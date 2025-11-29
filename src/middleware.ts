/**
 * Middleware
 * 
 * Handles authentication and route protection.
 */
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = req.nextUrl.pathname.startsWith('/login') ||
    req.nextUrl.pathname.startsWith('/signup') ||
    req.nextUrl.pathname.startsWith('/forgot-password') ||
    req.nextUrl.pathname.startsWith('/reset-password');
  const isPublicPage = req.nextUrl.pathname === '/' ||
    req.nextUrl.pathname.startsWith('/invite');
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');

  // Allow API routes to handle their own auth
  if (isApiRoute) {
    return NextResponse.next();
  }

  // If logged in and trying to access auth pages, redirect to dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Allow public pages and auth pages
  if (isPublicPage || isAuthPage) {
    return NextResponse.next();
  }

  // Redirect to login if not logged in
  if (!isLoggedIn) {
    const callbackUrl = encodeURIComponent(req.nextUrl.pathname);
    return NextResponse.redirect(new URL(`/login?callbackUrl=${callbackUrl}`, req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)',
  ],
};
