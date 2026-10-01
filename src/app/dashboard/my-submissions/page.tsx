"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  CalendarRange,
  Info,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dropdown, type DropdownOption } from "@/components/Dropdown";
import { SubmissionValues } from "@/components/SubmissionValues";
import type { FormField, FormSubmission, MyDepartment, SubmissionStatus } from "@/lib/types";
import {
  UNITS,
  frequencyLabel,
  isAllowedWhileTyping,
  isUnitId,
  normalizeUnitValue,
  unitLabel,
  validateUnitValue,
  type UnitDef,
} from "@/lib/units";
import { DashboardShell } from "../DashboardShell";

/* ───────────────────────── Тайлант хугацаа ───────────────────────── */

type Quarter = 1 | 2 | 3 | 4;
const QUARTERS: Quarter[] = [1, 2, 3, 4];

const MIN_YEAR = 1990;
const MAX_YEAR = 2100;

/** Аль хэдийн тайлантай хугацаанууд: "2025-3" → төлөв. */
type TakenPeriods = Map<string, SubmissionStatus>;

function periodKey(year: number, quarter: number): string {
  return `${year}-${quarter}`;
}

function quarterMonths(q: number, language: string): string {
  const mn = ["1–3 сар", "4–6 сар", "7–9 сар", "10–12 сар"];
  const en = ["Jan–Mar", "Apr–Jun", "Jul–Sep", "Oct–Dec"];
  return (language === "mn" ? mn : en)[q - 1] ?? "";
}

/** "2026 оны 3-р улирал" / "Q3 2026" */
function periodLabel(year: number, quarter: number, language: string): string {
  return language === "mn" ? `${year} оны ${quarter}-р улирал` : `Q${quarter} ${year}`;
}

/** Гарчгийг автоматаар бөглөхөд: "2026 оны 3-р улирлын тайлан" / "Q3 2026 report" */
function periodTitle(year: number, quarter: number, language: string): string {
  return language === "mn" ? `${year} оны ${quarter}-р улирлын тайлан` : `Q${quarter} ${year} report`;
}

function takenStatusLabel(status: SubmissionStatus, language: string): string {
  const mn = language === "mn";
  if (status === "accepted") return mn ? "Зөвшөөрсөн" : "Accepted";
  if (status === "rejected") return mn ? "Татгалзсан" : "Rejected";
  return mn ? "Илгээсэн" : "Submitted";
}

/**
 * Тухайн улирлын тайланд бөглөх талбар мөн эсэх. Жилийн ('year')
 * үзүүлэлтүүд зөвхөн 4-р улирлын тайланд орно. Backend ижил дүрэмтэй.
 */
function fieldAppliesTo(field: FormField, quarter: number | null): boolean {
  return field.frequency !== "year" || quarter === 4;
}

/* ───────────────────────── Тоон талбарын туслах ───────────────────────── */

