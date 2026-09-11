import { NextResponse, type NextRequest } from "next/server";

/**
 * Reachable without a session, and genuinely intended for search results.
 * "/" only matches itself (a prefix match would need "//"), so the marketing
 * homepage is the sole indexable entry point alongside the privacy page.
 */
const INDEXABLE_PATHS = ["/", "/privacy"];

/**
 * Reachable without a session, but never for a search index: sign-in and
 * registration are by invitation, and 360° feedback links are single-use tokens.
 */
const PUBLIC_UNINDEXED_PATHS = ["/login", "/register", "/feedback"];

/**
 * Crawler surfaces that must never be redirected to /login — search engines
 * have no session, so a redirect here would make the SEO files invisible and
 * break indexing of the public pages. /og is the generated social card, which
 * link previews and social crawlers fetch.
 */
const PUBLIC_FILES = ["/robots.txt", "/sitemap.xml", "/og"];

/** The canonical origin. Every other hostname serving this app is a duplicate. */
const CANONICAL_HOST = "doctorappraisal.co.uk";

/**
 * Appraisal portfolios, feedback responses and admin screens are confidential:
 * the header holds even if a crawler ignores robots.txt, and it covers paths no
 * individual page happens to declare a `robots` meta on.
 */
const NOINDEX = "noindex, nofollow, noarchive";

function noIndex(res: NextResponse): NextResponse {
  res.headers.set("X-Robots-Tag", NOINDEX);
  return res;
}

function matches(pathname: string, paths: string[]): boolean {
  return paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function roleHome(role: string): string {
  if (role === "ADMIN") return "/admin";
  if (role === "APPRAISER") return "/appraiser";
  return "/doctor";
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();

  // Both the apex and www are attached to the deployment, and every canonical
  // URL points at the apex — so fold www into it permanently rather than
  // letting search engines index two copies of every page.
  if (host === `www.${CANONICAL_HOST}`) {
    return NextResponse.redirect(
      new URL(`${pathname}${req.nextUrl.search}`, `https://${CANONICAL_HOST}`),
      301,
    );
  }

  // API routes enforce their own authentication (requireUser/requireRole) and
  // must respond with JSON status codes, not redirects to the login page.
  if (pathname.startsWith("/api/")) {
    return noIndex(NextResponse.next());
  }
  if (PUBLIC_FILES.includes(pathname)) {
    return NextResponse.next();
  }
  if (matches(pathname, INDEXABLE_PATHS)) {
    return NextResponse.next();
  }
  if (matches(pathname, PUBLIC_UNINDEXED_PATHS)) {
    return noIndex(NextResponse.next());
  }

  const token = req.cookies.get("appraisal_session")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return noIndex(NextResponse.redirect(url));
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
      return noIndex(NextResponse.redirect(url));
    }
  }

  return noIndex(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/feedback/public).*)"],
};
