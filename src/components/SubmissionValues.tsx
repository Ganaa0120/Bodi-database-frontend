"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import type { FormField } from "@/lib/types";
import {
  UNITS,
  formatUnitValue,
  isUnitId,
  toBaseValue,
  unitLabel,
  type UnitDef,
} from "@/lib/units";

/**
 * Тайлангийн утгуудыг (талбарын код → утга) хүн ойлгохоор харуулна:
 *
 *   Нийт борлуулалтын орлого            D-100
 *   99.00 тэрбум ₮
 *   = 99,000,000,000 ₮
 *
 * - Талбарын нэр, нэгж нь загвараас (form_schema) — кодоор тааруулна.
 * - Сая / тэрбум ₮-ийн дүнг бүтэн төгрөгөөр давхар харуулна (CEO шууд
 *   ойлгохоор, масштабын андуурлаас сэргийлэх).
 * - Загварт олдохгүй (хуучин / устгагдсан) түлхүүр төгсгөлд нь түүхийгээр.
 *
 * Хэлтсийн тайлан, компанийн хянах хуудас, super admin-ы бүх тайлан —
 * бүгд энэ нэг component-ийг ашиглана.
 */

export interface SubmissionValueRow {
  key: string;
  label: string;
  code: string | null;
  /** "99.00 тэрбум ₮", "95.95%", "120 хүн" */
  value: string;
  /** Сая/тэрбум ₮-д: "= 99,000,000,000 ₮" */
  baseValue: string | null;
  /** Загварт олдоогүй түлхүүр */
  unknown: boolean;
}

/** Тоон string-д мянгатын таслал (нэгжгүй хуучин талбарт). */
function withThousands(raw: string): string {
  const negative = raw.startsWith("-");
  const [intPart = "", decimalPart] = raw.replace(/^-/, "").split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const body = decimalPart !== undefined ? `${grouped}.${decimalPart}` : grouped;
  return negative ? `-${body}` : body;
}

function formatRow(field: FormField, raw: string, language: string): Pick<SubmissionValueRow, "value" | "baseValue"> {
  if (!isUnitId(field.unit)) {
    const unit = String(field.unit ?? "");
    return { value: unit ? `${withThousands(raw)} ${unit}` : withThousands(raw), baseValue: null };
  }

  const unit = field.unit;
  const def: UnitDef = UNITS[unit];
  const formatted = formatUnitValue(unit, raw);
  const value = unit === "percent" ? formatted : `${formatted} ${unitLabel(unit, language)}`;

  let baseValue: string | null = null;
  const numeric = Number(raw);
  if (def.group === "money" && def.scale > 1 && Number.isFinite(numeric)) {
    baseValue = `= ${formatUnitValue("mnt", String(toBaseValue(unit, numeric)))} ₮`;
  }
  return { value, baseValue };
}

export function buildSubmissionRows(
  data: Record<string, string>,
  fields: FormField[] | undefined,
  language: string,
): SubmissionValueRow[] {
  const rows: SubmissionValueRow[] = [];
  const used = new Set<string>();

  for (const field of fields ?? []) {
    if (!field.code) continue;
    const raw = data[field.code];
    if (raw === undefined || raw === "") continue;
    used.add(field.code);
    rows.push({ key: field.code, label: field.label, code: field.code, unknown: false, ...formatRow(field, raw, language) });
  }

  for (const [key, raw] of Object.entries(data)) {
    if (used.has(key)) continue;
    rows.push({ key, label: key, code: null, value: raw, baseValue: null, unknown: true });
  }
  return rows;
}

export function SubmissionValues({
  data,
  fields,
}: {
  data: Record<string, string>;
  fields: FormField[] | undefined;
}) {
  const { language } = useLanguage();
  const mn = language === "mn";
  const rows = buildSubmissionRows(data, fields, language);

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">{mn ? "Утга бөглөгдөөгүй." : "No values."}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col rounded-xl bg-white/5 px-3.5 py-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-[1.125rem] text-slate-400">
              {row.label}
            </p>
            {row.code && (
              <span className="shrink-0 pt-0.5 font-mono text-[10px] text-slate-600">{row.code}</span>
            )}
          </div>
          <p className="mt-1 truncate text-base font-semibold tabular-nums text-white" title={row.value}>
            {row.value}
          </p>
          {row.baseValue && (
            <p className="mt-0.5 truncate text-[11px] tabular-nums text-slate-500" title={row.baseValue}>
              {row.baseValue}
            </p>
          )}
          {row.unknown && (
            <p className="mt-0.5 text-[11px] text-amber-300/80">
              {mn ? "Формд байхгүй талбар" : "Field not in form"}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}