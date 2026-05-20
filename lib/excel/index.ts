// ─── lib/excel/index.ts ───────────────────────────────────────────────────
// Excel dışa aktarma yardımcıları. Tüm modüller buradan kullanır.
// SheetJS (xlsx) ile tarayıcı tarafında çalışır, sunucu gerekmez.

import * as XLSX from "xlsx";
import type { OrderLine, PurchaseOrderLine } from "@/modules/sd/types";

const fmt = (d: Date | null) =>
  d
    ? `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}.${d.getFullYear()}`
    : "-";

const STATUS_LABELS: Record<string, string> = {
  SEVKE_HAZIR: "Sevke Hazır",
  GECIKEN: "Geciken",
  URETIMDE: "Üretimde",
  PLANLAMA: "Planlama",
  BEKLIYOR: "Bekliyor",
  KISMI_TESLIM: "Kısmi Teslim",
  ONAYDA: "Onayda",
};

/** Satış siparişlerini Excel'e aktar */
export function exportSalesOrders(orders: OrderLine[], filename?: string) {
  const rows = orders.map((o) => ({
    "Sipariş No": o.salesOrderNumber,
    "Müşteri Kodu": o.customerCode,
    "Müşteri": o.customerName,
    "Bölge": o.region,
    "Malzeme Kodu": o.materialCode,
    "Malzeme Tanımı": o.materialDescription,
    "Miktar": o.quantity,
    "Birim": o.unit,
    "Ağırlık (ton)": o.weight ?? "",
    "Termin": fmt(o.deliveryDate),
    "Durum": STATUS_LABELS[o.status] ?? o.status,
  }));

  downloadSheet(rows, filename ?? "acik-satis-siparisleri");
}

/** Satınalma siparişlerini Excel'e aktar */
export function exportPurchaseOrders(
  lines: PurchaseOrderLine[],
  filename?: string
) {
  const rows = lines.map((l) => ({
    "SAS No": l.poNumber,
    "Tedarikçi Kodu": l.vendorCode,
    "Tedarikçi": l.vendorName,
    "Malzeme Kodu": l.materialCode,
    "Malzeme Tanımı": l.materialDescription,
    "Sipariş Miktarı": l.orderedQuantity,
    "Teslim Edilen": l.deliveredQuantity,
    "Açık Miktar": l.openQuantity,
    "Birim": l.unit,
    "Termin": fmt(l.deliveryDate),
    "Durum": STATUS_LABELS[l.status] ?? l.status,
    "Satınalma Grubu": l.purchasingGroup,
    "İşyeri": l.plantCode,
  }));

  downloadSheet(rows, filename ?? "acik-sas-siparisleri");
}

function downloadSheet(rows: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(rows);

  // Kolon genişliklerini otomatik ayarla
  const cols = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...rows.map((r) => String(r[key] ?? "").length)
    ) + 2,
  }));
  ws["!cols"] = cols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Veri");

  // Tarih damgası ekle
  const now = new Date();
  const stamp = `${now.getDate().toString().padStart(2, "0")}${(now.getMonth() + 1)
    .toString()
    .padStart(2, "0")}${now.getFullYear()}`;

  XLSX.writeFile(wb, `${filename}-${stamp}.xlsx`);
}
