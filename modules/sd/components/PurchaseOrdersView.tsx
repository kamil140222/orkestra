"use client";
import { useState, useEffect, useCallback } from "react";
import { Button, Badge, LoadingSpinner, EmptyState, ErrorCard } from "@/components/ui";
import { exportPurchaseOrders } from "@/lib/excel";
import { getOpenPurchaseOrders } from "../services";
import type { PurchaseOrderLine, POStatus } from "../types";
import { cn } from "@/components/ui/utils";

const SC:Record<POStatus,{label:string;bg:string;color:string}> = {
  BEKLIYOR:    {label:"Bekliyor",    bg:"#F2F2F7",  color:"#636366"},
  KISMI_TESLIM:{label:"Kısmi Teslim",bg:"#FFF3E0",  color:"#B25000"},
  GECIKEN:     {label:"Geciken",     bg:"#FFEBE9",  color:"#C0392B"},
  ONAYDA:      {label:"Onayda",      bg:"#DFF0FA",  color:"#0A6AA8"},
};

const fmt=(d:Date|null)=>d?`${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}`:"—";
const isLate=(d:Date|null)=>!!d&&d<new Date();
const pct=(l:PurchaseOrderLine)=>l.orderedQuantity===0?0:Math.round(l.deliveredQuantity/l.orderedQuantity*100);

