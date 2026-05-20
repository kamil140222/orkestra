"use client";
import { useState, useEffect, useCallback } from "react";
import { Button, Badge, StatusBadge, LoadingSpinner, EmptyState, ErrorCard } from "@/components/ui";
import { exportSalesOrders } from "@/lib/excel";
import { getRegions, getCustomersByRegion, getOpenOrders } from "../services";
import type { Region, Customer, OrderLine } from "../types";
import { cn } from "@/components/ui/utils";

const fmt = (d: Date|null) => d ? `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()}` : "—";
const isLate = (d: Date|null) => !!d && d < new Date();

export function SalesOrdersView() {
  const [regions, setRegions]         = useState<Region[]>([]);
  const [customers, setCustomers]     = useState<Customer[]>([]);
  const [orders, setOrders]           = useState<OrderLine[]>([]);
  const [selRegion, setSelRegion]     = useState("ALL");
  const [selCustomer, setSelCustomer] = useState("");
  const [statusFilter, setStatus]     = useState("");
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  useEffect(() => { getRegions().then(setRegions); }, []);
  useEffect(() => { setSelCustomer(""); getCustomersByRegion(selRegion).then(setCustomers); }, [selRegion]);

  // Ticker'a filtre ilet
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__tickerFilter = {
        regionId: selRegion !== "ALL" ? selRegion : undefined,
        customerCode: selCustomer || undefined,
        status: statusFilter || undefined,
      };
    }
    return () => { if (typeof window !== "undefined") window.__tickerFilter = undefined; };
  }, [selRegion, selCustomer, statusFilter]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      setOrders(await getOpenOrders({
        regionId: selRegion, customerCode: selCustomer || undefined, status: statusFilter || undefined,
      }));
    } catch { setError("Siparişler yüklenemedi"); }
    finally { setLoading(false); }
  }, [selRegion, selCustomer, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const lateCount  = orders.filter(o => o.status === "GECIKEN").length;
  const readyCount = orders.filter(o => o.status === "SEVKE_HAZIR").length;

  const grouped = customers
    .map(c => ({ customer: c, lines: orders.filter(o => o.customerCode === c.code) }))
    .filter(g => g.lines.length > 0);

  if (error) return <ErrorCard title="Veri yüklenemedi" description={error} />;

  return (
    <div className="space-y-5">
      {/* Filtre çubuğu */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl"
        style={{ background: "white", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <select value={selRegion} onChange={e => setSelRegion(e.target.value)} style={{ minWidth: 160 }}>
          <option value="ALL">Tüm Bölgeler</option>
          {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select value={selCustomer} onChange={e => setSelCustomer(e.target.value)} style={{ minWidth: 200 }}>
          <option value="">Tüm Müşteriler</option>
          {customers.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)} style={{ minWidth: 160 }}>
          <option value="">Tüm Durumlar</option>
          <option value="SEVKE_HAZIR">Sevke Hazır</option>
          <option value="GECIKEN">Geciken</option>
          <option value="URETIMDE">Üretimde</option>
          <option value="PLANLAMA">Planlama</option>
        </select>
        <div className="flex-1" />
        {!loading && (
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold" style={{ color: "var(--text2)" }}>{orders.length} kalem</span>
            {lateCount > 0  && <Badge variant="danger">{lateCount} geciken</Badge>}
            {readyCount > 0 && <Badge variant="success">{readyCount} hazır</Badge>}
          </div>
        )}
        <Button variant="secondary" size="sm" onClick={() => exportSalesOrders(orders)} disabled={orders.length === 0}>
          <i className="ti ti-download" aria-hidden="true" /> Excel İndir
        </Button>
        <button onClick={load} className="p-2.5 rounded-xl hover:bg-[#F2F2F7] transition-colors"
          style={{ color: "var(--text3)", fontSize: 18 }}>
          <i className="ti ti-refresh" aria-hidden="true" />
        </button>
      </div>

      {loading ? <LoadingSpinner /> : orders.length === 0 ? <EmptyState title="Açık sipariş bulunamadı" /> : (
        <>
          {/* Müşteri kayar kartları */}
          {!selCustomer && grouped.length > 0 && (
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text3)" }}>
                Müşteri bazlı özet — karta tıkla filtrele
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
                {grouped.map(({ customer, lines }) => {
                  const hasLate  = lines.some(l => l.status === "GECIKEN");
                  const hasReady = lines.some(l => l.status === "SEVKE_HAZIR");
                  return (
                    <button key={customer.code}
                      onClick={() => setSelCustomer(customer.code)}
                      className="flex-shrink-0 rounded-2xl p-5 text-left transition-all hover:shadow-md active:scale-[0.97]"
                      style={{
                        width: 190,
                        background: "white",
                        border: `2px solid ${hasLate ? "#E24B4A" : hasReady ? "#34C759" : "var(--border)"}`,
                        boxShadow: "var(--shadow-sm)",
                      }}>
                      <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-[20px] font-bold text-white mb-4"
                        style={{ background: "linear-gradient(135deg,var(--iba-purple),var(--iba-blue))" }}>
                        {customer.name.charAt(0)}
                      </div>
                      <p className="text-[15px] font-bold leading-tight" style={{ color: "var(--text)" }}>
                        {customer.name}
                      </p>
                      <p className="text-[12px] mt-1 mb-3" style={{ color: "var(--text3)" }}>#{customer.code}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: "var(--iba-purp-bg)", color: "var(--iba-purple)" }}>
                          {lines.length} kalem
                        </span>
                        {hasLate && (
                          <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: "#FCEBEB", color: "#A32D2D" }}>⚠ Geciken</span>
                        )}
                        {hasReady && !hasLate && (
                          <span className="text-[12px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: "#EAF3DE", color: "#3B6D11" }}>Hazır</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Aktif müşteri filtre chip */}
          {selCustomer && (
            <button onClick={() => setSelCustomer("")}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-semibold transition-colors hover:opacity-80"
              style={{ background: "var(--iba-purp-bg)", color: "var(--iba-purple)" }}>
              <i className="ti ti-x" aria-hidden="true" style={{ fontSize: 14 }} />
              {customers.find(c => c.code === selCustomer)?.name} — filtreyi kaldır
            </button>
          )}

          {/* Tablo */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "white", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ tableLayout: "fixed", minWidth: 800 }}>
                <colgroup>
                  <col style={{ width: 120 }} /><col style={{ width: 100 }} /><col />
                  <col style={{ width: 120 }} /><col style={{ width: 140 }} /><col style={{ width: 110 }} /><col style={{ width: 140 }} />
                </colgroup>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--border)", background: "#FAFAFA" }}>
                    {["Sipariş No","Malzeme","Tanım","Miktar","Müşteri","Termin","Durum"].map(h => (
                      <th key={h} className="px-5 py-4 text-left text-[12px] font-bold uppercase tracking-wider"
                        style={{ color: "var(--text3)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => {
                    const late = isLate(o.deliveryDate) && o.status !== "SEVKE_HAZIR";
                    return (
                      <tr key={o.id}
                        className="transition-colors hover:bg-[#FAFAFA] anim"
                        style={{ borderBottom: "1px solid var(--border)", animationDelay: `${i * 0.03}s`, background: late ? "#FFFAF9" : "white" }}>
                        <td className="px-5 py-4 font-mono text-[13px]" style={{ color: "var(--text3)" }}>{o.salesOrderNumber}</td>
                        <td className="px-5 py-4 font-mono text-[13px] font-bold" style={{ color: "var(--iba-purple)" }}>{o.materialCode}</td>
                        <td className="px-5 py-4 text-[14px] truncate" style={{ color: "var(--text)" }}>{o.materialDescription}</td>
                        <td className="px-5 py-4 text-[15px] font-bold tabular-nums" style={{ color: "var(--text)" }}>
                          {o.quantity.toLocaleString("tr-TR")}
                          <span className="ml-1 text-[12px] font-normal" style={{ color: "var(--text3)" }}>{o.unit}</span>
                        </td>
                        <td className="px-5 py-4 text-[13px] truncate" style={{ color: "var(--text2)" }}>{o.customerName}</td>
                        <td className="px-5 py-4 text-[14px] font-semibold tabular-nums"
                          style={{ color: late ? "var(--red)" : "var(--text)" }}>
                          {late && "⚠ "}{fmt(o.deliveryDate)}
                        </td>
                        <td className="px-5 py-4"><StatusBadge status={o.status as any} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
