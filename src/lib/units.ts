/**
 * Хэлтсийн формын талбарын нэгжийн каталог.
 *
 * Нэгж бүр ямар утга авахыг өөрөө тодорхойлно (бүхэл/бутархай, сөрөг
 * зөвшөөрөх эсэх, хязгаар) — тиймээс талбарт тусдаа "төрөл" хэрэггүй.
 *
 * АНХААР: backend дээр ижил каталог (src/constants/units.js) байх ёстой.
 * Нэгж нэмэх/өөрчлөхдөө хоёуланг нь зэрэг засна. UnitId-г хэзээ ч бүү
 * өөрчил — DB-д хадгалагдсан талбарууд үүгээр заана. Зөвхөн label-ийг
 * чөлөөтэй засаж болно.
 */

export type UnitGroup = "money" | "count" | "measure" | "rating";

export interface UnitDef {
  labelMn: string;
  labelEn: string;
  group: UnitGroup;
  /** Суурь нэгж рүү хөрвүүлэх үржүүлэгч (KPI тооцоололд): сая ₮ → 1e6 */
  scale: number;
  /** Бүхэл тоо шаардах эсэх (хүн, ширхэг г.м) */
  integer: boolean;
  /** Сөрөг утга зөвшөөрөх эсэх (цэвэр ашиг, мөнгөн урсгал г.м) */
  allowNegative: boolean;
  /**
   * Үнэмлэхүй утгын дээд хязгаар. Бодит бус утгаас (жишээ нь ₮-ийн дүнг
   * тэрбум ₮ талбарт бичих) хамгаална. Сөрөг зөвшөөрдөг нэгжид -max хүртэл.
   */
  max: number;
  /**
   * Таслалаас хойших оронгийн тоо. Оруулахад үүнээс олон орон бичих
   * боломжгүй, харуулахдаа яг ийм оронтой харуулна (1,000.00 / 95.95%).
   */
  decimals: number;
}

export const UNITS = {
  // Мөнгө — сөрөг байж болно (алдагдал, сөрөг мөнгөн урсгал)
  mnt: { labelMn: "₮", labelEn: "₮", group: "money", scale: 1, integer: false, allowNegative: true, max: 1e14, decimals: 0 },
  mnt_million: { labelMn: "сая ₮", labelEn: "mln ₮", group: "money", scale: 1e6, integer: false, allowNegative: true, max: 1e8, decimals: 2 },
  mnt_billion: { labelMn: "тэрбум ₮", labelEn: "bln ₮", group: "money", scale: 1e9, integer: false, allowNegative: true, max: 1e5, decimals: 2 },

  // Тоо ширхэг — бүхэл, сөрөг биш
  person: { labelMn: "хүн", labelEn: "people", group: "count", scale: 1, integer: true, allowNegative: false, max: 1e6, decimals: 0 },
  piece: { labelMn: "ширхэг", labelEn: "pcs", group: "count", scale: 1, integer: true, allowNegative: false, max: 1e9, decimals: 0 },
  count: { labelMn: "тоо", labelEn: "count", group: "count", scale: 1, integer: true, allowNegative: false, max: 1e9, decimals: 0 },
  project: { labelMn: "төсөл", labelEn: "projects", group: "count", scale: 1, integer: true, allowNegative: false, max: 1e5, decimals: 0 },
  process: { labelMn: "процесс", labelEn: "processes", group: "count", scale: 1, integer: true, allowNegative: false, max: 1e5, decimals: 0 },
  supplier: { labelMn: "нийлүүлэгч", labelEn: "suppliers", group: "count", scale: 1, integer: true, allowNegative: false, max: 1e6, decimals: 0 },

  // Хэмжигдэхүүн — бутархай, сөрөг биш
  hour: { labelMn: "цаг", labelEn: "hours", group: "measure", scale: 1, integer: false, allowNegative: false, max: 1e9, decimals: 2 },
  kwh: { labelMn: "кВт.ц", labelEn: "kWh", group: "measure", scale: 1, integer: false, allowNegative: false, max: 1e13, decimals: 2 },
  ton: { labelMn: "тонн", labelEn: "tonnes", group: "measure", scale: 1, integer: false, allowNegative: false, max: 1e10, decimals: 2 },

  // Үнэлгээ
  percent: { labelMn: "%", labelEn: "%", group: "rating", scale: 1, integer: false, allowNegative: false, max: 100, decimals: 2 },
  score: { labelMn: "оноо", labelEn: "points", group: "rating", scale: 1, integer: false, allowNegative: false, max: 1e6, decimals: 2 },
} as const satisfies Record<string, UnitDef>;

export type UnitId = keyof typeof UNITS;

/** Dropdown-д бүлэглэн харуулах дараалал. */
export const UNIT_GROUPS: { id: UnitGroup; labelMn: string; labelEn: string; units: UnitId[] }[] = [
  { id: "money", labelMn: "Мөнгө", labelEn: "Money", units: ["mnt", "mnt_million", "mnt_billion"] },
  {
    id: "count",
    labelMn: "Тоо ширхэг",
    labelEn: "Count",
    units: ["person", "piece", "count", "project", "process", "supplier"],
  },
  { id: "measure", labelMn: "Хэмжигдэхүүн", labelEn: "Measure", units: ["hour", "kwh", "ton"] },
  { id: "rating", labelMn: "Үнэлгээ", labelEn: "Rating", units: ["percent", "score"] },
];

export function isUnitId(value: unknown): value is UnitId {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(UNITS, value);
}

export function unitLabel(unit: UnitId, language: string): string {
  const def: UnitDef = UNITS[unit];
  return language === "mn" ? def.labelMn : def.labelEn;
}

