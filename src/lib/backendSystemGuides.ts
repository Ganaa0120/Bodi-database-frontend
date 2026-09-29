import 'server-only';
import { BackendError } from '@/lib/backendClient';
import type { GuideAudience, SystemGuide } from '@/lib/systemGuides';

/**
 * Системийн заавар (system-guides) — backend руу хандах функцууд.
 * backendClient.ts-ийн pattern-тэй ижил, тусдаа файлд байлгаснаар
 * том backendClient.ts-ийг өөрчлөх шаардлагагүй.
 */

const BACKEND_URL = process.env.BACKEND_URL;

if (!BACKEND_URL) {
  throw new Error('BACKEND_URL environment variable тохируулагдаагүй байна (.env.local харна уу).');
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new BackendError(res.status, body);
  }
  return body as T;
}

export interface SystemGuidesListResponseBody {
  guides: SystemGuide[];
}
export interface SystemGuideResponseBody {
  guide: SystemGuide;
}
export interface SystemGuideUploadUrlResponseBody {
  uploadUrl: string;
  blobPath: string;
}
export interface SystemGuideViewUrlResponseBody {
  url: string;
}

export interface CreateSystemGuidePayload {
  title: string;
  description: string | null;
  audience: GuideAudience[];
  blob_path: string;
  sort_order?: number;
}

export type UpdateSystemGuidePayload = Partial<{
  title: string;
  description: string | null;
  audience: GuideAudience[];
  is_active: boolean;
  sort_order: number;
  blob_path: string;
}>;

export async function backendListSystemGuides(accessToken: string): Promise<SystemGuidesListResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/system-guides`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return parseOrThrow<SystemGuidesListResponseBody>(res);
}

export async function backendGetSystemGuideUploadUrl(
  accessToken: string,
  fileName: string,
  fileSize: number
): Promise<SystemGuideUploadUrlResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/system-guides/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ fileName, fileSize }),
    cache: 'no-store',
  });
  return parseOrThrow<SystemGuideUploadUrlResponseBody>(res);
}

export async function backendCreateSystemGuide(
  accessToken: string,
  payload: CreateSystemGuidePayload
): Promise<SystemGuideResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/system-guides`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return parseOrThrow<SystemGuideResponseBody>(res);
}

export async function backendUpdateSystemGuide(
  accessToken: string,
  id: string,
  payload: UpdateSystemGuidePayload
): Promise<SystemGuideResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/system-guides/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return parseOrThrow<SystemGuideResponseBody>(res);
}

export async function backendDeleteSystemGuide(accessToken: string, id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/system-guides/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BackendError(res.status, body);
  }
}

export async function backendGetSystemGuideViewUrl(
  accessToken: string,
  id: string
): Promise<SystemGuideViewUrlResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/system-guides/${encodeURIComponent(id)}/view-url`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return parseOrThrow<SystemGuideViewUrlResponseBody>(res);
}