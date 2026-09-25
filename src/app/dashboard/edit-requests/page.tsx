'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Check, X as XIcon, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { EditRequest } from '@/lib/types';
import { DashboardShell } from '../DashboardShell';

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300',
  approved: 'bg-emerald-500/15 text-emerald-300',
  denied: 'bg-rose-500/15 text-rose-300',
};

const SUBMISSION_STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300',
  accepted: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-rose-500/15 text-rose-300',
};

function DetailModal({ request, onClose }: { request: EditRequest; onClose: () => void }) {
  const { language } = useLanguage();

  const submissionStatusLabel = (s?: string) =>
    s === 'pending'
      ? language === 'mn' ? 'Хүлээгдэж буй' : 'Pending'
      : s === 'accepted'
        ? language === 'mn' ? 'Зөвшөөрсөн' : 'Accepted'
        : s === 'rejected'
          ? language === 'mn' ? 'Татгалзсан' : 'Rejected'
          : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="dash-card relative w-full max-w-3xl rounded-3xl p-6 shadow-2xl sm:p-7 max-h-[85vh] overflow-y-auto">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-serif text-xl text-white">{request.submission_title}</h2>
          <button type="button" onClick={onClose} className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-1 text-xs text-slate-500">
          {request.company_name} · {request.department_name}
          {request.submission_created_at &&
            ` · ${new Date(request.submission_created_at).toLocaleString(language === 'mn' ? 'mn-MN' : 'en-US')}`}
        </p>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${SUBMISSION_STATUS_STYLE[request.submission_status || '']}`}>
            {language === 'mn' ? 'Тайлангийн төлөв: ' : 'Report status: '}
            {submissionStatusLabel(request.submission_status)}
          </span>
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[request.status]}`}>
            {language === 'mn' ? 'Хүсэлтийн төлөв: ' : 'Request status: '}
            {request.status === 'pending'
              ? language === 'mn' ? 'Хүлээгдэж буй' : 'Pending'
              : request.status === 'approved'
                ? language === 'mn' ? 'Зөвшөөрсөн' : 'Approved'
                : language === 'mn' ? 'Татгалзсан' : 'Denied'}
          </span>
        </div>

        <div className="rounded-xl bg-white/5 px-3.5 py-2.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {language === 'mn' ? 'Хүссэн шалтгаан' : 'Requested reason'}
          </p>
          <p className="mt-1 text-sm text-white">{request.reason}</p>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {language === 'mn' ? 'Хүссэн:' : 'Requested by:'} {request.requested_by_name} ·{' '}
          {new Date(request.created_at).toLocaleString(language === 'mn' ? 'mn-MN' : 'en-US')}
        </p>

        {request.submission_data && Object.keys(request.submission_data).length > 0 && (
          <>
            <div className="my-5 h-px bg-white/10" />
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === 'mn' ? 'Тайлангийн агуулга' : 'Report contents'}
            </p>
            <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
              {Object.entries(request.submission_data).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white/5 px-3.5 py-2.5">
                  <p className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-[1.125rem] text-slate-500">{label}</p>
                  <p className="mt-1 text-sm text-white">{value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function EditRequestsPage() {
  const { user, isInitializing, authorizedFetch } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [requests, setRequests] = useState<EditRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<EditRequest | null>(null);

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
        const res = await authorizedFetch('/api/edit-requests');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа.');
        if (!cancelled) setRequests(data.requests);
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

  async function handleReview(id: string, action: 'approve' | 'deny') {
    setActingId(id);
    try {
      const res = await authorizedFetch(`/api/edit-requests/${id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Алдаа гарлаа.');
      }
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'denied' } : r))
      );
    } catch {
      // silent
    } finally {
      setActingId(null);
    }
  }

  if (isInitializing || !user || user.role !== 'super_admin') {
    return (
      <div className="dash-bg flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{language === 'mn' ? 'Ачааллаж байна…' : 'Loading…'}</p>
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === 'pending');
  const reviewed = requests.filter((r) => r.status !== 'pending');

  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="dash-card rounded-3xl px-6 py-5">
          <h1 className="font-serif text-2xl text-white">
            {language === 'mn' ? 'Зөвшөөрлийн хүсэлтүүд' : 'Permission Requests'}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {language === 'mn'
              ? 'Компаниуд зөвшөөрсөн тайлангаа засах/устгах эрх хүссэн хүсэлтүүд.'
              : 'Requests from companies to edit/delete accepted reports.'}
          </p>
        </div>

        {isLoading ? (
          <div className="dash-card rounded-3xl px-4 py-8 text-center text-sm text-slate-400">
            {language === 'mn' ? 'Ачааллаж байна…' : 'Loading…'}
          </div>
        ) : loadError ? (
          <div className="dash-card rounded-3xl px-4 py-8 text-center text-sm text-rose-300">{loadError}</div>
        ) : (
          <>
            <div className="dash-card overflow-hidden rounded-3xl">
              <div className="border-b border-white/5 px-5 py-3">
                <h2 className="text-sm font-semibold text-white">
                  {language === 'mn' ? 'Хүлээгдэж буй' : 'Pending'} ({pending.length})
                </h2>
              </div>
              {pending.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <KeyRound className="h-8 w-8 text-slate-500" />
                  <p className="text-sm text-slate-400">
                    {language === 'mn' ? 'Хүлээгдэж буй хүсэлт алга.' : 'No pending requests.'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {pending.map((r) => (
                    <li key={r.id} className="px-5 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">{r.submission_title}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {r.company_name} · {r.department_name} · {r.requested_by_name} ·{' '}
                            {new Date(r.created_at).toLocaleDateString(language === 'mn' ? 'mn-MN' : 'en-US')}
                          </p>
                          <p className="mt-1.5 rounded-lg bg-white/5 px-3 py-2 text-xs text-slate-300">{r.reason}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewing(r)}
                            className="flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                            aria-label={language === 'mn' ? 'Харах' : 'View'}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReview(r.id, 'approve')}
                            disabled={actingId === r.id}
                            className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                          >
                            <Check className="h-3.5 w-3.5" />
                            {language === 'mn' ? 'Зөвшөөрөх' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReview(r.id, 'deny')}
                            disabled={actingId === r.id}
                            className="flex items-center gap-1 rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 disabled:opacity-50"
                          >
                            <XIcon className="h-3.5 w-3.5" />
                            {language === 'mn' ? 'Татгалзах' : 'Deny'}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {reviewed.length > 0 && (
              <div className="dash-card overflow-hidden rounded-3xl">
                <div className="border-b border-white/5 px-5 py-3">
                  <h2 className="text-sm font-semibold text-white">{language === 'mn' ? 'Шийдвэрлэсэн' : 'Reviewed'}</h2>
                </div>
                <ul className="divide-y divide-white/5">
                  {reviewed.map((r) => (
                    <li key={r.id} className="flex items-center justify-between px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{r.submission_title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {r.company_name} · {r.department_name}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>
                          {r.status === 'approved'
                            ? language === 'mn' ? 'Зөвшөөрсөн' : 'Approved'
                            : language === 'mn' ? 'Татгалзсан' : 'Denied'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewing(r)}
                          className="flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                          aria-label={language === 'mn' ? 'Харах' : 'View'}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {viewing && <DetailModal request={viewing} onClose={() => setViewing(null)} />}
    </DashboardShell>
  );
}