"use client";
import { useState, useEffect } from "react";
import { getOpenOrders, getOpenPurchaseOrders } from "@/modules/sd";
import type { OrderLine, PurchaseOrderLine } from "@/modules/sd";

// Global filtre state — siparişler sayfasından ticker'a aktarılır
type TickerFilter = { regionId?: string; customerCode?: string; status?: string };
declare global { interface Window { __tickerFilter?: TickerFilter; } }

const S_COLOR: Record<string, string> = { SEVKE_HAZIR:"#3B6D11",GECIKEN:"#A32D2D",URETIMDE:"#185FA5",PLANLAMA:"#633806" };
const S_BG:    Record<string, string> = { SEVKE_HAZIR:"#EAF3DE",GECIKEN:"#FCEBEB",URETIMDE:"#E6F1FB",PLANLAMA:"#FAEEDA" };
const S_LABEL: Record<string, string> = { SEVKE_HAZIR:"Hazır",GECIKEN:"Geciken",URETIMDE:"Üretimde",PLANLAMA:"Planlama" };
const PO_COLOR:Record<string,string>  = { BEKLIYOR:"#636366",KISMI_TESLIM:"#633806",GECIKEN:"#A32D2D",ONAYDA:"#185FA5" };
const PO_BG:   Record<string,string>  = { BEKLIYOR:"#F2F2F7",KISMI_TESLIM:"#FAEEDA",GECIKEN:"#FCEBEB",ONAYDA:"#E6F1FB" };
const PO_LABEL:Record<string,string>  = { BEKLIYOR:"Bekliyor",KISMI_TESLIM:"Kısmi",GECIKEN:"Geciken",ONAYDA:"Onayda" };

