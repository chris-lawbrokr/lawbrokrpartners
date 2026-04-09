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
    SELECT id, email, name, password_hash FROM users WHERE email = ${email}
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
    name: user.name as string,
  });
  const refreshToken = await signRefreshToken(userId);

  const response = NextResponse.json({
    access_token: accessToken,
    user: { id: userId, email: String(user.email), name: String(user.name) },
  });

  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set("refresh_token", refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}
