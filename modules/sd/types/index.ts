// ─── modules/sd/types/index.ts ────────────────────────────────────────────
// SD modülüne özel tipler. Global types değil, bu modüle özgü.

export type OrderStatus = "SEVKE_HAZIR" | "GECIKEN" | "URETIMDE" | "PLANLAMA";

export interface OrderLine {
  id: string;
  materialCode: string; // ön sıfır temizlenmiş
  materialDescription: string;
  quantity: number;
  unit: string;
  deliveryDate: Date | null; // SAP CHAR(8) dönüştürülmüş
  status: OrderStatus;
  region: string;
  customerCode: string; // ön sıfır temizlenmiş
  customerName: string;
  salesOrderNumber: string;
  weight?: number; // ton
}

export interface Customer {
  code: string; // ön sıfır temizlenmiş
  name: string;
  region: string;
  openOrderCount: number;
}

export interface Region {
  id: string;
  name: string;
  customerCount: number;
}

export interface WeeklyLoad {
  weekStart: Date;
  weekEnd: Date;
  weekLabel: string; // "H1", "H2" vb.
  totalTon: number;
  lateOrders: number;
  orders: OrderLine[];
}

export interface Truck {
  id: string;
  label: string; // "TIR 1", "TIR 2"
  capacityTon: number;
  assignedOrders: OrderLine[];
  totalAssignedTon: number;
}

export interface TruckLoadPlan {
  trucks: Truck[];
  unassignedPool: OrderLine[];
  generatedAt: Date;
}

// ── Satınalma Siparişi (PO / SAS) ─────────────────────────────────────────
export type POStatus = "BEKLIYOR" | "KISMI_TESLIM" | "GECIKEN" | "ONAYDA";

export interface PurchaseOrderLine {
  id: string;
  poNumber: string;          // Satınalma sipariş no
  materialCode: string;      // ön sıfır temizlenmiş
  materialDescription: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  openQuantity: number;      // orderedQuantity - deliveredQuantity
  unit: string;
  deliveryDate: Date | null;
  status: POStatus;
  vendorCode: string;        // ön sıfır temizlenmiş
  vendorName: string;
  purchasingGroup: string;   // Satınalma grubu
  plantCode: string;         // İşyeri
}

// ── IB Grubu SAS (Şirketlerarası Satınalma) ──────────────────────────────
export type SASStatus = "TEYİTLİ" | "KISMİ TEYİT" | "TEYİTSİZ";
export type IBCompany = "IB10" | "IB20" | "IB70" | "IB80";

export interface IBSASLine {
  sas_no: string;
  kalem_no: string;
  malzeme: string;
  malzeme_tanimi: string;
  acik_miktar: number;
  durum: SASStatus;
  teyitli_acik_miktar: number;
  teslim_tarihi: string | null;
  planlanan_miktar: number;
  gonderilen_miktar: number;
  buyer: IBCompany;
  vendor: string;
}
