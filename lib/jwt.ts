import { SignJWT, jwtVerify } from "jose";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

interface TokenPayload {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
  website: string;
  isAdmin: boolean;
  referralCode: string;
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    firstName: payload.firstName,
    lastName: payload.lastName,
    website: payload.website,
    isAdmin: payload.isAdmin,
    referralCode: payload.referralCode,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getSecret());
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getSecret());
}

export async function verifyRefreshToken(
  token: string,
): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, getSecret());
  if (!payload.sub) throw new Error("Invalid token");
  return { userId: payload.sub };
}

export async function verifyAccessToken(
  token: string,
): Promise<{ userId: string; isAdmin: boolean }> {
  const { payload } = await jwtVerify(token, getSecret());
  if (!payload.sub) throw new Error("Invalid token");
  return {
    userId: payload.sub,
    isAdmin: (payload as Record<string, unknown>).isAdmin === true,
  };
}
