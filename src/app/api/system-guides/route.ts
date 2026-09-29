import { NextRequest, NextResponse } from 'next/server';
import { BackendError } from '@/lib/backendClient';
import { backendListSystemGuides, backendCreateSystemGuide } from '@/lib/backendSystemGuides';
import type { GuideAudience } from '@/lib/systemGuides';

function getAccessToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function handleError(err: unknown) {
  if (err instanceof BackendError) {
    return NextResponse.json(err.body, { status: err.status });
  }
  return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
}

export async function GET(req: NextRequest) {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });
  }

  try {
    const data = await backendListSystemGuides(accessToken);
    return NextResponse.json(data);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });
  }

  let body: {
    title?: unknown;
    description?: unknown;
    audience?: unknown;
    blob_path?: unknown;
    sort_order?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Хүсэлтийн формат буруу байна.' }, { status: 400 });
  }

  if (
    typeof body.title !== 'string' ||
    typeof body.blob_path !== 'string' ||
    !Array.isArray(body.audience)
  ) {
    return NextResponse.json(
      { error: 'Гарчиг, файл болон хэнд харагдахыг бөглөнө үү.' },
      { status: 400 }
    );
  }

  try {
    const data = await backendCreateSystemGuide(accessToken, {
      title: body.title,
      description: typeof body.description === 'string' ? body.description : null,
      audience: body.audience as GuideAudience[],
      blob_path: body.blob_path,
      sort_order: typeof body.sort_order === 'number' ? body.sort_order : undefined,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}