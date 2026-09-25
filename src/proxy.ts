import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/lib/session';

/**
 * ЧУХАЛ ХЯЗГААРЛАЛТ: энэ proxy зөвхөн session cookie-ийн ОРШИН БАЙГАА
 * эсэхийг шалгадаг — түүний хүчинтэй эсэхийг (access token шиг) биш.
 * Учир нь энэ бол refresh token, зөвхөн backend л шалгаж чадна (DB дэх
 * hash-тай харьцуулах шаардлагатай).
 *
 * - Энэ нь зөвхөн UX-д зориулагдсан (auth flicker-ийг багасгах, cookie
 *   огт байхгүй үед шууд /login руу үсрэх).
 * - ЖИНХЭНЭ аюулгүй байдлын хамгаалалт (authorization) нь backend API
 *   дээр — endpoint бүрд access token шалгаж, RLS-ээр company/department
 *   дата тусгаарлагдана. Frontend routing НЬ хэзээ ч цорын ганц
 *   хамгаалалт байж болохгүй.
 * - /dashboard/* доторх компонент бүр AuthContext-с session бодитоор
 *   хүчинтэй эсэхийг client дээр ч дахин шалгана.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);
  const { pathname } = request.nextUrl;

  const isProtectedRoute = pathname.startsWith('/dashboard');
  const isLoginRoute = pathname === '/login';

  if (isProtectedRoute && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
