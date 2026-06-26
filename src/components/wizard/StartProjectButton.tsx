"use client";

/**
 * StartProjectButton — Project Lifecycle Wizard (spec 003), task T007.
 * The primary "Start a project" entry point (dashboard) → /projects/start.
 */
import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";

export function StartProjectButton({ locale }: { locale: "ar" | "en" }) {
  const t = useTranslations("Wizard");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <Link
      href="/projects/start"
      onClick={() => track("wizard_start_clicked", { locale })}
      className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-6 py-3 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
    >
      <Sparkles size={16} />
      {t("startProject")}
    </Link>
  );
}
