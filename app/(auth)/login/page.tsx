"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDefaultRedirectForRole } from "@/lib/auth";
import type { Role } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleLogin(e:React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/login",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok||!data.ok) { setError(data.error||"Giriş başarısız."); setLoading(false); return; }
      document.cookie=`orkestra_token=${data.token}; path=/; SameSite=Strict`;
      router.push(getDefaultRedirectForRole(data.user.role as Role));
    } catch { setError("Sunucuya bağlanılamadı."); setLoading(false); }
  }

  return (
    <div className="min-h-screen flex" style={{ background:"#F2F2F7" }}>
      {/* Sol panel — IBA renk bloğu */}
      <div className="hidden lg:flex flex-col items-center justify-center w-2/5 p-12"
        style={{ background:"linear-gradient(160deg,var(--iba-purple) 0%,#3A2575 100%)" }}>
        <img src="/iba-logo.jpg" alt="IBA Kimya"
          style={{ width:280, objectFit:"contain", filter:"brightness(0) invert(1)", marginBottom:40 }}/>
        <h2 className="text-[28px] font-bold text-white text-center leading-snug">
          Karar Destek Sistemi
        </h2>
        <p className="text-[16px] text-white/60 text-center mt-3 leading-relaxed">
          SAP ERP verilerinden beslenen<br/>modern fabrika yönetim portalı
        </p>
        <div className="flex gap-3 mt-10">
          {["Satış","Üretim","Depo","Kalite"].map(m=>(
            <span key={m} className="px-4 py-2 rounded-full text-[13px] font-semibold"
              style={{ background:"rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.9)" }}>{m}</span>
          ))}
        </div>
      </div>

      {/* Sağ panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[420px] anim">
          {/* Logo (mobil + sağda) */}
          <div className="flex justify-center mb-10">
            <img src="/iba-logo.jpg" alt="IBA Kimya"
              style={{ height:64, objectFit:"contain" }}/>
          </div>

          <h1 className="text-[28px] font-bold mb-1" style={{ color:"var(--text)" }}>Giriş Yap</h1>
          <p className="text-[15px] mb-8" style={{ color:"var(--text2)" }}>
            Kullanıcı bilgilerinizle devam edin
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[13px] font-semibold mb-2" style={{ color:"var(--text2)" }}>
                E-posta veya Kullanıcı Adı
              </label>
              <input type="text" value={username} onChange={e=>setUsername(e.target.value)}
                placeholder="kullanici@iba.com.tr" required style={{ width:"100%" }}/>
            </div>
            <div>
              <label className="block text-[13px] font-semibold mb-2" style={{ color:"var(--text2)" }}>
                Şifre
              </label>
              <div className="relative">
                <input type={showPass?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)}
                  placeholder="••••••••" required style={{ width:"100%", paddingRight:48 }}/>
                <button type="button" onClick={()=>setShowPass(v=>!v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 hover:opacity-60 transition-opacity"
                  style={{ color:"var(--text3)", fontSize:18 }}>
                  <i className={`ti ${showPass?"ti-eye-off":"ti-eye"}`} aria-hidden="true"/>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3"
                style={{ background:"var(--red-bg)", border:"1px solid rgba(255,59,48,0.2)" }}>
                <i className="ti ti-alert-circle" style={{ color:"var(--red)", fontSize:16 }} aria-hidden="true"/>
                <p className="text-[14px]" style={{ color:"var(--red)" }}>{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full rounded-2xl py-3.5 text-[16px] font-bold text-white transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              style={{ background:"var(--iba-purple)", boxShadow:"0 4px 16px rgba(91,63,160,0.35)" }}>
              {loading ? <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"/>Giriş yapılıyor...</> : "Giriş Yap"}
            </button>
          </form>

          {process.env.NODE_ENV==="development" && (
            <div className="mt-6 rounded-2xl p-4"
              style={{ background:"white", border:"1px solid var(--border)" }}>
              <p className="text-[12px] font-bold uppercase tracking-wider mb-3" style={{ color:"var(--text3)" }}>
                Test Hesapları
              </p>
              {[["ceo@orkestra.local","ceo123","CEO"],
                ["planlamaci@orkestra.local","plan123","Planlamacı"],
                ["depo@orkestra.local","depo123","Depo"],
                ["ihracat@orkestra.local","ihracat123","İhracat"],
              ].map(([e,p,r])=>(
                <button key={e} type="button" onClick={()=>{ setUsername(e); setPassword(p); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[13px] transition-colors hover:bg-[#F2F2F7]"
                  style={{ color:"var(--text)" }}>
                  <span className="font-semibold px-2.5 py-1 rounded-full text-[12px]"
                    style={{ background:"var(--iba-purp-bg)", color:"var(--iba-purple)" }}>{r}</span>
                  <span style={{ color:"var(--text3)" }}>{e}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
