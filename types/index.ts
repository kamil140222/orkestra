// ─── Orkestra Şefi — Global Types ─────────────────────────────────────────
// Bu dosya sistemin ortak sözleşmesidir.
// Değiştirirken tüm bağımlı modülleri kontrol et.

export type Role = "CEO" | "PLANLAMACI" | "DEPO" | "IHRACAT";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  region?: string; // Bölge kısıtı (IHRACAT/DEPO için)
}

export interface NavItem {
  path: string;
  label: string;
  icon?: string;
  allowedRoles: Role[];
  module?: string;
}

export interface ModuleConfig {
  id: string;
  name: string;
  description: string;
  allowedRoles: Role[];
  phase: number; // Hangi fazda aktif olduğu
  active: boolean;
}

// Ortak API yanıt sarmalayıcı
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

// Sayfalama
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
