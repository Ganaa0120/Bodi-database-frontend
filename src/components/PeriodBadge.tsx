import { CalendarRange } from "lucide-react";

/** "2026 оны 3-р улирал" / "Q3 2026" */
export function periodLabel(year: number, quarter: number, language: string): string {
  return language === "mn" ? `${year} оны ${quarter}-р улирал` : `Q${quarter} ${year}`;
}

/** Тайлант хугацааны шошго. Хугацаагүй хуучин тайланд "Хугацаа тодорхойгүй". */
export function PeriodBadge({
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