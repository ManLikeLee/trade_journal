import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * THIS MIDDLEWARE DOES NOT AUTHORISE ANYTHING.
 *
 * It is a redirect-UX optimisation: it avoids painting a dashboard shell for a
 * visitor with no session, and nothing more. It checks only that a session-hint
 * cookie is *present*; it cannot read its value, cannot verify a signature, and
 * is trivially satisfied by any cookie of the right name.
 *
 * **Real authorisation lives in the API**, which verifies the JWT on every
 * request and scopes every query to the authenticated user. Forging the hint
 * cookie gets you a rendered shell whose data requests all return 401 — an empty
 * page, not access to anything.
 *
 * Do not add authorisation logic here. Route handlers on the edge cannot reach
 * the database, and the refresh token is path-scoped to /api/auth on the API
 * origin, so it is not readable from this middleware by design.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PUBLIC_PATHS = ['/login', '/register'];

/**
 * The refresh cookie is SameSite=Strict, so the browser attaches it only when
 * the page and the API are the same site. The API is on 127.0.0.1:5000; a page
 * opened on localhost:3000 is therefore cross-site and every silent refresh
 * fails, presenting as "logged out immediately after logging in".
 *
 * Redirecting to the canonical host makes that impossible to hit by accident.
 */
function canonicalHostRedirect(request: NextRequest): NextResponse | null {
  const host = request.nextUrl.hostname;
  if (host !== 'localhost') return null;

  const url = request.nextUrl.clone();
  url.hostname = '127.0.0.1';
  return NextResponse.redirect(url);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never gate Next internals/assets (RSC/data/chunks/HMR/etc).
  if (pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const redirect = canonicalHostRedirect(request);
  if (redirect) return redirect;

  // Allow public routes through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Presence check only — see the note above. The hint cookie is httpOnly and
  // holds no secret; it exists because the refresh cookie is path-scoped to
  // /api/auth and is therefore invisible here.
  const sessionHint = request.cookies.get('tj_session');

  if (!sessionHint?.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next|favicon.ico|login|register).*)',
  ],
};
