import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const sql = getDb();

  const rows = await sql`
    SELECT i.used, u.first_name, u.last_name, u.email, u.website
    FROM invites i
    JOIN users u ON u.id = i.user_id
    WHERE i.token = ${token}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ message: "Invalid invite link" }, { status: 404 });
  }

  const invite = rows[0];
  if (invite?.used) {
    return NextResponse.json({ message: "This invite has already been used" }, { status: 410 });
  }

  return NextResponse.json({
    firstName: String(invite?.first_name),
    lastName: String(invite?.last_name),
    email: String(invite?.email),
    website: String(invite?.website),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const body = (await request.json()) as {
    firstName?: string;
    lastName?: string;
    email?: string;
    website?: string;
    password?: string;
  };

  const { firstName, lastName, email, website, password } = body;

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { message: "First name, last name, email, and password are required" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { message: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const sql = getDb();

  // Validate invite
  const inviteRows = await sql`
    SELECT i.id AS invite_id, i.used, i.user_id
    FROM invites i
    WHERE i.token = ${token}
  `;

  if (inviteRows.length === 0) {
    return NextResponse.json({ message: "Invalid invite link" }, { status: 404 });
  }

  const invite = inviteRows[0];
  if (invite?.used) {
    return NextResponse.json({ message: "This invite has already been used" }, { status: 410 });
  }

  // Check email isn't taken by another user
  const existing = await sql`
    SELECT id FROM users WHERE email = ${email} AND id != ${invite?.user_id as number}
  `;
  if (existing.length > 0) {
    return NextResponse.json(
      { message: "An account with this email already exists" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const referralCode = crypto.randomBytes(6).toString("hex");

  // Update user with partner's info and assign referral code.
  // Status goes to pending_approval — admin must accept before they can log in.
  await sql`
    UPDATE users
    SET first_name = ${firstName},
        last_name = ${lastName},
        email = ${email},
        website = ${website ?? ""},
        password_hash = ${passwordHash},
        referral_code = ${referralCode},
        status = 'pending_approval'
    WHERE id = ${invite?.user_id as number}
  `;

  // Mark invite as used
  await sql`UPDATE invites SET used = true, used_at = NOW() WHERE id = ${invite?.invite_id as number}`;

  return NextResponse.json(
    {
      ok: true,
      pendingApproval: true,
    },
    { status: 201 },
  );
}
