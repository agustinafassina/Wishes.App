import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth0 } from "./lib/auth0";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Let Auth0 handle its own routes (login, logout, callback, etc.)
  if (pathname.startsWith("/auth")) {
    return await auth0.middleware(request);
  }

  const session = await auth0.getSession(request);
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:ico|png|svg|jpg|jpeg|gif|webp)$).*)",
  ],
};
