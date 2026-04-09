import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { verifyRefreshToken, signAccessToken, signRefreshToken } from "@/lib/jwt";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("refresh_token")?.value;

  if (!token) {
    return NextResponse.json({ message: "No refresh token" }, { status: 401 });
  }

  let userId: string;
  try {
    const result = await verifyRefreshToken(token);
    userId = result.userId;
  } catch {
    return NextResponse.json(
      { message: "Invalid refresh token" },
      { status: 401 },
    );
  }

  const sql = getDb();
  const rows = await sql`
    SELECT id, first_name, last_name, email, website, is_admin, referral_code
    FROM users WHERE id = ${userId}
  `;

  const user = rows[0];
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 401 });
  }

  const accessToken = await signAccessToken({
    sub: String(user.id),
    email: user.email as string,
    firstName: user.first_name as string,
    lastName: user.last_name as string,
    website: user.website as string,
    isAdmin: user.is_admin as boolean,
    referralCode: String(user.referral_code ?? ""),
  });
  const newRefreshToken = await signRefreshToken(String(user.id));

  const response = NextResponse.json({
    access_token: accessToken,
    user: {
      id: String(user.id),
      firstName: String(user.first_name),
      lastName: String(user.last_name),
      email: String(user.email),
      website: String(user.website),
      isAdmin: Boolean(user.is_admin),
      referralCode: String(user.referral_code ?? ""),
    },
  });

  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set("refresh_token", newRefreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
