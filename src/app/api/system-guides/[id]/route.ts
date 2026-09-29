import { NextRequest, NextResponse } from 'next/server';
import { BackendError } from '@/lib/backendClient';
import {
  backendUpdateSystemGuide,
  backendDeleteSystemGuide,
  type UpdateSystemGuidePayload,
} from '@/lib/backendSystemGuides';

function getAccessToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

const ALLOWED_FIELDS = ['title', 'description', 'audience', 'is_active', 'sort_order', 'blob_path'] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Хүсэлтийн формат буруу байна.' }, { status: 400 });
  }

  // Зөвхөн зөвшөөрөгдсөн талбаруудыг дамжуулна (whitelist).
  const payload: Record<string, unknown> = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) payload[key] = body[key];
  }

  try {
    const data = await backendUpdateSystemGuide(accessToken, id, payload as UpdateSystemGuidePayload);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await backendDeleteSystemGuide(accessToken, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof BackendError) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}