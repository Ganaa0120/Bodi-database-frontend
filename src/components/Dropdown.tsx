"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export interface DropdownOption<T extends string | number> {
  value: T;
  label: string;
  /** Label-ийн хажууд бүдэг текст (жишээ нь "7–9 сар"). */
  hint?: string;
  /** Баруун талын жижиг шошго (жишээ нь "Илгээсэн"). */
  badge?: string;
  disabled?: boolean;
  /** Товчлуураар хайхад (type-ahead) тааруулах текст. */
  searchText?: string;
  /** Бүлгийн нэр — өмнөх сонголтоос өөр бол жагсаалтад гарчиг болж харагдана. */
  group?: string;
}

/** Жагсаалтын хамгийн их өндөр (px) — Tailwind max-h-64. */
const LIST_MAX_HEIGHT = 256;
/** Товч болон жагсаалтын хоорондох зай (px). */
const GAP = 6;
/** Дэлгэцийн ирмэгээс үлдээх зай (px). */
const VIEWPORT_MARGIN = 8;
/** Доош багтах зай үүнээс бага бол дээш нээнэ (px). */
const MIN_COMFORTABLE_HEIGHT = 180;

interface ListPosition {
  left: number;
  width: number;
  maxHeight: number;
  /** Доош нээхэд — дээд ирмэг */
  top?: number;
  /** Дээш нээхэд — доод ирмэг (viewport-ийн доороос) */
  bottom?: number;
}

/**
 * Дизайны системд таарсан dropdown (native <select>-ийн оронд).
 *
 * Жагсаалт нь document.body руу portal-оор, `position: fixed`-ээр гарна —
 * тиймээс modal-ын overflow-д тайрагдахгүй, modal дотор давхар scroll
 * үүсгэхгүй. Доор зай хүрэлцэхгүй бол автоматаар дээш нээгдэнэ. Modal
 * scroll хийх эсвэл цонхны хэмжээ өөрчлөгдөхөд товчоо дагаж байрлалаа
 * шинэчилнэ.
 *
 * - Гар: ↑ ↓ Home End — шилжих, Enter/Space — сонгох, Esc — хаах,
 *   тоо/үсэг бичихэд тухайн утга руу үсэрнэ (жишээ нь "2025").
 * - Идэвхгүй (disabled) сонголтыг сонгох боломжгүй, алгасна.
 * - Esc нь зөвхөн жагсаалтыг хаана — гадна талын modal-ыг хаахгүй.
 */
