import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/api-auth";
import { withApi } from "@/lib/api-errors";

interface RewardInput {
  category: string;
  type: string;
  description: string;
  note: string;
  sort_order: number;
}

export const GET = withApi(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const sql = getDb();
  const rows = await sql`SELECT id, category, type, description, note, sort_order FROM rewards ORDER BY category, sort_order, id`;
  return NextResponse.json(rows);
});

export const PUT = withApi(async (request: NextRequest) => {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as { rewards: RewardInput[] };
  const sql = getDb();

  // Replace all rewards with the new set
  await sql`DELETE FROM rewards`;
  for (const r of body.rewards) {
    await sql`
      INSERT INTO rewards (category, type, description, note, sort_order)
      VALUES (${r.category}, ${r.type}, ${r.description}, ${r.note}, ${r.sort_order})
    `;
  }

  const rows = await sql`SELECT id, category, type, description, note, sort_order FROM rewards ORDER BY category, sort_order, id`;
  return NextResponse.json(rows);
});
