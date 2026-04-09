import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/db";

export async function GET() {
  const sql = getDb();
  const rows = await sql`
    SELECT
      u.id, u.first_name, u.last_name, u.email, u.website, u.status, u.is_admin, u.created_at,
      i.token AS invite_token
    FROM users u
    LEFT JOIN invites i ON i.user_id = u.id
    WHERE u.is_admin = false
    ORDER BY u.created_at DESC
  `;
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    website?: string;
  };

  const sql = getDb();

  // Create pending user with optional reference info
  const userRows = await sql`
    INSERT INTO users (first_name, last_name, email, website, status)
    VALUES (${body.firstName ?? ""}, ${body.lastName ?? ""}, ${body.email ?? ""}, ${body.website ?? ""}, 'pending')
    RETURNING id
  `;
  const userId = userRows[0]?.id as number;

  // Generate invite token
  const token = crypto.randomBytes(32).toString("hex");
  await sql`
    INSERT INTO invites (token, user_id)
    VALUES (${token}, ${userId})
  `;

  return NextResponse.json({ inviteToken: token }, { status: 201 });
}
