import { NextRequest, NextResponse } from 'next/server';
import { backendLogout } from '@/lib/backendClient';
import { SESSION_COOKIE_NAME, clearedSessionCookieOptions } from '@/lib/session';

export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const authHeader = req.headers.get('authorization') || undefined;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  try {
    await backendLogout(sessionToken, accessToken);
  } catch {
    // Backend хүрэхгүй байсан ч local session-г цэвэрлэж logout-г
    // дуусгана — хэрэглэгч "гарсан" төлөвт л байх ёстой.
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.set(SESSION_COOKIE_NAME, '', clearedSessionCookieOptions());
  return response;
}