// Тоог "2,000,000" маягаар харуулах, буцаагаад цэвэр тоо ("2000000")
// болгож задлах туслах функцууд. Зөвхөн ДҮРСЛЭЛД ашиглагдана — сервер рүү
// явуулах өгөгдөл нь үргэлж цэвэр тоон string (таслалгүй) хэвээр байна.
function formatNumberInput(raw: string): string {
  const negative = raw.startsWith("-");
  const digitsOnly = raw.replace(/[^\d.]/g, "");
  const [intPart, decimalPart] = digitsOnly.split(".");
  const withCommas = (intPart || "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = decimalPart !== undefined ? `${withCommas}.${decimalPart}` : withCommas;
  return negative ? `-${body}` : body;
}

function stripCommas(formatted: string): string {
  return formatted.replace(/,/g, "");
}

/** Утсан дээр зөв гарын товчлуур: сөрөг тоонд "-" товчтой гар хэрэгтэй. */
function inputModeFor(field: FormField): "text" | "numeric" | "decimal" {
  if (!isUnitId(field.unit)) return "text";
  const def: UnitDef = UNITS[field.unit];
  // iOS-ийн decimal/numeric гар дээр "-" товч байдаггүй.
  if (def.allowNegative) return "text";
  return def.integer ? "numeric" : "decimal";
}

/** Бичиж байх үед нэгжид тохирохгүй тэмдэгтийг оруулахгүй. */
function allowWhileTyping(field: FormField, raw: string): boolean {
  if (raw === "") return true;
  if (isUnitId(field.unit)) return isAllowedWhileTyping(field.unit, raw);
  return /^-?\d*\.?\d*$/.test(raw); // шилжүүлээгүй хуучин талбар
}

function fieldUnitText(field: FormField, language: string): string {
  return isUnitId(field.unit) ? unitLabel(field.unit, language) : String(field.unit ?? "");
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

/* ───────────────────────── Period badge ───────────────────────── */

function PeriodBadge({
  year,
  quarter,
  language,
}: {
  year: number | null;
  quarter: number | null;
  language: string;
}) {
  if (!year || !quarter) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
        <CalendarRange className="h-3 w-3" />
        {language === "mn" ? "Хугацаа тодорхойгүй" : "No period"}
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-[#0072ce]/15 px-2 py-0.5 text-[11px] font-semibold text-sky-300">
      <CalendarRange className="h-3 w-3" />
      {periodLabel(year, quarter, language)}
    </span>
  );
}

/* ───────────────────────── Тайлан бөглөх modal ───────────────────────── */

function SubmissionFormModal({
  mode,
  department,
  initial,
  takenPeriods,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit";
  department: MyDepartment;
  initial?: FormSubmission;
  /** Энэ хэлтсийн бусад тайлангийн хугацаа (засаж буй тайлан өөрөө ороогүй). */
  takenPeriods: TakenPeriods;
  onClose: () => void;
  onSaved: (s: FormSubmission) => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();
  const mn = language === "mn";

  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<number>(initial?.period_year ?? currentYear);
  // Улирлыг санаатайгаар default-гүй үлдээнэ — буруу улиралд чимээгүй
  // илгээгдэхээс сэргийлж, хэрэглэгч заавал өөрөө сонгоно.
  const [quarter, setQuarter] = useState<Quarter | null>(
    (initial?.period_quarter as Quarter | null | undefined) ?? null,
  );

  const [title, setTitle] = useState(initial?.title ?? "");
  // Хэрэглэгч гарчгийг өөрөө бичээгүй бол хугацаанаас автоматаар бөглөнө.
  const [titleEdited, setTitleEdited] = useState(mode === "edit");
  const [values, setValues] = useState<Record<string, string>>(
    initial?.data ?? {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Талбар бүрийн алдаа — талбараас гарах (blur) үед шууд харагдана.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function setFieldError(code: string, message: string | null) {
    setFieldErrors((prev) => {
      if (!message) {
        if (!(code in prev)) return prev;
        const next = { ...prev };
        delete next[code];
        return next;
      }
      return prev[code] === message ? prev : { ...prev, [code]: message };
    });
  }
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  // Он: 2100 → 1990 (шинэ нь дээрээ). Бүх улирал нь тайлантай онг сонгох боломжгүй.
  const yearOptions = useMemo<DropdownOption<number>[]>(() => {
    const list: DropdownOption<number>[] = [];
    for (let y = MAX_YEAR; y >= MIN_YEAR; y--) {
      const takenCount = QUARTERS.filter((q) => takenPeriods.has(periodKey(y, q))).length;
      list.push({
        value: y,
        label: mn ? `${y} он` : String(y),
        hint: y === currentYear ? (mn ? "энэ он" : "this year") : undefined,
        badge: takenCount > 0 ? `${takenCount}/4` : undefined,
        disabled: takenCount === 4,
        searchText: String(y),
      });
    }
    return list;
  }, [takenPeriods, currentYear, mn]);

  // Улирал: тухайн онд аль хэдийн тайлантай улирлыг сонгох боломжгүй.
  const quarterOptions = useMemo<DropdownOption<Quarter>[]>(
    () =>
      QUARTERS.map((q) => {
        const takenStatus = takenPeriods.get(periodKey(year, q));
        return {
          value: q,
          label: mn ? `${q}-р улирал` : `Q${q}`,
          hint: quarterMonths(q, language),
          badge: takenStatus ? takenStatusLabel(takenStatus, language) : undefined,
          disabled: Boolean(takenStatus),
          searchText: String(q),
        };
      }),
    [takenPeriods, year, language, mn],
  );

  const takenInYear = QUARTERS.filter((q) => takenPeriods.has(periodKey(year, q)));
  const rejectedInYear = QUARTERS.filter((q) => takenPeriods.get(periodKey(year, q)) === "rejected");

  // Он солиход сонгосон улирал тухайн онд аль хэдийн тайлантай бол цэвэрлэнэ.
  useEffect(() => {
    if (quarter && takenPeriods.has(periodKey(year, quarter))) setQuarter(null);
  }, [year, quarter, takenPeriods]);

  useEffect(() => {
    if (!titleEdited && quarter) setTitle(periodTitle(year, quarter, language));
  }, [year, quarter, titleEdited, language]);

  const activeFields = department.form_schema.filter((f) => f.active);
  // Жилийн үзүүлэлтүүд зөвхөн 4-р улиралд харагдана.
  const visibleFields = activeFields.filter((f) => fieldAppliesTo(f, quarter));
  const hasYearlyFields = activeFields.some((f) => f.frequency === "year");
  const hasUnsavedInput =
    (titleEdited && title.trim().length > 0) ||
    Object.values(values).some((v) => v.trim().length > 0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, values, titleEdited]);

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

    if (!quarter) {
      setError(mn ? "Тайлант хугацааны улирлыг сонгоно уу." : "Select the reporting quarter.");
      return;
    }
    // Давхар шалгалт — сервер ч мөн адил шалгана (unique index).
    if (takenPeriods.has(periodKey(year, quarter))) {
      setError(
        mn
          ? `${periodLabel(year, quarter, language)}-ын тайлан аль хэдийн илгээгдсэн байна.`
          : `A report for ${periodLabel(year, quarter, language)} has already been submitted.`,
      );
      return;
    }
    if (title.trim().length < 2) {
      setError(mn ? "Тайлангийн гарчгийг оруулна уу." : "Enter a report title.");
      return;
    }

    // Зөвхөн харагдаж буй талбаруудыг илгээнэ (4-р улирлаас өөр улирал
    // сонгосон бол жилийн талбарт бичсэн утга явахгүй). Нэгж бүрийн дүрмээр
    // шалгана — сервер ч мөн адил шалгана.
    const payload: Record<string, string> = {};
    for (const field of visibleFields) {
      const raw = (values[field.code] ?? "").trim();
      if (raw === "") {
        if (field.required) {
          setError(mn ? `"${field.label}" талбарыг бөглөнө үү.` : `Fill in "${field.label}".`);
          return;
        }
        continue;
      }
      if (isUnitId(field.unit)) {
        const check = validateUnitValue(field.unit, raw, language);
        if (!check.ok) {
          setFieldError(field.code, check.error);
          setError(`"${field.label}": ${check.error}`);
          document.getElementById(`field-${field.code}`)?.focus();
          return;
        }
      }
      payload[field.code] = raw;
    }
    if (Object.keys(payload).length === 0) {
      setError(mn ? "Дор хаяж нэг талбар бөглөнө үү." : "Fill in at least one field.");
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
        body: JSON.stringify({
          period_year: year,
          period_quarter: quarter,
          title: title.trim(),
          data: payload,
        }),
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
              ? mn
                ? `${department.name} — тайлан илгээх`
                : `${department.name} — submit report`
              : mn
                ? "Засаж дахин илгээх"
                : "Edit and resubmit"}
          </h2>
          <button
            type="button"
            onClick={requestClose}
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label={mn ? "Хаах" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* autoComplete="off" — browser өмнө бичсэн утгуудыг ("Saved info")
            санал болгохгүй. Тайлангийн тоо улирал бүр өөр тул хэрэггүй. */}
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
            >
              {error}
            </div>
          )}

          {/* Тайлант хугацаа — формын хамгийн эхэнд */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <CalendarRange className="h-3.5 w-3.5" />
              {mn ? "Тайлант хугацаа" : "Reporting period"}
              <span className="text-rose-400">*</span>
            </p>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="period-year" className="block text-[11px] text-slate-500">
                  {mn ? "Он" : "Year"}
                </label>
                <div className="mt-1">
                  <Dropdown<number>
                    id="period-year"
                    value={year}
                    options={yearOptions}
                    onChange={setYear}
                    placeholder={mn ? "Он сонгох" : "Select year"}
                    disabled={isSubmitting}
                    ariaLabel={mn ? "Он" : "Year"}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="period-quarter" className="block text-[11px] text-slate-500">
                  {mn ? "Улирал" : "Quarter"}
                </label>
                <div className="mt-1">
                  <Dropdown<Quarter>
                    id="period-quarter"
                    value={quarter}
                    options={quarterOptions}
                    onChange={setQuarter}
                    placeholder={
                      takenInYear.length === 4
                        ? mn
                          ? "Энэ онд бүх улирал илгээгдсэн"
                          : "All quarters submitted"
                        : mn
                          ? "Улирал сонгох"
                          : "Select quarter"
                    }
                    disabled={isSubmitting || takenInYear.length === 4}
                    ariaLabel={mn ? "Улирал" : "Quarter"}
                  />
                </div>
              </div>
            </div>

            {takenInYear.length > 0 && (
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
                <Info className="mt-px h-3.5 w-3.5 shrink-0" />
                <span>
                  {mn
                    ? `${year} онд ${takenInYear.join(", ")}-р улирлын тайлан илгээгдсэн тул дахин сонгох боломжгүй.`
                    : `Q${takenInYear.join(", Q")} ${year} already submitted and can't be selected again.`}
                  {rejectedInYear.length > 0 &&
                    (mn
                      ? " Татгалзсан тайланг жагсаалтаас \"Засаж дахин илгээх\"-ээр засна уу."
                      : " Fix rejected reports from the list with \"Fix & resubmit\".")}
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              {mn ? "Тайлангийн гарчиг" : "Report title"}
            </label>
            <input
              required
              name="report-title"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleEdited(true);
              }}
              disabled={isSubmitting}
              placeholder={
                mn
                  ? "Улирал сонгоход автоматаар бөглөгдөнө"
                  : "Filled automatically when you pick a quarter"
              }
              className="glass-input mt-2 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>

          <div className="h-px bg-white/10" />

          {activeFields.length === 0 ? (
            <p className="text-sm text-slate-500">
              {mn
                ? "Энэ хэлтэст талбар тохируулагдаагүй байна — Super Admin-тай холбогдоно уу."
                : "No fields configured for this department yet."}
            </p>
          ) : (
            <>
              {hasYearlyFields && quarter !== 4 && (
                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
                  <Info className="mt-px h-3.5 w-3.5 shrink-0" />
                  {mn
                    ? "Жилийн үзүүлэлтүүд зөвхөн 4-р улирлын тайланд бөглөгдөнө."
                    : "Yearly indicators are filled in the Q4 report only."}
                </p>
              )}
              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                {visibleFields.map((field) => (
                  <div key={field.code} className="flex flex-col">
                    {/* Label — 2 мөрийн зайг НӨӨЦӨЛЖ (min-height), урт/богино нэр
                        үл хамааран доорх input бүгд ижил өндөрт эхэлнэ. */}
                    <label
                      htmlFor={`field-${field.code}`}
                      className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-[1.125rem] text-slate-300"
                    >
                      {field.label}
                      {field.required && <span className="text-rose-400"> *</span>}
                    </label>
                    {/* Код · давтамж — тусдаа, тогтмол 1 мөр */}
                    <span className="text-[11px] leading-4 text-slate-500">
                      <span className="font-mono">{field.code}</span> ·{" "}
                      {frequencyLabel(field.frequency, language)}
                    </span>
                    <div className="relative mt-1.5">
                      <input
                        id={`field-${field.code}`}
                        name={`field-${field.code}`}
                        type="text"
                        autoComplete="off"
                        // Password manager-ууд (1Password, LastPass, Bitwarden) санал болгохгүй
                        data-1p-ignore
                        data-lpignore="true"
                        data-bwignore
                        data-form-type="other"
                        inputMode={inputModeFor(field)}
                        required={field.required}
                        value={formatNumberInput(values[field.code] ?? "")}
                        onChange={(e) => {
                          const raw = stripCommas(e.target.value);
                          // Нэгжид тохирохгүй тэмдэгтийг (хүний тоонд "-", ".")
                          // үл тоомсорлоно.
                          if (!allowWhileTyping(field, raw)) return;
                          setValues((prev) => ({ ...prev, [field.code]: raw }));
                          // Засаж эхэлмэгц алдааг арилгана — дахин blur үед шалгана.
                          setFieldError(field.code, null);
                        }}
                        onBlur={() => {
                          // Гарахдаа нэгжийн оронгийн тоогоор тэгшилнэ:
                          // 1000 → 1,000.00 (тэрбум ₮), 95.5 → 95.50 (%).
                          if (!isUnitId(field.unit)) return;
                          const unit = field.unit;
                          const current = (values[field.code] ?? "").trim();
                          if (!current) {
                            setFieldError(field.code, null);
                            return;
                          }
                          const normalized = normalizeUnitValue(unit, current);
                          if (normalized !== current) {
                            setValues((prev) => ({ ...prev, [field.code]: normalized }));
                          }
                          // Хэт их утга, илүү орон г.м-ийг шууд харуулна.
                          const check = validateUnitValue(unit, normalized, language);
                          setFieldError(field.code, check.ok ? null : check.error);
                        }}
                        disabled={isSubmitting}
                        aria-invalid={Boolean(fieldErrors[field.code]) || undefined}
                        aria-describedby={fieldErrors[field.code] ? `field-${field.code}-error` : undefined}
                        className={`glass-input w-full rounded-xl py-2.5 pl-3.5 pr-16 text-sm text-white placeholder:text-slate-500 disabled:opacity-60 ${
                          fieldErrors[field.code] ? "ring-1 ring-rose-500/70" : ""
                        }`}
                      />
                      {/* Нэгж — input дотор баруун талд */}
                      <span className="pointer-events-none absolute right-3.5 top-1/2 max-w-[3.5rem] -translate-y-1/2 truncate text-xs text-slate-500">
                        {fieldUnitText(field, language)}
                      </span>
                    </div>
                    {fieldErrors[field.code] && (
                      <p
                        id={`field-${field.code}-error`}
                        role="alert"
                        className="mt-1 text-[11px] leading-4 text-rose-300"
                      >
                        {fieldErrors[field.code]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={requestClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50"
            >
              {mn ? "Цуцлах" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || visibleFields.length === 0 || !quarter}
              className="rounded-xl bg-gradient-to-r from-[#0072ce] to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0072ce]/25 disabled:opacity-50"
            >
              {isSubmitting
                ? mn
                  ? "Илгээж байна…"
                  : "Submitting…"
                : mn
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
              {mn ? "Хаахдаа итгэлтэй байна уу?" : "Are you sure you want to close?"}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              {mn
                ? "Бөглөсөн мэдээлэл хадгалагдахгүй, устах болно."
                : "Your entered data will not be saved and will be lost."}
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmCloseOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10"
              >
                {mn ? "Үгүй" : "No"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-500"
              >
                {mn ? "Тийм" : "Yes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Тайлан харах modal ───────────────────────── */

function ViewSubmissionModal({
  submission,
  fields,
  onClose,
}: {
  submission: FormSubmission;
  fields: FormField[];
  onClose: () => void;
}) {
  const { language } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="dash-card relative w-full max-w-3xl rounded-3xl p-6 shadow-2xl sm:p-7 max-h-[85vh] overflow-y-auto"
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="font-serif text-xl text-white">{submission.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label={language === "mn" ? "Хаах" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <PeriodBadge
            year={submission.period_year}
            quarter={submission.period_quarter}
            language={language}
          />
          <p className="text-xs text-slate-500">
            {language === "mn" ? "Илгээсэн: " : "Submitted: "}
            {new Date(submission.created_at).toLocaleString(
              language === "mn" ? "mn-MN" : "en-US",
            )}
          </p>
        </div>
        <SubmissionValues data={submission.data} fields={fields} />
        {submission.status === "rejected" && submission.rejection_reason && (
          <p className="mt-5 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3.5 py-2.5 text-sm text-rose-300">
            {language === "mn" ? "Татгалзсан шалтгаан: " : "Rejection reason: "}
            {submission.rejection_reason}
          </p>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

/** Хэлтсийн тайлангуудаас эзлэгдсэн хугацааны map үүсгэнэ (excludeId-ийг алгасна). */
function buildTakenPeriods(submissions: FormSubmission[], excludeId?: string): TakenPeriods {
  const map: TakenPeriods = new Map();
  for (const s of submissions) {
    if (s.id === excludeId) continue;
    if (s.period_year && s.period_quarter) {
      map.set(periodKey(s.period_year, s.period_quarter), s.status);
    }
  }
  return map;
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
  const [viewing, setViewing] = useState<FormSubmission | null>(null);

  const takenForCreate = useMemo(() => buildTakenPeriods(submissions), [submissions]);
  const takenForEdit = useMemo(
    () => buildTakenPeriods(submissions, editingSubmission?.id),
    [submissions, editingSubmission?.id],
  );

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
                ? "Компанидаа улирал бүр илгээсэн тайлангийн жагсаалт."
                : "Quarterly reports you have submitted to your company."}
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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <PeriodBadge
                            year={s.period_year}
                            quarter={s.period_quarter}
                            language={language}
                          />
                          <p className="truncate text-sm font-medium text-white">
                            {s.title}
                          </p>
                        </div>
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
                        <button
                          type="button"
                          onClick={() => setViewing(s)}
                          className="flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                          aria-label={language === "mn" ? "Харах" : "View"}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
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
          takenPeriods={takenForCreate}
          onClose={() => setCreateOpen(false)}
          onSaved={(s) => setSubmissions((prev) => [s, ...prev])}
        />
      )}
      {editingSubmission && department && (
        <SubmissionFormModal
          mode="edit"
          department={department}
          initial={editingSubmission}
          takenPeriods={takenForEdit}
          onClose={() => setEditingSubmission(null)}
          onSaved={(updated) =>
            setSubmissions((prev) =>
              prev.map((s) => (s.id === updated.id ? updated : s)),
            )
          }
        />
      )}
      {viewing && (
        <ViewSubmissionModal
          submission={viewing}
          fields={department?.form_schema ?? []}
          onClose={() => setViewing(null)}
        />
      )}
    </DashboardShell>
  );
}