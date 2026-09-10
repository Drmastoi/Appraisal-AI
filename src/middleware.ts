import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/login", "/register", "/feedback", "/privacy"];

function roleHome(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "APPRAISER") return "/appraiser";
  return "/doctor";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // API routes enforce their own authentication (requireUser/requireRole) and
  // must respond with JSON status codes, not redirects to the login page.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("appraisal_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Coarse prefix guard (fine-grained checks happen in each API route/page):
  // the session cookie's role claim is verified server-side in route handlers.
  const role = req.cookies.get("appraisal_role")?.value;
  if (role) {
    const prefixToRole: Record<string, string> = { "/admin": "ADMIN", "/appraiser": "APPRAISER", "/doctor": "DOCTOR" };
    const required = Object.entries(prefixToRole).find(([prefix]) => pathname.startsWith(prefix));
    if (required && required[1] !== role) {
      const url = req.nextUrl.clone();
      url.pathname = roleHome(role);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/feedback/public).*)"],
};
