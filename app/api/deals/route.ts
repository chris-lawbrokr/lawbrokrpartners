import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const sql = getDb();
  const rows = await sql`
    SELECT id, title, description, is_default, created_at
    FROM deals
    ORDER BY is_default DESC, created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as {
    title: string;
    description?: string;
    isDefault?: boolean;
  };

  if (!body.title.trim()) {
    return NextResponse.json({ message: "Title is required" }, { status: 400 });
  }

  const sql = getDb();
  const rows = await sql`
    INSERT INTO deals (title, description, is_default)
    VALUES (${body.title.trim()}, ${body.description?.trim() ?? ""}, ${body.isDefault ?? false})
    RETURNING id, title, description, is_default, created_at
  `;
  return NextResponse.json(rows[0], { status: 201 });
}
