/**
 * ProjectIntegrationsSlot — Feature 002 (Project hub), task T021.
 *
 * Labeled stub slot for third-party integrations. Honest by design (Constitution
 * I): supported providers are shown as "coming soon" — nothing claims to be
 * connected. Any integrations already recorded (e.g. via the action/tests) are
 * listed as read-only links. No OAuth, no connect button in this release.
 * Server component.
 */
import { getTranslations } from "next-intl/server";
import { PROJECT_INTEGRATION_PROVIDERS } from "@/lib/projects/types";

type Locale = "ar" | "en";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Integration = any;

const PROVIDER_LABELS: Record<string, string> = {
  figma: "Figma",
  github: "GitHub",
  behance: "Behance",
  adobe: "Adobe",
  drive: "Google Drive",
  other: "Other",
};

export async function ProjectIntegrationsSlot({
  integrations,
  locale,
}: {
  integrations: Integration[];
  locale: Locale;
}) {
  const t = await getTranslations({ locale, namespace: "Projects" });
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <section className="mb-6" dir={dir}>
      <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{t("integrationsTitle")}</h2>

      {/* Existing (read-only) integrations, if any */}
      {integrations.length > 0 && (
        <div className="space-y-2 mb-4">
          {integrations.map((it) => (
            <a
              key={it.id}
              href={it.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-white/60 px-4 py-3 hover:border-rizq-green/30 transition-all ${font}`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className={`text-sm font-medium text-rizq-ink truncate ${font}`}>
                  {it.display_label}
                </span>
                <span className="text-xs text-rizq-ink-soft/60">
                  {PROVIDER_LABELS[it.provider] ?? it.provider}
                </span>
              </span>
              <span className="text-sm text-rizq-ink-soft/60">↗</span>
            </a>
          ))}
        </div>
      )}

      {/* Coming-soon provider chips (honest stub — nothing connected) */}
      <div className={`rounded-2xl border border-dashed border-rizq-gold/30 bg-white/40 p-5 ${font}`}>
        <p className={`text-sm text-rizq-ink-soft mb-3 ${font}`}>{t("integrationsHint")}</p>
        <div className="flex flex-wrap gap-2">
          {PROJECT_INTEGRATION_PROVIDERS.filter((p) => p !== "other").map((p) => (
            <span
              key={p}
              className="inline-flex items-center gap-1.5 rounded-full border border-rizq-gold/20 bg-rizq-cream/60 px-3 py-1.5 text-xs text-rizq-ink-soft/80"
            >
              {PROVIDER_LABELS[p]}
              <span className="text-[10px] text-rizq-ink-soft/50">· {t("integrationsComingSoon")}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
