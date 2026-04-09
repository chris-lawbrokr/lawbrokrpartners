import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "./jwt";

interface AuthResult {
  userId: string;
  isAdmin: boolean;
}

/**
 * Verify the Bearer token from the Authorization header.
 * Returns the auth result or null if unauthorized.
 */
export async function getAuthFromRequest(
  request: NextRequest,
): Promise<AuthResult | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  try {
    return await verifyAccessToken(token);
  } catch {
    return null;
  }
}

/**
 * Require authentication. Returns a 401 response if not authenticated.
 */
export async function requireAuth(
  request: NextRequest,
): Promise<AuthResult | NextResponse> {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return auth;
}

/**
 * Require admin authentication. Returns a 403 response if not admin.
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<AuthResult | NextResponse> {
  const auth = await requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isAdmin) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  return auth;
}
