import { isPublicPath } from "@/core/auth/publicPaths";
import { HMS_AUTH_COOKIE } from "@/core/auth/sessionCookie";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const proxy = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const authed = request.cookies.get(HMS_AUTH_COOKIE)?.value === "1";
  if (!authed) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
};

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|jjm-signage|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|html|woff|woff2|ttf|eot)$).*)",
  ],
};
