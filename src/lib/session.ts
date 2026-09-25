import 'server-only';

export const SESSION_COOKIE_NAME = 'bodi_session';

/**
 * Энэ cookie нь Vercel-ийн (Next.js-ийн) домэйн дээр тохируулагдах тул
 * browser-ийн хувьд ЯМАР Ч тохиолдолд cross-site биш — тиймээс
 * sameSite: 'lax' хангалттай (browser native navigation дээр ч ажиллана).
 * 'strict' биш 'lax' сонгосон шалтгаан: ирээдүйд имэйл дэх линкээр эсвэл
 * гаднаас шууд landing хийхэд (жишээ нь SSO redirect) cookie алдагдахгүй
 * байх.
 */
export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

export function clearedSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}
