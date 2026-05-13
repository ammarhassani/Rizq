import { SiteNav } from "@/components/nav/SiteNav";

export default async function AuthRouteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="relative min-h-screen flex flex-col">
      <SiteNav locale={locale as "ar" | "en"} sticky={false} />
      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-10 sm:py-14">
        {children}
      </main>
    </div>
  );
}
