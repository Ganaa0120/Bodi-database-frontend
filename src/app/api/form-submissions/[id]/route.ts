import { NextRequest, NextResponse } from 'next/server';
import { backendResubmitFormSubmission, backendDeleteSubmissionByCompany, BackendError } from '@/lib/backendClient';

/** Бүхэл тоо эсэх (хугацааны утгуудад). Нарийн хязгаарыг backend шалгана. */
function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

// Хэлтэс татгалзсан тайлангаа засаж дахин илгээх.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!accessToken) return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });

  const { id } = await params;

  let body: { title?: unknown; data?: unknown; period_year?: unknown; period_quarter?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Хүсэлтийн формат буруу байна.' }, { status: 400 });
  }
  if (typeof body.title !== 'string' || typeof body.data !== 'object' || body.data === null) {
    return NextResponse.json({ error: 'Гарчиг болон талбаруудыг бөглөнө үү.' }, { status: 400 });
  }
  if (!isInteger(body.period_year) || !isInteger(body.period_quarter)) {
    return NextResponse.json({ error: 'Тайлант он болон улирлыг сонгоно уу.' }, { status: 400 });
  }

  try {
    const data = await backendResubmitFormSubmission(accessToken, id, {
      title: body.title,
      data: body.data as Record<string, string>,
      period_year: body.period_year,
      period_quarter: body.period_quarter,
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