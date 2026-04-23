import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { withApi } from "@/lib/api-errors";

export const PATCH = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    isDefault?: boolean;
  };

  const sql = getDb();
  const rows = await sql`
    UPDATE deals
    SET
      title = COALESCE(${body.title ?? null}, title),
      description = COALESCE(${body.description ?? null}, description),
      is_default = COALESCE(${body.isDefault ?? null}, is_default)
    WHERE id = ${id}
    RETURNING id, title, description, is_default, created_at
  `;

  if (rows.length === 0) {
    return NextResponse.json({ message: "Deal not found" }, { status: 404 });
  }
  return NextResponse.json(rows[0]);
});

export const DELETE = withApi(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const sql = getDb();
  await sql`DELETE FROM deals WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
});
