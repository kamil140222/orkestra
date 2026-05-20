// ─── config/navigation.ts ─────────────────────────────────────────────────
// TEK DOĞRULUK KAYNAĞI: Rota erişim hakları burada tanımlanır.
// Hem middleware.ts hem sidebar hem de layout.tsx bu dosyayı okur.
// Yeni rota eklemek = buraya bir kayıt eklemek.

import type { NavItem, Role } from "@/types";

export const NAV_ITEMS: NavItem[] = [
  // ── Orkestra Şefi Ana Panel (CEO görünümü)
  {
    path: "/",
    label: "Orkestra Şefi",
    icon: "LayoutDashboard",
    allowedRoles: ["CEO"],
    module: "dashboard",
  },

  // ── SD: Satış & Sipariş
  {
    path: "/sd",
    label: "Satış & Sipariş",
    icon: "ShoppingCart",
    allowedRoles: ["CEO", "IHRACAT", "PLANLAMACI"],
    module: "sd",
  },
  {
    path: "/sd/siparisler",
    label: "Açık Siparişler",
    icon: "ClipboardList",
    allowedRoles: ["CEO", "IHRACAT", "PLANLAMACI"],
    module: "sd",
  },
  {
    path: "/sd/haftalik-akis",
    label: "Haftalık Akış",
    icon: "CalendarDays",
    allowedRoles: ["CEO", "PLANLAMACI"],
    module: "sd",
  },
  {
    path: "/sd/tir-dagitim",
    label: "TIR Dağıtım",
    icon: "Truck",
    allowedRoles: ["CEO", "IHRACAT", "PLANLAMACI"],
    module: "sd",
  },

  // ── PP: Üretim Planlama (Faz 2)
  {
    path: "/pp",
    label: "Üretim Planlama",
    icon: "Factory",
    allowedRoles: ["CEO", "PLANLAMACI"],
    module: "pp",
  },

  // ── QM: Kalite Yönetimi (Faz 2)
  {
    path: "/qm",
    label: "Kalite",
    icon: "BadgeCheck",
    allowedRoles: ["CEO", "PLANLAMACI"],
    module: "qm",
  },

  // ── WM: Depo Yönetimi (Faz 2)
  {
    path: "/wm",
    label: "Depo",
    icon: "Warehouse",
    allowedRoles: ["CEO", "DEPO", "PLANLAMACI"],
    module: "wm",
  },
  // ── Ayarlar (sadece CEO)
  {
    path: "/ayarlar/kullanicilar",
    label: "Kullanıcı Yönetimi",
    icon: "Users",
    allowedRoles: ["CEO"],
    module: "ayarlar",
  },
];

// Bir rol için erişilebilir nav item'larını döner (sidebar için)
export function getNavItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.allowedRoles.includes(role));
}

// Bir rotanın verilen role açık olup olmadığını kontrol eder (middleware için)
export function isRouteAllowed(path: string, role: Role): boolean {
  const item = NAV_ITEMS.find(
    (item) => path === item.path || path.startsWith(item.path + "/")
  );
  if (!item) return false;
  return item.allowedRoles.includes(role);
}

// Korumalı rota grupları (middleware prefix check için)
export const PROTECTED_PREFIXES = ["/sd", "/pp", "/qm", "/wm", "/ayarlar", "/"];
export const PUBLIC_PATHS = ["/login", "/api/auth"];
