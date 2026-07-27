/**
 * ContextBreadcrumb (feature 005, US3) — shown on an editor opened inside a
 * project (`?from=project:{id}`) so the screen is framed for that engagement:
 * a chip naming the project (links back to the pane) + a compact lifecycle
 * progress ("Step N of 3"). Absent standalone. Server component.
 */
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Briefcase } from "lucide-react";
import { fmtCount } from "@/lib/format/number";

export async function ContextBreadcrumb({
  locale,
  projectId,
  projectTitle,
  stepNo,
  totalSteps,
  guided,
}: {
  locale: "ar" | "en";
  projectId: string;
  projectTitle: string;
  stepNo?: number;
  totalSteps?: number;
  guided?: boolean;
}) {
  const t = await getTranslations({ locale, namespace: "Wizard" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const href = `/projects/${projectId}${guided ? "?guided=1" : ""}` as `/projects/${string}`;

  return (
    <div className={`mb-4 flex flex-wrap items-center gap-2 text-xs ${font}`}>
      <Link
        href={href}
        className={`inline-flex items-center gap-1.5 rounded-full border border-rizq-green/25 bg-rizq-green/8 px-3 py-1 font-medium text-rizq-green hover:bg-rizq-green/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`}
      >
        <Briefcase size={12} aria-hidden />
        <span className="max-w-[14rem] truncate">{projectTitle}</span>
      </Link>
      {stepNo && totalSteps && (
        <span className={`text-rizq-ink-soft/60 ${font}`}>
          {t("guidedStepOf", { current: fmtCount(stepNo, locale), total: fmtCount(totalSteps, locale) })}
        </span>
      )}
    </div>
  );
}
