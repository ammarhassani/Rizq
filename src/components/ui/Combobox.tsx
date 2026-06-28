"use client";

/**
 * Combobox — a styled, searchable, accessible single-select.
 *
 * Drop-in replacement for the app's plain <select> on fetched / long lists.
 * Brand-styled (rounded-xl, gold border, cream bg, green focus ring), RTL-first,
 * keyboard-driven (↑/↓/Enter/Esc + type-to-filter), WCAG combobox/listbox roles.
 *
 * Built with a trigger button + a positioned panel (not a native <select>) so we
 * can put a search field at the top and fully control styling + RTL + a11y.
 * Reduced-motion safe — no essential motion.
 */

import * as React from "react";
import { ChevronDown, Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  hint?: string;
};

type Props = {
  value: string | null;
  onChange: (value: string | null) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  locale: "ar" | "en";
  emptyText?: string;
  allowClear?: boolean;
  id?: string;
  disabled?: boolean;
  /** Rendered under the option list — e.g. a "+ Add client" action. */
  footer?: React.ReactNode;
};

/**
 * Arabic-aware, case-insensitive normalization for search matching.
 * Strips Arabic diacritics (tashkeel) and the tatweel, folds alef variants and
 * common letter shapes so "احمد" matches "أحمد", and lowercases Latin text.
 */
function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "") // tashkeel + superscript alef + tatweel
    .replace(/[آأإٱ]/g, "ا") // آ أ إ ٱ → ا
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ى/g, "ي") // ى → ي
    .trim();
}

export function Combobox({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  locale,
  emptyText,
  allowClear = false,
  id,
  disabled = false,
  footer,
}: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);

  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const optionRefs = React.useRef<Array<HTMLLIElement | null>>([]);

  const reactId = React.useId();
  const listboxId = `${id ?? reactId}-listbox`;
  const searchId = `${id ?? reactId}-search`;

  const selected = React.useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value]
  );

  const filtered = React.useMemo(() => {
    const q = normalize(query);
    if (!q) return options;
    return options.filter(
      (o) =>
        normalize(o.label).includes(q) ||
        (o.hint ? normalize(o.hint).includes(q) : false)
    );
  }, [options, query]);

  // Keep the active option within the filtered range.
  React.useEffect(() => {
    setActiveIndex((prev) => {
      if (filtered.length === 0) return 0;
      return Math.min(prev, filtered.length - 1);
    });
  }, [filtered.length]);

  // On open: reset query, focus the search field, point active at the selected row.
  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    const selIdx = selected ? options.findIndex((o) => o.value === selected.value) : -1;
    setActiveIndex(selIdx >= 0 ? selIdx : 0);
    const raf = requestAnimationFrame(() => searchRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open, options, selected]);

  // Outside-click + Escape close.
  React.useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Scroll the active option into view as the user navigates.
  React.useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function commit(option: ComboboxOption) {
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
  }

  function onSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (filtered.length ? (i + 1) % filtered.length : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) =>
          filtered.length ? (i - 1 + filtered.length) % filtered.length : 0
        );
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(filtered.length ? filtered.length - 1 : 0);
        break;
      case "Enter": {
        e.preventDefault();
        const opt = filtered[activeIndex];
        if (opt) commit(opt);
        break;
      }
      // Escape handled by the document listener above.
    }
  }

  function onTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  const triggerClass = cn(
    "w-full inline-flex items-center justify-between gap-2 rounded-xl border bg-rizq-cream/60 px-4 py-3 text-base text-start transition-colors",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream",
    open ? "border-rizq-green bg-rizq-cream" : "border-[#8f7e48] hover:border-rizq-green/40",
    disabled && "cursor-not-allowed opacity-60",
    font
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        className={triggerClass}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            selected ? "text-rizq-ink" : "text-rizq-ink-soft/50"
          )}
        >
          {selected ? selected.label : (placeholder ?? "")}
        </span>

        <span className="flex shrink-0 items-center gap-1">
          {allowClear && selected && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              aria-label={isAr ? "مسح الاختيار" : "Clear selection"}
              onClick={clear}
              className="rounded-full p-0.5 text-rizq-ink-soft/60 hover:bg-rizq-ink/8 hover:text-rizq-ink transition-colors"
            >
              <X size={15} />
            </span>
          )}
          <ChevronDown
            size={18}
            className={cn(
              "text-rizq-ink-soft/60 transition-transform motion-reduce:transition-none",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </span>
      </button>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-rizq-gold/30 bg-rizq-cream shadow-xl ring-1 ring-rizq-ink/5",
            "start-0 animate-fade-in motion-reduce:animate-none",
            font
          )}
        >
          {/* Search field */}
          <div className="border-b border-rizq-gold/20 p-2">
            <div className="relative">
              <Search
                size={15}
                className={cn(
                  "pointer-events-none absolute top-1/2 -translate-y-1/2 text-rizq-ink-soft/50",
                  isAr ? "right-3" : "left-3"
                )}
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                id={searchId}
                type="text"
                role="searchbox"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onSearchKeyDown}
                placeholder={searchPlaceholder ?? (isAr ? "ابحث…" : "Search…")}
                aria-label={searchPlaceholder ?? (isAr ? "بحث" : "Search")}
                aria-controls={listboxId}
                aria-autocomplete="list"
                aria-activedescendant={
                  filtered[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined
                }
                autoComplete="off"
                className={cn(
                  "w-full rounded-lg border border-[#8f7e48] bg-rizq-cream/60 py-2 text-sm text-rizq-ink transition-colors",
                  "focus:border-rizq-green focus:bg-rizq-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/30",
                  "placeholder:text-rizq-ink-soft/50",
                  isAr ? "pr-9 pl-3" : "pl-9 pr-3"
                )}
              />
            </div>
          </div>

          {/* Option list */}
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={placeholder}
            className="max-h-60 overflow-y-auto p-1"
          >
            {filtered.length === 0 ? (
              <li
                role="presentation"
                className="px-3 py-3 text-center text-sm text-rizq-ink-soft/60"
              >
                {emptyText ?? (isAr ? "لا توجد نتائج" : "No results")}
              </li>
            ) : (
              filtered.map((option, idx) => {
                const isSelected = option.value === value;
                const isActive = idx === activeIndex;
                return (
                  <li
                    key={option.value}
                    ref={(el) => {
                      optionRefs.current[idx] = el;
                    }}
                    id={`${listboxId}-opt-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => commit(option)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "flex min-h-[40px] cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive ? "bg-rizq-green/10" : "hover:bg-rizq-green/8",
                      isSelected ? "text-rizq-green font-medium" : "text-rizq-ink"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {option.label}
                      {option.hint && (
                        <span className="text-rizq-ink-soft/60 font-normal">
                          {" · "}
                          {option.hint}
                        </span>
                      )}
                    </span>
                    {isSelected && (
                      <Check
                        size={16}
                        className="shrink-0 text-rizq-green"
                        strokeWidth={2.4}
                        aria-hidden="true"
                      />
                    )}
                  </li>
                );
              })
            )}
          </ul>

          {/* Optional footer (e.g. "+ Add client") */}
          {footer && <div className="border-t border-rizq-gold/20 p-1">{footer}</div>}
        </div>
      )}
    </div>
  );
}
