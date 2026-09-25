"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FileText, Plus, X, Clock, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { FormSubmission, MyDepartment } from "@/lib/types";
import { DashboardShell } from "../DashboardShell";

// Тоог "2,000,000" маягаар харуулах, буцаагаад цэвэр тоо ("2000000")
// болгож задлах туслах функцууд. Зөвхөн ДҮРСЛЭЛД ашиглагдана — сервер рүү
// явуулах өгөгдөл нь үргэлж цэвэр тоон string (таслалгүй) хэвээр байна.
function formatNumberInput(raw: string): string {
  const digitsOnly = raw.replace(/[^\d.]/g, "");
  const [intPart, decimalPart] = digitsOnly.split(".");
  const withCommas = (intPart || "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimalPart !== undefined
    ? `${withCommas}.${decimalPart}`
    : withCommas;
}

function stripCommas(formatted: string): string {
  return formatted.replace(/,/g, "");
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  accepted: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-rose-500/15 text-rose-300",
};
const STATUS_ICON = {
  pending: Clock,
  accepted: CheckCircle2,
  rejected: XCircle,
};

function SubmissionFormModal({
  mode,
  department,
  initial,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  department: MyDepartment;
  initial?: FormSubmission;
  onClose: () => void;
  onSaved: (s: FormSubmission) => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [values, setValues] = useState<Record<string, string>>(
    initial?.data ?? {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const activeFields = department.form_schema.filter((f) => f.active);
  const hasUnsavedInput =
    title.trim().length > 0 ||
    Object.values(values).some((v) => v.trim().length > 0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, values]);

  // Ямар нэг зүйл бөглөсөн бол шууд хаахгүй, баталгаажуулна.
  // Хоосон бол шууд хаана — санаа зовох зүйлгүй.
  function requestClose() {
    if (hasUnsavedInput) {
      setConfirmCloseOpen(true);
    } else {
      onClose();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 2) {
      setError(
        language === "mn"
          ? "Тайлангийн гарчгийг оруулна уу."
          : "Enter a report title.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const url =
        mode === "create"
          ? "/api/form-submissions"
          : `/api/form-submissions/${initial!.id}`;
      const res = await authorizedFetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), data: values }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Алдаа гарлаа.");
      onSaved(resData.submission);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop дээр дарахад ХААГДАХГҮЙ — зөвхөн X/Цуцлах товчоор л хаагдана */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        className="dash-card relative w-full max-w-3xl rounded-3xl p-6 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-xl text-white">
            {mode === "create"
              ? language === "mn"
                ? `${department.name} — тайлан илгээх`
                : `${department.name} — submit report`
              : language === "mn"
                ? "Засаж дахин илгээх"
                : "Edit and resubmit"}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label={language === "mn" ? "Хаах" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
            >
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {language === "mn" ? "Тайлангийн гарчиг" : "Report title"}
            </label>
            <input
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              placeholder={
                language === "mn"
                  ? "Жишээ нь: 2026 оны 9-р сарын тайлан"
                  : "e.g. September 2026 report"
              }
              className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>

          <div className="h-px bg-white/10" />

          {activeFields.length === 0 ? (
            <p className="text-sm text-slate-500">
              {language === "mn"
                ? "Энэ хэлтэст талбар тохируулагдаагүй байна — Super Admin-тай холбогдоно уу."
                : "No fields configured for this department yet."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              {activeFields.map((field) => (
                <div key={field.label} className="flex flex-col">
                  {/* Label — 2 мөрийн зайг НӨӨЦӨЛЖ (min-height), урт/богино нэр
                      үл хамааран доорх input бүгд ижил өндөрт эхэлнэ. */}
                  <label className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-[1.125rem] text-slate-300">
                    {field.label}
                    {field.required && (
                      <span className="text-rose-400"> *</span>
                    )}
                  </label>
                  {/* Нэгж/давтамж — тусдаа, тогтмол 1 мөр */}
                  <span className="text-[11px] leading-4 text-slate-500">
                    {field.frequency}
                    {field.unit ? ` · ${field.unit}` : ""}
                  </span>
                  <input
                    type="text"
                    inputMode={field.type === "number" ? "decimal" : "text"}
                    required={field.required}
                    value={
                      field.type === "number"
                        ? formatNumberInput(values[field.label] ?? "")
                        : (values[field.label] ?? "")
                    }
                    onChange={(e) => {
                      const raw =
                        field.type === "number"
                          ? stripCommas(e.target.value)
                          : e.target.value;
                      // Тоон талбарт зөвхөн тоо/цэг бичихийг зөвшөөрнө —
                      // үсэг/бусад тэмдэгт орж ирвэл үл тоомсорлоно.
                      if (
                        field.type === "number" &&
                        raw !== "" &&
                        !/^\d*\.?\d*$/.test(raw)
                      )
                        return;
                      setValues((prev) => ({ ...prev, [field.label]: raw }));
                    }}
                    disabled={isSubmitting}
                    className="glass-input mt-1.5 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={requestClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50"
            >
              {language === "mn" ? "Цуцлах" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || activeFields.length === 0}
              className="rounded-xl bg-gradient-to-r from-[#0072ce] to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0072ce]/25 disabled:opacity-50"
            >
              {isSubmitting
                ? language === "mn"
                  ? "Илгээж байна…"
                  : "Submitting…"
                : language === "mn"
                  ? "Илгээх"
                  : "Submit"}
            </button>
          </div>
        </form>
      </div>

      {/* "Итгэлтэй байна уу?" баталгаажуулах modal */}
      {confirmCloseOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" />
          <div
            role="alertdialog"
            aria-modal="true"
            className="dash-card relative w-full max-w-sm rounded-3xl p-6 shadow-2xl"
          >
            <h3 className="font-serif text-lg text-white">
              {language === "mn"
                ? "Хаахдаа итгэлтэй байна уу?"
                : "Are you sure you want to close?"}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              {language === "mn"
                ? "Бөглөсөн мэдээлэл хадгалагдахгүй, устах болно."
                : "Your entered data will not be saved and will be lost."}
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmCloseOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10"
              >
                {language === "mn" ? "Үгүй" : "No"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-500"
              >
                {language === "mn" ? "Тийм" : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MySubmissionsPage() {
  const { user, isInitializing, authorizedFetch } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [department, setDepartment] = useState<MyDepartment | null>(null);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSubmission, setEditingSubmission] =
    useState<FormSubmission | null>(null);

  useEffect(() => {
    if (!isInitializing && !user) router.replace("/login");
    else if (!isInitializing && user && user.role !== "department")
      router.replace("/dashboard");
  }, [isInitializing, user, router]);

  useEffect(() => {
    if (!user || user.role !== "department") return;
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const [deptRes, subRes] = await Promise.all([
          authorizedFetch("/api/departments/mine"),
          authorizedFetch("/api/form-submissions"),
        ]);
        const deptData = await deptRes.json();
        const subData = await subRes.json();
        if (!deptRes.ok) throw new Error(deptData.error || "Алдаа гарлаа.");
        if (!subRes.ok) throw new Error(subData.error || "Алдаа гарлаа.");
        if (!cancelled) {
          setDepartment(deptData.department);
          setSubmissions(subData.submissions);
        }
      } catch (err) {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : "Алдаа гарлаа.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, authorizedFetch]);

  if (isInitializing || !user || user.role !== "department") {
    return (
      <div className="dash-bg flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-400">
          {language === "mn" ? "Ачааллаж байна…" : "Loading…"}
        </p>
      </div>
    );
  }

  const statusLabel = (s: string) =>
    s === "pending"
      ? language === "mn"
        ? "Хүлээгдэж буй"
        : "Pending"
      : s === "accepted"
        ? language === "mn"
          ? "Зөвшөөрсөн"
          : "Accepted"
        : language === "mn"
          ? "Татгалзсан"
          : "Rejected";

  return (
    <DashboardShell>
      <div className="space-y-4">
        <div className="dash-card flex flex-wrap items-center justify-between gap-3 rounded-3xl px-6 py-5">
          <div>
            <h1 className="font-serif text-2xl text-white">
              {department
                ? department.name
                : language === "mn"
                  ? "Миний тайлангууд"
                  : "My Reports"}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {language === "mn"
                ? "Компанидаа илгээсэн тайлангийн жагсаалт."
                : "Reports you have submitted to your company."}
            </p>
          </div>
          {department && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#0072ce] to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0072ce]/25 transition-transform active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              {language === "mn" ? "Тайлан илгээх" : "Submit report"}
            </button>
          )}
        </div>

        <div className="dash-card overflow-hidden rounded-3xl">
          {isLoading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-400">
              {language === "mn" ? "Ачааллаж байна…" : "Loading…"}
            </p>
          ) : loadError ? (
            <p className="px-4 py-8 text-center text-sm text-rose-300">
              {loadError}
            </p>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <FileText className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">
                {language === "mn"
                  ? "Тайлан илгээгээгүй байна."
                  : "No reports submitted yet."}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {submissions.map((s) => {
                const StatusIcon = STATUS_ICON[s.status];
                return (
                  <li key={s.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {s.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {new Date(s.created_at).toLocaleString(
                            language === "mn" ? "mn-MN" : "en-US",
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_STYLE[s.status]}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {statusLabel(s.status)}
                        </span>
                        {s.status === "rejected" && (
                          <button
                            type="button"
                            onClick={() => setEditingSubmission(s)}
                            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
                          >
                            {language === "mn"
                              ? "Засаж дахин илгээх"
                              : "Fix & resubmit"}
                          </button>
                        )}
                      </div>
                    </div>
                    {s.status === "rejected" && s.rejection_reason && (
                      <p className="mt-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2 text-xs text-rose-300">
                        {language === "mn"
                          ? "Татгалзсан шалтгаан: "
                          : "Rejection reason: "}
                        {s.rejection_reason}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {createOpen && department && (
        <SubmissionFormModal
          mode="create"
          department={department}
          onClose={() => setCreateOpen(false)}
          onSaved={(s) => setSubmissions((prev) => [s, ...prev])}
        />
      )}
      {editingSubmission && department && (
        <SubmissionFormModal
          mode="edit"
          department={department}
          initial={editingSubmission}
          onClose={() => setEditingSubmission(null)}
          onSaved={(updated) =>
            setSubmissions((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s)),
            )
          }
        />
      )}
    </DashboardShell>
  );
}
