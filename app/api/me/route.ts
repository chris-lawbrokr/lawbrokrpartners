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
    SELECT id, first_name, last_name, email, website, referral_code,
           status, is_admin, created_at
    FROM users WHERE id = ${auth.userId}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  return NextResponse.json(rows[0]);
});

export const PATCH = withApi(async (request: NextRequest) => {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    website?: string;
  };

  const sql = getDb();

  await sql`
    UPDATE users SET
      first_name = COALESCE(${body.firstName ?? null}, first_name),
      last_name = COALESCE(${body.lastName ?? null}, last_name),
      website = COALESCE(${body.website ?? null}, website)
    WHERE id = ${auth.userId}
  `;

  return NextResponse.json({ ok: true });
});
