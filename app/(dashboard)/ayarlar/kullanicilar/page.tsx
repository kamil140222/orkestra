"use client";
import { useState, useEffect, useCallback } from "react";
import { Card, Button, Badge } from "@/components/ui";
import {
  getUsers, addUser, updateUser, deleteUser,
  ROLE_LABELS, ROLE_COLORS, type ManagedUser,
} from "@/lib/auth/users";
import type { Role } from "@/types";
import { cn } from "@/components/ui/utils";

const ROLES: Role[] = ["CEO", "PLANLAMACI", "DEPO", "IHRACAT"];

type ModalMode = "add" | "edit" | "delete" | null;

interface FormState {
  name: string; email: string; password: string; confirmPassword: string;
  role: Role; region: string; active: boolean;
}

const EMPTY_FORM: FormState = {
  name:"", email:"", password:"", confirmPassword:"",
  role:"PLANLAMACI", region:"", active:true,
};

function fmt(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

const inputCls = "w-full rounded-xl px-4 py-2.5 text-[14px] outline-none transition-colors";
const inputStyle = {
  background:"var(--bg)",
  border:"1px solid var(--border2)",
  color:"var(--os-text)",
};
const labelCls = "block text-[11px] font-semibold uppercase tracking-wider mb-1.5";

export default function KullanicilarPage() {
  const [users, setUsers]           = useState<ManagedUser[]>([]);
  const [modal, setModal]           = useState<ModalMode>(null);
  const [selected, setSelected]     = useState<ManagedUser | null>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");
  const [showPass, setShowPass]     = useState(false);
  const [search, setSearch]         = useState("");

  const reload = useCallback(() => setUsers(getUsers()), []);
  useEffect(() => { reload(); }, [reload]);

  // Flash success
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(t);
  }, [success]);

  function openAdd() {
    setForm(EMPTY_FORM); setError(""); setModal("add"); setSelected(null);
  }
  function openEdit(u: ManagedUser) {
    setForm({ name:u.name, email:u.email, password:"", confirmPassword:"",
      role:u.role, region:u.region||"", active:u.active });
    setError(""); setSelected(u); setModal("edit");
  }
  function openDelete(u: ManagedUser) { setSelected(u); setModal("delete"); }
  function closeModal() { setModal(null); setSelected(null); setError(""); }

  function handleSubmit() {
    setError("");
    if (!form.name.trim()) { setError("Ad Soyad zorunlu."); return; }
    if (!form.email.trim()) { setError("E-posta zorunlu."); return; }
    if (modal==="add" && !form.password) { setError("Şifre zorunlu."); return; }
    if (form.password && form.password !== form.confirmPassword) {
      setError("Şifreler eşleşmiyor."); return;
    }
    if (form.password && form.password.length < 4) {
      setError("Şifre en az 4 karakter olmalı."); return;
    }

    if (modal === "add") {
      const res = addUser({ name:form.name, email:form.email,
        password:form.password, role:form.role, region:form.region||undefined });
      if (!res.ok) { setError(res.error || "Hata."); return; }
      setSuccess(`${form.name} eklendi.`);
    } else if (modal === "edit" && selected) {
      const res = updateUser(selected.id, {
        name:form.name, email:form.email,
        password:form.password || undefined,
        role:form.role, region:form.region||undefined, active:form.active,
      });
      if (!res.ok) { setError(res.error || "Hata."); return; }
      setSuccess(`${form.name} güncellendi.`);
    }
    reload(); closeModal();
  }

  function handleDelete() {
    if (!selected) return;
    const res = deleteUser(selected.id);
    if (!res.ok) { setError(res.error || "Silinemedi."); return; }
    setSuccess(`${selected.name} silindi.`); reload(); closeModal();
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    ROLE_LABELS[u.role].toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 os-animate-in" style={{ maxWidth:1100 }}>
      {/* Başlık */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight" style={{ color:"var(--os-text)" }}>
            Kullanıcı Yönetimi
          </h1>
          <p className="text-[14px] mt-1" style={{ color:"var(--text3)" }}>
            Sisteme erişim hakları ve roller
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={openAdd}>
          <i className="ti ti-user-plus" aria-hidden="true" style={{ fontSize:16 }}/>
          Yeni Kullanıcı
        </Button>
      </div>

      {/* Başarı mesajı */}
      {success && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-3 os-animate-in"
          style={{ background:"var(--iba-green-bg)", border:"1px solid rgba(168,201,35,0.3)" }}>
          <i className="ti ti-circle-check" style={{ color:"var(--iba-green)", fontSize:18 }} aria-hidden="true"/>
          <span className="text-[14px] font-medium" style={{ color:"var(--iba-green)" }}>{success}</span>
        </div>
      )}

      {/* Özet kartlar */}
      <div className="grid grid-cols-4 gap-4">
        {ROLES.map(role => {
          const count = users.filter(u => u.role === role && u.active).length;
          const c = ROLE_COLORS[role];
          return (
            <Card key={role} className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center text-[15px]"
                  style={{ background:c.bg, color:c.color }}>
                  <i className="ti ti-user" aria-hidden="true"/>
                </div>
                <span className="text-[12px] font-semibold" style={{ color:"var(--text2)" }}>
                  {ROLE_LABELS[role]}
                </span>
              </div>
              <p className="text-4xl font-bold" style={{ color:c.color }}>{count}</p>
              <p className="text-[12px] mt-1" style={{ color:"var(--text3)" }}>aktif kullanıcı</p>
            </Card>
          );
        })}
      </div>

      {/* Arama + tablo */}
      <Card className="overflow-hidden p-0">
        {/* Tablo başlığı */}
        <div className="flex items-center gap-4 px-6 py-4"
          style={{ borderBottom:"1px solid var(--border)", background:"var(--bg)" }}>
          <div className="relative flex-1 max-w-xs">
            <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true" style={{ color:"var(--text3)", fontSize:14 }}/>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Kullanıcı veya rol ara..."
              className={inputCls} style={{ ...inputStyle, paddingLeft:36 } as any}/>
          </div>
          <span className="text-[13px]" style={{ color:"var(--text3)" }}>
            {filtered.length} kullanıcı
          </span>
        </div>

        {/* Tablo */}
        <table className="w-full">
          <thead>
            <tr style={{ borderBottom:"1px solid var(--border)" }}>
              {["Kullanıcı","E-posta","Rol","Durum","Son Giriş",""].map(h => (
                <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color:"var(--text3)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u, i) => {
              const rc = ROLE_COLORS[u.role];
              return (
                <tr key={u.id} className="os-animate-in transition-colors hover:bg-white/[0.02]"
                  style={{ borderBottom:"1px solid var(--border)",
                    animationDelay:`${i*0.04}s`,
                    opacity: u.active ? 1 : 0.5 }}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full flex items-center justify-center text-[14px] font-bold flex-shrink-0"
                        style={{ background:`linear-gradient(135deg,${rc.color}44,${rc.color}88)`, color:rc.color }}>
                        {u.name.charAt(0)}
                      </div>
                      <span className="text-[14px] font-semibold" style={{ color:"var(--os-text)" }}>
                        {u.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[13px]" style={{ color:"var(--text2)" }}>
                    {u.email}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[12px] font-semibold px-3 py-1 rounded-full"
                      style={{ background:rc.bg, color:rc.color }}>
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full"
                        style={{ background: u.active ? "var(--iba-green)" : "var(--text3)",
                          animation: u.active ? "os-pulse 2s ease-in-out infinite" : undefined }}/>
                      <span className="text-[13px]" style={{ color: u.active ? "var(--iba-green)" : "var(--text3)" }}>
                        {u.active ? "Aktif" : "Pasif"}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[13px]" style={{ color:"var(--text3)" }}>
                    {fmt(u.lastLogin)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(u)}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-white/[0.08]"
                        style={{ color:"var(--text2)" }}>
                        <i className="ti ti-edit" aria-hidden="true"/>
                        Düzenle
                      </button>
                      <button onClick={() => openDelete(u)}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-medium transition-colors"
                        style={{ color:"var(--red)", background:"var(--red-bg)" }}>
                        <i className="ti ti-trash" aria-hidden="true"/>
                        Sil
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* ── MODAL ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background:"rgba(0,0,0,0.7)", backdropFilter:"blur(6px)" }}
          onClick={e => e.target === e.currentTarget && closeModal()}>

          <div className="w-full max-w-md os-animate-in rounded-2xl overflow-hidden"
            style={{ background:"white", border:"1px solid var(--border2)" }}>

            {/* Modal başlık */}
            <div className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom:"1px solid var(--border)" }}>
              <div>
                <h2 className="text-[18px] font-bold" style={{ color:"var(--os-text)" }}>
                  {modal==="add" ? "Yeni Kullanıcı Ekle"
                    : modal==="edit" ? "Kullanıcıyı Düzenle"
                    : "Kullanıcıyı Sil"}
                </h2>
                {selected && modal==="edit" && (
                  <p className="text-[13px] mt-0.5" style={{ color:"var(--text3)" }}>
                    {selected.email}
                  </p>
                )}
              </div>
              <button onClick={closeModal}
                className="h-8 w-8 flex items-center justify-center rounded-xl transition-colors hover:bg-white/[0.08]"
                style={{ color:"var(--text3)", fontSize:18 }}>
                ×
              </button>
            </div>

            {/* Modal içerik */}
            <div className="px-6 py-5">
              {modal === "delete" ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-4 p-4 rounded-xl"
                    style={{ background:"var(--red-bg)", border:"1px solid rgba(255,69,58,0.2)" }}>
                    <i className="ti ti-alert-triangle" style={{ color:"var(--red)", fontSize:24 }} aria-hidden="true"/>
                    <div>
                      <p className="text-[14px] font-semibold" style={{ color:"var(--red)" }}>
                        Bu işlem geri alınamaz
                      </p>
                      <p className="text-[13px] mt-1" style={{ color:"var(--text2)" }}>
                        <strong>{selected?.name}</strong> ({selected?.email}) kalıcı olarak silinecek.
                      </p>
                    </div>
                  </div>
                  {error && <p className="text-[13px]" style={{ color:"var(--red)" }}>{error}</p>}
                  <div className="flex gap-3 pt-1">
                    <Button variant="secondary" size="lg" onClick={closeModal} className="flex-1">
                      İptal
                    </Button>
                    <button onClick={handleDelete}
                      className="flex-1 rounded-xl py-2.5 text-[14px] font-bold text-white transition-all active:scale-[0.97]"
                      style={{ background:"var(--red)", boxShadow:"0 4px 14px rgba(255,69,58,0.3)" }}>
                      Evet, Sil
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Ad Soyad */}
                  <div>
                    <label className={labelCls} style={{ color:"var(--text3)" }}>Ad Soyad</label>
                    <input type="text" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name:e.target.value }))}
                      placeholder="Örn: Ahmet Yılmaz"
                      className={inputCls} style={inputStyle as any}/>
                  </div>

                  {/* E-posta */}
                  <div>
                    <label className={labelCls} style={{ color:"var(--text3)" }}>E-posta</label>
                    <input type="email" value={form.email}
                      onChange={e => setForm(f => ({ ...f, email:e.target.value }))}
                      placeholder="kullanici@iba.com.tr"
                      className={inputCls} style={inputStyle as any}/>
                  </div>

                  {/* Rol */}
                  <div>
                    <label className={labelCls} style={{ color:"var(--text3)" }}>Rol</label>
                    <select value={form.role}
                      onChange={e => setForm(f => ({ ...f, role:e.target.value as Role }))}
                      className={inputCls} style={inputStyle as any}>
                      {ROLES.map(r => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>

                  {/* Şifre */}
                  <div>
                    <label className={labelCls} style={{ color:"var(--text3)" }}>
                      {modal==="edit" ? "Yeni Şifre (boş bırakırsan değişmez)" : "Şifre"}
                    </label>
                    <div className="relative">
                      <input type={showPass ? "text" : "password"} value={form.password}
                        onChange={e => setForm(f => ({ ...f, password:e.target.value }))}
                        placeholder={modal==="edit" ? "Değiştirmek için yaz..." : "Min. 4 karakter"}
                        className={inputCls} style={{ ...inputStyle, paddingRight:44 } as any}/>
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
                        style={{ color:"var(--text3)", fontSize:16 }}>
                        <i className={`ti ${showPass ? "ti-eye-off" : "ti-eye"}`} aria-hidden="true"/>
                      </button>
                    </div>
                  </div>

                  {/* Şifre tekrar */}
                  {(modal==="add" || form.password) && (
                    <div>
                      <label className={labelCls} style={{ color:"var(--text3)" }}>Şifre Tekrar</label>
                      <input type={showPass ? "text" : "password"} value={form.confirmPassword}
                        onChange={e => setForm(f => ({ ...f, confirmPassword:e.target.value }))}
                        placeholder="Aynı şifreyi gir"
                        className={inputCls} style={inputStyle as any}/>
                    </div>
                  )}

                  {/* Durum (sadece düzenlemede) */}
                  {modal==="edit" && (
                    <div className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ background:"var(--bg)", border:"1px solid var(--border)" }}>
                      <div>
                        <p className="text-[14px] font-medium" style={{ color:"var(--os-text)" }}>Hesap Durumu</p>
                        <p className="text-[12px]" style={{ color:"var(--text3)" }}>
                          {form.active ? "Kullanıcı sisteme giriş yapabilir" : "Giriş engellendi"}
                        </p>
                      </div>
                      <button onClick={() => setForm(f => ({ ...f, active:!f.active }))}
                        className="relative h-7 w-12 rounded-full transition-colors flex-shrink-0"
                        style={{ background: form.active ? "var(--iba-purple)" : "var(--bg)",
                          border:"1px solid var(--border2)" }}>
                        <span className="absolute top-0.5 h-6 w-6 rounded-full transition-transform"
                          style={{ background:"white",
                            transform: form.active ? "translateX(22px)" : "translateX(2px)" }}/>
                      </button>
                    </div>
                  )}

                  {/* Hata */}
                  {error && (
                    <p className="text-[13px] font-medium" style={{ color:"var(--red)" }}>
                      ⚠ {error}
                    </p>
                  )}

                  {/* Butonlar */}
                  <div className="flex gap-3 pt-2">
                    <Button variant="secondary" size="lg" onClick={closeModal} className="flex-1">
                      İptal
                    </Button>
                    <button onClick={handleSubmit}
                      className="flex-1 rounded-xl py-2.5 text-[14px] font-bold text-white transition-all active:scale-[0.97]"
                      style={{ background:"var(--iba-purple)", boxShadow:"0 4px 14px rgba(91,63,160,0.3)" }}>
                      {modal==="add" ? "Kullanıcı Ekle" : "Kaydet"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
