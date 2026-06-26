"use client";

/**
 * IntegrationsTab — Project Workspace (spec 004), task T025.
 * Real provider connections (GitHub read-only) when configured, plus the
 * manual "attach a link" path that always works. Secrets never appear here —
 * only connection status + non-secret links.
 */

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Link2, Plus, ExternalLink, X, Unplug, CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  startProviderConnection,
  revokeProviderConnection,
  type ProviderConnectionRow,
} from "@/app/actions/projects/integrations/connect";
import { addProjectIntegration } from "@/app/actions/projects/integrations/addProjectIntegration";
import { removeProjectIntegration } from "@/app/actions/projects/integrations/removeProjectIntegration";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Link = any;

const STATUS_KEY: Record<string, string> = {
  active: "statusActive",
  revoked: "statusRevoked",
  expired: "statusExpired",
};

export function IntegrationsTab({
  locale,
  projectId,
  githubConfigured,
  connections,
  links,
}: {
  locale: "ar" | "en";
  projectId: string;
  githubConfigured: boolean;
  connections: ProviderConnectionRow[];
  links: Link[];
}) {
  const t = useTranslations("Projects");
  const router = useRouter();
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "font-arabic" : "font-sans";

  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [, start] = useTransition();
  const fieldCls = `rounded-xl border border-rizq-gold/30 bg-white/70 px-4 py-2.5 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`;

  const integrationStatus = useSearchParams().get("integration");

  function connect() {
    setBusy("connect");
    start(async () => {
      const r = await startProviderConnection({
        provider: "github",
        return_to: `/${locale}/projects/${projectId}?tab=integrations`,
      });
      setBusy(null);
      if (r.ok) window.location.href = r.url;
    });
  }
  function revoke(id: string) {
    setBusy(id);
    start(async () => {
      await revokeProviderConnection({ connection_id: id });
      setBusy(null);
      router.refresh();
    });
  }
  function addLink() {
    if (!url.trim() || !label.trim()) return;
    setBusy("add");
    start(async () => {
      await addProjectIntegration({ project_id: projectId, provider: "other", external_url: url.trim(), display_label: label.trim() });
      setBusy(null);
      setUrl("");
      setLabel("");
      router.refresh();
    });
  }
  function removeLink(id: string) {
    setBusy(`rm-${id}`);
    start(async () => {
      await removeProjectIntegration({ integration_id: id });
      setBusy(null);
      router.refresh();
    });
  }

  return (
    <div dir={dir} className={`space-y-6 ${font}`}>
      {/* Connection result banner (from the OAuth callback redirect) */}
      {integrationStatus === "connected" && (
        <div className={`flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ${font}`}>
          <CheckCircle2 size={16} /> {t("connectedBanner")}
        </div>
      )}
      {(integrationStatus === "error" || integrationStatus === "not_configured") && (
        <div role="alert" className={`rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 ${font}`}>
          {t("connectErrorBanner")}
        </div>
      )}

      {/* Connect / connections */}
      <section>
        <h3 className={`text-sm font-semibold text-rizq-ink mb-3 ${font}`}>{t("connectionsTitle")}</h3>
        {githubConfigured ? (
          <button
            type="button"
            onClick={connect}
            disabled={busy === "connect"}
            className={`inline-flex items-center gap-2 rounded-full bg-rizq-ink text-rizq-cream px-5 py-2.5 text-sm font-medium hover:opacity-90 transition disabled:opacity-70 ${font}`}
          >
            {busy === "connect" ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={15} />}
            {t("connectGithub")}
          </button>
        ) : (
          <p className={`text-sm text-rizq-ink-soft ${font}`}>{t("githubNotConfiguredHint")}</p>
        )}

        {connections.length > 0 && (
          <ul className="mt-3 space-y-2">
            {connections.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-white/60 px-4 py-3">
                <span className="flex items-center gap-2 min-w-0">
                  <Link2 size={15} className="text-rizq-ink-soft shrink-0" />
                  <span className={`text-sm text-rizq-ink ${font}`}>
                    GitHub {c.external_login ? t("connectedAs", { login: c.external_login }) : ""}
                  </span>
                  <span className={`text-xs ${c.status === "active" ? "text-emerald-700" : "text-rizq-ink-soft/60"}`}>
                    · {t(STATUS_KEY[c.status] ?? "statusActive")}
                  </span>
                </span>
                {c.status === "active" && (
                  <button
                    type="button"
                    onClick={() => revoke(c.id)}
                    disabled={busy === c.id}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:underline shrink-0"
                  >
                    {busy === c.id ? <Loader2 size={12} className="animate-spin" /> : <Unplug size={12} />}
                    {t("revokeConnection")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Manual links */}
      <section>
        <h3 className={`text-sm font-semibold text-rizq-ink mb-3 ${font}`}>{t("addLinkTitle")}</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("linkUrlPlaceholder")} className={`${fieldCls} flex-1`} />
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("linkLabelPlaceholder")} className={`${fieldCls} sm:w-40`} />
          <button
            type="button"
            onClick={addLink}
            disabled={busy === "add"}
            className={`inline-flex items-center justify-center gap-2 rounded-full border border-rizq-green/40 text-rizq-green px-5 py-2.5 text-sm font-medium hover:bg-rizq-green/8 transition disabled:opacity-70 ${font}`}
          >
            {busy === "add" ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {t("addLinkBtn")}
          </button>
        </div>

        {links.length > 0 && (
          <ul className="mt-3 space-y-2">
            {links.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-white/60 px-4 py-3">
                <a href={l.external_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 min-w-0 text-sm text-rizq-ink hover:text-rizq-green ${font}`}>
                  <ExternalLink size={14} className="shrink-0" />
                  <span className="truncate">{l.display_label}</span>
                </a>
                <button type="button" onClick={() => removeLink(l.id)} disabled={busy === `rm-${l.id}`} className="text-rizq-ink-soft/60 hover:text-red-600 shrink-0" title={t("removeLink")}>
                  {busy === `rm-${l.id}` ? <Loader2 size={12} className="animate-spin" /> : <X size={14} />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
