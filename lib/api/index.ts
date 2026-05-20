// ─── lib/api/index.ts ─────────────────────────────────────────────────────
// Ortak fetch istemcisi. Tüm modül servisleri buradan geçer.
// Hata sınırı: servis hatasında çökme değil, fallback + uyarı.

import type { ApiResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

interface FetchOptions extends RequestInit {
  timeout?: number;
}

// ── Temel fetch sarmalayıcı ────────────────────────────────────────────────
async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { timeout = 15_000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "Bilinmeyen hata");
      return {
        data: null,
        error: `Sunucu hatası ${res.status}: ${errorText}`,
        loading: false,
      };
    }

    const data = (await res.json()) as T;
    return { data, error: null, loading: false };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err instanceof Error && err.name === "AbortError") {
      return { data: null, error: "İstek zaman aşımına uğradı", loading: false };
    }

    const message = err instanceof Error ? err.message : "Ağ hatası";
    return { data: null, error: message, loading: false };
  }
}

// ── HTTP metodları ─────────────────────────────────────────────────────────
export const apiClient = {
  get: <T>(path: string, options?: FetchOptions) =>
    apiFetch<T>(path, { method: "GET", ...options }),

  post: <T>(path: string, body: unknown, options?: FetchOptions) =>
    apiFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
      ...options,
    }),
};

// ── Anayasa: SAP veri dönüşüm yardımcıları ────────────────────────────────
// Bu fonksiyonlar mikroserviste de uygulanır; frontend fallback olarak içerir.

/** SAP CHAR(8) YYYYMMDD → Date. "00000000" → null */
export function parseSapDate(sapDate: string): Date | null {
  if (!sapDate || sapDate === "00000000" || sapDate.trim() === "") return null;
  const year = parseInt(sapDate.substring(0, 4), 10);
  const month = parseInt(sapDate.substring(4, 6), 10) - 1;
  const day = parseInt(sapDate.substring(6, 8), 10);
  const date = new Date(year, month, day);
  if (isNaN(date.getTime())) return null;
  return date;
}

/** SAP MATNR/KUNNR baştaki sıfırları temizle. "000000001234" → "1234" */
export function stripLeadingZeros(code: string): string {
  if (!code) return code;
  return code.replace(/^0+/, "") || "0";
}

/** Miktarı SAP birim ile birlikte formatla */
export function formatQuantity(qty: number, unit: string): string {
  return `${qty.toLocaleString("tr-TR")} ${unit}`;
}

export default apiClient;
