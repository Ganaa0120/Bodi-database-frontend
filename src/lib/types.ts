import type { Frequency, UnitId } from './units';

export type UserRole = 'super_admin' | 'company' | 'department';
export type Language = 'mn' | 'en';
export type ThemeMode = 'dark' | 'light';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string | null;
  department_id: string | null;
}

export interface LoginResult {
  accessToken: string;
  accessTokenExpiresIn: string;
  user: AuthUser;
}

export interface ApiErrorBody {
  error?: string;
  details?: Array<{ path: string; message: string }>;
}

export interface Company {
  id: string;
  name: string;
  phone: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  admin_id?: string | null;
  admin_full_name?: string | null;
  admin_email?: string | null;
}

/**
 * Хэлтсийн формын нэг талбар (нэг data point).
 *
 * - code: өөрчлөгддөггүй түлхүүр ("D-201"). Тайлангийн утга үүгээр хадгалагдана,
 *   KPI тооцоолол үүгээр заана. Нэг удаа оноосны дараа хэзээ ч солихгүй.
 * - label: харагдах нэр — чөлөөтэй засаж болно, өгөгдөлд нөлөөлөхгүй.
 * - unit: нэгжийн каталогоос (lib/units.ts). Утгын шалгалтыг нэгж тодорхойлно.
 * - frequency: 'year' талбарууд зөвхөн 4-р улирлын тайланд бөглөгдөнө.
 */
export interface FormField {
  code: string;
  label: string;
  unit: UnitId;
  frequency: Frequency;
  required: boolean;
  active: boolean;
}

export interface DepartmentTemplate {
  id: string;
  name: string;
  form_schema: FormField[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  company_id: string;
  company_name?: string;
  template_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  admin_id?: string | null;
  admin_email?: string | null;
  admin_full_name?: string | null;
}

export interface MyDepartment {
  id: string;
  name: string;
  template_id: string;
  form_schema: FormField[];
}

export type SubmissionStatus = 'pending' | 'accepted' | 'rejected';

export interface FormSubmission {
  id: string;
  company_id: string;
  company_name?: string;
  department_id: string;
  department_name?: string;
  submitted_by: string;
  submitted_by_name?: string;
  title: string;
  /** Талбарын код → утга (таслалгүй тоон string). Жишээ нь { "D-201": "120" }. */
  data: Record<string, string>;
  status: SubmissionStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  edit_unlocked: boolean;
  /** Тайлант хугацаа. Хугацаа нэмэгдэхээс өмнөх тайлангууд null. */
  period_year: number | null;
  period_quarter: number | null;
  /**
   * Тайлан илгээсэн хэлтсийн загварын талбарууд — жагсаалт (GET) дээр ирнэ.
   * Кодыг нэр, нэгж рүү хөрвүүлж харуулахад. Review/засварын хариуд ирэхгүй.
   */
  form_schema?: FormField[];
  created_at: string;
  updated_at: string;
}

export interface SubmissionStat {
  group_id: string;
  group_name: string;
  count: number;
}

export interface EditRequest {
  id: string;
  submission_id: string;
  submission_title?: string;
  submission_data?: Record<string, string>;
  submission_status?: SubmissionStatus;
  submission_created_at?: string;
  company_name?: string;
  department_name?: string;
  requested_by_name?: string;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface AnalyticsGroupItem { group_id: string; group_name: string; count: number }
export interface AnalyticsStatusItem { status: string; count: number }
export interface AnalyticsTimeItem { period: string; count: number }
export interface AnalyticsFilters {
  companies: { id: string; name: string }[];
  departments: { id: string; name: string; company_id: string }[];
}
export interface AnalyticsResponse {
  totalsByStatus: AnalyticsStatusItem[];
  overTime: AnalyticsTimeItem[];
  byGroup: AnalyticsGroupItem[];
  groupLabel: 'company' | 'department';
  filters: AnalyticsFilters;
}