"use client";

/**
 * ChipInput — a generic tag/chip editor over `string[]` (feature 001 / bug ⑦).
 *
 * Add an entry with Enter or on blur; remove with the × button or Backspace on an
 * empty field. Crucially, commas are NOT separators — an entry may contain a comma
 * (e.g. "Acme, Inc."), which is exactly what the old comma-joined field got wrong.
 * RTL-aware; entries render with dir="auto" so Arabic and Latin names both read right.
 */

import { useState, type KeyboardEvent, type ClipboardEvent } from "react";
import { X } from "lucide-react";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxItems?: number;
  maxLength?: number;
  dir?: "rtl" | "ltr";
  inputClassName?: string;
  removeLabel?: string;
};

export function ChipInput({
  value,
  onChange,
  placeholder,
  maxItems = 20,
  maxLength = 120,
  dir = "rtl",
  inputClassName,
  removeLabel = "Remove",
}: Props) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    const v = raw.trim();
    if (!v || value.length >= maxItems || value.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...value, v.slice(0, maxLength)]);
    setDraft("");
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!text.includes(",")) return; // single value — let the browser paste normally
    e.preventDefault();
    const candidates = text.split(",").map((s) => s.trim()).filter(Boolean);
    const deduped = candidates.filter((c) => !value.includes(c));
    const slots = maxItems - value.length;
    if (deduped.length === 0 || slots <= 0) return;
    onChange([...value, ...deduped.slice(0, slots).map((c) => c.slice(0, maxLength))]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add(draft);
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      e.preventDefault();
      remove(value.length - 1);
    }
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((chip, i) => (
            <span
              key={`${chip}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-rizq-green/10 text-rizq-green ps-3 pe-2 py-1.5 text-sm"
            >
              <span dir="auto">{chip}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={removeLabel}
                className="text-rizq-green/70 hover:text-rizq-green transition-colors"
              >
                <X size={14} strokeWidth={2.4} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={() => add(draft)}
        placeholder={placeholder}
        className={inputClassName}
        dir={dir}
        maxLength={maxLength}
      />
    </div>
  );
}
