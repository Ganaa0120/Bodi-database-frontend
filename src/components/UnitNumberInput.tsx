"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import type { FormField } from "@/lib/types";
import {
  UNITS,
  isAllowedWhileTyping,
  isUnitId,
  normalizeUnitValue,
  unitLabel,
  validateUnitValue,
  type UnitDef,
} from "@/lib/units";

/**
 * Нэгжтэй тоон талбарын input (компани тайлан засахад).
 * - Бичих үед нэгжид тохирохгүй тэмдэгтийг оруулахгүй (хүний тоонд "-", ".").
 * - Мянгатын таслалтай харагдана, хадгалах утга таслалгүй.
 * - Гарах (blur) үед оронгийн тоогоор тэгшилж (1000 → 1,000.00), шалгаад
 *   алдааг талбарын доор шууд харуулна.
 */

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

function inputModeFor(field: FormField): "text" | "numeric" | "decimal" {
  if (!isUnitId(field.unit)) return "text";
  const def: UnitDef = UNITS[field.unit];
  // iOS-ийн decimal/numeric гар дээр "-" товч байдаггүй.
  if (def.allowNegative) return "text";
  return def.integer ? "numeric" : "decimal";
}

function allowWhileTyping(field: FormField, raw: string): boolean {
  if (raw === "") return true;
  if (isUnitId(field.unit)) return isAllowedWhileTyping(field.unit, raw);
  return /^-?\d*\.?\d*$/.test(raw);
}

export function UnitNumberInput({
  id,
  field,
  value,
  onChange,
  error,
  onErrorChange,
  disabled = false,
}: {
  id: string;
  field: FormField;
  value: string;
  onChange: (raw: string) => void;
  error: string | null;
  onErrorChange: (error: string | null) => void;
  disabled?: boolean;
}) {
  const { language } = useLanguage();
  const unitText = isUnitId(field.unit) ? unitLabel(field.unit, language) : String(field.unit ?? "");

  return (
    <>
      <div className="relative">
        <input
          id={id}
          name={id}
          type="text"
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
          data-form-type="other"
          inputMode={inputModeFor(field)}
          value={formatNumberInput(value)}
          onChange={(e) => {
            const raw = stripCommas(e.target.value);
            if (!allowWhileTyping(field, raw)) return;
            onChange(raw);
            onErrorChange(null);
          }}
          onBlur={() => {
            if (!isUnitId(field.unit)) return;
            const current = value.trim();
            if (!current) {
              onErrorChange(null);
              return;
            }
            const normalized = normalizeUnitValue(field.unit, current);
            if (normalized !== current) onChange(normalized);
            const check = validateUnitValue(field.unit, normalized, language);
            onErrorChange(check.ok ? null : check.error);
          }}
          disabled={disabled}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`glass-input w-full rounded-xl py-2.5 pl-3.5 pr-16 text-sm text-white placeholder:text-slate-500 disabled:opacity-60 ${
            error ? "ring-1 ring-rose-500/70" : ""
          }`}
        />
        <span className="pointer-events-none absolute right-3.5 top-1/2 max-w-[3.5rem] -translate-y-1/2 truncate text-xs text-slate-500">
          {unitText}
        </span>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-[11px] leading-4 text-rose-300">
          {error}
        </p>
      )}
    </>
  );
}