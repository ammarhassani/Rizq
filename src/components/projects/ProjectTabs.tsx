"use client";

/**
 * ProjectTabs — Project Workspace (spec 004), task T001.
 * URL-addressable tab nav (?tab=) for the project page. Additive: new tabs are
 * added as their facets ship. Mobile-friendly, RTL-aware.
 */
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type ProjectTabKey = "overview" | "files" | "deliverables" | "tasks" | "integrations";

const TAB_LABEL: Record<ProjectTabKey, string> = {
  overview: "tabOverview",
  files: "tabFiles",
  deliverables: "tabDeliverables",
  tasks: "tabTasks",
  integrations: "tabIntegrations",
};

export function ProjectTabs({
  locale,
  projectId,
  current,
  tabs,
}: {
  locale: "ar" | "en";
  projectId: string;
  current: ProjectTabKey;
  tabs: ProjectTabKey[];
}) {
  const t = useTranslations("Projects");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <nav
      dir={locale === "ar" ? "rtl" : "ltr"}
      className="mb-6 flex gap-1 overflow-x-auto border-b border-rizq-gold/20"
      aria-label="Project sections"
    >
      {tabs.map((tab) => {
        const active = tab === current;
        const href =
          tab === "overview"
            ? (`/projects/${projectId}` as `/projects/${string}`)
            : (`/projects/${projectId}?tab=${tab}` as `/projects/${string}`);
        return (
          <Link
            key={tab}
            href={href}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active
                ? "border-rizq-green text-rizq-green"
                : "border-transparent text-rizq-ink-soft hover:text-rizq-ink"
            } ${font}`}
          >
            {t(TAB_LABEL[tab])}
          </Link>
        );
      })}
    </nav>
  );
}
