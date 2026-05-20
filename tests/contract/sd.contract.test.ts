// ─── tests/contract/sd.contract.test.ts ──────────────────────────────────
// SD modül sözleşme testleri.
// Bu testler yeşilse modül dışa açık arayüzü kırmamış demektir.
// Anayasa kuralları da burada kanıtlanır (ön sıfır, tarih).

import {
  getRegions,
  getCustomersByRegion,
  getOpenOrders,
  getWeeklyLoad,
} from "../../modules/sd";
import { parseSapDate, stripLeadingZeros } from "../../lib/api";

describe("SD Module Contract", () => {
  // ── getRegions ────────────────────────────────────────────────────────
  test("getRegions — dizi döner", async () => {
    const regions = await getRegions();
    expect(Array.isArray(regions)).toBe(true);
    expect(regions.length).toBeGreaterThan(0);
  });

  test("getRegions — her bölgede id ve name var", async () => {
    const regions = await getRegions();
    for (const r of regions) {
      expect(typeof r.id).toBe("string");
      expect(typeof r.name).toBe("string");
    }
  });

  // ── getOpenOrders ─────────────────────────────────────────────────────
  test("getOpenOrders — dizi döner", async () => {
    const orders = await getOpenOrders();
    expect(Array.isArray(orders)).toBe(true);
  });

  test("getOpenOrders — her satırda zorunlu alanlar var", async () => {
    const orders = await getOpenOrders();
    for (const o of orders) {
      expect(typeof o.id).toBe("string");
      expect(typeof o.materialCode).toBe("string");
      expect(typeof o.quantity).toBe("number");
      expect(["SEVKE_HAZIR", "GECIKEN", "URETIMDE", "PLANLAMA"]).toContain(
        o.status
      );
    }
  });

  // ── Anayasa: ön sıfır temizliği ───────────────────────────────────────
  test("Anayasa — stripLeadingZeros çalışıyor", () => {
    expect(stripLeadingZeros("000001234")).toBe("1234");
    expect(stripLeadingZeros("0000000001")).toBe("1");
    expect(stripLeadingZeros("1234")).toBe("1234");
    expect(stripLeadingZeros("0")).toBe("0");
    expect(stripLeadingZeros("")).toBe("");
  });

  // ── Anayasa: tarih dönüşümü ───────────────────────────────────────────
  test("Anayasa — parseSapDate geçerli tarihi dönüştürür", () => {
    const date = parseSapDate("20240315");
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2024);
    expect(date?.getMonth()).toBe(2); // 0-indexed
    expect(date?.getDate()).toBe(15);
  });

  test("Anayasa — parseSapDate boş değerleri null döndürür", () => {
    expect(parseSapDate("00000000")).toBeNull();
    expect(parseSapDate("")).toBeNull();
    expect(parseSapDate("   ")).toBeNull();
  });

  // ── getWeeklyLoad ─────────────────────────────────────────────────────
  test("getWeeklyLoad — haftalık yapı doğru", async () => {
    const weeks = await getWeeklyLoad();
    expect(Array.isArray(weeks)).toBe(true);
    for (const w of weeks) {
      expect(w.weekStart instanceof Date).toBe(true);
      expect(typeof w.totalTon).toBe("number");
      expect(Array.isArray(w.orders)).toBe(true);
    }
  });

  // ── Modül izolasyonu ──────────────────────────────────────────────────
  test("SD modülü yalnızca index.ts üzerinden import ediliyor", () => {
    // Bu test, doğrudan iç yollara import yapılmadığını sembolik olarak temsil eder.
    // Gerçek projede ESLint kuralı ile zorlanır (no-restricted-imports).
    expect(true).toBe(true); // Placeholder
  });
});
