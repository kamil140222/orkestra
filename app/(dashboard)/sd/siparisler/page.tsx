"use client";
import { useState, useEffect } from "react";
import { KpiCard } from "@/components/ui";
import { SalesOrdersView } from "@/modules/sd/components/SalesOrdersView";
import { PurchaseOrdersView } from "@/modules/sd/components/PurchaseOrdersView";
import { IBSASView } from "@/modules/sd/components/IBSASView";
import { getOpenOrders, getOpenPurchaseOrders } from "@/modules/sd";

const TABS = [
  { id:"so",    label:"Satış Siparişleri", icon:"ti-package" },
  { id:"po",    label:"Satınalma (SAS)",   icon:"ti-shopping-cart" },
  { id:"ibsas", label:"IB Grubu SAS",      icon:"ti-building-community" },
];

export default function SiparislerPage() {
  const [tab, setTab]     = useState("so");
  const [so, setSo]       = useState<number|null>(null);
  const [late, setLate]   = useState<number|null>(null);
  const [ready, setReady] = useState<number|null>(null);
  const [po, setPo]       = useState<number|null>(null);

  useEffect(() => {
    Promise.all([getOpenOrders(), getOpenPurchaseOrders()]).then(([s, p]) => {
      setSo(s.length);
      setLate(s.filter(o => o.status === "GECIKEN").length);
      setReady(s.filter(o => o.status === "SEVKE_HAZIR").length);
      setPo(p.length);
    });
  }, []);

  return (
    <div className="space-y-6" style={{ maxWidth: 1100 }}>
      <div className="anim flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight" style={{ color:"var(--text)" }}>
            Açık Siparişler
          </h1>
          <p className="text-[15px] mt-1" style={{ color:"var(--text2)" }}>
            {tab === "so"    ? "Müşteri siparişleri — bölge ve müşteri kırılımı"
            : tab === "po"   ? "Satınalma siparişleri — malzeme bazlı"
            :                  "IB Grubu şirketlerarası satınalma siparişleri"}
          </p>
        </div>
        <div className="h-1 w-20 rounded-full"
          style={{ background:"linear-gradient(90deg,var(--iba-purple),var(--iba-blue))" }}/>
      </div>

      {/* KPI — sadece SO/PO sekmesinde göster */}
      {tab !== "ibsas" && (
        <div className="grid grid-cols-4 gap-4">
          <div className="anim anim-1">
            <KpiCard label="Satış Siparişi" value={so??'—'} sub="açık kalem" color="var(--iba-blue)" icon="ti-package"/>
          </div>
          <div className="anim anim-2">
            <KpiCard label="Geciken" value={late??'—'} sub="termin geçmiş" color="var(--red)" icon="ti-alert-triangle"/>
          </div>
          <div className="anim anim-3">
            <KpiCard label="Sevke Hazır" value={ready??'—'} sub="yüklenebilir" color="var(--iba-green)" icon="ti-truck"/>
          </div>
          <div className="anim anim-4">
            <KpiCard label="Açık SAS" value={po??'—'} sub="satınalma" color="var(--iba-purple)" icon="ti-shopping-cart"/>
          </div>
        </div>
      )}

      {/* Sekmeler */}
      <div className="flex gap-2 p-1.5 rounded-2xl w-fit"
        style={{ background:"white", border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-all duration-200"
            style={tab === t.id
              ? { background:"var(--iba-purp-bg)", color:"var(--iba-purple)" }
              : { color:"var(--text2)" }
            }>
            <i className={`ti ${t.icon}`} aria-hidden="true" style={{ fontSize:16 }}/>
            {t.label}
          </button>
        ))}
      </div>

      <div className="anim">
        {tab === "so"    && <SalesOrdersView/>}
        {tab === "po"    && <PurchaseOrdersView/>}
        {tab === "ibsas" && <IBSASView/>}
      </div>
    </div>
  );
}
