import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ADMIN_AUTH_COOKIE = 'admin_panel_auth';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  const expected = String(process.env.ADMIN_PANEL_CODE || '').trim();
  if (!expected) {
    return NextResponse.next();
  }

  const cookieValue = String(request.cookies.get(ADMIN_AUTH_COOKIE)?.value || '').trim();
  if (cookieValue === expected) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*'],
};