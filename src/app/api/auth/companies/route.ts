import { NextRequest, NextResponse } from 'next/server';
import { backendListCompanies, backendCreateCompany, BackendError } from '@/lib/backendClient';

function getAccessToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });
  }

  try {
    const data = await backendListCompanies(accessToken);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });
  }

  let body: {
    name?: unknown;
    phone?: unknown;
    logo_url?: unknown;
    admin_full_name?: unknown;
    admin_email?: unknown;
    admin_password?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Хүсэлтийн формат буруу байна.' }, { status: 400 });
  }

  if (
    typeof body.name !== 'string' ||
    typeof body.phone !== 'string' ||
    typeof body.admin_full_name !== 'string' ||
    typeof body.admin_email !== 'string' ||
    typeof body.admin_password !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Компанийн нэр, утас, админы нэр/имэйл/нууц үгийг бөглөнө үү.' },
      { status: 400 }
    );
  }

  try {
    const data = await backendCreateCompany(accessToken, {
      name: body.name,
      phone: body.phone,
      logo_url: typeof body.logo_url === 'string' ? body.logo_url : null,
      admin_full_name: body.admin_full_name,
      admin_email: body.admin_email,
      admin_password: body.admin_password,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof BackendError) {
      return NextResponse.json(err.body, { status: err.status });
    }
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}