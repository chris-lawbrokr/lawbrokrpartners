import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/invite"];

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) {
    return NextResponse.next();
  }

  const session = request.cookies.get("session");
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based routing using the session_user cookie
  const sessionUser = request.cookies.get("session_user");
  if (sessionUser) {
    try {
      const user = JSON.parse(decodeURIComponent(sessionUser.value)) as { isAdmin?: boolean };
      const isAdmin = user.isAdmin === true;

      // Redirect root to the correct dashboard
      if (pathname === "/") {
        const target = isAdmin ? "/admin" : "/dashboard";
        return NextResponse.redirect(new URL(target, request.url));
      }

      // Block partners from accessing admin routes
      if (pathname.startsWith("/admin") && !isAdmin) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }

      // Block admins from accessing partner dashboard
      if (pathname.startsWith("/dashboard") && isAdmin) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
    } catch {
      // If cookie is malformed, let the page handle it
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)"],
};
