import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sql = getDb();

  const rows = await sql`
    SELECT id, first_name, last_name, email, website, status, is_admin, created_at
    FROM users WHERE id = ${id}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    website?: string;
  };

  const sql = getDb();

  const existing = await sql`SELECT id FROM users WHERE id = ${id}`;
  if (existing.length === 0) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  // Check email uniqueness if changing email
  if (body.email) {
    const dup = await sql`SELECT id FROM users WHERE email = ${body.email} AND id != ${id}`;
    if (dup.length > 0) {
      return NextResponse.json({ message: "Email already in use" }, { status: 409 });
    }
  }

  await sql`
    UPDATE users SET
      first_name = COALESCE(${body.firstName ?? null}, first_name),
      last_name = COALESCE(${body.lastName ?? null}, last_name),
      email = COALESCE(${body.email ?? null}, email),
      website = COALESCE(${body.website ?? null}, website)
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const sql = getDb();

  // Delete invites first (foreign key)
  await sql`DELETE FROM invites WHERE user_id = ${id}`;
  await sql`DELETE FROM users WHERE id = ${id} AND is_admin = false`;

  return NextResponse.json({ ok: true });
}
