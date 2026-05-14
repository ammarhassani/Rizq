import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteNav } from "@/components/nav/SiteNav";

// Next 16 App Router calls this for unmatched routes inside [locale]/*.
// We can't read params here (Next limitation), so default to Arabic and
// let the user toggle via the nav.
export default async function LocaleNotFound() {
  const locale = "ar" as const;
  const tNav = await getTranslations({ locale, namespace: "Nav" });

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <SiteNav locale={locale} />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="eyebrow mb-4">404</p>
          <h1 className="display-2 text-rizq-ink mb-3 font-arabic">
            لم نعثر على الصفحة.
          </h1>
          <p className="text-base text-rizq-ink-soft mb-8 font-arabic">
            الرابط الذي فتحته غير صحيح أو تم نقله.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark transition-colors font-arabic"
          >
            <span className="inline-block rtl:rotate-180">←</span>
            <span>{tNav("tool")}</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
