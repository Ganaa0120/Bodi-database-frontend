import 'server-only';
import type { Company, DepartmentTemplate, Department, FormSubmission, MyDepartment, FormField } from '@/lib/types';

const BACKEND_URL = process.env.BACKEND_URL;

if (!BACKEND_URL) {
  throw new Error('BACKEND_URL environment variable тохируулагдаагүй байна (.env.local харна уу).');
}

const BACKEND_REFRESH_COOKIE_NAME = 'refresh_token';

export class BackendError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : 'Backend алдаа буцаалаа.';
    super(message);
    this.name = 'BackendError';
    this.status = status;
    this.body = body;
  }
}

function extractRefreshToken(res: Response): { value: string; maxAgeSeconds: number } | null {
  const rawCookies =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];

  const refreshCookie = rawCookies.find((c) => c.startsWith(`${BACKEND_REFRESH_COOKIE_NAME}=`));
  if (!refreshCookie) return null;

  const valueMatch = refreshCookie.match(new RegExp(`${BACKEND_REFRESH_COOKIE_NAME}=([^;]+)`));
  const maxAgeMatch = refreshCookie.match(/Max-Age=(\d+)/i);

  const value = valueMatch?.[1];
  if (!value) return null;

  const maxAgeRaw = maxAgeMatch?.[1];

  return {
    value,
    maxAgeSeconds: maxAgeRaw ? parseInt(maxAgeRaw, 10) : 7 * 24 * 60 * 60,
  };
}

interface BackendAuthResult<T> {
  data: T;
  refreshToken: { value: string; maxAgeSeconds: number } | null;
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new BackendError(res.status, body);
  }
  return body as T;
}

export interface LoginResponseBody {
  accessToken: string;
  accessTokenExpiresIn: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: 'super_admin' | 'company' | 'department';
    company_id: string | null;
    department_id: string | null;
  };
}

export async function backendLogin(
  email: string,
  password: string
): Promise<BackendAuthResult<LoginResponseBody>> {
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });

  const data = await parseOrThrow<LoginResponseBody>(res);
  return { data, refreshToken: extractRefreshToken(res) };
}

export async function backendRefresh(
  refreshTokenValue: string
): Promise<BackendAuthResult<LoginResponseBody>> {
  const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { Cookie: `${BACKEND_REFRESH_COOKIE_NAME}=${refreshTokenValue}` },
    cache: 'no-store',
  });

  const data = await parseOrThrow<LoginResponseBody>(res);
  return { data, refreshToken: extractRefreshToken(res) };
}

export async function backendLogout(
  refreshTokenValue: string | undefined,
  accessToken: string | undefined
): Promise<void> {
  const headers: Record<string, string> = {};
  if (refreshTokenValue) headers.Cookie = `${BACKEND_REFRESH_COOKIE_NAME}=${refreshTokenValue}`;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  await fetch(`${BACKEND_URL}/api/auth/logout`, {
    method: 'POST',
    headers,
    cache: 'no-store',
  });
}

export interface MeResponseBody {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: 'super_admin' | 'company' | 'department';
    company_id: string | null;
    department_id: string | null;
    last_login_at: string | null;
  };
}

export async function backendMe(accessToken: string): Promise<MeResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return parseOrThrow<MeResponseBody>(res);
}

// ---------------- Companies ----------------

export interface CompaniesListResponseBody {
  companies: Company[];
}
export interface CompanyResponseBody {
  company: Company;
}

export async function backendListCompanies(accessToken: string): Promise<CompaniesListResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/companies`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return parseOrThrow<CompaniesListResponseBody>(res);
}

export interface CreateCompanyPayload {
  name: string;
  phone: string;
  logo_url?: string | null;
  admin_full_name: string;
  admin_email: string;
  admin_password: string;
}

export async function backendCreateCompany(
  accessToken: string,
  payload: CreateCompanyPayload
): Promise<CompanyResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return parseOrThrow<CompanyResponseBody>(res);
}

export async function backendUpdateCompany(
  accessToken: string,
  id: string,
  payload: Partial<{ name: string; phone: string; logo_url: string | null; is_active: boolean }>
): Promise<CompanyResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/companies/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return parseOrThrow<CompanyResponseBody>(res);
}

export async function backendDeleteCompany(accessToken: string, id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/companies/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BackendError(res.status, body);
  }
}

export interface LogoUploadUrlResponseBody {
  uploadUrl: string;
  publicUrl: string;
}

export async function backendGetLogoUploadUrl(
  accessToken: string,
  fileName: string,
  contentType: string
): Promise<LogoUploadUrlResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/companies/logo-upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ fileName, contentType }),
    cache: 'no-store',
  });
  return parseOrThrow<LogoUploadUrlResponseBody>(res);
}

// ---------------- Department templates ----------------

export interface DepartmentTemplatesListResponseBody {
  templates: DepartmentTemplate[];
}
export interface DepartmentTemplateResponseBody {
  template: DepartmentTemplate;
}

export async function backendListDepartmentTemplates(
  accessToken: string
): Promise<DepartmentTemplatesListResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/department-templates`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return parseOrThrow<DepartmentTemplatesListResponseBody>(res);
}

export async function backendCreateDepartmentTemplate(
  accessToken: string,
  name: string
): Promise<DepartmentTemplateResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/department-templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ name }),
    cache: 'no-store',
  });
  return parseOrThrow<DepartmentTemplateResponseBody>(res);
}

