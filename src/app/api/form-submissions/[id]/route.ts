import { NextRequest, NextResponse } from 'next/server';
import { backendResubmitFormSubmission, backendDeleteSubmissionByCompany, BackendError } from '@/lib/backendClient';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!accessToken) return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });

  const { id } = await params;

  let body: { title?: unknown; data?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Хүсэлтийн формат буруу байна.' }, { status: 400 });
  }
  if (typeof body.title !== 'string' || typeof body.data !== 'object' || body.data === null) {
    return NextResponse.json({ error: 'Гарчиг болон талбаруудыг бөглөнө үү.' }, { status: 400 });
  }

  try {
    const data = await backendResubmitFormSubmission(accessToken, id, {
      title: body.title,
      data: body.data as Record<string, string>,
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError) return NextResponse.json(err.body, { status: err.status });
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!accessToken) return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });

  const { id } = await params;

  try {
    await backendDeleteSubmissionByCompany(accessToken, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof BackendError) return NextResponse.json(err.body, { status: err.status });
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}