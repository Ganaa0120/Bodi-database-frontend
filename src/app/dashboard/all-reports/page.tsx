'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Eye, X as XIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FormSubmission } from '@/lib/types';
import { DashboardShell } from '../DashboardShell';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300',
  accepted: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-rose-500/15 text-rose-300',
};

function ViewModal({ submission, onClose }: { submission: FormSubmission; onClose: () => void }) {
  const { language } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="dash-card relative w-full max-w-3xl rounded-3xl p-6 shadow-2xl sm:p-7 max-h-[85vh] overflow-y-auto">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-serif text-xl text-white">{submission.title}</h2>
          <button type="button" onClick={onClose} className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-5 text-xs text-slate-500">
          {submission.company_name} · {submission.department_name} · {submission.submitted_by_name} ·{' '}
          {new Date(submission.created_at).toLocaleString(language === 'mn' ? 'mn-MN' : 'en-US')}
        </p>
        <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
          {Object.entries(submission.data).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white/5 px-3.5 py-2.5">
              <p className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-[1.125rem] text-slate-500">{label}</p>
              <p className="mt-1 text-sm text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AllReportsPage() {
  const { user, isInitializing, authorizedFetch } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

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
        if (!cancelled) setSubmissions(data.submissions);
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
        <p className="text-sm text-slate-400">{language === 'mn' ? 'Ачааллаж байна…' : 'Loading…'}</p>
      </div>
    );
  }

  const statusLabel = (s: string) =>
    s === 'pending'
      ? language === 'mn' ? 'Хүлээгдэж буй' : 'Pending'
      : s === 'accepted'
        ? language === 'mn' ? 'Зөвшөөрсөн' : 'Accepted'
        : language === 'mn' ? 'Татгалзсан' : 'Rejected';

  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="dash-card rounded-3xl px-6 py-5">
          <h1 className="font-serif text-2xl text-white">{language === 'mn' ? 'Бүх тайлан' : 'All Reports'}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {language === 'mn'
              ? 'Bodi Group-ийн бүх компанийн бүх хэлтэсээс ирсэн тайлангууд.'
              : "All reports submitted across Bodi Group's companies and departments."}
          </p>
        </div>

        <div className="dash-card overflow-hidden rounded-3xl">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">{language === 'mn' ? 'Ачааллаж байна…' : 'Loading…'}</p>
          ) : loadError ? (
            <p className="px-4 py-8 text-center text-sm text-rose-300">{loadError}</p>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <FileText className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">{language === 'mn' ? 'Тайлан алга байна.' : 'No reports yet.'}</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">{language === 'mn' ? 'Компани' : 'Company'}</th>
                  <th className="px-4 py-3 font-semibold">{language === 'mn' ? 'Хэлтэс' : 'Department'}</th>
                  <th className="px-4 py-3 font-semibold">{language === 'mn' ? 'Гарчиг' : 'Title'}</th>
                  <th className="px-4 py-3 font-semibold">{language === 'mn' ? 'Төлөв' : 'Status'}</th>
                  <th className="px-4 py-3 font-semibold">{language === 'mn' ? 'Огноо' : 'Date'}</th>
                  <th className="px-4 py-3 font-semibold text-right">{language === 'mn' ? 'Үйлдэл' : 'Action'}</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-t border-white/5">
                    <td className="px-4 py-3.5 font-medium text-white">{s.company_name}</td>
                    <td className="px-4 py-3.5 text-slate-300">{s.department_name}</td>
                    <td className="px-4 py-3.5 text-slate-300">{s.title}</td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[s.status]}`}>
                        {statusLabel(s.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {new Date(s.created_at).toLocaleDateString(language === 'mn' ? 'mn-MN' : 'en-US')}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setViewing(s)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {language === 'mn' ? 'Харах' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {viewing && <ViewModal submission={viewing} onClose={() => setViewing(null)} />}
    </DashboardShell>
  );
}