"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getNavItemsForRole } from "@/config/navigation";
import { cn } from "@/components/ui/utils";
import type { User } from "@/types";

const ICONS: Record<string, string> = {
  LayoutDashboard: "ti-layout-dashboard",
  ShoppingCart:    "ti-package",
  ClipboardList:   "ti-clipboard-list",
  CalendarDays:    "ti-calendar-week",
  Truck:           "ti-truck",
  Factory:         "ti-building-factory",
  BadgeCheck:      "ti-certificate",
  Warehouse:       "ti-building-warehouse",
  Users:           "ti-users",
};

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router   = useRouter();
  const navItems = getNavItemsForRole(user.role);

  function logout() {
    document.cookie = "orkestra_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  }

  return (
    <aside
      className="flex h-screen flex-col flex-shrink-0"
      style={{ width: 260, background: "white", borderRight: "1px solid var(--border)", boxShadow: "1px 0 8px rgba(0,0,0,0.04)" }}
    >
      {/* Logo — topbar ile aynı yükseklik (56px) */}
      <div style={{ height: 56, flexShrink: 0, display: "flex", alignItems: "center", paddingLeft: 24, paddingRight: 24, position: "relative" }}>
        <img
          src="/iba-logo.jpg"
          alt="IBA Kimya"
          style={{ maxHeight: 36, objectFit: "contain", objectPosition: "left" }}
        />
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,var(--iba-purple),var(--iba-purp2),var(--iba-blue))" }} />
      </div>

      {/* Karar Destek Sistemi */}
      <div className="px-6 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-[15px] font-bold tracking-wide"
          style={{ background: "linear-gradient(90deg,var(--iba-purple),var(--iba-blue))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          Karar Destek Sistemi
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map(item => {
          const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
          const icon = ICONS[item.icon ?? ""] ?? "ti-circle";
          const isSub = item.path.split("/").length > 2;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 font-medium transition-all duration-150",
                isSub ? "ml-6 py-2.5 text-[15px]" : "text-[16px]",
                !isActive && "hover:bg-[#F2F2F7]"
              )}
              style={isActive
                ? { background: "var(--iba-purp-bg)", color: "var(--iba-purple)" }
                : { color: "var(--text2)" }
              }
            >
              {!isSub && (
                <i className={`ti ${icon}`} aria-hidden="true"
                  style={{ fontSize: 22, width: 26, textAlign: "center" }} />
              )}
              {isSub && (
                <span className="w-4 h-px block flex-shrink-0" style={{ background: "var(--border2)" }} />
              )}
              <span className="truncate">{item.label}</span>
              {isActive && !isSub && (
                <span className="ml-auto h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: "var(--iba-purple)" }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Kullanıcı */}
      <div className="p-4" style={{ borderTop: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-[16px] font-bold flex-shrink-0 text-white"
            style={{ background: "linear-gradient(135deg,var(--iba-purple),var(--iba-blue))" }}
          >
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold" style={{ color: "var(--text)" }}>{user.name}</p>
            <p className="text-[12px]" style={{ color: "var(--text3)" }}>{user.role}</p>
          </div>
          <button onClick={logout} title="Çıkış"
            className="hover:opacity-60 transition-opacity p-1"
            style={{ color: "var(--text3)", fontSize: 20 }}>
            <i className="ti ti-logout" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}
