import { NextRequest, NextResponse } from 'next/server';
import { backendReviewFormSubmission, BackendError } from '@/lib/backendClient';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!accessToken) return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });

  const { id } = await params;

  let body: { action?: unknown; rejection_reason?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Хүсэлтийн формат буруу байна.' }, { status: 400 });
  }
  if (body.action !== 'accept' && body.action !== 'reject') {
    return NextResponse.json({ error: 'action буруу байна.' }, { status: 400 });
  }

  try {
    const data = await backendReviewFormSubmission(accessToken, id, {
      action: body.action,
      rejection_reason: typeof body.rejection_reason === 'string' ? body.rejection_reason : undefined,
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError) return NextResponse.json(err.body, { status: err.status });
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}