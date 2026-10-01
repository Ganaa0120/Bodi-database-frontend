import { NextRequest, NextResponse } from 'next/server';
import {
  backendUpdateSubmissionByCompany,
  BackendError,
  type CompanySubmissionEditPayload,
} from '@/lib/backendClient';

/** Бүхэл тоо эсэх (хугацааны утгуудад). Нарийн хязгаарыг backend шалгана. */
function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

// Компани (CEO) тайланг засах. Хугацаа заавал биш — илгээвэл он, улирлыг хамт.
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

  const hasYear = body.period_year !== undefined && body.period_year !== null;
  const hasQuarter = body.period_quarter !== undefined && body.period_quarter !== null;
  if (hasYear !== hasQuarter) {
    return NextResponse.json({ error: 'Он болон улирлыг хамт илгээнэ үү.' }, { status: 400 });
  }
  if (hasYear && (!isInteger(body.period_year) || !isInteger(body.period_quarter))) {
    return NextResponse.json({ error: 'Тайлант хугацаа буруу байна.' }, { status: 400 });
  }

  const payload: CompanySubmissionEditPayload = {
    title: body.title,
    data: body.data as Record<string, string>,
  };
  if (isInteger(body.period_year) && isInteger(body.period_quarter)) {
    payload.period_year = body.period_year;
    payload.period_quarter = body.period_quarter;
  }

  try {
    const data = await backendUpdateSubmissionByCompany(accessToken, id, payload);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError) return NextResponse.json(err.body, { status: err.status });
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}