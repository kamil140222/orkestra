# ─── services/sas/main.py ─────────────────────────────────────────────────
# Açık Satınalma Siparişleri (SAS) mikroservisi
# Çalıştır: uvicorn main:app --host 0.0.0.0 --port 8001 --reload
#
# Anayasa kuralları burada zorlanır:
#   - WITH (NOLOCK) her sorguda
#   - Tarih: CHAR(8) → ISO string
#   - Ön sıfır temizliği: MATNR/LIFNR

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pyodbc
import os
from datetime import datetime

app = FastAPI(title="IBA SAS Mikroservis", version="1.0.0")

# CORS — Next.js'ten istek gelebilsin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://10.1.2.247:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ── Veritabanı yapılandırması ─────────────────────────────────────────────
DB_SERVER   = os.getenv("DB_SERVER",   "COMMONDBS")
DB_DATABASE = os.getenv("DB_DATABASE", "commondb")
DB_USER     = os.getenv("DB_USER",     "")        # .env'den okunur
DB_PASSWORD = os.getenv("DB_PASSWORD", "")        # .env'den okunur

# Geçerli şirket kodları
VALID_COMPANIES = {"IB10", "IB20", "IB70", "IB80"}

# ── Anayasa yardımcıları ──────────────────────────────────────────────────

def strip_leading_zeros(code: str) -> str:
    """MATNR/LIFNR baştaki sıfırları temizle. '000001234' → '1234'"""
    if not code:
        return code
    return code.lstrip("0") or "0"

def parse_sap_date(sap_date: str) -> Optional[str]:
    """SAP CHAR(8) YYYYMMDD → 'DD.MM.YYYY'. '00000000' → None"""
    if not sap_date or sap_date.strip() == "00000000" or sap_date.strip() == "":
        return None
    try:
        d = datetime.strptime(sap_date.strip(), "%Y%m%d")
        return d.strftime("%d.%m.%Y")
    except ValueError:
        return None

def get_connection():
    """SQL Server bağlantısı — ReadOnly intent"""
    if not DB_USER or not DB_PASSWORD:
        raise HTTPException(
            status_code=503,
            detail="Veritabanı kimlik bilgileri yapılandırılmamış. DB_USER ve DB_PASSWORD ortam değişkenlerini ayarlayın."
        )
    conn_str = (
        f"DRIVER={{SQL Server}};"
        f"SERVER={DB_SERVER};"
        f"DATABASE={DB_DATABASE};"
        f"UID={DB_USER};"
        f"PWD={DB_PASSWORD};"
        f"ApplicationIntent=ReadOnly;"
    )
    try:
        return pyodbc.connect(conn_str, timeout=10)
    except pyodbc.Error as e:
        raise HTTPException(status_code=503, detail=f"Veritabanı bağlantı hatası: {str(e)}")

# ── Response modelleri ────────────────────────────────────────────────────

class SASLine(BaseModel):
    sas_no: str
    kalem_no: str
    malzeme: str                  # ön sıfır temizlenmiş
    malzeme_tanimi: str
    acik_miktar: float
    durum: str                    # TEYİTLİ / KISMİ TEYİT / TEYİTSİZ
    teyitli_acik_miktar: float
    teslim_tarihi: Optional[str]  # DD.MM.YYYY veya None
    planlanan_miktar: float
    gonderilen_miktar: float
    buyer: str
    vendor: str

class SASResponse(BaseModel):
    items: list[SASLine]
    total: int
    teyitli: int
    kismi_teyit: int
    teyitsiz: int
    generated_at: str

# ── Endpoint'ler ──────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "sas-mikroservis"}

@app.get("/api/sas/companies")
def get_companies():
    """Kullanılabilir şirket kodları"""
    return {"companies": sorted(list(VALID_COMPANIES))}

