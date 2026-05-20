// ─── lib/db/mssql.ts ──────────────────────────────────────────────────────
// SQL Server bağlantı havuzu — sunucu tarafında çalışır.
// Anayasa: ApplicationIntent=ReadOnly, WITH (NOLOCK) her sorguda.

import sql from "mssql";

const config: sql.config = {
  server:   process.env.DB_SERVER   ?? "COMMONDBS",
  database: process.env.DB_DATABASE ?? "commondb",
  user:     process.env.DB_USER     ?? "",
  password: process.env.DB_PASSWORD ?? "",
  options: {
    encrypt:                false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10, min: 0, idleTimeoutMillis: 30000,
  },
  connectionTimeout: 15000,
  requestTimeout:    30000,
};

// Global singleton pool — Next.js hot reload'da tekrar bağlanmasın
declare global {
  // eslint-disable-next-line no-var
  var _mssqlPool: sql.ConnectionPool | undefined;
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (global._mssqlPool?.connected) return global._mssqlPool;

  const pool = new sql.ConnectionPool(config);
  await pool.connect();
  global._mssqlPool = pool;
  return pool;
}

/** Anayasa: ön sıfır temizle */
export function stripZeros(code: string): string {
  return code?.trimStart().replace(/^0+/, "") || "0";
}

/** Anayasa: SAP CHAR(8) → DD.MM.YYYY */
export function parseSapDate(raw: string | number | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s === "00000000" || s.length !== 8) return null;
  return `${s.slice(6, 8)}.${s.slice(4, 6)}.${s.slice(0, 4)}`;
}
