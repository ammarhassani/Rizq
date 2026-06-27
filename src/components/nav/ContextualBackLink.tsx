/**
 * ContextualBackLink (feature 005) — the ONE back affordance for every detail/
 * editor screen. With a project origin (`?from=project:{id}`) it returns to the
 * project pane labeled with the project; otherwise it returns to the screen's
 * default list (today's behaviour). Replaces the 8 hardcoded back links.
 *
 * Server component (async) — resolves its own bilingual labels from the `Nav`
 * namespace, so callers pass only locale + origin + fallback.
 */
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveBack, type NavigationOrigin } from "@/lib/nav/origin";

type NavListKey = "invoices" | "proposals" | "income" | "clients" | "projects";

export async function ContextualBackLink({
  locale,
  origin,
  fallbackHref,
  fallbackKey,
  projectTitle,
  tab,
  guided,
}: {
  locale: "ar" | "en";
  origin: NavigationOrigin | null;
  fallbackHref: string;
  /** i18n key under `Nav` for the default-list label (standalone back target). */
  fallbackKey: NavListKey;
  /** When known (e.g. on framed editors), label the project back with its title. */
  projectTitle?: string | null;
  tab?: string;
  guided?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "Nav" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const { href, label } = resolveBack(origin, {
    fallbackHref,
    fallbackLabel: t(fallbackKey),
    projectLabel: projectTitle?.trim() || t("project"),
    tab,
    guided,
  });

  return (
    <Link
      href={href as `/${string}`}
      className={`print:hidden inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors mb-8 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`}
    >
      <span className="inline-block ltr:rotate-180" aria-hidden>→</span>
      {label}
    </Link>
  );
}
