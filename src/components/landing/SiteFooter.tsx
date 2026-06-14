import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleToggle } from "./LocaleToggle";
import { APPS } from "@/lib/apps";

type Props = { locale: "ar" | "en" };

/** Key modules to feature in the footer apps column */
const FOOTER_APP_IDS = [
  "tool",
  "proposals",
  "invoices",
  "income",
  "clients",
  "rate-calculator",
] as const;

export async function SiteFooter({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Footer" });
  const tLanding = await getTranslations({ locale, namespace: "Landing" });
  const tApps = await getTranslations({ locale, namespace: "AppShell" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const footerApps = APPS.filter((a) =>
    (FOOTER_APP_IDS as readonly string[]).includes(a.id)
  );

  return (
    <footer className="relative border-t border-rizq-gold/20 bg-rizq-cream-dark/40">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand block — spans 2 cols on lg */}
          <div className="lg:col-span-2">
            <p className="font-arabic text-3xl font-bold text-rizq-green leading-none mb-3">
              رِزق
            </p>
            <p className={`text-sm text-rizq-ink-soft max-w-xs leading-relaxed ${font}`}>
              {t("tagline")}
            </p>
          </div>

          {/* Apps column */}
          <div>
            <p className={`text-xs tracking-[0.18em] uppercase text-rizq-gold-dark mb-4 ${font}`}>
              {tLanding("footerApps")}
            </p>
            <ul className="flex flex-col gap-2.5">
              {footerApps.map((app) => (
                <li key={app.id}>
                  <Link
                    href={app.href}
                    className={`text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rizq-green rounded-sm ${font}`}
                  >
                    {tApps(`apps.${app.id}.name`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact column */}
          <div>
            <p className={`text-xs tracking-[0.18em] uppercase text-rizq-gold-dark mb-4 ${font}`}>
              {t("contactLabel")}
            </p>
            <a
              href={`mailto:${t("contactEmail")}`}
              className={`text-sm text-rizq-ink hover:text-rizq-green transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rizq-green rounded-sm ${font}`}
            >
              {t("contactEmail")}
            </a>
          </div>

          {/* Legal + locale toggle column */}
          <div className="flex flex-col gap-3">
            <Link
              href="/methodology"
              className={`text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rizq-green rounded-sm ${font}`}
            >
              {t("methodologyLabel")}
            </Link>
            <Link
              href="/terms"
              className={`text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rizq-green rounded-sm ${font}`}
            >
              {t("termsLabel")}
            </Link>
            <Link
              href="/privacy"
              className={`text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rizq-green rounded-sm ${font}`}
            >
              {t("privacyLabel")}
            </Link>
            <div className="mt-2">
              <LocaleToggle />
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-rizq-gold/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className={`text-xs text-rizq-ink-soft/70 ${font}`}>
            {t("copyright")}
          </p>
          <p className="text-xs tracking-[0.18em] uppercase text-rizq-ink-soft/60 font-sans">
            rizq.sa
          </p>
        </div>
      </div>
    </footer>
  );
}
