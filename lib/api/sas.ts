// ─── lib/api/sas.ts ───────────────────────────────────────────────────────
// FastAPI SAS mikroservisine bağlanan istemci.
// SAS_API_URL tanımlıysa mikroservis kullanılır,
// yoksa mock veriye düşer (geliştirme ortamı).

const SAS_API = process.env.NEXT_PUBLIC_SAS_API_URL || "";

export interface SASLine {
  sas_no: string;
  kalem_no: string;
  malzeme: string;
  malzeme_tanimi: string;
  acik_miktar: number;
  durum: "TEYİTLİ" | "KISMİ TEYİT" | "TEYİTSİZ";
  teyitli_acik_miktar: number;
  teslim_tarihi: string | null;
  planlanan_miktar: number;
  gonderilen_miktar: number;
  buyer: string;
  vendor: string;
}

export interface SASResponse {
  items: SASLine[];
  total: number;
  teyitli: number;
  kismi_teyit: number;
  teyitsiz: number;
  generated_at: string;
}

export interface Vendor {
  code: string;
  name: string;
}

export const COMPANIES = ["IB10", "IB20", "IB70", "IB80"] as const;
export type Company = (typeof COMPANIES)[number];

// ── Mock veri (SAS_API_URL yokken) ────────────────────────────────────────
const MOCK_SAS: Record<string, SASLine[]> = {
  IB10: [
    { sas_no:"4500091001", kalem_no:"1", malzeme:"MAT-4521", malzeme_tanimi:"Plastik Profil 40x40mm", acik_miktar:3000, durum:"KISMİ TEYİT", teyitli_acik_miktar:1200, teslim_tarihi:"25.05.2026", planlanan_miktar:5000, gonderilen_miktar:2000, buyer:"IB10", vendor:"V001" },
    { sas_no:"4500091001", kalem_no:"2", malzeme:"MAT-4522", malzeme_tanimi:"Plastik Profil 60x60mm", acik_miktar:3000, durum:"TEYİTSİZ", teyitli_acik_miktar:0, teslim_tarihi:"17.05.2026", planlanan_miktar:3000, gonderilen_miktar:0, buyer:"IB10", vendor:"V001" },
    { sas_no:"4500091002", kalem_no:"1", malzeme:"MAT-7810", malzeme_tanimi:"Çelik Boru DN50", acik_miktar:800, durum:"TEYİTLİ", teyitli_acik_miktar:800, teslim_tarihi:"28.05.2026", planlanan_miktar:800, gonderilen_miktar:0, buyer:"IB10", vendor:"V002" },
    { sas_no:"4500091003", kalem_no:"1", malzeme:"MAT-3310", malzeme_tanimi:"Alüminyum Profil T-6", acik_miktar:2500, durum:"KISMİ TEYİT", teyitli_acik_miktar:1000, teslim_tarihi:"22.05.2026", planlanan_miktar:4000, gonderilen_miktar:1500, buyer:"IB10", vendor:"V003" },
    { sas_no:"4500091004", kalem_no:"1", malzeme:"MAT-9901", malzeme_tanimi:"Kimyasal Katkı B-200", acik_miktar:1200, durum:"TEYİTSİZ", teyitli_acik_miktar:0, teslim_tarihi:"12.06.2026", planlanan_miktar:1200, gonderilen_miktar:0, buyer:"IB10", vendor:"V004" },
    { sas_no:"4500091005", kalem_no:"1", malzeme:"MAT-1120", malzeme_tanimi:"Hammadde Granül HDPE", acik_miktar:10000, durum:"TEYİTSİZ", teyitli_acik_miktar:0, teslim_tarihi:"19.05.2026", planlanan_miktar:10000, gonderilen_miktar:0, buyer:"IB10", vendor:"V001" },
  ],
  IB80: [
    { sas_no:"4500092001", kalem_no:"1", malzeme:"EXP-001", malzeme_tanimi:"Export Bileşen A", acik_miktar:500, durum:"TEYİTLİ", teyitli_acik_miktar:500, teslim_tarihi:"30.05.2026", planlanan_miktar:500, gonderilen_miktar:0, buyer:"IB80", vendor:"V005" },
    { sas_no:"4500092002", kalem_no:"1", malzeme:"EXP-002", malzeme_tanimi:"Export Bileşen B", acik_miktar:750, durum:"KISMİ TEYİT", teyitli_acik_miktar:300, teslim_tarihi:"15.05.2026", planlanan_miktar:1000, gonderilen_miktar:250, buyer:"IB80", vendor:"V005" },
  ],
};

function getMockSAS(buyer: string, vendor: string, status: string): SASResponse {
  let items = MOCK_SAS[buyer] ?? MOCK_SAS["IB10"];
  if (vendor) items = items.filter(i => i.vendor === vendor);
  if (status) items = items.filter(i => i.durum === status);
  return {
    items,
    total: items.length,
    teyitli:     items.filter(i => i.durum === "TEYİTLİ").length,
    kismi_teyit: items.filter(i => i.durum === "KISMİ TEYİT").length,
    teyitsiz:    items.filter(i => i.durum === "TEYİTSİZ").length,
    generated_at: new Date().toLocaleString("tr-TR"),
  };
}

// ── API çağrıları ──────────────────────────────────────────────────────────

export async function fetchOpenSAS(
  buyer: Company,
  vendor = "",
  status = ""
): Promise<SASResponse> {
  if (!SAS_API) return getMockSAS(buyer, vendor, status);

  const params = new URLSearchParams({ buyer });
  if (vendor) params.set("vendor", vendor);
  if (status) params.set("status", status);

  const res = await fetch(`${SAS_API}/api/sas/open?${params}`, {
    next: { revalidate: 60 }, // 1 dk cache
  });
  if (!res.ok) throw new Error(`SAS API hatası: ${res.status}`);
  return res.json();
}

export async function fetchVendors(buyer: Company): Promise<Vendor[]> {
  if (!SAS_API) {
    const mockVendors: Record<string, Vendor[]> = {
      V001: [{ code:"V001", name:"Polimer Tedarik A.Ş." }],
      V002: [{ code:"V002", name:"Metalsan Çelik San." }],
      V003: [{ code:"V003", name:"Alümet Profil Ltd." }],
      V004: [{ code:"V004", name:"ChemSupply GmbH" }],
    };
    return Object.values(mockVendors).flat();
  }

  const res = await fetch(`${SAS_API}/api/vendors?buyer=${buyer}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.vendors ?? [];
}
