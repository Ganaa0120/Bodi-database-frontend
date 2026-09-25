import { NextRequest, NextResponse } from 'next/server';
import { backendRefresh, BackendError } from '@/lib/backendClient';
import { SESSION_COOKIE_NAME, sessionCookieOptions, clearedSessionCookieOptions } from '@/lib/session';

export async function POST(req: NextRequest) {
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: 'Session олдсонгүй.' }, { status: 401 });
  }

  try {
    const { data, refreshToken } = await backendRefresh(sessionToken);

    const response = NextResponse.json({
      accessToken: data.accessToken,
      accessTokenExpiresIn: data.accessTokenExpiresIn,
      user: data.user,
    });

    if (refreshToken) {
      response.cookies.set(
        SESSION_COOKIE_NAME,
        refreshToken.value,
        sessionCookieOptions(refreshToken.maxAgeSeconds)
      );
    }

    return response;
  } catch (err) {
    const response = NextResponse.json(
      { error: err instanceof BackendError ? err.body : { error: 'Session хүчингүй байна.' } },
      { status: err instanceof BackendError ? err.status : 401 }
    );
    // Хүчингүй болсон session cookie-г цэвэрлэнэ, дахин ашиглагдахгүй
    response.cookies.set(SESSION_COOKIE_NAME, '', clearedSessionCookieOptions());
    return response;
  }
}
