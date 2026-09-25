'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Users2, Plus, X, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Department, DepartmentTemplate } from '@/lib/types';
import { DashboardShell } from '../DashboardShell';

function CreateDepartmentModal({
  templates,
  onClose,
  onCreated,
}: {
  templates: DepartmentTemplate[];
  onClose: () => void;
  onCreated: (d: Department) => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();

  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '');
  const [adminFullName, setAdminFullName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!templateId) {
      setError(language === 'mn' ? 'Хэлтэсийн төрөл сонгоно уу.' : 'Select a department type.');
      return;
    }
    if (adminFullName.trim().length < 2) {
      setError(language === 'mn' ? 'Админы нэрийг оруулна уу.' : 'Enter admin name.');
      return;
    }
    if (!adminEmail.includes('@')) {
      setError(language === 'mn' ? 'Имэйл хаяг буруу байна.' : 'Invalid email.');
      return;
    }
    if (adminPassword.length < 10) {
      setError(language === 'mn' ? 'Нууц үг дор хаяж 10 тэмдэгттэй байх ёстой.' : 'Password must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authorizedFetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: templateId,
          admin_full_name: adminFullName.trim(),
          admin_email: adminEmail.trim(),
          admin_password: adminPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа.');
      onCreated(data.department);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="dash-card relative w-full max-w-md rounded-3xl p-6 shadow-2xl sm:p-7">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-xl text-white">{language === 'mn' ? 'Шинэ хэлтэс нэмэх' : 'Add new department'}</h2>
          <button type="button" onClick={onClose} className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</div>}

          {templates.length === 0 ? (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              {language === 'mn'
                ? 'Хэлтэсийн загвар байхгүй байна — Super Admin-тай холбогдож эхлээд загвар (HR, Finance гэх мэт) үүсгүүлнэ үү.'
                : 'No department templates yet — ask your Super Admin to create one first.'}
            </p>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                {language === 'mn' ? 'Хэлтэсийн төрөл' : 'Department type'}
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={isSubmitting}
                className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white disabled:opacity-60"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id} className="bg-[#0e1626]">
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="h-px bg-white/10" />
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {language === 'mn' ? 'Хэлтэсийн админ нэвтрэх мэдээлэл' : 'Department admin login'}
          </p>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === 'mn' ? 'Бүтэн нэр' : 'Full name'}
            </label>
            <input
              value={adminFullName}
              onChange={(e) => setAdminFullName(e.target.value)}
              disabled={isSubmitting}
              className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === 'mn' ? 'Имэйл' : 'Email'}
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              disabled={isSubmitting}
              placeholder="hr@company.mn"
              className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === 'mn' ? 'Нууц үг' : 'Password'}
            </label>
            <input
              type="text"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              disabled={isSubmitting}
              placeholder={language === 'mn' ? 'Дор хаяж 10 тэмдэгт' : 'At least 10 characters'}
              className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50">
              {language === 'mn' ? 'Цуцлах' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || templates.length === 0}
              className="rounded-xl bg-gradient-to-r from-[#0072ce] to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0072ce]/25 disabled:opacity-50"
            >
              {isSubmitting ? (language === 'mn' ? 'Хадгалж байна…' : 'Saving…') : language === 'mn' ? 'Хадгалах' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DepartmentsPage() {
  const { user, isInitializing, authorizedFetch } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [templates, setTemplates] = useState<DepartmentTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isInitializing && !user) router.replace('/login');
    else if (!isInitializing && user && user.role !== 'company') router.replace('/dashboard');
  }, [isInitializing, user, router]);

  useEffect(() => {
    if (!user || user.role !== 'company') return;
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [deptRes, tplRes] = await Promise.all([
          authorizedFetch('/api/departments'),
          authorizedFetch('/api/department-templates'),
        ]);
        const deptData = await deptRes.json();
        const tplData = await tplRes.json();
        if (!deptRes.ok) throw new Error(deptData.error || 'Алдаа гарлаа.');
        if (!tplRes.ok) throw new Error(tplData.error || 'Алдаа гарлаа.');
        if (!cancelled) {
          setDepartments(deptData.departments);
          setTemplates(tplData.templates);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Алдаа гарлаа.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, authorizedFetch]);

  // Компанийн доторх аль хэдийн үүссэн хэлтэсийн template-үүдийг
  // dropdown-с хасна (нэг компанид нэг төрлийн хэлтэс 1 удаа л үүснэ).
  const usedTemplateIds = new Set(departments.map((d) => d.template_id));
  const availableTemplates = templates.filter((t) => !usedTemplateIds.has(t.id));

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await authorizedFetch(`/api/departments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Алдаа гарлаа.');
      }
      setDepartments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  }

  if (isInitializing || !user || user.role !== 'company') {
    return (
      <div className="dash-bg flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{language === 'mn' ? 'Ачааллаж байна…' : 'Loading…'}</p>
      </div>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="dash-card flex flex-wrap items-center justify-between gap-3 rounded-3xl px-6 py-5">
          <div>
            <h1 className="font-serif text-2xl text-white">{language === 'mn' ? 'Хэлтэсүүд' : 'Departments'}</h1>
            <p className="mt-1 text-sm text-slate-400">
              {language === 'mn' ? 'Компанийхаа хэлтэс, тэдгээрийн админ бүртгэлийг удирдана.' : 'Manage your departments and their admins.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0072ce] to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0072ce]/25 transition-transform active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            {language === 'mn' ? 'Хэлтэс нэмэх' : 'Add department'}
          </button>
        </div>

        <div className="dash-card overflow-hidden rounded-3xl">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">{language === 'mn' ? 'Ачааллаж байна…' : 'Loading…'}</p>
          ) : loadError ? (
            <p className="px-4 py-8 text-center text-sm text-rose-300">{loadError}</p>
          ) : departments.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <Users2 className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">
                {language === 'mn' ? 'Хэлтэс бүртгэгдээгүй байна. Дээрх товчоор эхнийхийг нэмнэ үү.' : 'No departments yet.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">{language === 'mn' ? 'Хэлтэс' : 'Department'}</th>
                  <th className="px-4 py-3 font-semibold">{language === 'mn' ? 'Админ' : 'Admin'}</th>
                  <th className="px-4 py-3 font-semibold">{language === 'mn' ? 'Имэйл' : 'Email'}</th>
                  <th className="px-4 py-3 font-semibold text-right">{language === 'mn' ? 'Үйлдэл' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => (
                  <tr key={d.id} className="border-t border-white/5">
                    <td className="px-4 py-3.5 font-medium text-white">{d.name}</td>
                    <td className="px-4 py-3.5 text-slate-400">{d.admin_full_name || '—'}</td>
                    <td className="px-4 py-3.5 text-slate-400">{d.admin_email || '—'}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleDelete(d.id)}
                          disabled={deletingId === d.id}
                          className="flex items-center justify-center rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-50"
                          aria-label={language === 'mn' ? 'Устгах' : 'Delete'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {createOpen && (
        <CreateDepartmentModal
          templates={availableTemplates}
          onClose={() => setCreateOpen(false)}
          onCreated={(d) => setDepartments((prev) => [d, ...prev])}
        />
      )}
    </DashboardShell>
  );
}