import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/map', '/dashboard', '/profile', '/journal', '/passport'];
const authRoutes = ['/login', '/signup'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('sb-access-token')?.value;

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!accessToken) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (accessToken) {
      const mapUrl = new URL('/map', request.url);
      return NextResponse.redirect(mapUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/map', '/login', '/signup'],
};
