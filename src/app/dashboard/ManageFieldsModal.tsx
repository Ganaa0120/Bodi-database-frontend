"use client";

import { useMemo, useState } from "react";
import { X, Trash2, Plus, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dropdown, type DropdownOption } from "@/components/Dropdown";
import type { DepartmentTemplate, FormField } from "@/lib/types";
import {
  FREQUENCIES,
  UNITS,
  UNIT_GROUPS,
  frequencyLabel,
  isUnitId,
  unitLabel,
  type Frequency,
  type UnitDef,
  type UnitId,
} from "@/lib/units";

/** Талбарын код: "D-201", "HR-015" гэх мэт. Backend дээр ижил дүрэмтэй. */
const CODE_PATTERN = /^[A-Z]{1,5}-\d{3,4}$/;

/** Нэгжийн шалгалтын товч тайлбар (dropdown-д бүдгээр харагдана). */
function unitRuleHint(unit: UnitId, language: string): string | undefined {
  const def: UnitDef = UNITS[unit];
  const mn = language === "mn";
  if (unit === "percent") return "0–100";
  if (def.allowNegative) return mn ? "сөрөг болно" : "can be negative";
  if (def.integer) return mn ? "бүхэл тоо" : "whole number";
  return undefined;
}

/**
 * React key. Кодгүй хуучин талбарт (08 migration хийгдээгүй) байрлалаар
 * нь key үүсгэнэ — эс бөгөөс бүх key undefined болж давхцана.
 */
function fieldKey(field: FormField, index: number): string {
  return field.code ? field.code : `legacy-${index}`;
}

/** 08 migration хийгдээгүй (кодгүй эсвэл каталогт байхгүй нэгжтэй) талбар. */
function isLegacyField(field: FormField): boolean {
  return !field.code || !isUnitId(field.unit);
}

/** Талбарын картын доорх мөр: "D-201 · хүн · Улирал · Заавал" */
function fieldMeta(field: FormField, language: string): string {
  const parts = [
    field.code,
    isUnitId(field.unit) ? unitLabel(field.unit, language) : String(field.unit ?? ""),
    frequencyLabel(field.frequency, language),
  ];
  if (field.required) parts.push(language === "mn" ? "Заавал" : "Required");
  return parts.filter(Boolean).join(" · ");
}

