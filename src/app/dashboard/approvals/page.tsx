'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardCheck, Check, X as XIcon, Eye, Pencil, Trash2, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { FormSubmission } from '@/lib/types';
import { DashboardShell } from '../DashboardShell';

function canModify(s: FormSubmission): boolean {
  return s.status !== 'accepted' || s.edit_unlocked;
}

function ViewSubmissionModal({ submission, onClose }: { submission: FormSubmission; onClose: () => void }) {
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
          {submission.department_name} · {submission.submitted_by_name} ·{' '}
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

function DecideModal({
  submission,
  onClose,
  onDecided,
}: {
  submission: FormSubmission;
  onClose: () => void;
  onDecided: (s: FormSubmission) => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();
  const [reason, setReason] = useState('');
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitDecision(action: 'accept' | 'reject') {
    setError(null);
    action === 'accept' ? setIsAccepting(true) : setIsRejecting(true);
    try {
      const res = await authorizedFetch(`/api/form-submissions/${submission.id}/review`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа.');
      onDecided(data.submission);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа.');
    } finally {
      setIsAccepting(false);
      setIsRejecting(false);
    }
  }

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
          {submission.department_name} · {submission.submitted_by_name} ·{' '}
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

        <div className="my-5 h-px bg-white/10" />

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {language === 'mn' ? 'Татгалзах шалтгаан' : 'Rejection reason'}{' '}
          <span className="font-sans text-[11px] font-normal normal-case text-slate-500">
            ({language === 'mn' ? 'зөвхөн татгалзах тохиолдолд, заавал биш' : 'only if rejecting, optional'})
          </span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isAccepting || isRejecting}
          rows={2}
          placeholder={language === 'mn' ? 'Юуг засаж дахин илгээх ёстойг бичиж болно (заавал биш)...' : 'Explain what needs to be fixed (optional)...'}
          className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
        />

        <div className="mt-4 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={() => submitDecision('reject')}
            disabled={isAccepting || isRejecting}
            className="flex items-center gap-1.5 rounded-xl bg-rose-500/15 px-4 py-2.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/25 disabled:opacity-50"
          >
            <XIcon className="h-4 w-4" />
            {isRejecting ? (language === 'mn' ? 'Илгээж байна…' : 'Submitting…') : language === 'mn' ? 'Татгалзах' : 'Reject'}
          </button>
          <button
            type="button"
            onClick={() => submitDecision('accept')}
            disabled={isAccepting || isRejecting}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-4 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            {isAccepting ? (language === 'mn' ? 'Илгээж байна…' : 'Submitting…') : language === 'mn' ? 'Зөвшөөрөх' : 'Accept'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompanyEditModal({
  submission,
  onClose,
  onSaved,
}: {
  submission: FormSubmission;
  onClose: () => void;
  onSaved: (s: FormSubmission) => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();

  const [title, setTitle] = useState(submission.title);
  const [values, setValues] = useState<Record<string, string>>(submission.data);
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
    if (title.trim().length < 2) {
      setError(language === 'mn' ? 'Гарчгийг оруулна уу.' : 'Enter a title.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authorizedFetch(`/api/form-submissions/${submission.id}/edit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), data: values }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа.');
      onSaved(data.submission);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div role="dialog" aria-modal="true" className="dash-card relative w-full max-w-2xl rounded-3xl p-6 shadow-2xl sm:p-7 max-h-[85vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-xl text-white">{language === 'mn' ? 'Тайлан засах' : 'Edit report'}</h2>
          <button type="button" onClick={onClose} className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === 'mn' ? 'Гарчиг' : 'Title'}
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
            {Object.entries(values).map(([label, value]) => (
              <div key={label}>
                <label className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-[1.125rem] text-slate-400">
                  {label}
                </label>
                <input
                  value={value}
                  onChange={(e) => setValues((prev) => ({ ...prev, [label]: e.target.value }))}
                  disabled={isSubmitting}
                  className="glass-input mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm text-white disabled:opacity-60"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50">
              {language === 'mn' ? 'Цуцлах' : 'Cancel'}
            </button>
            <button type="submit" disabled={isSubmitting} className="rounded-xl bg-gradient-to-r from-[#0072ce] to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0072ce]/25 disabled:opacity-50">
              {isSubmitting ? (language === 'mn' ? 'Хадгалж байна…' : 'Saving…') : language === 'mn' ? 'Хадгалах' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteSubmissionModal({
  submission,
  onClose,
  onDeleted,
}: {
  submission: FormSubmission;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    try {
      const res = await authorizedFetch(`/api/form-submissions/${submission.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Алдаа гарлаа.');
      }
      onDeleted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Алдаа гарлаа.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="dash-card relative w-full max-w-sm rounded-3xl p-6 shadow-2xl">
        <h2 className="font-serif text-lg text-white">{language === 'mn' ? 'Тайланг устгах уу?' : 'Delete this report?'}</h2>
        <p className="mt-2 text-sm text-slate-400">&quot;{submission.title}&quot;</p>
        {error && (
          <div role="alert" className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
            {error}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} disabled={isDeleting} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50">
            {language === 'mn' ? 'Цуцлах' : 'Cancel'}
          </button>
          <button type="button" onClick={handleDelete} disabled={isDeleting} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50">
            {isDeleting ? (language === 'mn' ? 'Устгаж байна…' : 'Deleting…') : language === 'mn' ? 'Устгах' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RequestAccessModal({
  submission,
  onClose,
  onRequested,
}: {
  submission: FormSubmission;
  onClose: () => void;
  onRequested: () => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (reason.trim().length < 2) {
      setError(language === 'mn' ? 'Шалтгаанаа бичнэ үү.' : 'Please enter a reason.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await authorizedFetch(`/api/form-submissions/${submission.id}/request-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Алдаа гарлаа.');
      onRequested();
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
      <div role="dialog" aria-modal="true" className="dash-card relative w-full max-w-sm rounded-3xl p-6 shadow-2xl">
        <h2 className="font-serif text-lg text-white">{language === 'mn' ? 'Засах эрх хүсэх' : 'Request edit access'}</h2>
        <p className="mt-1 text-xs text-slate-500">
          {language === 'mn'
            ? 'Зөвшөөрсөн тайланг засах/устгах бол Super Admin-ийн зөвшөөрөл шаардлагатай.'
            : 'Editing/deleting an accepted report requires Super Admin approval.'}
        </p>
        {error && (
          <div role="alert" className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-300">
            {error}
          </div>
        )}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={isSubmitting}
          rows={3}
          placeholder={language === 'mn' ? 'Яагаад засах/устгах шаардлагатай байгаагаа бичнэ үү...' : 'Explain why you need to edit/delete this...'}
          className="glass-input mt-3 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
        />
        <div className="mt-4 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50">
            {language === 'mn' ? 'Цуцлах' : 'Cancel'}
          </button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="rounded-xl bg-gradient-to-r from-[#0072ce] to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {isSubmitting ? (language === 'mn' ? 'Илгээж байна…' : 'Sending…') : language === 'mn' ? 'Илгээх' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalsPage() {
  const { user, isInitializing, authorizedFetch } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [viewing, setViewing] = useState<FormSubmission | null>(null);
  const [deciding, setDeciding] = useState<FormSubmission | null>(null);
  const [editing, setEditing] = useState<FormSubmission | null>(null);
  const [deleting, setDeleting] = useState<FormSubmission | null>(null);
  const [requestingAccess, setRequestingAccess] = useState<FormSubmission | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

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

  if (isInitializing || !user || user.role !== 'company') {
    return (
      <div className="dash-bg flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">{language === 'mn' ? 'Ачааллаж байна…' : 'Loading…'}</p>
      </div>
    );
  }

  const pending = submissions.filter((s) => s.status === 'pending');
  const reviewed = submissions.filter((s) => s.status !== 'pending');

  function renderRowActions(s: FormSubmission) {
    const editable = canModify(s);
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => setViewing(s)}
          className="flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label={language === 'mn' ? 'Харах' : 'View'}
        >
          <Eye className="h-4 w-4" />
        </button>
        {editable ? (
          <>
            <button
              type="button"
              onClick={() => setEditing(s)}
              className="flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label={language === 'mn' ? 'Засах' : 'Edit'}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeleting(s)}
              className="flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
              aria-label={language === 'mn' ? 'Устгах' : 'Delete'}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        ) : requestedIds.has(s.id) ? (
          <span className="flex items-center gap-1 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-slate-500">
            <Lock className="h-3.5 w-3.5" />
            {language === 'mn' ? 'Хүсэлт илгээгдсэн' : 'Request sent'}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setRequestingAccess(s)}
            className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
          >
            <Lock className="h-3.5 w-3.5" />
            {language === 'mn' ? 'Эрх хүсэх' : 'Request access'}
          </button>
        )}
      </div>
    );
  }

  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="dash-card rounded-3xl px-6 py-5">
          <h1 className="font-serif text-2xl text-white">{language === 'mn' ? 'Хүсэлтүүд' : 'Approvals'}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {language === 'mn' ? 'Хэлтэсүүдээс ирсэн тайлангуудыг хянаж зөвшөөрнө.' : 'Review reports submitted by your departments.'}
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
                  <ClipboardCheck className="h-8 w-8 text-slate-500" />
                  <p className="text-sm text-slate-400">{language === 'mn' ? 'Хүлээгдэж буй тайлан алга.' : 'No pending reports.'}</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {pending.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-white">{s.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {s.department_name} · {s.submitted_by_name} ·{' '}
                          {new Date(s.created_at).toLocaleDateString(language === 'mn' ? 'mn-MN' : 'en-US')}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDeciding(s)}
                          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/15"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {language === 'mn' ? 'Харах / Шийдвэрлэх' : 'View / Decide'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditing(s)}
                          className="flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                          aria-label={language === 'mn' ? 'Засах' : 'Edit'}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(s)}
                          className="flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300"
                          aria-label={language === 'mn' ? 'Устгах' : 'Delete'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
                  {reviewed.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{s.title}</p>
                        <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          {s.department_name}
                          <span
                            className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                              s.status === 'accepted' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
                            }`}
                          >
                            {s.status === 'accepted'
                              ? language === 'mn' ? 'Зөвшөөрсөн' : 'Accepted'
                              : language === 'mn' ? 'Татгалзсан' : 'Rejected'}
                          </span>
                        </p>
                      </div>
                      {renderRowActions(s)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {viewing && <ViewSubmissionModal submission={viewing} onClose={() => setViewing(null)} />}

      {deciding && (
        <DecideModal
          submission={deciding}
          onClose={() => setDeciding(null)}
          onDecided={(updated) => setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))}
        />
      )}

      {editing && (
        <CompanyEditModal
          submission={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))}
        />
      )}

      {deleting && (
        <DeleteSubmissionModal
          submission={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => setSubmissions((prev) => prev.filter((s) => s.id !== deleting.id))}
        />
      )}

      {requestingAccess && (
        <RequestAccessModal
          submission={requestingAccess}
          onClose={() => setRequestingAccess(null)}
          onRequested={() => setRequestedIds((prev) => new Set(prev).add(requestingAccess.id))}
        />
      )}
    </DashboardShell>
  );
}