export function PurchaseOrdersView() {
  const [lines,setLines]           = useState<PurchaseOrderLine[]>([]);
  const [statusFilter,setStatus]   = useState("");
  const [search,setSearch]         = useState("");
  const [loading,setLoading]       = useState(true);
  const [error,setError]           = useState("");

  const load = useCallback(async()=>{
    setLoading(true); setError("");
    try { setLines(await getOpenPurchaseOrders({ status:statusFilter||undefined })); }
    catch { setError("Satınalma siparişleri yüklenemedi"); }
    finally { setLoading(false); }
  },[statusFilter]);

  useEffect(()=>{ load(); },[load]);

  const filtered = search ? lines.filter(l=>
    l.materialCode.toLowerCase().includes(search.toLowerCase())||
    l.materialDescription.toLowerCase().includes(search.toLowerCase())||
    l.vendorName.toLowerCase().includes(search.toLowerCase())
  ) : lines;

  if (error) return <ErrorCard title="Veri yüklenemedi" description={error}/>;

  const lateCount    = lines.filter(l=>l.status==="GECIKEN").length;
  const partialCount = lines.filter(l=>l.status==="KISMI_TESLIM").length;

  return (
    <div className="space-y-5">
      {/* Filtreler */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl"
        style={{ background:"white", border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)" }}>
        <div className="relative">
          <i className="ti ti-search absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true"
            style={{ color:"var(--text3)", fontSize:16 }}/>
          <input type="search" value={search} onChange={e=>setSearch(e.target.value)}
            placeholder="Malzeme veya tedarikçi..." style={{ paddingLeft:40, width:240 }}/>
        </div>
        <select value={statusFilter} onChange={e=>setStatus(e.target.value)} style={{ minWidth:170 }}>
          <option value="">Tüm Durumlar</option>
          <option value="BEKLIYOR">Bekliyor</option>
          <option value="KISMI_TESLIM">Kısmi Teslim</option>
          <option value="GECIKEN">Geciken</option>
          <option value="ONAYDA">Onayda</option>
        </select>
        <div className="flex-1"/>
        {!loading&&(
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-medium" style={{ color:"var(--text2)" }}>{filtered.length} kalem</span>
            {lateCount>0&&<Badge variant="danger">{lateCount} geciken</Badge>}
            {partialCount>0&&<Badge variant="warning">{partialCount} kısmi</Badge>}
          </div>
        )}
        <Button variant="secondary" size="sm" onClick={()=>exportPurchaseOrders(filtered)} disabled={filtered.length===0}>
          <i className="ti ti-download" aria-hidden="true"/> Excel İndir
        </Button>
        <button onClick={load} className="p-2.5 rounded-xl hover:bg-[#F2F2F7] transition-colors"
          style={{ color:"var(--text3)", fontSize:18 }}>
          <i className="ti ti-refresh" aria-hidden="true"/>
        </button>
      </div>

      {/* Tedarikçi kayar kartları */}
      {!loading&&filtered.length>0&&(()=>{
        const vendors = [...new Set(filtered.map(l=>l.vendorName))];
        return (
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wider mb-3" style={{ color:"var(--text3)" }}>
              Tedarikçi bazlı özet
            </p>
            <div className="flex gap-3 overflow-x-auto pb-3" style={{ scrollbarWidth:"thin" }}>
              {vendors.map(v=>{
                const vLines = filtered.filter(l=>l.vendorName===v);
                const hasLate = vLines.some(l=>l.status==="GECIKEN");
                const totalOpen = vLines.reduce((s,l)=>s+l.openQuantity,0);
                return (
                  <div key={v} className="flex-shrink-0 rounded-2xl p-4"
                    style={{ width:200, background:"white",
                      border:`2px solid ${hasLate?"#FF3B30":"var(--border)"}`,
                      boxShadow:"var(--shadow-sm)" }}>
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-[16px] font-bold text-white mb-3"
                      style={{ background:"linear-gradient(135deg,var(--iba-blue),var(--iba-green))" }}>
                      {v.charAt(0)}
                    </div>
                    <p className="text-[13px] font-bold leading-tight" style={{ color:"var(--text)" }}>{v}</p>
                    <p className="text-[12px] mt-1" style={{ color:"var(--text3)" }}>{vLines.length} SAS kalemi</p>
                    {hasLate&&<span className="inline-flex mt-2 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background:"#FFEBE9",color:"#C0392B" }}>⚠ Geciken</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {loading ? <LoadingSpinner/> : filtered.length===0 ? <EmptyState title="Açık satınalma siparişi bulunamadı"/> : (
        <div className="rounded-2xl overflow-hidden" style={{ background:"white", border:"1px solid var(--border)", boxShadow:"var(--shadow-sm)" }}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ tableLayout:"fixed", minWidth:900 }}>
              <colgroup>
                <col style={{ width:110 }}/><col style={{ width:100 }}/><col/>
                <col style={{ width:150 }}/><col style={{ width:100 }}/><col style={{ width:85 }}/>
                <col style={{ width:130 }}/><col style={{ width:100 }}/><col style={{ width:120 }}/>
              </colgroup>
              <thead>
                <tr style={{ borderBottom:"2px solid var(--border)", background:"#FAFAFA" }}>
                  {["SAS No","Malzeme","Tanım","Tedarikçi","Sipariş","Teslim","İlerleme","Termin","Durum"].map(h=>(
                    <th key={h} className="px-4 py-4 text-left text-[12px] font-bold uppercase tracking-wider"
                      style={{ color:"var(--text3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((l,i)=>{
                  const p=pct(l); const late=isLate(l.deliveryDate)&&l.status!=="BEKLIYOR";
                  const s=SC[l.status];
                  return (
                    <tr key={l.id} className="transition-colors hover:bg-[#FAFAFA] anim"
                      style={{ borderBottom:"1px solid var(--border)", animationDelay:`${i*0.03}s`,
                        background:late?"#FFFAF9":"white" }}>
                      <td className="px-4 py-4 font-mono text-[13px]" style={{ color:"var(--text3)" }}>{l.poNumber}</td>
                      <td className="px-4 py-4 font-mono text-[13px] font-semibold" style={{ color:"var(--iba-purple)" }}>{l.materialCode}</td>
                      <td className="px-4 py-4 text-[14px] truncate" style={{ color:"var(--text)" }}>{l.materialDescription}</td>
                      <td className="px-4 py-4 text-[13px] truncate" style={{ color:"var(--text2)" }}>{l.vendorName}</td>
                      <td className="px-4 py-4 text-[14px] font-semibold tabular-nums" style={{ color:"var(--text)" }}>
                        {l.orderedQuantity.toLocaleString("tr-TR")} <span className="text-[12px] font-normal" style={{ color:"var(--text3)" }}>{l.unit}</span>
                      </td>
                      <td className="px-4 py-4 text-[14px] tabular-nums" style={{ color:"var(--text2)" }}>
                        {l.deliveredQuantity.toLocaleString("tr-TR")}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background:"#E5E5EA" }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width:`${p}%`,
                                background:p===0?"#C7C7CC":p<50?"#FF9500":p<100?"#0E86D4":"#34C759" }}/>
                          </div>
                          <span className="text-[12px] font-semibold tabular-nums w-8"
                            style={{ color:"var(--text3)" }}>{p}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[14px] font-semibold tabular-nums"
                        style={{ color:late?"var(--red)":"var(--text)" }}>
                        {late&&"⚠ "}{fmt(l.deliveryDate)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full px-3 py-1 text-[13px] font-semibold"
                          style={{ background:s.bg, color:s.color }}>{s.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
