import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleToggle } from "./LocaleToggle";

type Props = { locale: "ar" | "en" };

export async function SiteFooter({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Footer" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  return (
    <footer className="relative border-t border-rizq-gold/20 bg-rizq-cream-dark/40">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-2">
            <p className="font-arabic text-3xl font-bold text-rizq-green leading-none mb-3">
              رِزق
            </p>
            <p className={`text-sm text-rizq-ink-soft max-w-xs leading-relaxed ${font}`}>
              {t("tagline")}
            </p>
          </div>

          <div>
            <p className={`text-xs tracking-[0.18em] uppercase text-rizq-gold-dark mb-4 ${font}`}>
              {t("contactLabel")}
            </p>
            <a
              href={`mailto:${t("contactEmail")}`}
              className={`text-sm text-rizq-ink hover:text-rizq-green transition-colors ${font}`}
            >
              {t("contactEmail")}
            </a>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href="/tool"
              className={`text-sm text-rizq-green hover:text-rizq-green-dark font-medium transition-colors ${font}`}
            >
              {t("navTool")} →
            </Link>
            <Link
              href="/methodology"
              className={`text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors ${font}`}
            >
              {t("methodologyLabel")}
            </Link>
            <Link
              href="/terms"
              className={`text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors ${font}`}
            >
              {t("termsLabel")}
            </Link>
            <Link
              href="/privacy"
              className={`text-sm text-rizq-ink-soft hover:text-rizq-green transition-colors ${font}`}
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
          <p className={`text-xs tracking-[0.18em] uppercase text-rizq-ink-soft/60 ${font}`}>
            v0.1 · pre-launch
          </p>
        </div>
      </div>
    </footer>
  );
}
