"use client";

import { useState } from "react";
import { X, Trash2, Plus, RotateCcw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DepartmentTemplate, FormField } from "@/lib/types";

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

  const [fields, setFields] = useState<FormField[]>(template.form_schema);
  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState("");
  const [frequency, setFrequency] = useState<FormField["frequency"]>("Сар");
  const [type, setType] = useState<FormField["type"]>("number");
  const [required, setRequired] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveFields(next: FormField[]) {
    setIsSaving(true);
    setError(null);
    try {
      const res = await authorizedFetch(
        `/api/department-templates/${template.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ form_schema: next }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Алдаа гарлаа.");
      setFields(data.template.form_schema);
      onUpdated(data.template);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Алдаа гарлаа.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleAdd() {
    if (label.trim().length < 1) {
      setError(
        language === "mn"
          ? "Талбарын нэрийг оруулна уу."
          : "Enter a field label.",
      );
      return;
    }
    if (fields.some((f) => f.label === label.trim() && f.active)) {
      setError(
        language === "mn"
          ? "Ийм нэртэй идэвхтэй талбар аль хэдийн байна."
          : "An active field with this label already exists.",
      );
      return;
    }
    const newField: FormField = {
      label: label.trim(),
      unit: unit.trim(),
      frequency,
      type,
      required,
      active: true,
    };
    saveFields([...fields, newField]);
    setLabel("");
    setUnit("");
  }

  // Бодитоор устгахгүй — "active: false" болгож л тэмдэглэнэ. Учир нь
  // өмнөх тайлангуудын дата энэ label-аар хадгалагдсан хэвээр байгаа,
  // хэрэв бодитоор устгавал түүхэн тайланг зөв дүрслэх боломжгүй болно.
  function handleSoftDelete(index: number) {
    const next = fields.map((f, i) =>
      i === index ? { ...f, active: false } : f,
    );
    saveFields(next);
  }

  function handleRestore(index: number) {
    const next = fields.map((f, i) =>
      i === index ? { ...f, active: true } : f,
    );
    saveFields(next);
  }

  const activeFields = fields.filter((f) => f.active);
  const inactiveFields = fields.filter((f) => !f.active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="dash-card relative w-full max-w-3xl rounded-3xl p-6 shadow-2xl sm:p-7 max-h-[90vh] overflow-y-auto"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-serif text-xl text-white">
            {language === "mn"
              ? `Талбар удирдах — ${template.name}`
              : `Manage fields — ${template.name}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

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
              {language === "mn"
                ? "Идэвхтэй талбар алга."
                : "No active fields yet."}
            </p>
          ) : (
            activeFields.map((f) => {
              const realIndex = fields.indexOf(f);
              return (
                <div
                  key={f.label}
                  className="flex items-start justify-between gap-2 rounded-xl bg-white/5 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white" title={f.label}>
                      {f.label}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {f.unit && `${f.unit} · `}
                      {f.frequency} ·{" "}
                      {f.type === "number"
                        ? language === "mn"
                          ? "Тоо"
                          : "Number"
                        : language === "mn"
                          ? "Текст"
                          : "Text"}
                      {f.required &&
                        ` · ${language === "mn" ? "Заавал" : "Required"}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSoftDelete(realIndex)}
                    disabled={isSaving}
                    className="flex shrink-0 items-center justify-center rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-50"
                    aria-label={
                      language === "mn" ? "Идэвхгүй болгох" : "Deactivate"
                    }
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
              {language === "mn"
                ? "Идэвхгүй талбарууд (устгагдаагүй, зөвхөн нуугдсан)"
                : "Inactive fields (not deleted, just hidden)"}
            </p>
            <div className="mb-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {inactiveFields.map((f) => {
                const realIndex = fields.indexOf(f);
                return (
                  <div
                    key={f.label}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.02] px-3.5 py-2.5 opacity-60"
                  >
                    <p
                      className="truncate text-sm text-slate-400 line-through"
                      title={f.label}
                    >
                      {f.label}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRestore(realIndex)}
                      disabled={isSaving}
                      className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      {language === "mn" ? "Сэргээх" : "Restore"}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Шинэ талбар нэмэх */}
        <div className="h-px bg-white/10" />
        <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {language === "mn" ? "Шинэ талбар нэмэх" : "Add a new field"}
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            disabled={isSaving}
            placeholder={language === "mn" ? "Талбарын нэр" : "Field label"}
            className="glass-input rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60 sm:col-span-2"
          />
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            disabled={isSaving}
            placeholder={
              language === "mn"
                ? "Нэгж (жишээ нь: хүн, сая ₮)"
                : "Unit (e.g. people, mn ₮)"
            }
            className="glass-input rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 disabled:opacity-60"
          />
          <select
            value={frequency}
            onChange={(e) =>
              setFrequency(e.target.value as FormField["frequency"])
            }
            disabled={isSaving}
            className="glass-input rounded-xl px-3.5 py-2.5 text-sm text-white disabled:opacity-60"
          >
            <option value="Сар" className="bg-[#0e1626]">
              {language === "mn" ? "Сар" : "Monthly"}
            </option>
            <option value="Улирал" className="bg-[#0e1626]">
              {language === "mn" ? "Улирал" : "Quarterly"}
            </option>
            <option value="Жил" className="bg-[#0e1626]">
              {language === "mn" ? "Жил" : "Yearly"}
            </option>
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as FormField["type"])}
            disabled={isSaving}
            className="glass-input rounded-xl px-3.5 py-2.5 text-sm text-white disabled:opacity-60"
          >
            <option value="number" className="bg-[#0e1626]">
              {language === "mn" ? "Тоо" : "Number"}
            </option>
            <option value="text" className="bg-[#0e1626]">
              {language === "mn" ? "Текст" : "Text"}
            </option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              disabled={isSaving}
            />
            {language === "mn" ? "Заавал бөглөх" : "Required"}
          </label>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={isSaving}
          className="mt-3 flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0072ce] to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#0072ce]/25 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {language === "mn" ? "Талбар нэмэх" : "Add field"}
        </button>
      </div>
    </div>
  );
}
