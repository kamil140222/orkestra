// ─── modules/sd/index.ts ──────────────────────────────────────────────────
// SD modülünün DIŞA AÇILAN TEK KAPISI.
// Dışarıdan bu modülü kullanan her yer buradan import eder.
// İç yapı (components/, services/, types/) dışarıya sızmaz.

// Tipler
export type {
  OrderLine,
  Customer,
  Region,
  WeeklyLoad,
  Truck,
  TruckLoadPlan,
  OrderStatus,
  PurchaseOrderLine,
  POStatus,
} from "./types";

// Servisler (mock → mikroservis geçişi buradan yönetilir)
export {
  getRegions,
  getCustomersByRegion,
  getOpenOrders,
  getWeeklyLoad,
  createInitialTruckPlan,
  getOpenPurchaseOrders,
} from "./services";
