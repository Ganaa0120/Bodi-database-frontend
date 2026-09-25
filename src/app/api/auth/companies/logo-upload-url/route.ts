import { NextRequest, NextResponse } from 'next/server';
import { backendGetLogoUploadUrl, BackendError } from '@/lib/backendClient';

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!accessToken) {
    return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });
  }

  let body: { fileName?: unknown; contentType?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Хүсэлтийн формат буруу байна.' }, { status: 400 });
  }

  if (typeof body.fileName !== 'string' || typeof body.contentType !== 'string') {
    return NextResponse.json({ error: 'Файлын нэр болон төрөл шаардлагатай.' }, { status: 400 });
  }

  try {
    const data = await backendGetLogoUploadUrl(accessToken, body.fileName, body.contentType);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}