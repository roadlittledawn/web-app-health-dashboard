import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE, authSettings, loginUrl, resolveToken } from "./lib/clang-auth";

/**
 * Page protection with clang-auth. API routes (/api/*) are Netlify Functions
 * that authenticate every request themselves (lib/authenticate.ts), so they
 * are excluded below. Pages hold no data of their own; this saves a flash of
 * an empty page before AuthProvider redirects.
 *
 * - no / expired / invalid ca_access → 302 to the clang-auth sign-in page
 * - valid token without a `health` grant → 403 (a redirect would loop)
 */
export async function proxy(request: NextRequest) {
  let settings;
  try {
    settings = authSettings();
  } catch (error) {
    // Misconfigured env: let AuthProvider and the API (which fail closed) handle it.
    console.error(error);
    return NextResponse.next();
  }

  const state = await resolveToken(request.cookies.get(ACCESS_COOKIE)?.value, settings);
  if (state.status === "ok") return NextResponse.next();
  if (state.status === "forbidden") {
    return new NextResponse("You don't have access to the Health Dashboard.", {
      status: 403,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // The old in-app login page is gone: send its bookmarks to the dashboard.
  const { pathname, search } = request.nextUrl;
  const returnTo = `${publicOrigin(request)}${pathname === "/login" ? "/" : pathname + search}`;
  return NextResponse.redirect(loginUrl(returnTo, settings.authBaseUrl));
}

/**
 * The origin the browser used. Behind Netlify (and `netlify dev`, which proxies
 * to the framework's own port) request.url can carry the internal host, so
 * prefer the forwarded headers. clang-auth only redirects back to registered
 * origins, so a spoofed header can't become an open redirect.
 */
function publicOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return request.nextUrl.origin;
  const proto =
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ??
    request.nextUrl.protocol.replace(/:$/, "");
  return `${proto}://${host.split(",")[0].trim()}`;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api, .netlify (Netlify Functions authenticate themselves)
     * - _next/static, _next/image (static files, image optimization)
     * - favicon.ico and image files in public/
     */
    "/((?!api/|\\.netlify/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
