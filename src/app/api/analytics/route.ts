import { NextRequest, NextResponse } from 'next/server';
import { backendGetAnalytics, BackendError } from '@/lib/backendClient';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!accessToken) return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  try {
    const data = await backendGetAnalytics(accessToken, {
      companyId: searchParams.get('companyId') || undefined,
      departmentId: searchParams.get('departmentId') || undefined,
      status: searchParams.get('status') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    });
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError) return NextResponse.json(err.body, { status: err.status });
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}