import { NextRequest, NextResponse } from 'next/server';
import { backendLogin, BackendError } from '@/lib/backendClient';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session';

export async function POST(req: NextRequest) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Хүсэлтийн формат буруу байна.' }, { status: 400 });
  }

  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Имэйл болон нууц үг оруулна уу.' }, { status: 400 });
  }

  try {
    const { data, refreshToken } = await backendLogin(body.email, body.password);

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
    if (err instanceof BackendError) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}