/* ───────────────────────── Давтамж ───────────────────────── */

export const FREQUENCIES = ["quarter", "year"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export function isFrequency(value: unknown): value is Frequency {
  return typeof value === "string" && (FREQUENCIES as readonly string[]).includes(value);
}

export function frequencyLabel(frequency: Frequency, language: string): string {
  if (frequency === "year") return language === "mn" ? "Жил" : "Yearly";
  return language === "mn" ? "Улирал" : "Quarterly";
}

/* ───────────────────────── Утга шалгах ───────────────────────── */

export type UnitValueResult = { ok: true; value: number } | { ok: false; error: string };

/**
 * Хэрэглэгчийн оруулсан утгыг (таслалгүй цэвэр string) нэгжийн дүрмээр
 * шалгана. Хоосон утгыг энд шалгахгүй — "заавал бөглөх" шалгалт тусдаа.
 */
export function validateUnitValue(unit: UnitId, raw: string, language: string): UnitValueResult {
  const def: UnitDef = UNITS[unit];
  const mn = language === "mn";
  const text = raw.trim();

  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    return { ok: false, error: mn ? "Зөвхөн тоо оруулна уу." : "Enter a number." };
  }

  const value = Number(text);
  if (!Number.isFinite(value)) {
    return { ok: false, error: mn ? "Тоо хэт том байна." : "Number is too large." };
  }
  if (!def.allowNegative && value < 0) {
    return { ok: false, error: mn ? "Сөрөг утга оруулах боломжгүй." : "Negative values are not allowed." };
  }
  if ((def.integer || def.decimals === 0) && !Number.isInteger(value)) {
    return { ok: false, error: mn ? "Бүхэл тоо оруулна уу." : "Enter a whole number." };
  }
  const fraction = text.split(".")[1] ?? "";
  if (fraction.length > def.decimals) {
    return {
      ok: false,
      error: mn
        ? `Таслалаас хойш ${def.decimals}-аас олон орон оруулах боломжгүй.`
        : `Use at most ${def.decimals} decimal places.`,
    };
  }
  if (Math.abs(value) > def.max) {
    const limit = `${formatterFor(0).format(def.max)}${unit === "percent" ? "%" : ` ${mn ? def.labelMn : def.labelEn}`}`;
    if (unit === "percent") {
      return { ok: false, error: mn ? `${limit}-иас их байж болохгүй.` : `Cannot exceed ${limit}.` };
    }
    return {
      ok: false,
      error: mn
        ? `Хэт их утга байна (дээд хязгаар ${limit}). Нэгжээ шалгана уу.`
        : `Value is too large (limit ${limit}). Check the unit.`,
    };
  }
  return { ok: true, value };
}

/**
 * Бичиж байх үеийн шүүлт — нэгжид тохирохгүй тэмдэгтийг (сөрөг биш
 * нэгжид "-", бүхэл тоонд ".") эхнээс нь оруулахгүй.
 */
export function isAllowedWhileTyping(unit: UnitId, raw: string): boolean {
  const def: UnitDef = UNITS[unit];
  const sign = def.allowNegative ? "-?" : "";
  const decimal = def.integer || def.decimals === 0 ? "" : `(\\.\\d{0,${def.decimals}})?`;
  return new RegExp(`^${sign}\\d*${decimal}$`).test(raw);
}

const numberFormatters = new Map<number, Intl.NumberFormat>();

function formatterFor(decimals: number): Intl.NumberFormat {
  let formatter = numberFormatters.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    numberFormatters.set(decimals, formatter);
  }
  return formatter;
}

/**
 * Харуулах формат: мянгатын таслал + нэгжийн оронгийн тоо.
 *   percent     "95.95"   → "95.95%"
 *   mnt_billion "1000"    → "1,000.00"
 *   person      "120"     → "120"
 * Тоо биш утгыг өөрчлөхгүй буцаана. Нэгжийн нэрийг (% -ээс бусад) дуудагч
 * тусад нь харуулна.
 */
export function formatUnitValue(unit: UnitId, raw: string): string {
  const text = raw.trim();
  const value = Number(text);
  if (text === "" || !Number.isFinite(value)) return raw;
  const def: UnitDef = UNITS[unit];
  const formatted = formatterFor(def.decimals).format(value);
  return unit === "percent" ? `${formatted}%` : formatted;
}

/**
 * Input-ээс гарах (blur) үед утгыг нэгжийн оронгийн тоогоор тэгшилнэ:
 * "1000" → "1000.00", "95.5" → "95.50". Хадгалах утга таслалгүй хэвээр.
 * Буруу утгыг өөрчлөхгүй — шалгалт нь илгээх үед алдааг харуулна.
 */
export function normalizeUnitValue(unit: UnitId, raw: string): string {
  // Бичиж дуусаагүй хэлбэрүүдийг засна: "1000." → "1000", ".5" → "0.5", "-.5" → "-0.5"
  const text = raw
    .trim()
    .replace(/\.$/, "")
    .replace(/^(-?)\./, "$10.");
  if (!/^-?\d+(\.\d+)?$/.test(text)) return raw;
  const def: UnitDef = UNITS[unit];
  const fraction = text.split(".")[1] ?? "";
  if (fraction.length > def.decimals) return raw;
  const fixed = Number(text).toFixed(def.decimals);
  return fixed === "-0" || /^-0\.0+$/.test(fixed) ? fixed.slice(1) : fixed;
}

/** KPI тооцоололд: суурь нэгж рүү хөрвүүлнэ (1.5 тэрбум ₮ → 1 500 000 000). */
export function toBaseValue(unit: UnitId, value: number): number {
  const def: UnitDef = UNITS[unit];
  return value * def.scale;
}