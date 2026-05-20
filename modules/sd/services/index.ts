// ─── modules/sd/services/index.ts ────────────────────────────────────────
// Veri erişim katmanı. Şu an mock döner.
// SAP VIEW hazır olunca YALNIZCA bu dosya değişir — UI dokunulmaz.
// Anayasa kuralları (ön sıfır, tarih) mock'ta da uygulanır; SAP'den gelince
// mikroserviste aynı kurallar çalışır.

import type {
  OrderLine,
  Customer,
  Region,
  WeeklyLoad,
  TruckLoadPlan,
  Truck,
  PurchaseOrderLine,
} from "../types";

// ── Mock veri ─────────────────────────────────────────────────────────────
const MOCK_REGIONS: Region[] = [
  { id: "MARMARA", name: "Marmara", customerCount: 8 },
  { id: "EGE", name: "Ege", customerCount: 5 },
  { id: "IC_ANADOLU", name: "İç Anadolu", customerCount: 6 },
  { id: "EXPORT", name: "İhracat", customerCount: 4 },
];

const MOCK_CUSTOMERS: Customer[] = [
  { code: "1001", name: "ABC Plastik A.Ş.", region: "MARMARA", openOrderCount: 3 },
  { code: "1002", name: "XYZ Metal San.", region: "MARMARA", openOrderCount: 1 },
  { code: "1003", name: "Delta Makina", region: "EGE", openOrderCount: 2 },
  { code: "1004", name: "Omega Kimya", region: "IC_ANADOLU", openOrderCount: 4 },
  { code: "1005", name: "Euro Parts GmbH", region: "EXPORT", openOrderCount: 2 },
];

const today = new Date();
const addDays = (d: Date, n: number) =>
  new Date(d.getTime() + n * 86_400_000);

const MOCK_ORDERS: OrderLine[] = [
  {
    id: "SO-001-001",
    materialCode: "MAT-4521",
    materialDescription: "Plastik Profil 40x40mm",
    quantity: 2500,
    unit: "KG",
    deliveryDate: addDays(today, 3),
    status: "SEVKE_HAZIR",
    region: "MARMARA",
    customerCode: "1001",
    customerName: "ABC Plastik A.Ş.",
    salesOrderNumber: "4500001234",
    weight: 2.5,
  },
  {
    id: "SO-001-002",
    materialCode: "MAT-4522",
    materialDescription: "Plastik Profil 60x60mm",
    quantity: 1800,
    unit: "KG",
    deliveryDate: addDays(today, -2),
    status: "GECIKEN",
    region: "MARMARA",
    customerCode: "1001",
    customerName: "ABC Plastik A.Ş.",
    salesOrderNumber: "4500001234",
    weight: 1.8,
  },
  {
    id: "SO-002-001",
    materialCode: "MAT-7810",
    materialDescription: "Çelik Boru DN50",
    quantity: 500,
    unit: "AD",
    deliveryDate: addDays(today, 7),
    status: "URETIMDE",
    region: "MARMARA",
    customerCode: "1002",
    customerName: "XYZ Metal San.",
    salesOrderNumber: "4500001235",
    weight: 4.5,
  },
  {
    id: "SO-003-001",
    materialCode: "MAT-3310",
    materialDescription: "Alüminyum Profil T-6",
    quantity: 3200,
    unit: "KG",
    deliveryDate: addDays(today, 5),
    status: "SEVKE_HAZIR",
    region: "EGE",
    customerCode: "1003",
    customerName: "Delta Makina",
    salesOrderNumber: "4500001236",
    weight: 3.2,
  },
  {
    id: "SO-004-001",
    materialCode: "MAT-9901",
    materialDescription: "Kimyasal Katkı B-200",
    quantity: 800,
    unit: "LT",
    deliveryDate: addDays(today, 14),
    status: "PLANLAMA",
    region: "IC_ANADOLU",
    customerCode: "1004",
    customerName: "Omega Kimya",
    salesOrderNumber: "4500001237",
    weight: 0.8,
  },
  {
    id: "SO-005-001",
    materialCode: "MAT-5510",
    materialDescription: "Export Part X-100",
    quantity: 1200,
    unit: "AD",
    deliveryDate: addDays(today, 10),
    status: "URETIMDE",
    region: "EXPORT",
    customerCode: "1005",
    customerName: "Euro Parts GmbH",
    salesOrderNumber: "4500001238",
    weight: 6.0,
  },
];

// ── Servis arayüzü ─────────────────────────────────────────────────────────

/** Tüm bölgeleri getir */
export async function getRegions(): Promise<Region[]> {
  await delay(200);
  return MOCK_REGIONS;
}

/** Bölgeye göre müşterileri getir */
export async function getCustomersByRegion(
  regionId: string
): Promise<Customer[]> {
  await delay(200);
  if (regionId === "ALL") return MOCK_CUSTOMERS;
  return MOCK_CUSTOMERS.filter((c) => c.region === regionId);
}

/** Açık sipariş satırlarını getir (region/customer filtreli) */
export async function getOpenOrders(filters?: {
  regionId?: string;
  customerCode?: string;
  status?: string;
}): Promise<OrderLine[]> {
  await delay(300);
  let orders = [...MOCK_ORDERS];
  if (filters?.regionId && filters.regionId !== "ALL") {
    orders = orders.filter((o) => o.region === filters.regionId);
  }
  if (filters?.customerCode) {
    orders = orders.filter((o) => o.customerCode === filters.customerCode);
  }
  if (filters?.status) {
    orders = orders.filter((o) => o.status === filters.status);
  }
  return orders;
}

