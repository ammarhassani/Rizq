import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleToggle } from "@/components/landing/LocaleToggle";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { AuthNavSlot } from "./AuthNavSlot";

type Props = {
  locale: "ar" | "en";
  /** Sticky on scroll? Defaults to true. */
  sticky?: boolean;
  /** Hide the Logout button (e.g. on the dashboard where it's elsewhere) */
  hideLogout?: boolean;
};

/**
 * The single nav used across every page.
 *
 * - Opaque cream background (no backdrop-blur). Backdrop-blur on a sticky
 *   element is a major scroll-jank source on macOS/Safari; the slight
 *   translucency wasn't worth it.
 * - Server component but DOES NOT read auth itself — that happens in the
 *   AuthNavSlot client island. This keeps landing-page SSG eligibility.
 */
export async function SiteNav({ locale, sticky = true, hideLogout = false }: Props) {
  const t = await getTranslations({ locale, namespace: "Nav" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const positionClass = sticky ? "sticky top-0 z-40" : "relative z-10";

  return (
    <header
      className={`${positionClass} bg-rizq-cream/95 border-b border-rizq-gold/15`}
    >
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12 h-14 sm:h-16 flex items-center justify-between gap-3">
        {/* Brand */}
        <Link href="/" className="group inline-flex items-baseline gap-2 shrink-0">
          <span className="font-display text-2xl font-bold aurora-text tracking-tight">
            رِزق
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 md:gap-4">
          <Link
            href="/tool"
            className={`relative inline-flex items-center rounded-full px-3 py-1.5 text-xs sm:text-sm text-rizq-ink hover:text-rizq-green transition-colors ${font}`}
          >
            <span>{t("tool")}</span>
          </Link>

          <span aria-hidden className="hidden sm:inline-block h-4 w-px bg-rizq-gold/25" />

          <AuthNavSlot locale={locale} hideLogout={hideLogout} />

          <span aria-hidden className="hidden sm:inline-block h-4 w-px bg-rizq-gold/25" />
          <ThemeToggle locale={locale} />
          <LocaleToggle />
        </nav>
      </div>
    </header>
  );
}
