// ─── config/modules.ts ────────────────────────────────────────────────────
// Yeni modül = buraya bir kayıt + modules/<yeni>/ klasörü.
// Mevcut modüllere dokunulmaz.

import type { ModuleConfig } from "@/types";

export const MODULES: ModuleConfig[] = [
  {
    id: "sd",
    name: "Satış & Sipariş",
    description: "Açık siparişler, haftalık akış, TIR dağıtım planlaması",
    allowedRoles: ["CEO", "IHRACAT", "PLANLAMACI"],
    phase: 1,
    active: true,
  },
  {
    id: "pp",
    name: "Üretim Planlama",
    description: "İş emirleri, üretim akışı, kapasite",
    allowedRoles: ["CEO", "PLANLAMACI"],
    phase: 2,
    active: false,
  },
  {
    id: "qm",
    name: "Kalite Yönetimi",
    description: "Kalite lotları, ölçüm sonuçları",
    allowedRoles: ["CEO", "PLANLAMACI"],
    phase: 2,
    active: false,
  },
  {
    id: "wm",
    name: "Depo Yönetimi",
    description: "Stok, lokasyon, transfer emirleri",
    allowedRoles: ["CEO", "DEPO", "PLANLAMACI"],
    phase: 2,
    active: false,
  },
];

export function getModuleById(id: string): ModuleConfig | undefined {
  return MODULES.find((m) => m.id === id);
}

export function getActiveModules(): ModuleConfig[] {
  return MODULES.filter((m) => m.active);
}
