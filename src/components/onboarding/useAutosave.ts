import { useEffect, useRef } from "react";

/**
 * Debounced autosave (feature 009). When `enabled`, saves ~700ms after `watch` last changes —
 * so the Settings → Profile editors persist on edit with no Save button.
 *
 * Fires ONLY when the values actually differ from what they were at mount, so it never saves just
 * because the page (re)mounted — including React StrictMode's dev double-mount, which defeats a
 * naive "skip first run" ref. In the onboarding wizard `enabled` is false → behaviour unchanged.
 */
export function useAutosave(enabled: boolean, save: () => void, watch: unknown[]): void {
  const saveRef = useRef(save);
  saveRef.current = save;
  const baseline = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;
    const key = JSON.stringify(watch);
    // First run for this mount: record the baseline, never save.
    if (baseline.current === undefined) {
      baseline.current = key;
      return;
    }
    // Unchanged from the baseline (e.g. a StrictMode remount) → not a real edit.
    if (key === baseline.current) return;

    const id = setTimeout(() => saveRef.current(), 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, watch);
}
