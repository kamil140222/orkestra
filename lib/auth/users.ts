// ─── lib/auth/users.ts ────────────────────────────────────────────────────
// Kullanıcı yönetimi. localStorage'da saklanır (tarayıcı tarafı).
// SAP SSO/LDAP entegrasyonunda bu dosya değişir, UI dokunulmaz.

import type { Role } from "@/types";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  region?: string;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface StoredUser extends ManagedUser {
  passwordHash: string; // basit hash (gerçekte bcrypt)
}

const STORAGE_KEY = "iba_users_v1";

// ── Varsayılan kullanıcılar (ilk yüklemede) ───────────────────────────────
const DEFAULT_USERS: StoredUser[] = [
  {
    id: "1", name: "Genel Müdür", email: "ceo@orkestra.local",
    role: "CEO", active: true, createdAt: new Date().toISOString(),
    passwordHash: btoa("ceo123"),
  },
  {
    id: "2", name: "Üretim Planlamacı", email: "planlamaci@orkestra.local",
    role: "PLANLAMACI", active: true, createdAt: new Date().toISOString(),
    passwordHash: btoa("plan123"),
  },
  {
    id: "3", name: "Depo Sorumlusu", email: "depo@orkestra.local",
    role: "DEPO", active: true, createdAt: new Date().toISOString(),
    passwordHash: btoa("depo123"),
  },
  {
    id: "4", name: "İhracat Uzmanı", email: "ihracat@orkestra.local",
    role: "IHRACAT", region: "EXPORT", active: true,
    createdAt: new Date().toISOString(),
    passwordHash: btoa("ihracat123"),
  },
];

// ── Storage yardımcıları ──────────────────────────────────────────────────
function loadUsers(): StoredUser[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveUsers(DEFAULT_USERS);
      return DEFAULT_USERS;
    }
    return JSON.parse(raw) as StoredUser[];
  } catch {
    return DEFAULT_USERS;
  }
}

function saveUsers(users: StoredUser[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// ── Public API ─────────────────────────────────────────────────────────────

/** Tüm kullanıcıları listele (şifresiz) */
export function getUsers(): ManagedUser[] {
  return loadUsers().map(({ passwordHash: _, ...u }) => u);
}

/** Email + şifre ile doğrula */
export function verifyUser(email: string, password: string): ManagedUser | null {
  const users = loadUsers();
  const user = users.find(
    u => u.email.toLowerCase() === email.toLowerCase() &&
         u.passwordHash === btoa(password) &&
         u.active
  );
  if (!user) return null;

  // Son giriş zamanını güncelle
  user.lastLogin = new Date().toISOString();
  saveUsers(users);

  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

/** Yeni kullanıcı ekle */
export function addUser(data: {
  name: string; email: string; password: string;
  role: Role; region?: string;
}): { ok: boolean; error?: string } {
  const users = loadUsers();
  if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
    return { ok: false, error: "Bu e-posta zaten kayıtlı." };
  }
  const newUser: StoredUser = {
    id: Date.now().toString(),
    name: data.name,
    email: data.email,
    role: data.role,
    region: data.region,
    active: true,
    createdAt: new Date().toISOString(),
    passwordHash: btoa(data.password),
  };
  users.push(newUser);
  saveUsers(users);
  return { ok: true };
}

/** Kullanıcıyı güncelle */
export function updateUser(id: string, data: {
  name?: string; email?: string; password?: string;
  role?: Role; region?: string; active?: boolean;
}): { ok: boolean; error?: string } {
  const users = loadUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return { ok: false, error: "Kullanıcı bulunamadı." };

  // Email çakışma kontrolü
  if (data.email) {
    const conflict = users.find(u => u.id !== id && u.email.toLowerCase() === data.email!.toLowerCase());
    if (conflict) return { ok: false, error: "Bu e-posta zaten kullanımda." };
  }

  const user = users[idx];
  if (data.name)    user.name    = data.name;
  if (data.email)   user.email   = data.email;
  if (data.role)    user.role    = data.role;
  if (data.region !== undefined) user.region = data.region;
  if (data.active !== undefined) user.active = data.active;
  if (data.password) user.passwordHash = btoa(data.password);

  saveUsers(users);
  return { ok: true };
}

/** Kullanıcıyı sil (son CEO koruması var) */
export function deleteUser(id: string): { ok: boolean; error?: string } {
  const users = loadUsers();
  const user = users.find(u => u.id === id);
  if (!user) return { ok: false, error: "Kullanıcı bulunamadı." };

  // Son aktif CEO'yu silme
  const activeCeos = users.filter(u => u.role === "CEO" && u.active);
  if (user.role === "CEO" && activeCeos.length <= 1) {
    return { ok: false, error: "En az bir CEO hesabı olmalıdır." };
  }

  saveUsers(users.filter(u => u.id !== id));
  return { ok: true };
}

export const ROLE_LABELS: Record<Role, string> = {
  CEO:        "Genel Müdür / CEO",
  PLANLAMACI: "Üretim Planlamacı",
  DEPO:       "Depo Sorumlusu",
  IHRACAT:    "İhracat Uzmanı",
};

export const ROLE_COLORS: Record<Role, { bg: string; color: string }> = {
  CEO:        { bg:"rgba(91,63,160,0.18)",   color:"#9B7FD0" },
  PLANLAMACI: { bg:"rgba(41,171,226,0.18)",  color:"#29ABE2" },
  DEPO:       { bg:"rgba(168,201,35,0.18)",  color:"#A8C923" },
  IHRACAT:    { bg:"rgba(255,159,10,0.18)",  color:"#FF9F0A" },
};
