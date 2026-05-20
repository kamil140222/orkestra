// ─── app/api/auth/login/route.ts ──────────────────────────────────────────
// Login API endpoint. Sunucu tarafında çalışır.
// 1. AD_ENABLED=true ise önce Active Directory'ye dener
// 2. AD başarısız veya kapalıysa yerel kullanıcı DB'ye döner
// Bu sayede geliştirme/test ortamında AD olmadan da çalışır.

import { NextRequest, NextResponse } from "next/server";
import { verifyUser } from "@/lib/auth/users";

// AD entegrasyonu — sadece sunucuda
let adAuth: typeof import("@/lib/auth/ldap").authenticateWithAD | null = null;
if (process.env.AD_ENABLED === "true") {
  import("@/lib/auth/ldap").then(m => { adAuth = m.authenticateWithAD; });
}

export async function POST(req: NextRequest) {
  const { username, password } = await req.json() as {
    username: string; password: string;
  };

  if (!username?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Kullanıcı adı ve şifre gerekli." }, { status: 400 });
  }

  // ── 1. Active Directory dene ──────────────────────────────────────────
  if (process.env.AD_ENABLED === "true" && adAuth) {
    const result = await adAuth(username, password);

    if (result.ok) {
      const { user } = result;
      // Kullanıcı DB'de kayıtlı değilse otomatik oluştur (ilk giriş)
      const token = Buffer.from(JSON.stringify({
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      })).toString("base64");

      return NextResponse.json({ ok: true, token, user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
      }});
    }

    // AD hata döndürdüyse (şifre hatalı vb.) — yerel DB'ye geçme, hata göster
    if (result.error !== "AD sunucusuna bağlanılamadı. Ağ bağlantınızı kontrol edin.") {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Bağlantı hatası → yerel DB'ye fallback (ağ yokken çalışsın)
    console.warn("[Auth] AD bağlantısı başarısız, yerel kullanıcıya dönülüyor.");
  }

  // ── 2. Yerel kullanıcı DB ─────────────────────────────────────────────
  // E-posta veya kullanıcı adıyla ara
  const email = username.includes("@") ? username : `${username}@orkestra.local`;
  const user = verifyUser(email, password) || verifyUser(username, password);

  if (!user) {
    return NextResponse.json({ error: "Kullanıcı adı veya şifre hatalı." }, { status: 401 });
  }

  const token = Buffer.from(JSON.stringify(user)).toString("base64");
  return NextResponse.json({ ok: true, token, user });
}
