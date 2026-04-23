import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/api-auth";
import { withApi } from "@/lib/api-errors";

export const GET = withApi(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const sql = getDb();
  const rows = await sql`SELECT title, description FROM reward WHERE id = 1`;
  return NextResponse.json(rows[0] ?? { title: "", description: "" });
});

export const PUT = withApi(async (request: NextRequest) => {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as { title: string; description: string };
  const sql = getDb();
  await sql`
    INSERT INTO reward (id, title, description)
    VALUES (1, ${body.title}, ${body.description})
    ON CONFLICT (id) DO UPDATE SET title = ${body.title}, description = ${body.description}
  `;
  return NextResponse.json({ title: body.title, description: body.description });
});
