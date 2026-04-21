import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;

  const body = (await request.json()) as {
    currentPassword?: string;
    newPassword?: string;
  };

  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { message: "Current and new passwords are required" },
      { status: 400 },
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { message: "New password must be at least 8 characters" },
      { status: 400 },
    );
  }

  if (newPassword === currentPassword) {
    return NextResponse.json(
      { message: "New password must be different from current password" },
      { status: 400 },
    );
  }

  const sql = getDb();
  const rows = await sql`
    SELECT password_hash FROM users WHERE id = ${auth.userId}
  `;

  if (rows.length === 0) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const ok = await bcrypt.compare(
    currentPassword,
    rows[0]?.password_hash as string,
  );
  if (!ok) {
    return NextResponse.json(
      { message: "Current password is incorrect" },
      { status: 401 },
    );
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await sql`
    UPDATE users SET password_hash = ${newHash} WHERE id = ${auth.userId}
  `;

  return NextResponse.json({ ok: true });
}
