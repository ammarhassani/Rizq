"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

/**
 * Wahaj light/dark toggle. Renders a stable button (mounted-guard swaps the icon
 * after hydration to avoid a mismatch, since the server can't know the persisted
 * theme). Default is light; this flips to "Wahaj night".
 */
export function ThemeToggle({ locale }: { locale: "ar" | "en" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";
  const label = isDark
    ? locale === "ar" ? "التبديل إلى الوضع الفاتح" : "Switch to light"
    : locale === "ar" ? "التبديل إلى الوضع الداكن" : "Switch to dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={[
        "inline-flex items-center justify-center h-11 w-11 rounded-xl shrink-0",
        "text-rizq-ink hover:bg-rizq-green/10 hover:text-rizq-green transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/60",
      ].join(" ")}
    >
      {isDark ? (
        <Sun size={18} aria-hidden strokeWidth={1.7} />
      ) : (
        <Moon size={18} aria-hidden strokeWidth={1.7} />
      )}
    </button>
  );
}