@app.get("/api/sas/open", response_model=SASResponse)
def get_open_sas(
    buyer:  str = Query(..., description="Alıcı şirket kodu (IB10/IB20/IB70/IB80)"),
    vendor: str = Query("", description="Tedarikçi kodu (boş = tümü)"),
    status: str = Query("", description="Durum filtresi: TEYİTLİ / KISMİ TEYİT / TEYİTSİZ"),
):
    # Güvenlik — SQL injection önlemi
    if buyer not in VALID_COMPANIES:
        raise HTTPException(status_code=400, detail=f"Geçersiz buyer: {buyer}. Geçerliler: {VALID_COMPANIES}")

    conn = get_connection()
    try:
        # ── Anayasa: WITH (NOLOCK) her tabloda ────────────────────────────
        vendor_filter = f"AND KO.LIFNR = '{vendor}'" if vendor.strip() else ""
        status_filter = f"HAVING ... AND DURUM = '{status}'" if status.strip() else ""

        query = f"""
            SELECT
                KO.EBELN                                                          AS SAS_NO,
                PO.EBELP                                                          AS KALEM_NO,
                PO.MATNR                                                          AS MALZEME,
                PO.TXZ01                                                          AS MALZEME_TANIMI,
                SUM(ET.MENGE)
                  - SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END)
                                                                                  AS ACIK_MIKTAR,
                CASE
                    WHEN SUM(ET.WAMNG)
                           - SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END)
                         >= SUM(ET.MENGE)
                              - SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END)
                    THEN 'TEYİTLİ'
                    WHEN SUM(ET.WAMNG)
                           - SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END) > 0
                    THEN 'KISMİ TEYİT'
                    ELSE 'TEYİTSİZ'
                END                                                               AS DURUM,
                CASE
                    WHEN SUM(ET.WAMNG)
                           - SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END) > 0
                    THEN SUM(ET.WAMNG)
                           - SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END)
                    ELSE 0
                END                                                               AS TEYITLI_ACIK_MIKTAR,
                MAX(ET.EINDT)                                                     AS TESLIM_TARIHI,
                SUM(ET.MENGE)                                                     AS PLANLANAN_MIKTAR,
                SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END)
                                                                                  AS GONDERILEN_MIKTAR
            FROM       IBASAP.IBA.iba.EKET  ET  WITH (NOLOCK)
            INNER JOIN IBASAP.IBA.iba.EKPO  PO  WITH (NOLOCK)
                ON ET.EBELN = PO.EBELN AND ET.EBELP = PO.EBELP
            INNER JOIN IBASAP.IBA.iba.EKKO  KO  WITH (NOLOCK)
                ON ET.EBELN = KO.EBELN
            WHERE
                KO.BUKRS = ?
                AND KO.BSART = 'IBAA'
                AND KO.LOEKZ = ' '
                AND PO.LOEKZ = ' '
                AND PO.ELIKZ = ' '
                AND ET.MENGE > 0
                {vendor_filter}
            GROUP BY KO.EBELN, PO.EBELP, PO.MATNR, PO.TXZ01
            HAVING
                SUM(ET.MENGE) > SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END)
            ORDER BY KO.EBELN, PO.EBELP
        """

        cursor = conn.cursor()
        cursor.execute(query, buyer)
        rows = cursor.fetchall()
        cols = [d[0] for d in cursor.description]

    except pyodbc.Error as e:
        raise HTTPException(status_code=500, detail=f"Sorgu hatası: {str(e)}")
    finally:
        conn.close()

    # ── Veri dönüşümü + Anayasa kuralları ────────────────────────────────
    items: list[SASLine] = []
    for row in rows:
        d = dict(zip(cols, row))

        # Durum filtresi (Python tarafında — SQL HAVING içinde parametre güçleştirir)
        durum = str(d.get("DURUM", "")).strip()
        if status.strip() and durum != status.strip():
            continue

        line = SASLine(
            sas_no          = str(d.get("SAS_NO", "")).strip(),
            kalem_no        = str(d.get("KALEM_NO", "")).strip(),
            malzeme         = strip_leading_zeros(str(d.get("MALZEME", "")).strip()),
            malzeme_tanimi  = str(d.get("MALZEME_TANIMI", "")).strip(),
            acik_miktar     = float(d.get("ACIK_MIKTAR") or 0),
            durum           = durum,
            teyitli_acik_miktar = float(d.get("TEYITLI_ACIK_MIKTAR") or 0),
            teslim_tarihi   = parse_sap_date(str(d.get("TESLIM_TARIHI", ""))),
            planlanan_miktar= float(d.get("PLANLANAN_MIKTAR") or 0),
            gonderilen_miktar = float(d.get("GONDERILEN_MIKTAR") or 0),
            buyer           = buyer,
            vendor          = strip_leading_zeros(str(d.get("VENDOR", vendor)).strip()),
        )
        items.append(line)

    return SASResponse(
        items       = items,
        total       = len(items),
        teyitli     = sum(1 for i in items if i.durum == "TEYİTLİ"),
        kismi_teyit = sum(1 for i in items if i.durum == "KISMİ TEYİT"),
        teyitsiz    = sum(1 for i in items if i.durum == "TEYİTSİZ"),
        generated_at= datetime.now().strftime("%d.%m.%Y %H:%M:%S"),
    )

@app.get("/api/sas/vendors")
def get_vendors(buyer: str = Query(...)):
    """Verilen buyer için tedarikçi listesi"""
    if buyer not in VALID_COMPANIES:
        raise HTTPException(status_code=400, detail=f"Geçersiz buyer: {buyer}")

    conn = get_connection()
    try:
        query = """
            SELECT DISTINCT KO.LIFNR, LFA1.NAME1
            FROM       IBASAP.IBA.iba.EKKO  KO   WITH (NOLOCK)
            LEFT JOIN  IBASAP.IBA.iba.LFA1  LFA1 WITH (NOLOCK)
                ON KO.LIFNR = LFA1.LIFNR
            WHERE
                KO.BUKRS  = ?
                AND KO.BSART = 'IBAA'
                AND KO.LOEKZ = ' '
            ORDER BY LFA1.NAME1
        """
        cursor = conn.cursor()
        cursor.execute(query, buyer)
        rows = cursor.fetchall()
    finally:
        conn.close()

    return {
        "vendors": [
            {
                "code": strip_leading_zeros(str(r[0]).strip()),
                "name": str(r[1] or "").strip(),
            }
            for r in rows
        ]
    }
