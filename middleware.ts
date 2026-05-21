import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { CANONICAL_APP_URL, LEGACY_RENDER_HOST } from '@/lib/appUrl';

export function middleware(request: NextRequest) {
  if (request.nextUrl.hostname !== LEGACY_RENDER_HOST) {
    return NextResponse.next();
  }

  const { pathname, search } = request.nextUrl;
  const suffix = pathname === '/' ? '' : pathname;
  const destination = `${CANONICAL_APP_URL}${suffix}${search}`;

  return NextResponse.redirect(destination, 308);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
