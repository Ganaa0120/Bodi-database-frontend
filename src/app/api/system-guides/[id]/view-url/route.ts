import { NextRequest, NextResponse } from 'next/server';
import { BackendError } from '@/lib/backendClient';
import { backendGetSystemGuideViewUrl } from '@/lib/backendSystemGuides';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!accessToken) {
    return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const data = await backendGetSystemGuideViewUrl(accessToken, id);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    if (err instanceof BackendError) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}