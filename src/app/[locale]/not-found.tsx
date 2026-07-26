import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SiteNav } from "@/components/nav/SiteNav";
import { AppShell } from "@/components/shell/AppShell";
import { createClient } from "@/lib/supabase/server";

// Next 16 App Router calls this for unmatched routes inside [locale]/*.
// We can't read params here (Next limitation), so default to Arabic and
// let the user toggle via the nav.
export default async function LocaleNotFound() {
  const locale = "ar" as const;
  const tNav = await getTranslations({ locale, namespace: "Nav" });

  // A signed-in freelancer who mistypes a URL should not be dropped onto the marketing
  // site. Keep their sidebar and a way back into the app; visitors keep the public nav.
  let isSignedIn = false;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    isSignedIn = !!data.user;
  } catch {
    // Auth unavailable → fall through to the public shell rather than failing the 404.
  }

  const body = (
    <div className="text-center max-w-md mx-auto">
      <p className="eyebrow mb-4">404</p>
      <h1 className="display-2 text-rizq-ink mb-3 font-arabic">لم نعثر على الصفحة.</h1>
      <p className="text-base text-rizq-ink-soft mb-8 font-arabic">
        الرابط الذي فتحته غير صحيح أو تم نقله.
      </p>
      <Link
        href={isSignedIn ? "/dashboard" : "/"}
        className="inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark transition-colors font-arabic"
      >
        <span className="inline-block rtl:rotate-180">←</span>
        <span>{isSignedIn ? tNav("dashboard") : tNav("tool")}</span>
      </Link>
    </div>
  );

  if (isSignedIn) {
    return (
      <AppShell locale={locale} maxWidth="reading">
        <div dir="rtl" className="py-16">
          {body}
        </div>
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <SiteNav locale={locale} />
      <main className="flex-1 flex items-center justify-center px-6">{body}</main>
    </div>
  );
}
