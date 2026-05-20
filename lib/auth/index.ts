// ─── lib/auth/index.ts ────────────────────────────────────────────────────
// Auth entry point — users.ts'e delege eder.
import { verifyUser, type ManagedUser } from "./users";
import type { Role } from "@/types";

export type { ManagedUser };

export async function authenticateUser(email: string, password: string) {
  return verifyUser(email, password);
}

export function hasRole(user: { role: Role }, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(user.role);
}

export function getDefaultRedirectForRole(role: Role): string {
  switch (role) {
    case "CEO":        return "/";
    case "PLANLAMACI": return "/sd/siparisler";
    case "IHRACAT":    return "/sd/siparisler";
    case "DEPO":       return "/wm";
    default:           return "/sd/siparisler";
  }
}

export function saveSession(user: ManagedUser): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("orkestra_session", JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("orkestra_session");
}