export function Dropdown<T extends string | number>({
  id,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  ariaLabel,
}: {
  id: string;
  value: T | null;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder: string;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<ListPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeAhead = useRef<{ text: string; timer: ReturnType<typeof setTimeout> | null }>({
    text: "",
    timer: null,
  });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  function firstEnabledIndex() {
    return options.findIndex((o) => !o.disabled);
  }

  function openList() {
    if (disabled) return;
    const current = options[selectedIndex];
    setActiveIndex(current && !current.disabled ? selectedIndex : firstEnabledIndex());
    setOpen(true);
  }

  function closeList(focusButton = true) {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  }

  function select(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    closeList();
  }

  function move(delta: 1 | -1) {
    let i = activeIndex;
    for (let step = 0; step < options.length; step++) {
      i += delta;
      const option = options[i];
      if (!option) return; // жагсаалтын хязгаараас гарлаа
      if (!option.disabled) {
        setActiveIndex(i);
        return;
      }
    }
  }

  /** Товчны байрлалаас жагсаалтын байрлалыг тооцоолно (доош/дээш). */
  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom - GAP - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - GAP - VIEWPORT_MARGIN;
    const openDown = spaceBelow >= Math.min(LIST_MAX_HEIGHT, MIN_COMFORTABLE_HEIGHT) || spaceBelow >= spaceAbove;

    const available = Math.max(openDown ? spaceBelow : spaceAbove, 120);
    const maxHeight = Math.min(LIST_MAX_HEIGHT, available);

    setPosition(
      openDown
        ? { left: rect.left, width: rect.width, maxHeight, top: rect.bottom + GAP }
        : { left: rect.left, width: rect.width, maxHeight, bottom: viewportHeight - rect.top + GAP },
    );
  }, []);

  // Нээгдэх үед байрлалыг зурахаас өмнө тооцоолно (анивчихгүй).
  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

  // Modal / хуудас scroll хийх, цонхны хэмжээ өөрчлөгдөхөд товчоо дагана.
  useEffect(() => {
    if (!open) return;
    // capture: true — modal-ын дотоод scroll-ыг ч барина
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  /**
   * Идэвхтэй мөрийг жагсаалт дотор харагдуулна. scrollIntoView-г
   * ашиглахгүй — тэр нь modal болон хуудсыг ч гүйлгэдэг.
   */
  const scrollOptionIntoView = useCallback((index: number, center: boolean) => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (!list || !el) return;

    if (center) {
      list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2;
      return;
    }
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }, []);

  // Жагсаалт гарч ирэхэд focus шилжүүлж, сонгосон утгыг голд харуулна.
  useEffect(() => {
    if (!open || !position) return;
    listRef.current?.focus({ preventScroll: true });
    scrollOptionIntoView(activeIndex, true);
    // Зөвхөн анх гарч ирэх мөчид
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, position !== null]);

  // Гараар шилжихэд идэвхтэй мөрийг харагдах хэсэгт байлгана.
  useEffect(() => {
    if (open) scrollOptionIntoView(activeIndex, false);
  }, [activeIndex, open, scrollOptionIntoView]);

  // Гадна дарахад хаана (жагсаалт portal-д байгаа тул тусад нь шалгана).
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    const state = typeAhead.current;
    return () => {
      if (state.timer) clearTimeout(state.timer);
    };
  }, []);

  function handleButtonKeyDown(e: ReactKeyboardEvent<HTMLButtonElement>) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  }

  function handleListKeyDown(e: ReactKeyboardEvent<HTMLUListElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        move(1);
        return;
      case "ArrowUp":
        e.preventDefault();
        move(-1);
        return;
      case "Home": {
        e.preventDefault();
        const i = firstEnabledIndex();
        if (i >= 0) setActiveIndex(i);
        return;
      }
      case "End": {
        e.preventDefault();
        for (let i = options.length - 1; i >= 0; i--) {
          const option = options[i];
          if (option && !option.disabled) {
            setActiveIndex(i);
            break;
          }
        }
        return;
      }
      case "Enter":
      case " ":
        e.preventDefault();
        select(activeIndex);
        return;
      case "Escape":
        // Modal-ын Esc listener хүртэл очихгүй — зөвхөн жагсаалт хаагдана.
        e.preventDefault();
        e.stopPropagation();
        closeList();
        return;
      case "Tab":
        closeList();
        return;
      default:
        if (e.key.length === 1 && /[\p{L}\p{N}%₮]/u.test(e.key)) {
          const state = typeAhead.current;
          state.text += e.key.toLowerCase();
          if (state.timer) clearTimeout(state.timer);
          state.timer = setTimeout(() => {
            state.text = "";
          }, 800);
          const match = options.findIndex(
            (o) => !o.disabled && (o.searchText ?? o.label).toLowerCase().startsWith(state.text),
          );
          if (match >= 0) setActiveIndex(match);
        }
    }
  }

  const listStyle: CSSProperties | undefined = position
    ? {
        position: "fixed",
        left: position.left,
        width: position.width,
        maxHeight: position.maxHeight,
        top: position.top,
        bottom: position.bottom,
        // Бараан, нимгэн scrollbar (Firefox, Chrome 121+)
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(148, 163, 184, 0.35) transparent",
      }
    : undefined;

  const list =
    open && position && typeof document !== "undefined"
      ? createPortal(
          <ul
            ref={listRef}
            id={`${id}-listbox`}
            role="listbox"
            tabIndex={-1}
            aria-label={ariaLabel}
            aria-activedescendant={activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined}
            onKeyDown={handleListKeyDown}
            style={listStyle}
            // z-[100] — modal (z-50) болон баталгаажуулах цонхноос (z-60) дээр
            className="z-[100] overflow-y-auto rounded-xl border border-white/10 bg-[#0e1626]/95 p-1 shadow-2xl shadow-black/50 backdrop-blur-md focus:outline-none"
          >
            {options.map((o, i) => {
              const isSelected = i === selectedIndex;
              const isActive = i === activeIndex;
              const showGroup = Boolean(o.group) && o.group !== options[i - 1]?.group;
              return (
                <Fragment key={String(o.value)}>
                  {showGroup && (
                    <li
                      role="presentation"
                      className="px-2.5 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 first:pt-1.5"
                    >
                      {o.group}
                    </li>
                  )}
                  <li
                    id={`${id}-opt-${i}`}
                    data-index={i}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={o.disabled || undefined}
                    onMouseEnter={() => !o.disabled && setActiveIndex(i)}
                    // Focus жагсаалтаас гарахгүй байлгана (гадна дарсан гэж ойлгогдохгүй).
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => select(i)}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      o.disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"
                    } ${isActive && !o.disabled ? "bg-white/[0.08]" : ""} ${
                      isSelected ? "font-medium text-white" : "text-slate-300"
                    }`}
                  >
                    <Check className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-sky-300" : "invisible"}`} />
                    <span className="min-w-0 flex-1 truncate">
                      {o.label}
                      {o.hint && <span className="ml-1.5 text-xs text-slate-500">{o.hint}</span>}
                    </span>
                    {o.badge && (
                      <span className="shrink-0 rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                        {o.badge}
                      </span>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? closeList() : openList())}
        onKeyDown={handleButtonKeyDown}
        className={`glass-input flex w-full items-center justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm transition-shadow disabled:cursor-not-allowed disabled:opacity-60 ${
          open ? "ring-1 ring-[#0072ce]/70" : ""
        }`}
      >
        <span className={`min-w-0 truncate ${selected ? "text-white" : "text-slate-500"}`}>
          {selected ? selected.label : placeholder}
          {selected?.hint && <span className="ml-1.5 text-xs text-slate-500">· {selected.hint}</span>}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {list}
    </div>
  );
}