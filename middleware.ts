import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const CMS_SESSION_COOKIE = "cms_session";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Only handle CMS routes.
  if (!pathname.startsWith("/cms")) return NextResponse.next();

  const token = req.cookies.get(CMS_SESSION_COOKIE)?.value ?? "";
  const isLogin = pathname === "/cms/login";

  // Allow the login page through.
  if (isLogin) return NextResponse.next();

  // Protect everything else under /cms.
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/cms/login";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/cms/:path*"],
};

