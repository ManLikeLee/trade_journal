import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never gate Next internals/assets (RSC/data/chunks/HMR/etc).
  if (pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Allow public routes through
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Auth gate via refresh-token cookie set on login/refresh.
  const authCookie = request.cookies.get('tj-auth');

  if (!authCookie?.value) {
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
