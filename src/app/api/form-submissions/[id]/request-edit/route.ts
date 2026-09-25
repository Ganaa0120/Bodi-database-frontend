import { NextRequest, NextResponse } from 'next/server';
import { backendRequestEdit, BackendError } from '@/lib/backendClient';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!accessToken) return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });

  const { id } = await params;

  let body: { reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Хүсэлтийн формат буруу байна.' }, { status: 400 });
  }
  if (typeof body.reason !== 'string') {
    return NextResponse.json({ error: 'Шалтгаанаа бичнэ үү.' }, { status: 400 });
  }

  try {
    const data = await backendRequestEdit(accessToken, id, body.reason);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof BackendError) return NextResponse.json(err.body, { status: err.status });
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}