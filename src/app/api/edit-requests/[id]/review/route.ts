import { NextRequest, NextResponse } from 'next/server';
import { backendReviewEditRequest, BackendError } from '@/lib/backendClient';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!accessToken) return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });

  const { id } = await params;

  let body: { action?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Хүсэлтийн формат буруу байна.' }, { status: 400 });
  }
  if (body.action !== 'approve' && body.action !== 'deny') {
    return NextResponse.json({ error: 'action буруу байна.' }, { status: 400 });
  }

  try {
    await backendReviewEditRequest(accessToken, id, body.action);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof BackendError) return NextResponse.json(err.body, { status: err.status });
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}