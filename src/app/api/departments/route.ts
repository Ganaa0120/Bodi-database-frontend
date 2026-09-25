import { NextRequest, NextResponse } from 'next/server';
import { backendListDepartments, backendCreateDepartment, BackendError } from '@/lib/backendClient';

function getAccessToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const accessToken = getAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });

  try {
    const data = await backendListDepartments(accessToken);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError) return NextResponse.json(err.body, { status: err.status });
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const accessToken = getAccessToken(req);
  if (!accessToken) return NextResponse.json({ error: 'Нэвтрэх шаардлагатай.' }, { status: 401 });

  let body: { template_id?: unknown; admin_full_name?: unknown; admin_email?: unknown; admin_password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Хүсэлтийн формат буруу байна.' }, { status: 400 });
  }
  if (
    typeof body.template_id !== 'string' ||
    typeof body.admin_full_name !== 'string' ||
    typeof body.admin_email !== 'string' ||
    typeof body.admin_password !== 'string'
  ) {
    return NextResponse.json({ error: 'Бүх талбарыг бөглөнө үү.' }, { status: 400 });
  }

  try {
    const data = await backendCreateDepartment(accessToken, {
      template_id: body.template_id,
      admin_full_name: body.admin_full_name,
      admin_email: body.admin_email,
      admin_password: body.admin_password,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    if (err instanceof BackendError) return NextResponse.json(err.body, { status: err.status });
    return NextResponse.json({ error: 'Backend-тэй холбогдож чадсангүй.' }, { status: 502 });
  }
}