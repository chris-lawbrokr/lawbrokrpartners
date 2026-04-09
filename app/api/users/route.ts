import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const sql = getDb();
  const rows = await sql`
    SELECT
      u.id, u.first_name, u.last_name, u.email, u.website, u.referral_code, u.status, u.is_admin, u.created_at,
      i.token AS invite_token,
      (SELECT COUNT(*) FROM referrals r WHERE r.partner_id = u.id) AS referral_count
    FROM users u
    LEFT JOIN invites i ON i.user_id = u.id
    WHERE u.is_admin = false
    ORDER BY u.created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    website?: string;
  };

  const sql = getDb();

  const userRows = await sql`
    INSERT INTO users (first_name, last_name, email, website, status)
    VALUES (${body.firstName ?? ""}, ${body.lastName ?? ""}, ${body.email ?? ""}, ${body.website ?? ""}, 'pending')
    RETURNING id
  `;
  const userId = userRows[0]?.id as number;

  const token = crypto.randomBytes(32).toString("hex");
  await sql`
    INSERT INTO invites (token, user_id)
    VALUES (${token}, ${userId})
  `;

  return NextResponse.json({ inviteToken: token }, { status: 201 });
}