export function LiveTickerPanel() {
  const [allSo, setAllSo]         = useState<OrderLine[]>([]);
  const [allPo, setAllPo]         = useState<PurchaseOrderLine[]>([]);
  const [filtered, setFiltered]   = useState<OrderLine[]>([]);
  const [time, setTime]           = useState("");
  const [tab, setTab]             = useState<"so"|"po">("so");
  const [filterLabel, setFilterLabel] = useState("");

  useEffect(() => {
    getOpenOrders().then(d => { setAllSo(d); setFiltered(d); });
    getOpenPurchaseOrders().then(setAllPo);
  }, []);

  // Filtre senkronu — 500ms'de bir window.__tickerFilter'ı oku
  useEffect(() => {
    const id = setInterval(() => {
      const f = window.__tickerFilter;
      if (!f) { setFiltered(allSo); setFilterLabel(""); return; }
      let items = allSo;
      const labels: string[] = [];
      if (f.regionId && f.regionId !== "ALL") {
        items = items.filter(o => o.region === f.regionId);
        labels.push(f.regionId);
      }
      if (f.customerCode) {
        items = items.filter(o => o.customerCode === f.customerCode);
        const name = allSo.find(o => o.customerCode === f.customerCode)?.customerName;
        if (name) labels.push(name);
      }
      if (f.status) {
        items = items.filter(o => o.status === f.status);
        labels.push(S_LABEL[f.status] || f.status);
      }
      setFiltered(items);
      setFilterLabel(labels.join(" · "));
    }, 500);
    return () => clearInterval(id);
  }, [allSo]);

  useEffect(() => {
    const tick = () => {
      const n = new Date(), p = (v: number) => String(v).padStart(2, "0");
      setTime(`${p(n.getHours())}:${p(n.getMinutes())}:${p(n.getSeconds())}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  const displaySo = filtered;
  const lateCount = displaySo.filter(o => o.status === "GECIKEN").length;
  const readyCount = displaySo.filter(o => o.status === "SEVKE_HAZIR").length;

  return (
    <div className="flex-shrink-0 flex flex-col"
      style={{ width: 280, borderLeft: "1px solid var(--border)", background: "white", height: "100%", overflow: "hidden" }}>

      {/* Başlık */}
      <div className="px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="live-dot" style={{ width: 10, height: 10, background: "#34C759" }} />
          <span className="text-[16px] font-bold" style={{ color: "var(--text)" }}>Canlı Akış</span>
          {filterLabel && (
            <span className="ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "var(--iba-purp-bg)", color: "var(--iba-purple)" }}>
              Filtreli
            </span>
          )}
        </div>
        {/* Büyük saat */}
        <div className="rounded-2xl py-4 flex items-center justify-center mb-4"
          style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
          <span className="font-mono text-[32px] font-bold tabular-nums"
            style={{ color: "var(--iba-purple)" }}>
            {time}
          </span>
        </div>
        {/* İstatistikler */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Toplam", value: displaySo.length, color: "var(--iba-blue)" },
            { label: "Geciken", value: lateCount, color: "var(--red)" },
            { label: "Hazır", value: readyCount, color: "var(--iba-green)" },
          ].map((s, i) => (
            <div key={s.label} className="rounded-xl py-3 flex flex-col items-center"
              style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <span className="text-[28px] font-bold tabular-nums leading-none"
                style={{ color: s.color }}>{s.value}</span>
              <span className="text-[11px] font-medium mt-1" style={{ color: "var(--text3)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-1.5 p-2 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
        {(["so", "po"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 rounded-xl py-2 text-[13px] font-semibold transition-all"
            style={tab === t
              ? { background: "var(--iba-purp-bg)", color: "var(--iba-purple)" }
              : { color: "var(--text3)" }}>
            {t === "so" ? "Satış" : "Satınalma"}
          </button>
        ))}
      </div>

      {/* Filtre göstergesi */}
      {filterLabel && tab === "so" && (
        <div className="px-4 py-2 flex items-center gap-2 flex-shrink-0"
          style={{ background: "var(--iba-purp-bg)", borderBottom: "1px solid var(--border)" }}>
          <i className="ti ti-filter" aria-hidden="true" style={{ fontSize: 13, color: "var(--iba-purple)" }} />
          <span className="text-[12px] font-medium truncate" style={{ color: "var(--iba-purple)" }}>
            {filterLabel}
          </span>
        </div>
      )}

      {/* Akan liste */}
      <div className="flex-1 overflow-y-auto">
        {tab === "so" ? (
          displaySo.length === 0 ? (
            <p className="text-[13px] text-center py-10" style={{ color: "var(--text3)" }}>Sonuç yok</p>
          ) : (
            <div style={{ animation: displaySo.length > 4 ? "tickerV 20s linear infinite" : undefined }}>
              <style>{`@keyframes tickerV{0%{transform:translateY(0)}100%{transform:translateY(-50%)}}`}</style>
              {(displaySo.length > 4 ? [...displaySo, ...displaySo] : displaySo).map((o, i) => (
                <div key={`${o.id}-${i}`}
                  className="px-5 py-4 flex flex-col gap-2"
                  style={{ borderBottom: "1px solid var(--border)", background: o.status === "GECIKEN" ? "#FFFAF9" : "white" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-bold rounded-full px-2.5 py-1"
                      style={{ background: S_BG[o.status], color: S_COLOR[o.status] }}>
                      {S_LABEL[o.status]}
                    </span>
                    <span className="font-mono text-[12px] font-semibold"
                      style={{ color: "var(--iba-purple)" }}>{o.materialCode}</span>
                  </div>
                  <p className="text-[14px] font-bold" style={{ color: "var(--text)" }}>{o.customerName}</p>
                  <p className="text-[13px]" style={{ color: "var(--text2)" }}>{o.materialDescription}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                      {o.quantity.toLocaleString("tr-TR")} {o.unit}
                    </span>
                    {o.deliveryDate && (
                      <span className="text-[12px] font-medium" style={{ color: o.status === "GECIKEN" ? "var(--red)" : "var(--text3)" }}>
                        {o.status === "GECIKEN" && "⚠ "}
                        {`${String(o.deliveryDate.getDate()).padStart(2,"0")}.${String(o.deliveryDate.getMonth()+1).padStart(2,"0")}`}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          allPo.length === 0 ? (
            <p className="text-[13px] text-center py-10" style={{ color: "var(--text3)" }}>Yükleniyor...</p>
          ) : (
            <div style={{ animation: allPo.length > 4 ? "tickerV 22s linear infinite" : undefined }}>
              {(allPo.length > 4 ? [...allPo, ...allPo] : allPo).map((l, i) => {
                const p = l.orderedQuantity === 0 ? 0 : Math.round(l.deliveredQuantity / l.orderedQuantity * 100);
                return (
                  <div key={`${l.id}-${i}`}
                    className="px-5 py-4 flex flex-col gap-2"
                    style={{ borderBottom: "1px solid var(--border)", background: l.status === "GECIKEN" ? "#FFFAF9" : "white" }}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-bold rounded-full px-2.5 py-1"
                        style={{ background: PO_BG[l.status], color: PO_COLOR[l.status] }}>
                        {PO_LABEL[l.status]}
                      </span>
                      <span className="font-mono text-[12px] font-semibold" style={{ color: "var(--iba-purple)" }}>
                        {l.materialCode}
                      </span>
                    </div>
                    <p className="text-[14px] font-bold" style={{ color: "var(--text)" }}>{l.vendorName}</p>
                    <p className="text-[13px]" style={{ color: "var(--text2)" }}>{l.materialDescription}</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--bg3)" }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${p}%`, background: l.status === "GECIKEN" ? "var(--red)" : l.status === "KISMI_TESLIM" ? "var(--amber)" : "var(--iba-blue)" }} />
                      </div>
                      <span className="text-[13px] font-bold tabular-nums" style={{ color: "var(--text2)" }}>%{p}</span>
                    </div>
                    <span className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                      {l.openQuantity.toLocaleString("tr-TR")} {l.unit} açık
                    </span>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* Alt bar */}
      <div className="flex-shrink-0 px-5 py-3 flex items-center gap-2"
        style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
        <span className="live-dot" style={{ width: 7, height: 7, background: "#34C759" }} />
        <span className="text-[12px] font-medium" style={{ color: "var(--text3)" }}>SAP bağlantısı aktif</span>
      </div>
    </div>
  );
}
