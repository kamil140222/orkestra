"use client";
// ─── modules/sd/components/IBSASView.tsx ──────────────────────────────────
// IB Grubu şirketlerarası açık satınalma siparişleri.
// Buyer seçilir → SAS listesi gelir (FastAPI veya mock).

import { useState, useEffect, useCallback } from "react";
import { Card, Button, Badge, LoadingSpinner, EmptyState, ErrorCard } from "@/components/ui";
import { fetchOpenSAS, fetchVendors, COMPANIES, type Company, type SASLine, type Vendor } from "@/lib/api/sas";
import { cn } from "@/components/ui/utils";
import * as XLSX from "xlsx";

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  "TEYİTLİ":    { label: "Teyitli",     bg: "#EAF3DE", color: "#3B6D11" },
  "KISMİ TEYİT":{ label: "Kısmi Teyit", bg: "#FAEEDA", color: "#633806" },
  "TEYİTSİZ":   { label: "Teyitsiz",    bg: "#FCEBEB", color: "#A32D2D" },
};

const fmt = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 3 });

function pct(line: SASLine) {
  if (line.planlanan_miktar === 0) return 0;
  return Math.round((line.gonderilen_miktar / line.planlanan_miktar) * 100);
}

function exportToExcel(items: SASLine[], buyer: string) {
  const rows = items.map(l => ({
    "SAS No":           l.sas_no,
    "Kalem":            l.kalem_no,
    "Malzeme":          l.malzeme,
    "Tanım":            l.malzeme_tanimi,
    "Alıcı":            l.buyer,
    "Tedarikçi":        l.vendor,
    "Açık Miktar":      l.acik_miktar,
    "Teyitli Miktar":   l.teyitli_acik_miktar,
    "Planlanan":        l.planlanan_miktar,
    "Gönderilen":       l.gonderilen_miktar,
    "Teslim Tarihi":    l.teslim_tarihi ?? "—",
    "Durum":            l.durum,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const cols = Object.keys(rows[0] ?? {}).map(k => ({
    wch: Math.max(k.length, ...rows.map(r => String((r as Record<string,unknown>)[k] ?? "").length)) + 2,
  }));
  ws["!cols"] = cols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Açık SAS");

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  XLSX.writeFile(wb, `Acik_SAS_${buyer}_${stamp}.xlsx`);
}

export function IBSASView() {
  const [buyer, setBuyer]         = useState<Company>("IB10");
  const [vendor, setVendor]       = useState("");
  const [statusFilter, setStatus] = useState("");
  const [vendors, setVendors]     = useState<Vendor[]>([]);
  const [data, setData]           = useState<{ items: SASLine[]; teyitli: number; kismi_teyit: number; teyitsiz: number; generated_at: string } | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // Buyer değişince vendor listesini çek
  useEffect(() => {
    setVendor("");
    fetchVendors(buyer).then(setVendors);
  }, [buyer]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetchOpenSAS(buyer, vendor, statusFilter);
      setData(res);
    } catch (e) {
      setError("Veri yüklenemedi. FastAPI servisi çalışıyor mu?");
    } finally {
      setLoading(false);
    }
  }, [buyer, vendor, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      {/* Buyer seçici — iOS pill tarzı */}
      <div>
        <p className="text-[12px] font-bold uppercase tracking-wider mb-3"
          style={{ color: "var(--text3)" }}>Şirket Seçimi</p>
        <div className="flex gap-2">
          {COMPANIES.map(c => (
            <button key={c} onClick={() => setBuyer(c)}
              className="flex flex-col items-center rounded-2xl px-5 py-3 transition-all font-semibold"
              style={buyer === c
                ? { background: "var(--iba-purple)", color: "white", boxShadow: "0 4px 12px rgba(91,63,160,0.35)" }
                : { background: "white", color: "var(--text2)", border: "1.5px solid var(--border)" }
              }>
              <span className="text-[18px] font-bold">{c}</span>
              <span className="text-[11px] opacity-70 mt-0.5">
                {c === "IB10" ? "Yurtiçi" : c === "IB80" ? "İhracat" : "Grup"}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* KPI kartlar */}
      {data && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Toplam Kalem",  value: data.items.length,  color: "var(--iba-blue)",   icon: "ti-shopping-cart" },
            { label: "Teyitli",       value: data.teyitli,        color: "var(--iba-green)",  icon: "ti-circle-check" },
            { label: "Kısmi Teyit",   value: data.kismi_teyit,    color: "var(--amber)",      icon: "ti-alert-circle" },
            { label: "Teyitsiz",      value: data.teyitsiz,       color: "var(--red)",        icon: "ti-circle-x" },
          ].map(k => (
            <div key={k.label} className="card p-5 flex flex-col items-center text-center anim">
              <i className={`ti ${k.icon}`} aria-hidden="true"
                style={{ fontSize: 28, color: k.color, marginBottom: 10 }} />
              <p className="text-[44px] font-bold tracking-tight leading-none"
                style={{ color: k.color }}>{k.value}</p>
              <p className="text-[13px] font-semibold mt-2 uppercase tracking-wider"
                style={{ color: "var(--text2)" }}>{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtre çubuğu */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl"
        style={{ background: "white", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
        <select value={vendor} onChange={e => setVendor(e.target.value)} style={{ minWidth: 220 }}>
          <option value="">Tüm Tedarikçiler</option>
          {vendors.map(v => (
            <option key={v.code} value={v.code}>{v.name} ({v.code})</option>
          ))}
        </select>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)} style={{ minWidth: 170 }}>
          <option value="">Tüm Durumlar</option>
          <option value="TEYİTLİ">Teyitli</option>
          <option value="KISMİ TEYİT">Kısmi Teyit</option>
          <option value="TEYİTSİZ">Teyitsiz</option>
        </select>
        <div className="flex-1" />
        {data && (
          <p className="text-[13px]" style={{ color: "var(--text3)" }}>
            Son güncelleme: {data.generated_at}
          </p>
        )}
        <Button variant="secondary" size="sm"
          onClick={() => items.length > 0 && exportToExcel(items, buyer)}
          disabled={items.length === 0}>
          <i className="ti ti-download" aria-hidden="true" /> Excel İndir
        </Button>
        <button onClick={load}
          className="p-2.5 rounded-xl hover:bg-[#F2F2F7] transition-colors"
          style={{ color: "var(--text3)", fontSize: 18 }}>
          <i className="ti ti-refresh" aria-hidden="true" />
        </button>
      </div>

      {error && <ErrorCard title="Servis hatası" description={error} />}

      {loading ? <LoadingSpinner /> : items.length === 0 ? (
        <EmptyState title="Açık satınalma siparişi bulunamadı"
          description={`${buyer} için seçili kriterlere uygun kayıt yok`} />
      ) : (
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "white", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ tableLayout: "fixed", minWidth: 960 }}>
              <colgroup>
                <col style={{ width: 120 }} /><col style={{ width: 60 }} />
                <col style={{ width: 100 }} /><col />
                <col style={{ width: 110 }} /><col style={{ width: 110 }} />
                <col style={{ width: 130 }} /><col style={{ width: 100 }} /><col style={{ width: 130 }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)", background: "#FAFAFA" }}>
                  {["SAS No","K","Malzeme","Tanım","Açık Miktar","Teyitli","İlerleme","Teslim","Durum"].map(h => (
                    <th key={h} className="px-4 py-4 text-left text-[12px] font-bold uppercase tracking-wider"
                      style={{ color: "var(--text3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((line, i) => {
                  const p = pct(line);
                  const s = STATUS_CFG[line.durum] ?? STATUS_CFG["TEYİTSİZ"];
                  const isLate = line.teslim_tarihi
                    ? new Date(line.teslim_tarihi.split(".").reverse().join("-")) < new Date()
                    : false;

                  return (
                    <tr key={`${line.sas_no}-${line.kalem_no}-${i}`}
                      className="transition-colors hover:bg-[#FAFAFA] anim"
                      style={{
                        borderBottom: "1px solid var(--border)",
                        animationDelay: `${i * 0.025}s`,
                        background: line.durum === "TEYİTSİZ" && isLate ? "#FFFAF9" : "white",
                      }}>
                      <td className="px-4 py-4 font-mono text-[13px] font-semibold"
                        style={{ color: "var(--iba-purple)" }}>{line.sas_no}</td>
                      <td className="px-4 py-4 text-[13px] font-semibold text-center"
                        style={{ color: "var(--text3)" }}>{line.kalem_no}</td>
                      <td className="px-4 py-4 font-mono text-[13px] font-bold"
                        style={{ color: "var(--iba-blue)" }}>{line.malzeme}</td>
                      <td className="px-4 py-4 text-[14px] truncate" style={{ color: "var(--text)" }}>
                        {line.malzeme_tanimi}
                      </td>
                      <td className="px-4 py-4 text-[15px] font-bold tabular-nums"
                        style={{ color: "var(--text)" }}>
                        {fmt(line.acik_miktar)}
                      </td>
                      <td className="px-4 py-4 text-[14px] font-semibold tabular-nums"
                        style={{ color: line.teyitli_acik_miktar > 0 ? "#3B6D11" : "var(--text3)" }}>
                        {fmt(line.teyitli_acik_miktar)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full overflow-hidden"
                            style={{ background: "var(--bg3)" }}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${p}%`,
                                background: p === 100 ? "#34C759" : p > 0 ? "#FF9500" : "#E5E5EA",
                              }} />
                          </div>
                          <span className="text-[12px] font-bold tabular-nums w-8 text-right"
                            style={{ color: "var(--text3)" }}>%{p}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[14px] font-semibold tabular-nums"
                        style={{ color: isLate && line.durum !== "TEYİTLİ" ? "var(--red)" : "var(--text)" }}>
                        {isLate && line.durum !== "TEYİTLİ" && <span className="mr-1">⚠</span>}
                        {line.teslim_tarihi ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full px-3 py-1 text-[12px] font-bold"
                          style={{ background: s.bg, color: s.color }}>
                          {s.label}
                        </span>
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