/** Haftalık yük dağılımı */
export async function getWeeklyLoad(): Promise<WeeklyLoad[]> {
  await delay(300);
  const orders = await getOpenOrders();

  // Basit haftalık gruplama (termin tarihine göre)
  const weeks: Map<string, WeeklyLoad> = new Map();

  for (const order of orders) {
    if (!order.deliveryDate) continue;
    const weekStart = getWeekStart(order.deliveryDate);
    const key = weekStart.toISOString();

    if (!weeks.has(key)) {
      const weekEnd = addDays(weekStart, 6);
      weeks.set(key, {
        weekStart,
        weekEnd,
        weekLabel: formatWeekLabel(weekStart),
        totalTon: 0,
        lateOrders: 0,
        orders: [],
      });
    }

    const week = weeks.get(key)!;
    week.orders.push(order);
    week.totalTon += order.weight ?? 0;
    if (order.status === "GECIKEN") week.lateOrders++;
  }

  return Array.from(weeks.values()).sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
  );
}

/** TIR yükleme planı oluştur (başlangıç — boş TIR'lar) */
export async function createInitialTruckPlan(
  truckCount = 3,
  defaultCapacity = 20
): Promise<TruckLoadPlan> {
  await delay(200);
  const readyOrders = await getOpenOrders({ status: "SEVKE_HAZIR" });

  const trucks: Truck[] = Array.from({ length: truckCount }, (_, i) => ({
    id: `truck-${i + 1}`,
    label: `TIR ${i + 1}`,
    capacityTon: defaultCapacity,
    assignedOrders: [],
    totalAssignedTon: 0,
  }));

  return {
    trucks,
    unassignedPool: readyOrders,
    generatedAt: new Date(),
  };
}

// ── Yardımcılar ───────────────────────────────────────────────────────────
function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Pazartesi
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const fmt = (d: Date) =>
    `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
  return `${fmt(weekStart)} – ${fmt(end)}`;
}

// ── PO Mock verisi ─────────────────────────────────────────────────────────
const MOCK_PO_LINES: PurchaseOrderLine[] = [
  {
    id: "PO-2024-001-001",
    poNumber: "4500091001",
    materialCode: "MAT-4521",
    materialDescription: "Plastik Profil 40x40mm",
    orderedQuantity: 5000,
    deliveredQuantity: 2000,
    openQuantity: 3000,
    unit: "KG",
    deliveryDate: addDays(today, 5),
    status: "KISMI_TESLIM",
    vendorCode: "V001",
    vendorName: "Polimer Tedarik A.Ş.",
    purchasingGroup: "P01",
    plantCode: "1000",
  },
  {
    id: "PO-2024-001-002",
    poNumber: "4500091001",
    materialCode: "MAT-4522",
    materialDescription: "Plastik Profil 60x60mm",
    orderedQuantity: 3000,
    deliveredQuantity: 0,
    openQuantity: 3000,
    unit: "KG",
    deliveryDate: addDays(today, -3),
    status: "GECIKEN",
    vendorCode: "V001",
    vendorName: "Polimer Tedarik A.Ş.",
    purchasingGroup: "P01",
    plantCode: "1000",
  },
  {
    id: "PO-2024-002-001",
    poNumber: "4500091002",
    materialCode: "MAT-7810",
    materialDescription: "Çelik Boru DN50",
    orderedQuantity: 800,
    deliveredQuantity: 0,
    openQuantity: 800,
    unit: "AD",
    deliveryDate: addDays(today, 8),
    status: "BEKLIYOR",
    vendorCode: "V002",
    vendorName: "Metalsan Çelik San.",
    purchasingGroup: "P02",
    plantCode: "1000",
  },
  {
    id: "PO-2024-003-001",
    poNumber: "4500091003",
    materialCode: "MAT-3310",
    materialDescription: "Alüminyum Profil T-6",
    orderedQuantity: 4000,
    deliveredQuantity: 1500,
    openQuantity: 2500,
    unit: "KG",
    deliveryDate: addDays(today, 2),
    status: "KISMI_TESLIM",
    vendorCode: "V003",
    vendorName: "Alümet Profil Ltd.",
    purchasingGroup: "P01",
    plantCode: "1000",
  },
  {
    id: "PO-2024-004-001",
    poNumber: "4500091004",
    materialCode: "MAT-9901",
    materialDescription: "Kimyasal Katkı B-200",
    orderedQuantity: 1200,
    deliveredQuantity: 0,
    openQuantity: 1200,
    unit: "LT",
    deliveryDate: addDays(today, 12),
    status: "ONAYDA",
    vendorCode: "V004",
    vendorName: "ChemSupply GmbH",
    purchasingGroup: "P03",
    plantCode: "1000",
  },
  {
    id: "PO-2024-005-001",
    poNumber: "4500091005",
    materialCode: "MAT-1120",
    materialDescription: "Hammadde Granül HDPE",
    orderedQuantity: 10000,
    deliveredQuantity: 0,
    openQuantity: 10000,
    unit: "KG",
    deliveryDate: addDays(today, -1),
    status: "GECIKEN",
    vendorCode: "V001",
    vendorName: "Polimer Tedarik A.Ş.",
    purchasingGroup: "P01",
    plantCode: "1000",
  },
];

/** Açık satınalma sipariş kalemlerini getir */
export async function getOpenPurchaseOrders(filters?: {
  vendorCode?: string;
  status?: string;
  materialCode?: string;
}): Promise<PurchaseOrderLine[]> {
  await delay(300);
  let lines = [...MOCK_PO_LINES];
  if (filters?.vendorCode) {
    lines = lines.filter((l) => l.vendorCode === filters.vendorCode);
  }
  if (filters?.status) {
    lines = lines.filter((l) => l.status === filters.status);
  }
  if (filters?.materialCode) {
    lines = lines.filter((l) =>
      l.materialCode.toLowerCase().includes(filters.materialCode!.toLowerCase())
    );
  }
  return lines;
}
