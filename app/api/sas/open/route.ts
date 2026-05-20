// ─── app/api/sas/open/route.ts ────────────────────────────────────────────
// Açık SAS (şirketlerarası satınalma) API endpoint.
// Python'daki sorgunun birebir Next.js karşılığı.
// Anayasa: WITH (NOLOCK), ReadOnly connection, ön sıfır temizliği.

import { NextRequest, NextResponse } from "next/server";
import { getPool, stripZeros, parseSapDate } from "@/lib/db/mssql";

const VALID_BUYERS = new Set(["IB10", "IB20", "IB70", "IB80"]);

// Mock veri — DB bağlantısı yokken (geliştirme)
const MOCK: Record<string, unknown[]> = {
  IB10: [
    { sas_no:"4500091001", kalem_no:"1",  malzeme:"MAT-4521", malzeme_tanimi:"Plastik Profil 40x40mm",  acik_miktar:3000,  durum:"KISMİ TEYİT", teyitli_acik_miktar:1200, teslim_tarihi:"25.05.2026", planlanan_miktar:5000,  gonderilen_miktar:2000, buyer:"IB10", vendor:"Polimer Tedarik A.Ş." },
    { sas_no:"4500091001", kalem_no:"2",  malzeme:"MAT-4522", malzeme_tanimi:"Plastik Profil 60x60mm",  acik_miktar:3000,  durum:"TEYİTSİZ",    teyitli_acik_miktar:0,    teslim_tarihi:"17.05.2026", planlanan_miktar:3000,  gonderilen_miktar:0,    buyer:"IB10", vendor:"Polimer Tedarik A.Ş." },
    { sas_no:"4500091002", kalem_no:"1",  malzeme:"MAT-7810", malzeme_tanimi:"Çelik Boru DN50",          acik_miktar:800,   durum:"TEYİTLİ",     teyitli_acik_miktar:800,  teslim_tarihi:"28.05.2026", planlanan_miktar:800,   gonderilen_miktar:0,    buyer:"IB10", vendor:"Metalsan Çelik" },
    { sas_no:"4500091003", kalem_no:"1",  malzeme:"MAT-3310", malzeme_tanimi:"Alüminyum Profil T-6",     acik_miktar:2500,  durum:"KISMİ TEYİT", teyitli_acik_miktar:1000, teslim_tarihi:"22.05.2026", planlanan_miktar:4000,  gonderilen_miktar:1500, buyer:"IB10", vendor:"Alümet Profil" },
    { sas_no:"4500091004", kalem_no:"1",  malzeme:"MAT-9901", malzeme_tanimi:"Kimyasal Katkı B-200",     acik_miktar:1200,  durum:"TEYİTSİZ",    teyitli_acik_miktar:0,    teslim_tarihi:"12.06.2026", planlanan_miktar:1200,  gonderilen_miktar:0,    buyer:"IB10", vendor:"ChemSupply GmbH" },
    { sas_no:"4500091005", kalem_no:"1",  malzeme:"MAT-1120", malzeme_tanimi:"Hammadde Granül HDPE",     acik_miktar:10000, durum:"TEYİTSİZ",    teyitli_acik_miktar:0,    teslim_tarihi:"19.05.2026", planlanan_miktar:10000, gonderilen_miktar:0,    buyer:"IB10", vendor:"Polimer Tedarik A.Ş." },
  ],
  IB80: [
    { sas_no:"4500092001", kalem_no:"1",  malzeme:"EXP-001",  malzeme_tanimi:"Export Bileşen A",         acik_miktar:500,   durum:"TEYİTLİ",     teyitli_acik_miktar:500,  teslim_tarihi:"30.05.2026", planlanan_miktar:500,   gonderilen_miktar:0,    buyer:"IB80", vendor:"Euro Parts GmbH" },
    { sas_no:"4500092002", kalem_no:"1",  malzeme:"EXP-002",  malzeme_tanimi:"Export Bileşen B",         acik_miktar:750,   durum:"KISMİ TEYİT", teyitli_acik_miktar:300,  teslim_tarihi:"15.05.2026", planlanan_miktar:1000,  gonderilen_miktar:250,  buyer:"IB80", vendor:"Euro Parts GmbH" },
  ],
};

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const buyer  = searchParams.get("buyer")?.toUpperCase() ?? "";
  const vendor = searchParams.get("vendor") ?? "";
  const status = searchParams.get("status") ?? "";

  if (!VALID_BUYERS.has(buyer)) {
    return NextResponse.json({ error: `Geçersiz buyer: ${buyer}` }, { status: 400 });
  }

  // DB bilgisi yoksa mock dön
  if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
    const items = (MOCK[buyer] ?? MOCK["IB10"]) as Record<string, unknown>[];
    const filtered = items
      .filter(i => !vendor || i.vendor === vendor)
      .filter(i => !status || i.durum === status);
    return NextResponse.json(buildResponse(filtered, buyer));
  }

  // Gerçek SQL
  try {
    const pool = await getPool();

    // Anayasa: WITH (NOLOCK) her tabloda
    const vendorFilter = vendor ? `AND KO.LIFNR = @vendor` : "";

    const query = `
      SELECT
        KO.EBELN                                                            AS sas_no,
        PO.EBELP                                                            AS kalem_no,
        PO.MATNR                                                            AS malzeme_raw,
        PO.TXZ01                                                            AS malzeme_tanimi,
        SUM(ET.MENGE)
          - SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END)
                                                                            AS acik_miktar,
        CASE
          WHEN SUM(ET.WAMNG) - SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END)
               >= SUM(ET.MENGE) - SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END)
          THEN N'TEYİTLİ'
          WHEN SUM(ET.WAMNG) - SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END) > 0
          THEN N'KISMİ TEYİT'
          ELSE N'TEYİTSİZ'
        END                                                                 AS durum,
        CASE
          WHEN SUM(ET.WAMNG) - SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END) > 0
          THEN SUM(ET.WAMNG) - SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END)
          ELSE 0
        END                                                                 AS teyitli_acik_miktar,
        MAX(ET.EINDT)                                                       AS teslim_tarihi_raw,
        SUM(ET.MENGE)                                                       AS planlanan_miktar,
        SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END) AS gonderilen_miktar,
        KO.LIFNR                                                            AS vendor_raw,
        ISNULL(LFA1.NAME1, KO.LIFNR)                                       AS vendor_name
      FROM       IBASAP.IBA.iba.EKET  ET   WITH (NOLOCK)
      INNER JOIN IBASAP.IBA.iba.EKPO  PO   WITH (NOLOCK)
          ON ET.EBELN = PO.EBELN AND ET.EBELP = PO.EBELP
      INNER JOIN IBASAP.IBA.iba.EKKO  KO   WITH (NOLOCK)
          ON ET.EBELN = KO.EBELN
      LEFT JOIN  IBASAP.IBA.iba.LFA1  LFA1 WITH (NOLOCK)
          ON KO.LIFNR = LFA1.LIFNR
      WHERE
          KO.BUKRS  = @buyer
          AND KO.BSART  = 'IBAA'
          AND KO.LOEKZ  = ' '
          AND PO.LOEKZ  = ' '
          AND PO.ELIKZ  = ' '
          AND ET.MENGE  > 0
          ${vendorFilter}
      GROUP BY KO.EBELN, PO.EBELP, PO.MATNR, PO.TXZ01, KO.LIFNR, LFA1.NAME1
      HAVING
          SUM(ET.MENGE) > SUM(CASE WHEN ET.GLMNG > ET.WEMNG THEN ET.GLMNG ELSE ET.WEMNG END)
      ORDER BY KO.EBELN, PO.EBELP
    `;

    const req2 = pool.request()
      .input("buyer", buyer);
    if (vendor) req2.input("vendor", vendor);

    const result = await req2.query(query);

    // Anayasa dönüşümleri
    const items = result.recordset
      .filter(r => !status || r.durum === status)
      .map(r => ({
        sas_no:               String(r.sas_no ?? "").trim(),
        kalem_no:             String(r.kalem_no ?? "").trim(),
        malzeme:              stripZeros(String(r.malzeme_raw ?? "")),  // ön sıfır temizle
        malzeme_tanimi:       String(r.malzeme_tanimi ?? "").trim(),
        acik_miktar:          Number(r.acik_miktar ?? 0),
        durum:                String(r.durum ?? "").trim(),
        teyitli_acik_miktar:  Number(r.teyitli_acik_miktar ?? 0),
        teslim_tarihi:        parseSapDate(r.teslim_tarihi_raw),        // CHAR(8) → DD.MM.YYYY
        planlanan_miktar:     Number(r.planlanan_miktar ?? 0),
        gonderilen_miktar:    Number(r.gonderilen_miktar ?? 0),
        buyer,
        vendor:               String(r.vendor_name ?? r.vendor_raw ?? "").trim(),
      }));

    return NextResponse.json(buildResponse(items, buyer));

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[SAS API]", msg);
    return NextResponse.json({ error: `Veritabanı hatası: ${msg}` }, { status: 500 });
  }
}

function buildResponse(items: Record<string, unknown>[], buyer: string) {
  return {
    items,
    total:       items.length,
    teyitli:     items.filter(i => i.durum === "TEYİTLİ").length,
    kismi_teyit: items.filter(i => i.durum === "KISMİ TEYİT").length,
    teyitsiz:    items.filter(i => i.durum === "TEYİTSİZ").length,
    buyer,
    generated_at: new Date().toLocaleString("tr-TR"),
    source: process.env.DB_USER ? "SAP" : "mock",
  };
}
