"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Wahaj theme provider. Light is the default; dark is "Wahaj night".
 * Uses a data-theme attribute (matches the @custom-variant in globals.css and
 * the [data-theme] token blocks). enableSystem is off — the founder's call is a
 * light default, not the OS preference, for a daylight-mobile Saudi audience.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
