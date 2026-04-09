import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { signAccessToken, signRefreshToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { email?: string; password?: string };
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { message: "Email and password are required" },
      { status: 400 },
    );
  }

  const sql = getDb();
  const rows = await sql`
    SELECT id, first_name, last_name, email, password_hash, website, is_admin, referral_code
    FROM users WHERE email = ${email}
  `;

  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash as string))) {
    return NextResponse.json(
      { message: "Invalid credentials" },
      { status: 401 },
    );
  }

  const userId = String(user.id);
  const accessToken = await signAccessToken({
    sub: userId,
    email: user.email as string,
    firstName: user.first_name as string,
    lastName: user.last_name as string,
    website: user.website as string,
    isAdmin: user.is_admin as boolean,
    referralCode: String(user.referral_code ?? ""),
  });
  const refreshToken = await signRefreshToken(userId);

  const response = NextResponse.json({
    access_token: accessToken,
    user: {
      id: userId,
      firstName: String(user.first_name),
      lastName: String(user.last_name),
      email: String(user.email),
      website: String(user.website),
      isAdmin: Boolean(user.is_admin),
      referralCode: String(user.referral_code ?? ""),
    },
  });

  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
