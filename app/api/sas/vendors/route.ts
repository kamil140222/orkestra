// ─── app/api/sas/vendors/route.ts ─────────────────────────────────────────
import { NextRequest, NextResponse } from "next/server";
import { getPool, stripZeros } from "@/lib/db/mssql";

const VALID_BUYERS = new Set(["IB10", "IB20", "IB70", "IB80"]);

const MOCK_VENDORS: Record<string, { code: string; name: string }[]> = {
  IB10: [
    { code: "V001", name: "Polimer Tedarik A.Ş." },
    { code: "V002", name: "Metalsan Çelik San." },
    { code: "V003", name: "Alümet Profil Ltd." },
    { code: "V004", name: "ChemSupply GmbH" },
  ],
  IB80: [
    { code: "V005", name: "Euro Parts GmbH" },
  ],
};

export async function GET(req: NextRequest) {
  const buyer = req.nextUrl.searchParams.get("buyer")?.toUpperCase() ?? "";

  if (!VALID_BUYERS.has(buyer)) {
    return NextResponse.json({ vendors: [] });
  }

  if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
    return NextResponse.json({ vendors: MOCK_VENDORS[buyer] ?? [] });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("buyer", buyer)
      .query(`
        SELECT DISTINCT KO.LIFNR, ISNULL(LFA1.NAME1, KO.LIFNR) AS NAME1
        FROM      IBASAP.IBA.iba.EKKO KO  WITH (NOLOCK)
        LEFT JOIN IBASAP.IBA.iba.LFA1 LFA1 WITH (NOLOCK) ON KO.LIFNR = LFA1.LIFNR
        WHERE KO.BUKRS = @buyer AND KO.BSART = 'IBAA' AND KO.LOEKZ = ' '
        ORDER BY NAME1
      `);

    return NextResponse.json({
      vendors: result.recordset.map(r => ({
        code: stripZeros(String(r.LIFNR ?? "").trim()),
        name: String(r.NAME1 ?? "").trim(),
      })),
    });
  } catch (err) {
    return NextResponse.json({ vendors: [] });
  }
}
