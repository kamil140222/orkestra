// ─── lib/auth/ldap.ts ─────────────────────────────────────────────────────
// Active Directory kimlik doğrulama — iba.local domain
// Sunucu tarafında çalışır (API route). Tarayıcıya gönderilmez.
// Kullanıcı Windows şifresiyle giriş yapar, ayrı şifre gerekmez.

import ldap from "ldapjs";
import type { Role } from "@/types";

// ── AD Yapılandırması ──────────────────────────────────────────────────────
const AD_CONFIG = {
  url:        process.env.AD_URL        || "ldap://10.1.1.4:389",
  url2:       process.env.AD_URL2       || "ldap://10.1.5.4:389",  // yedek DC
  baseDN:     process.env.AD_BASE_DN    || "DC=iba,DC=local",
  domain:     process.env.AD_DOMAIN     || "iba.local",
  // Grup → Rol eşlemesi (AD'de bu gruplar yoksa manuel rol ataması kullanılır)
  groupMap: {
    "CN=OrkSefi-CEO,OU=Groups,DC=iba,DC=local":        "CEO",
    "CN=OrkSefi-Planlamaci,OU=Groups,DC=iba,DC=local": "PLANLAMACI",
    "CN=OrkSefi-Depo,OU=Groups,DC=iba,DC=local":       "DEPO",
    "CN=OrkSefi-Ihracat,OU=Groups,DC=iba,DC=local":    "IHRACAT",
  } as Record<string, Role>,
};

export interface ADUser {
  id: string;
  name: string;
  email: string;
  username: string;   // sAMAccountName (iba40)
  role: Role;
  department?: string;
}

// ── LDAP bind (kimlik doğrulama) ───────────────────────────────────────────
function createClient(url: string): ldap.Client {
  return ldap.createClient({
    url,
    timeout: 5000,
    connectTimeout: 5000,
    tlsOptions: { rejectUnauthorized: false },
  });
}

function bindAsync(client: ldap.Client, dn: string, password: string): Promise<void> {
  return new Promise((resolve, reject) => {
    client.bind(dn, password, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function searchAsync(
  client: ldap.Client,
  base: string,
  opts: ldap.SearchOptions
): Promise<ldap.SearchEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: ldap.SearchEntry[] = [];
    client.search(base, opts, (err, res) => {
      if (err) { reject(err); return; }
      res.on("searchEntry", e => entries.push(e));
      res.on("error",       e => reject(e));
      res.on("end",         () => resolve(entries));
    });
  });
}

// ── Kullanıcı bilgilerini AD'den çek ──────────────────────────────────────
async function fetchUserInfo(
  client: ldap.Client,
  username: string
): Promise<{ displayName: string; email: string; groups: string[]; objectGUID: string }> {
  const entries = await searchAsync(client, AD_CONFIG.baseDN, {
    filter: `(sAMAccountName=${username.replace(/[*()\\\x00]/g, "")})`,
    scope: "sub",
    attributes: ["displayName", "mail", "memberOf", "objectGUID", "department"],
  });

  if (entries.length === 0) throw new Error("Kullanıcı AD'de bulunamadı");

  const entry = entries[0];
  const attrs = entry.attributes;
  const get = (name: string) => {
    const attr = attrs.find((a: any) => a.type === name);
    return attr ? (Array.isArray(attr.values) ? attr.values[0] : attr.values) : undefined;
  };
  const getAll = (name: string): string[] => {
    const attr = attrs.find((a: any) => a.type === name);
    if (!attr) return [];
    return Array.isArray(attr.values) ? attr.values : [attr.values];
  };

  const displayName = String(get("displayName") || username);
  const email       = String(get("mail") || `${username}@iba.local`);
  const memberOf    = getAll("memberOf");
  const objectGUID  = String(get("objectGUID") || username);

  return { displayName, email, groups: memberOf, objectGUID };
}

// ── Grup → Rol çözümleme ──────────────────────────────────────────────────
function resolveRole(groups: string[], username: string): Role {
  for (const group of groups) {
    const role = AD_CONFIG.groupMap[group];
    if (role) return role;
  }
  // AD grubu yoksa kullanıcı DB'den manuel role bak
  // Varsayılan: PLANLAMACI (en kısıtlı)
  return "PLANLAMACI";
}

// ── Ana doğrulama fonksiyonu ───────────────────────────────────────────────
export async function authenticateWithAD(
  username: string,
  password: string
): Promise<{ ok: true; user: ADUser } | { ok: false; error: string }> {
  // username hem "iba40" hem "iba\iba40" hem "iba40@iba.local" formatında gelebilir
  const cleanUsername = username
    .replace(/^.*\\/, "")   // "IBA\iba40" → "iba40"
    .replace(/@.*$/, "");   // "iba40@iba.local" → "iba40"

  // UPN formatı ile bind (daha güvenilir)
  const upn = `${cleanUsername}@${AD_CONFIG.domain}`;

  // Primary DC dene, başarısız olursa secondary
  for (const url of [AD_CONFIG.url, AD_CONFIG.url2]) {
    const client = createClient(url);
    try {
      // 1. Kullanıcı şifresiyle bind — bu başarılıysa kimlik doğrulandı
      await bindAsync(client, upn, password);

      // 2. Kullanıcı bilgilerini çek
      const info = await fetchUserInfo(client, cleanUsername);

      // 3. Rol belirle
      const role = resolveRole(info.groups, cleanUsername);

      client.unbind();
      return {
        ok: true,
        user: {
          id:         info.objectGUID,
          name:       info.displayName,
          email:      info.email,
          username:   cleanUsername,
          role,
        },
      };
    } catch (err: unknown) {
      client.unbind?.();
      const msg = err instanceof Error ? err.message : String(err);

      // Şifre hatalı / hesap kilitli
      if (msg.includes("InvalidCredentials") || msg.includes("49")) {
        return { ok: false, error: "Kullanıcı adı veya şifre hatalı." };
      }
      if (msg.includes("AccountLocked") || msg.includes("775")) {
        return { ok: false, error: "Hesabınız kilitlenmiş. IT ile iletişime geçin." };
      }
      if (msg.includes("PasswordExpired") || msg.includes("532")) {
        return { ok: false, error: "Şifrenizin süresi dolmuş. Windows şifrenizi yenileyin." };
      }

      // Bağlantı hatası → diğer DC'yi dene
      console.error(`[LDAP] ${url} bağlantı hatası:`, msg);
      continue;
    }
  }

  return { ok: false, error: "AD sunucusuna bağlanılamadı. Ağ bağlantınızı kontrol edin." };
}
