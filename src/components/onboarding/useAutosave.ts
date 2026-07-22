import { useEffect, useRef } from "react";

/**
 * Debounced autosave (feature 009). When `enabled`, calls `save` ~700ms after `watch` last
 * changes — so the Settings → Profile editors persist on typing/selecting with no Save button.
 * Skips the initial mount (don't save unchanged pre-filled values). Uses a ref so the latest
 * `save` closure is called without re-arming on every render. In the onboarding wizard `enabled`
 * is false, so behaviour there is unchanged.
 */
export function useAutosave(enabled: boolean, save: () => void, watch: unknown[]): void {
  const saveRef = useRef(save);
  saveRef.current = save;
  const mounted = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const id = setTimeout(() => saveRef.current(), 700);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, watch);
}
