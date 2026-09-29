import { NextRequest, NextResponse } from 'next/server';

/**
 * /api/notifications/* — backend руу дамжуулах proxy (нэг файлд).
 *
 * Зөвхөн доорх ALLOWED_ROUTES-д бүртгэгдсэн method + зам дамжина.
 * Эрхийн шалгалтыг (super_admin / company / department) backend хийнэ.
 */

const BACKEND_URL = process.env.BACKEND_URL;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Matcher = (segments: string[]) => boolean;

const ALLOWED_ROUTES: Record<string, Matcher[]> = {
  GET: [
    (s) => s.length === 0, // өөрийн inbox
    (s) => s.length === 1 && s[0] === 'unread-count',
    (s) => s.length === 1 && s[0] === 'recipients',
    (s) => s.length === 1 && s[0] === 'sent',
    (s) => s.length === 2 && UUID.test(s[0] ?? '') && s[1] === 'recipients',
    (s) => s.length === 2 && UUID.test(s[0] ?? '') && s[1] === 'attachments',
  ],
  POST: [
    (s) => s.length === 0, // шинэ мэдэгдэл илгээх
    (s) => s.length === 1 && s[0] === 'read-all',
    (s) => s.length === 2 && s[0] === 'attachments' && s[1] === 'upload-url',
    (s) => s.length === 2 && UUID.test(s[0] ?? '') && s[1] === 'read',
  ],
  DELETE: [(s) => s.length === 1 && UUID.test(s[0] ?? '')],
};

type RouteContext = { params: Promise<{ path?: string[] }> };

async function proxy(req: NextRequest, ctx: RouteContext) {
  if (!BACKEND_URL) {
    return NextResponse.json({ error: 'BACKEND_URL тохируулагдаагүй байна.' }, { status: 500 });
  }

  const header = req.headers.get('authorization') || '';
  const accessToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!accessToken) {
    return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });
  }

  const { path } = await ctx.params;
  const segments = path ?? [];
  const matchers = ALLOWED_ROUTES[req.method] ?? [];
  if (!matchers.some((m) => m(segments))) {
    return NextResponse.json({ error: 'Route олдсонгүй.' }, { status: 404 });
  }

  const url = `${BACKEND_URL}/api/notifications${segments.length ? `/${segments.join('/')}` : ''}`;

  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}` };
  let body: string | undefined;
  if (req.method === 'POST') {
    body = await req.text();
    if (body) headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(url, { method: req.method, headers, body, cache: 'no-store' });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status, headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  return proxy(req, ctx);
}