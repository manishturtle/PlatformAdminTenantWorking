import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get("authToken")?.value;
  const { pathname } = request.nextUrl;

  // Paths that don't require authentication
  const publicPaths = ["/", "/login", "/api/auth"];

  // API routes that should be proxied to Django
  const apiRoutes = ["/api/customers", "/api/documents"];

  // Check if the path is public
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));
  const isApiRoute = apiRoutes.some((route) => pathname.startsWith(route));

  // Proxy API requests to Django backend
  if (isApiRoute) {
    const apiUrl = new URL(pathname, "http://localhost:8020");
    return NextResponse.rewrite(apiUrl);
  }

  // If the path is not public and there's no token, redirect to login
  if (!isPublicPath && !authToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If we're on the login page but already have a token, redirect to dashboard
  if (pathname === "/login" && authToken) {
    return NextResponse.redirect(new URL("/customers", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
