"use client";

/**
 * AccountIntegrations — Settings → Integrations (account-level connect/disconnect).
 * The provider connection is user-scoped (one per provider), so it's managed
 * here, once, for the whole account. Projects only consume it.
 */

import { useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Unplug, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { GithubIcon } from "@/components/icons/GithubIcon";
import {
  startProviderConnection,
  revokeProviderConnection,
  type ProviderConnectionRow,
} from "@/app/actions/projects/integrations/connect";

export function AccountIntegrations({
  locale,
  githubConfigured,
  connections,
}: {
  locale: "ar" | "en";
  githubConfigured: boolean;
  connections: ProviderConnectionRow[];
}) {
  const t = useTranslations("Projects");
  const tS = useTranslations("Settings");
  const router = useRouter();
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "font-arabic" : "font-sans";
  const [pending, start] = useTransition();
  const status = useSearchParams().get("integration");

  const github = connections.find((c) => c.provider === "github" && c.status === "active") ?? null;

  function connect() {
    start(async () => {
      const r = await startProviderConnection({
        provider: "github",
        return_to: `/${locale}/settings?tab=integrations`,
      });
      if (r.ok) window.location.href = r.url;
    });
  }
  function disconnect(id: string) {
    start(async () => {
      await revokeProviderConnection({ connection_id: id });
      router.refresh();
    });
  }

  return (
    <section dir={dir} className="mb-10">
      <h2 className={`text-base font-semibold text-rizq-ink mb-4 ${font}`}>{tS("integrationsSectionTitle")}</h2>

      {status === "connected" && (
        <div className={`mb-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ${font}`}>
          <CheckCircle2 size={16} /> {t("connectedBanner")}
        </div>
      )}
      {(status === "error" || status === "not_configured") && (
        <div role="alert" className={`mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--over)] ${font}`}>
          {t("connectErrorBanner")}
        </div>
      )}

      <div className="rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-10 w-10 rounded-2xl bg-rizq-ink text-rizq-cream flex items-center justify-center shrink-0">
              <GithubIcon size={20} />
            </span>
            <div className="min-w-0">
              <p className={`text-sm font-semibold text-rizq-ink ${font}`}>GitHub</p>
              <p className={`text-xs text-rizq-ink-soft ${font}`}>
                {github
                  ? (github.external_login ? t("connectedAs", { login: github.external_login }) : t("statusActive"))
                  : tS("integrationsGithubBlurb")}
              </p>
            </div>
          </div>

          {github ? (
            <button
              type="button"
              onClick={() => disconnect(github.id)}
              disabled={pending}
              className={`inline-flex items-center gap-1.5 rounded-full border border-red-300/50 text-[var(--over)] px-4 py-2 text-sm font-medium hover:bg-red-50 transition disabled:opacity-60 ${font}`}
            >
              {pending ? <Loader2 size={13} className="animate-spin" /> : <Unplug size={13} />}
              {t("revokeConnection")}
            </button>
          ) : githubConfigured ? (
            <button
              type="button"
              onClick={connect}
              disabled={pending}
              className={`inline-flex items-center gap-2 rounded-full bg-rizq-ink text-rizq-cream px-5 py-2.5 text-sm font-medium hover:opacity-90 transition disabled:opacity-70 ${font}`}
            >
              {pending ? <Loader2 size={14} className="animate-spin" /> : <GithubIcon size={15} />}
              {t("connectGithub")}
            </button>
          ) : (
            <span className={`text-xs text-rizq-ink-soft/60 ${font}`}>{t("githubNotConfiguredHint")}</span>
          )}
        </div>
      </div>
    </section>
  );
}
