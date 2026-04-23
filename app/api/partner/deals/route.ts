import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";
import { withApi } from "@/lib/api-errors";

export const GET = withApi(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const sql = getDb();
  const rows = await sql`
    SELECT id, title, description, is_default, created_at
    FROM deals
    ORDER BY is_default DESC, created_at DESC
  `;
  return NextResponse.json(rows);
});
