"use client";

/**
 * NumberStepper (feature 006) — a digits-only input with custom +/- buttons.
 * Replaces native type=number (whose spinner vanished on hover and gave no
 * reliable increment/decrement). Value is a string the parent owns; clamps to
 * [min, max] and steps by `step`.
 */

import { ChevronUp, ChevronDown } from "lucide-react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  locale: "ar" | "en";
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  maxDigits?: number;
  ariaLabel?: string;
  /** Optional trailing unit shown inside the field (e.g. a currency code). */
  suffix?: string;
};

export function NumberStepper({
  value,
  onChange,
  locale,
  placeholder,
  min = 0,
  max = 9_999_999,
  step = 1,
  maxDigits = 9,
  ariaLabel,
  suffix,
}: Props) {
  const isAr = locale === "ar";

  const handleType = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, maxDigits);
    onChange(digits);
  };

  const stepBy = (delta: number) => {
    const cur = value === "" ? 0 : parseInt(value, 10);
    const base = Number.isNaN(cur) ? 0 : cur;
    const next = Math.max(min, Math.min(max, base + delta));
    onChange(String(next));
  };

  return (
    <div
      dir="ltr"
      className="flex items-stretch overflow-hidden rounded-xl border border-[#8f7e48] bg-rizq-cream/60 cursor-text transition-colors focus-within:ring-2 focus-within:ring-rizq-green/40 focus-within:border-rizq-green"
    >
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => handleType(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="flex-1 min-w-0 bg-transparent px-4 py-3 text-base text-rizq-ink tabular cursor-text focus:outline-none"
      />
      {suffix && (
        <span className="flex items-center px-2.5 text-xs font-semibold text-rizq-ink-soft border-s border-[#8f7e48] select-none">
          {suffix}
        </span>
      )}
      <div className="flex flex-col border-s border-[#8f7e48]">
        <button
          type="button"
          onClick={() => stepBy(step)}
          aria-label={isAr ? "زيادة" : "Increase"}
          className="flex flex-1 cursor-pointer items-center justify-center px-2.5 text-rizq-ink-soft hover:text-rizq-green hover:bg-rizq-green/5 transition-colors"
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          onClick={() => stepBy(-step)}
          aria-label={isAr ? "إنقاص" : "Decrease"}
          className="flex flex-1 items-center justify-center border-t border-[#8f7e48] px-2.5 text-rizq-ink-soft hover:text-rizq-green hover:bg-rizq-green/5 transition-colors"
        >
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
}