export async function backendDeleteDepartmentTemplate(accessToken: string, id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/department-templates/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BackendError(res.status, body);
  }
}

// ---------------- Departments ----------------

export interface DepartmentsListResponseBody {
  departments: Department[];
}
export interface DepartmentResponseBody {
  department: Department;
}

export async function backendListDepartments(accessToken: string): Promise<DepartmentsListResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/departments`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return parseOrThrow<DepartmentsListResponseBody>(res);
}

export interface CreateDepartmentPayload {
  template_id: string;
  admin_full_name: string;
  admin_email: string;
  admin_password: string;
}

export async function backendCreateDepartment(
  accessToken: string,
  payload: CreateDepartmentPayload
): Promise<DepartmentResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/departments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return parseOrThrow<DepartmentResponseBody>(res);
}

export async function backendDeleteDepartment(accessToken: string, id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/departments/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BackendError(res.status, body);
  }
}

// ---------------- Form submissions ----------------

export interface FormSubmissionsListResponseBody {
  submissions: FormSubmission[];
}
export interface FormSubmissionResponseBody {
  submission: FormSubmission;
}

export async function backendListFormSubmissions(accessToken: string): Promise<FormSubmissionsListResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/form-submissions`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return parseOrThrow<FormSubmissionsListResponseBody>(res);
}

export async function backendCreateFormSubmission(
  accessToken: string,
  payload: { title: string; data: Record<string, string> }
): Promise<FormSubmissionResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/form-submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return parseOrThrow<FormSubmissionResponseBody>(res);
}

export async function backendResubmitFormSubmission(
  accessToken: string,
  id: string,
  payload: { title: string; data: Record<string, string> }
): Promise<FormSubmissionResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/form-submissions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return parseOrThrow<FormSubmissionResponseBody>(res);
}

export async function backendReviewFormSubmission(
  accessToken: string,
  id: string,
  payload: { action: 'accept' | 'reject'; rejection_reason?: string }
): Promise<FormSubmissionResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/form-submissions/${id}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return parseOrThrow<FormSubmissionResponseBody>(res);
}

export async function backendUpdateDepartmentTemplate(
  accessToken: string,
  id: string,
  payload: { name?: string; form_schema?: FormField[] }
): Promise<DepartmentTemplateResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/department-templates/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return parseOrThrow<DepartmentTemplateResponseBody>(res);
}

export interface MyDepartmentResponseBody {
  department: MyDepartment;
}

export async function backendGetMyDepartment(accessToken: string): Promise<MyDepartmentResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/departments/mine`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return parseOrThrow<MyDepartmentResponseBody>(res);
}

export interface FormSubmissionStatsResponseBody {
  stats: import('@/lib/types').SubmissionStat[];
}

export async function backendGetFormSubmissionStats(
  accessToken: string
): Promise<FormSubmissionStatsResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/form-submissions/stats`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return parseOrThrow<FormSubmissionStatsResponseBody>(res);
}

export interface PendingCountResponseBody {
  count: number;
}

export async function backendGetPendingCount(accessToken: string): Promise<PendingCountResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/form-submissions/pending-count`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return parseOrThrow<PendingCountResponseBody>(res);
}

export interface UpdateSubmissionByCompanyResponseBody {
  submission: import('@/lib/types').FormSubmission;
}

export async function backendUpdateSubmissionByCompany(
  accessToken: string,
  id: string,
  payload: { title: string; data: Record<string, string> }
): Promise<UpdateSubmissionByCompanyResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/form-submissions/${id}/edit`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });
  return parseOrThrow<UpdateSubmissionByCompanyResponseBody>(res);
}

export async function backendDeleteSubmissionByCompany(accessToken: string, id: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/form-submissions/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BackendError(res.status, body);
  }
}

export interface RequestEditResponseBody {
  request: { id: string; submission_id: string; reason: string; status: string; created_at: string };
}

export async function backendRequestEdit(
  accessToken: string,
  submissionId: string,
  reason: string
): Promise<RequestEditResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/form-submissions/${submissionId}/request-edit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ reason }),
    cache: 'no-store',
  });
  return parseOrThrow<RequestEditResponseBody>(res);
}

export interface EditRequestsListResponseBody {
  requests: import('@/lib/types').EditRequest[];
}

export async function backendListEditRequests(accessToken: string): Promise<EditRequestsListResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/edit-requests`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return parseOrThrow<EditRequestsListResponseBody>(res);
}

export async function backendReviewEditRequest(
  accessToken: string,
  id: string,
  action: 'approve' | 'deny'
): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/edit-requests/${id}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ action }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new BackendError(res.status, body);
  }
}

export interface AllDepartmentsResponseBody {
  departments: import('@/lib/types').Department[];
}

export async function backendListAllDepartments(accessToken: string): Promise<AllDepartmentsResponseBody> {
  const res = await fetch(`${BACKEND_URL}/api/departments/all`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return parseOrThrow<AllDepartmentsResponseBody>(res);
}

export async function backendGetAnalytics(
  accessToken: string,
  params: { companyId?: string; departmentId?: string; status?: string; from?: string; to?: string }
): Promise<import('@/lib/types').AnalyticsResponse> {
  const qs = new URLSearchParams();
  if (params.companyId) qs.set('companyId', params.companyId);
  if (params.departmentId) qs.set('departmentId', params.departmentId);
  if (params.status) qs.set('status', params.status);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);

  const res = await fetch(`${BACKEND_URL}/api/analytics?${qs.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  return parseOrThrow(res);
}