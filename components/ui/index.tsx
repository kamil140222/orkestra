"use client";
import { cn } from "./utils";
import type { ReactNode } from "react";

export function Card({ children, className, onClick, style }: {
  children: ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties;
}) {
  return (
    <div onClick={onClick} style={style}
      className={cn("card transition-all duration-200",
        onClick && "cursor-pointer hover:shadow-md active:scale-[0.99]", className)}>
      {children}
    </div>
  );
}

type BV = "success"|"warning"|"danger"|"info"|"purple"|"default";
const BDG: Record<BV, string> = {
  success: "bg-[#EAF3DE] text-[#3B6D11]",
  warning: "bg-[#FAEEDA] text-[#633806]",
  danger:  "bg-[#FCEBEB] text-[#A32D2D]",
  info:    "bg-[#E6F1FB] text-[#185FA5]",
  purple:  "bg-[#EDE8F8] text-[#5B3FA0]",
  default: "bg-[#F2F2F7] text-[#636366]",
};
export function Badge({ children, variant = "default", className }: {
  children: ReactNode; variant?: BV; className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold", BDG[variant], className)}>
      {children}
    </span>
  );
}

export function Button({ children, variant = "primary", size = "md", loading, className, disabled, style, ...props }: {
  children: ReactNode; variant?: "primary"|"secondary"|"ghost"|"danger";
  size?: "sm"|"md"|"lg"; loading?: boolean; className?: string;
  disabled?: boolean; style?: React.CSSProperties;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const V = {
    primary:   "text-white font-semibold shadow-sm",
    secondary: "bg-white text-[#1C1C1E] border border-[rgba(0,0,0,0.14)] hover:bg-[#F2F2F7]",
    ghost:     "text-[#636366] hover:bg-[#F2F2F7]",
    danger:    "bg-[#FCEBEB] text-[#A32D2D] hover:bg-[#F7C1C1]",
  };
  const S = { sm: "px-4 py-2 text-[13px]", md: "px-5 py-2.5 text-[14px]", lg: "px-6 py-3 text-[15px]" };
  return (
    <button {...props} disabled={disabled || loading}
      style={variant === "primary" ? { background: "var(--iba-purple)", ...style } : style}
      className={cn("inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed", V[variant], S[size], className)}>
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

type OS = "SEVKE_HAZIR"|"GECIKEN"|"URETIMDE"|"PLANLAMA";
const SC: Record<OS, { label: string; bg: string; color: string; dot: string }> = {
  SEVKE_HAZIR: { label: "Sevke Hazır", bg: "#EAF3DE", color: "#3B6D11", dot: "#34C759" },
  GECIKEN:     { label: "Geciken",     bg: "#FCEBEB", color: "#A32D2D", dot: "#E24B4A" },
  URETIMDE:    { label: "Üretimde",    bg: "#E6F1FB", color: "#185FA5", dot: "#378ADD" },
  PLANLAMA:    { label: "Planlama",    bg: "#FAEEDA", color: "#633806", dot: "#EF9F27" },
};
export function StatusBadge({ status }: { status: OS }) {
  const s = SC[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold"
      style={{ background: s.bg, color: s.color }}>
      <span className="h-2 w-2 rounded-full flex-shrink-0"
        style={{ background: s.dot, animation: status === "GECIKEN" ? "pulse 1s ease-in-out infinite" : undefined }} />
      {s.label}
    </span>
  );
}

export function LiveDot({ color = "green" }: { color?: "green"|"red"|"amber"|"blue" }) {
  return <span className="live-dot" style={{ background: color === "green" ? "#34C759" : color === "red" ? "#E24B4A" : color === "blue" ? "#378ADD" : "#EF9F27" }} />;
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-20", className)}>
      <div className="h-10 w-10 animate-spin rounded-full"
        style={{ border: "3px solid var(--iba-purp-bg)", borderTopColor: "var(--iba-purple)" }} />
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
      <i className="ti ti-inbox" aria-hidden="true" style={{ fontSize: 48, color: "var(--text3)" }} />
      <p className="text-[16px] font-semibold" style={{ color: "var(--text2)" }}>{title}</p>
      {description && <p className="text-[14px]" style={{ color: "var(--text3)" }}>{description}</p>}
    </div>
  );
}

export function ErrorCard({ title = "Hata", description }: { title?: string; description?: string }) {
  return (
    <div className="rounded-2xl p-5 flex items-start gap-3"
      style={{ background: "var(--red-bg)", border: "1px solid rgba(226,75,74,0.2)" }}>
      <i className="ti ti-alert-circle" aria-hidden="true" style={{ fontSize: 20, color: "var(--red)" }} />
      <div>
        <p className="text-[15px] font-semibold" style={{ color: "var(--red)" }}>{title}</p>
        {description && <p className="text-[13px] mt-1" style={{ color: "var(--red)" }}>{description}</p>}
      </div>
    </div>
  );
}

/* ── KPI Kartı — büyük değer ortada ── */
export function KpiCard({ label, value, sub, color, icon }: {
  label: string; value: string|number; sub?: string; color?: string; icon?: string;
}) {
  return (
    <div className="card p-6 flex flex-col items-center text-center anim"
      style={{ minHeight: 140 }}>
      {icon && (
        <i className={`ti ${icon}`} aria-hidden="true"
          style={{ fontSize: 28, color: color || "var(--text3)", marginBottom: 12 }} />
      )}
      <p className="text-[48px] font-bold tracking-tight leading-none"
        style={{ color: color || "var(--text)" }}>
        {value}
      </p>
      <p className="text-[13px] font-semibold mt-3 uppercase tracking-wider"
        style={{ color: "var(--text2)" }}>
        {label}
      </p>
      {sub && (
        <p className="text-[12px] mt-1" style={{ color: "var(--text3)" }}>{sub}</p>
      )}
    </div>
  );
}
