import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/ui/Sidebar";
import { LiveTickerPanel } from "@/components/ui/LiveTickerPanel";
import type { User } from "@/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const token = h.get("x-user-token");
  if (!token) redirect("/login");

  let user: User;
  try {
    user = JSON.parse(Buffer.from(token, "base64").toString("utf-8")) as User;
  } catch {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Sol sidebar */}
      <Sidebar user={user} />

      {/* Ana içerik */}
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {/* Topbar */}
        <div
          className="sticky top-0 z-10 flex items-center px-8 flex-shrink-0"
          style={{
            height: 56,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(16px)",
            borderBottom: "1px solid var(--border)",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
            position: "relative",
          }}
        >
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{ height: 2, background: "linear-gradient(90deg,#5B3FA0,#0E86D4,#7CB518)" }}
          />
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <span
              className="text-[13px] font-semibold px-3 py-1.5 rounded-full"
              style={{ background: "var(--iba-purp-bg)", color: "var(--iba-purple)" }}
            >
              {user.role}
            </span>
            <span
              className="flex items-center gap-2 text-[13px] px-3 py-1.5 rounded-full font-medium"
              style={{ background: "var(--iba-green-bg)", color: "#3B6D11" }}
            >
              <span
                className="live-dot"
                style={{ width: 7, height: 7, background: "var(--iba-green)" }}
              />
              Mock veri
            </span>
          </div>
        </div>

        {/* Sayfa içeriği + sağ ticker */}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8">{children}</div>

          {/* Sağ dikey canlı ticker paneli */}
          <LiveTickerPanel />
        </div>
      </main>
    </div>
  );
}
