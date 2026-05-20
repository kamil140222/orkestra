import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@/types";

const SESSION_COOKIE = "orkestra_token";

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Statik dosyalar, API, public assets — dokunma
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/iba-logo") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Token kontrol
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Token çöz
  let role: Role;
  let session: Record<string, string>;
  try {
    session = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    role = session.role as Role;
    if (!role) throw new Error("no role");
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Rol yetki haritası
  const ROLE_PATHS: Record<string, string[]> = {
    CEO:        ["/", "/sd", "/pp", "/qm", "/wm", "/ayarlar"],
    PLANLAMACI: ["/", "/sd", "/pp", "/qm"],
    IHRACAT:    ["/", "/sd"],
    DEPO:       ["/", "/sd", "/wm"],
  };

  const allowed = ROLE_PATHS[role] ?? ["/"];
  const hasAccess = allowed.some(p =>
    pathname === p || pathname.startsWith(p === "/" ? "/" : p + "/")
  );

  if (!hasAccess) {
    return NextResponse.redirect(new URL("/sd/siparisler", request.url));
  }

  // Geçir — header'a token ekle
  const res = NextResponse.next();
  res.headers.set("x-user-token", token);
  res.headers.set("x-user-role", role);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
