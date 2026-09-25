import { NextRequest, NextResponse } from 'next/server';
import { backendDeleteDepartment, BackendError } from '@/lib/backendClient';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authHeader = req.headers.get('authorization') || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!accessToken) return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });

  const { id } = await params;

  try {
    await backendDeleteDepartment(accessToken, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof BackendError) return NextResponse.json(err.body, { status: err.status });
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}