export function ManageFieldsModal({
  template,
  onClose,
  onUpdated,
}: {
  template: DepartmentTemplate;
  onClose: () => void;
  onUpdated: (t: DepartmentTemplate) => void;
}) {
  const { language } = useLanguage();
  const { authorizedFetch } = useAuth();
  const mn = language === "mn";

  const [fields, setFields] = useState<FormField[]>(template.form_schema);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  // Нэгжийг санаатайгаар default-гүй үлдээнэ — буруу нэгжтэй талбар
  // анзааралгүй үүсэхээс сэргийлнэ.
  const [unit, setUnit] = useState<UnitId | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("quarter");
  const [required, setRequired] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitOptions = useMemo<DropdownOption<UnitId>[]>(
    () =>
      UNIT_GROUPS.flatMap((group) =>
        group.units.map((id) => ({
          value: id,
          label: unitLabel(id, language),
          hint: unitRuleHint(id, language),
          group: mn ? group.labelMn : group.labelEn,
          searchText: unitLabel(id, language),
        })),
      ),
    [language, mn],
  );

  const frequencyOptions = useMemo<DropdownOption<Frequency>[]>(
    () =>
      FREQUENCIES.map((f) => ({
        value: f,
        label: frequencyLabel(f, language),
        hint:
          f === "year"
            ? mn
              ? "зөвхөн 4-р улиралд"
              : "Q4 report only"
            : undefined,
      })),
    [language, mn],
  );

  async function saveFields(next: FormField[]): Promise<boolean> {
    setIsSaving(true);
    setError(null);
    try {
      const res = await authorizedFetch(`/api/department-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ form_schema: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Алдаа гарлаа.");
      setFields(data.template.form_schema);
      onUpdated(data.template);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAdd() {
    const trimmedCode = code.trim().toUpperCase();
    const trimmedLabel = label.trim();

    if (!CODE_PATTERN.test(trimmedCode)) {
      setError(
        mn
          ? 'Талбарын кодыг "D-201" хэлбэрээр оруулна уу (Excel-ийн Data ID).'
          : 'Enter the field code like "D-201" (the Excel Data ID).',
      );
      return;
    }
    // Идэвхгүй талбарын кодыг ч давтахгүй — хуучин тайлангууд тэр кодоор хадгалагдсан.
    if (fields.some((f) => f.code === trimmedCode)) {
      setError(
        mn
          ? `"${trimmedCode}" код аль хэдийн ашиглагдсан байна (идэвхгүй талбаруудыг ч шалгана уу).`
          : `Code "${trimmedCode}" is already used (check inactive fields too).`,
      );
      return;
    }
    if (trimmedLabel.length < 1) {
      setError(mn ? "Талбарын нэрийг оруулна уу." : "Enter a field label.");
      return;
    }
    if (fields.some((f) => f.active && f.label === trimmedLabel)) {
      setError(
        mn
          ? "Ийм нэртэй идэвхтэй талбар аль хэдийн байна."
          : "An active field with this label already exists.",
      );
      return;
    }
    if (!unit) {
      setError(mn ? "Нэгжийг сонгоно уу." : "Select a unit.");
      return;
    }

    const newField: FormField = {
      code: trimmedCode,
      label: trimmedLabel,
      unit,
      frequency,
      required,
      active: true,
    };
    const saved = await saveFields([...fields, newField]);
    // Амжилтгүй бол бичсэн утгуудыг хадгална — дахин бичүүлэхгүй.
    if (saved) {
      setCode("");
      setLabel("");
      setUnit(null);
    }
  }

  // Бодитоор устгахгүй — "active: false" болгож л тэмдэглэнэ. Өмнөх
  // тайлангуудын утга энэ кодоор хадгалагдсан хэвээр байгаа тул бодитоор
  // устгавал түүхэн тайланг зөв харуулах боломжгүй болно.
  function handleSoftDelete(index: number) {
    saveFields(fields.map((f, i) => (i === index ? { ...f, active: false } : f)));
  }

  function handleRestore(index: number) {
    const target = fields[index];
    if (target && fields.some((f, i) => i !== index && f.active && f.label === target.label)) {
      setError(
        mn
          ? "Ийм нэртэй идэвхтэй талбар байгаа тул сэргээх боломжгүй."
          : "An active field with this label exists, so it can't be restored.",
      );
      return;
    }
    saveFields(fields.map((f, i) => (i === index ? { ...f, active: true } : f)));
  }

  const activeFields = fields.filter((f) => f.active);
  const inactiveFields = fields.filter((f) => !f.active);
  // Хуучин бүтэцтэй талбар байвал хадгалах бүх үйлдэл backend дээр
  // татгалзагдана — migration хийгдэх хүртэл засварыг хаана.
  const hasLegacyFields = fields.some(isLegacyField);
  const isLocked = isSaving || hasLegacyFields;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        role="dialog"
        aria-modal="true"
        className="dash-card relative w-full max-w-3xl rounded-3xl p-6 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-xl text-white">
            {mn ? `Талбар удирдах — ${template.name}` : `Manage fields — ${template.name}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label={mn ? "Хаах" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {hasLegacyFields && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
          >
            {mn
              ? "Энэ загварт хуучин бүтэцтэй (кодгүй) талбар байна. 08_form_field_codes.sql migration-ийг ажиллуулсны дараа засах боломжтой болно."
              : "This template has fields in the old format (no code). Run the 08_form_field_codes.sql migration to edit it."}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"
          >
            {error}
          </div>
        )}

        {/* Идэвхтэй талбарууд — grid (2 багана) */}
        <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {activeFields.length === 0 ? (
            <p className="text-sm text-slate-500 sm:col-span-2">
              {mn ? "Идэвхтэй талбар алга." : "No active fields yet."}
            </p>
          ) : (
            activeFields.map((f) => {
              const realIndex = fields.indexOf(f);
              return (
                <div
                  key={fieldKey(f, realIndex)}
                  className="flex items-start justify-between gap-2 rounded-xl bg-white/5 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white" title={f.label}>
                      {f.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{fieldMeta(f, language)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSoftDelete(realIndex)}
                    disabled={isLocked}
                    className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-50"
                    aria-label={mn ? "Идэвхгүй болгох" : "Deactivate"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Идэвхгүй (soft-deleted) талбарууд — сэргээх боломжтой */}
        {inactiveFields.length > 0 && (
          <>
            <div className="h-px bg-white/10" />
            <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {mn
                ? "Идэвхгүй талбарууд (устгагдаагүй, зөвхөн нуугдсан)"
                : "Inactive fields (not deleted, just hidden)"}
            </p>
            <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {inactiveFields.map((f) => {
                const realIndex = fields.indexOf(f);
                return (
                  <div
                    key={fieldKey(f, realIndex)}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.02] px-3.5 py-2.5 opacity-60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-400 line-through" title={f.label}>
                        {f.label}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{f.code || "—"}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestore(realIndex)}
                      disabled={isLocked}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {mn ? "Сэргээх" : "Restore"}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Шинэ талбар нэмэх */}
        <div className="h-px bg-white/10" />
        <p className="mt-4 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {mn ? "Шинэ талбар нэмэх" : "Add a new field"}
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[140px_1fr]">
          <div>
            <label htmlFor="field-code" className="block text-[11px] text-slate-500">
              {mn ? "Код (Data ID)" : "Code (Data ID)"}
            </label>
            <input
              id="field-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
              disabled={isLocked}
              maxLength={10}
              placeholder="D-201"
              className="glass-input mt-1 w-full rounded-xl px-3.5 py-2.5 font-mono text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>
          <div>
            <label htmlFor="field-label" className="block text-[11px] text-slate-500">
              {mn ? "Талбарын нэр" : "Field label"}
            </label>
            <input
              id="field-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={isLocked}
              maxLength={300}
              placeholder={mn ? "Жишээ нь: Нийт ажилтан / FTE" : "e.g. Total employees / FTE"}
              className="glass-input mt-1 w-full rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="field-unit" className="block text-[11px] text-slate-500">
              {mn ? "Нэгж" : "Unit"}
            </label>
            <div className="mt-1">
              <Dropdown<UnitId>
                id="field-unit"
                value={unit}
                options={unitOptions}
                onChange={setUnit}
                placeholder={mn ? "Нэгж сонгох" : "Select unit"}
                disabled={isLocked}
                ariaLabel={mn ? "Нэгж" : "Unit"}
              />
            </div>
          </div>
          <div>
            <label htmlFor="field-frequency" className="block text-[11px] text-slate-500">
              {mn ? "Давтамж" : "Frequency"}
            </label>
            <div className="mt-1">
              <Dropdown<Frequency>
                id="field-frequency"
                value={frequency}
                options={frequencyOptions}
                onChange={setFrequency}
                placeholder={mn ? "Давтамж сонгох" : "Select frequency"}
                disabled={isLocked}
                ariaLabel={mn ? "Давтамж" : "Frequency"}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              disabled={isLocked}
            />
            {mn ? "Заавал бөглөх" : "Required"}
          </label>

          <button
            type="button"
            onClick={handleAdd}
            disabled={isLocked}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0072ce] to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0072ce]/25 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {mn ? "Талбар нэмэх" : "Add field"}
          </button>
        </div>
      </div>
    </div>
  );
}