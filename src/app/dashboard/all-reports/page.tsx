'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Eye, X as XIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FormSubmission } from '@/lib/types';
import { SubmissionValues } from '@/components/SubmissionValues';
import { PeriodBadge } from '@/components/PeriodBadge';
import { DashboardShell } from '../DashboardShell';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300',
  accepted: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-rose-500/15 text-rose-300',
};

/**
 * Хугацаагаар эрэмбэлэх: шинэ улирал эхэндээ, хугацаагүй (хуучин) тайлангууд
 * төгсгөлд, адил хугацаатай бол илгээсэн огноогоор.
 */
function sortByPeriod(list: FormSubmission[]): FormSubmission[] {
  const periodKey = (s: FormSubmission) =>
    s.period_year !== null && s.period_quarter !== null ? s.period_year * 10 + s.period_quarter : -1;
  return [...list].sort((a, b) => {
    const diff = periodKey(b) - periodKey(a);
    if (diff !== 0) return diff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function ViewModal({ submission, onClose }: { submission: FormSubmission; onClose: () => void }) {
  const { language } = useLanguage();
  const mn = language === 'mn';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="dash-card relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-3xl p-6 shadow-2xl sm:p-7"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-serif text-xl text-white">{submission.title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={mn ? 'Хаах' : 'Close'}
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-3 text-sm text-slate-400">
          {submission.company_name} / {submission.department_name}
          {submission.submitted_by_name ? ` / ${submission.submitted_by_name}` : ''}
        </p>

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <PeriodBadge year={submission.period_year} quarter={submission.period_quarter} language={language} />
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[submission.status] ?? ''}`}>
            {statusLabel(submission.status, language)}
          </span>
          <p className="text-xs text-slate-500">
            {mn ? 'Илгээсэн: ' : 'Submitted: '}
            {new Date(submission.created_at).toLocaleString(mn ? 'mn-MN' : 'en-US')}
          </p>
        </div>

        <SubmissionValues data={submission.data} fields={submission.form_schema} />

        {submission.status === 'rejected' && submission.rejection_reason && (
          <p className="mt-5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2.5 text-sm text-rose-300">
            {mn ? 'Татгалзсан шалтгаан: ' : 'Rejection reason: '}
            {submission.rejection_reason}
          </p>
        )}
      </div>
    </div>
  );
}

function statusLabel(s: string, language: string): string {
  const mn = language === 'mn';
  if (s === 'pending') return mn ? 'Хүлээгдэж буй' : 'Pending';
  if (s === 'accepted') return mn ? 'Зөвшөөрсөн' : 'Accepted';
  return mn ? 'Татгалзсан' : 'Rejected';
}

export default function AllReportsPage() {
  const { user, isInitializing, authorizedFetch } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const mn = language === 'mn';

  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<FormSubmission | null>(null);

  useEffect(() => {
    if (!isInitializing && !user) router.replace('/login');
    else if (!isInitializing && user && user.role !== 'super_admin') router.replace('/dashboard');
  }, [isInitializing, user, router]);

  useEffect(() => {
    if (!user || user.role !== 'super_admin') return;
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await authorizedFetch('/api/form-submissions');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа.');
        if (!cancelled) setSubmissions(sortByPeriod(data.submissions ?? []));
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

  if (isInitializing || !user || user.role !== 'super_admin') {
    return (
      <div className="dash-bg flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{mn ? 'Ачааллаж байна…' : 'Loading…'}</p>
      </div>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="dash-card rounded-3xl px-6 py-5">
          <h1 className="font-serif text-2xl text-white">{mn ? 'Бүх тайлан' : 'All Reports'}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {mn
              ? 'Bodi Group-ийн бүх компанийн бүх хэлтэсээс ирсэн тайлангууд.'
              : "All reports submitted across Bodi Group's companies and departments."}
          </p>
        </div>

        <div className="dash-card overflow-hidden rounded-3xl">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">{mn ? 'Ачааллаж байна…' : 'Loading…'}</p>
          ) : loadError ? (
            <p className="px-4 py-8 text-center text-sm text-rose-300">{loadError}</p>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <FileText className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">{mn ? 'Тайлан алга байна.' : 'No reports yet.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-semibold">{mn ? 'Компани' : 'Company'}</th>
                    <th className="px-4 py-3 font-semibold">{mn ? 'Хэлтэс' : 'Department'}</th>
                    <th className="px-4 py-3 font-semibold">{mn ? 'Хугацаа' : 'Period'}</th>
                    <th className="px-4 py-3 font-semibold">{mn ? 'Гарчиг' : 'Title'}</th>
                    <th className="px-4 py-3 font-semibold">{mn ? 'Төлөв' : 'Status'}</th>
                    <th className="px-4 py-3 font-semibold">{mn ? 'Илгээсэн' : 'Submitted'}</th>
                    <th className="px-4 py-3 text-right font-semibold">{mn ? 'Үйлдэл' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s) => (
                    <tr key={s.id} className="border-t border-white/5">
                      <td className="px-4 py-3.5 font-medium text-white">{s.company_name}</td>
                      <td className="px-4 py-3.5 text-slate-300">{s.department_name}</td>
                      <td className="px-4 py-3.5">
                        <PeriodBadge year={s.period_year} quarter={s.period_quarter} language={language} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">{s.title}</td>
                      <td className="px-4 py-3.5">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[s.status] ?? ''}`}>
                          {statusLabel(s.status, language)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-400">
                        {new Date(s.created_at).toLocaleDateString(mn ? 'mn-MN' : 'en-US')}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setViewing(s)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {mn ? 'Харах' : 'View'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {viewing && <ViewModal submission={viewing} onClose={() => setViewing(null)} />}
    </DashboardShell>
  );
}