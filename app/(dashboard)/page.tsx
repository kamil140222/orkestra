"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { KpiCard, Badge } from "@/components/ui";
import { getOpenOrders, getOpenPurchaseOrders } from "@/modules/sd";

export default function DashboardPage() {
  const [so,setSo]     = useState(0);
  const [late,setLate] = useState(0);
  const [ready,setReady] = useState(0);
  const [po,setPo]     = useState(0);
  const [loaded,setLoaded] = useState(false);

  useEffect(()=>{
    Promise.all([getOpenOrders(),getOpenPurchaseOrders()]).then(([s,p])=>{
      setSo(s.length); setLate(s.filter(o=>o.status==="GECIKEN").length);
      setReady(s.filter(o=>o.status==="SEVKE_HAZIR").length); setPo(p.length); setLoaded(true);
    });
  },[]);

  const modules=[
    {id:"sd",label:"Satış & Sipariş",icon:"ti-package",desc:"Açık siparişler, haftalık akış, TIR dağıtım",href:"/sd/siparisler",active:true,color:"var(--iba-blue)",bg:"var(--iba-blue-bg)"},
    {id:"pp",label:"Üretim Planlama",icon:"ti-building-factory",desc:"İş emirleri, kapasite planlaması",href:"/pp",active:false,color:"var(--iba-purple)",bg:"var(--iba-purp-bg)"},
    {id:"qm",label:"Kalite Yönetimi",icon:"ti-certificate",desc:"Kalite lotları, ölçüm sonuçları",href:"/qm",active:false,color:"var(--iba-green)",bg:"var(--iba-green-bg)"},
    {id:"wm",label:"Depo Yönetimi",icon:"ti-building-warehouse",desc:"Stok, lokasyon, transfer",href:"/wm",active:false,color:"#FF9500",bg:"#FFF3E0"},
  ];

  return (
    <div className="space-y-6" style={{ maxWidth:1100 }}>
      <div className="anim flex items-center justify-between">
        <div>
          <h1 className="text-[28px] font-bold" style={{ color:"var(--text)" }}>Genel Bakış</h1>
          <p className="text-[15px] mt-1" style={{ color:"var(--text2)" }}>Fabrika operasyonları</p>
        </div>
        <img src="/iba-logo.jpg" alt="IBA Kimya" style={{ height:40, objectFit:"contain" }}/>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="anim anim-1"><KpiCard label="Açık Satış" value={loaded?so:"—"} sub="sipariş kalemi" color="var(--iba-blue)" icon="ti-package"/></div>
        <div className="anim anim-2"><KpiCard label="Geciken" value={loaded?late:"—"} sub="termin geçmiş" color="var(--red)" icon="ti-alert-triangle"/></div>
        <div className="anim anim-3"><KpiCard label="Sevke Hazır" value={loaded?ready:"—"} sub="yüklenebilir" color="var(--iba-green)" icon="ti-truck"/></div>
        <div className="anim anim-4"><KpiCard label="Açık SAS" value={loaded?po:"—"} sub="satınalma" color="var(--iba-purple)" icon="ti-shopping-cart"/></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {modules.map((m,i)=>(
          <div key={m.id} className="anim" style={{ animationDelay:`${i*0.05}s` }}>
            <Link href={m.href} className={m.active?"":"pointer-events-none"}>
              <div className={`card p-5 group transition-all duration-200 ${m.active?"hover:shadow-md cursor-pointer":"opacity-50"}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-[22px]"
                    style={{ background:m.bg, color:m.color }}>
                    <i className={`ti ${m.icon}`} aria-hidden="true"/>
                  </div>
                  {m.active ? <Badge variant="success">Aktif</Badge> : <Badge>Faz 2</Badge>}
                </div>
                <p className="text-[17px] font-bold" style={{ color:"var(--text)" }}>{m.label}</p>
                <p className="text-[14px] mt-1" style={{ color:"var(--text2)" }}>{m.desc}</p>
                {m.active&&(
                  <p className="text-[14px] font-semibold mt-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color:m.color }}>
                    Modüle git <i className="ti ti-arrow-right" aria-hidden="true"/>
                  </p>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
