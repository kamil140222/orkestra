"use client";
import { cn } from "./utils";
export interface Tab { id: string; label: string; count?: number; icon?: string; }
export function Tabs({ tabs, activeTab, onChange, className }: {
  tabs: Tab[]; activeTab: string; onChange: (id: string) => void; className?: string;
}) {
  return (
    <div
      className={cn("flex gap-1 p-1 rounded-xl", className)}
      style={{ background:"var(--os-surface2)", border:"1px solid var(--os-border)" }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-medium transition-all duration-200 flex-1 justify-center"
          style={activeTab===tab.id
            ? { background:"var(--os-surface)", color:"var(--os-text)", border:"1px solid var(--os-border-mid)" }
            : { color:"var(--os-text-3)", border:"1px solid transparent" }
          }
        >
          {tab.icon && <span>{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span
              className="rounded-full px-1.5 text-[10px] font-bold"
              style={activeTab===tab.id
                ? { background:"var(--os-blue-bg)", color:"var(--os-blue)" }
                : { background:"rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.3)" }
              }
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
