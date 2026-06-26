"use client";

/**
 * IntegrationsTab — Project Workspace (spec 004). Project-level USAGE of the
 * account-level GitHub connection: browse the connected user's public repos and
 * attach one to this project, plus a manual "attach a link" path. Connect/
 * disconnect lives in Settings → Integrations (the connection is account-wide).
 */

import { useState, useTransition } from "react";
import { Loader2, Plus, ExternalLink, X, Star, Settings2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, Link } from "@/i18n/navigation";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { addProjectIntegration } from "@/app/actions/projects/integrations/addProjectIntegration";
import { removeProjectIntegration } from "@/app/actions/projects/integrations/removeProjectIntegration";
import { listGithubRepos, type GithubRepo } from "@/app/actions/projects/integrations/githubRepos";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LinkRow = any;

export function IntegrationsTab({
  locale,
  projectId,
  githubConnected,
  githubLogin,
  links,
}: {
  locale: "ar" | "en";
  projectId: string;
  githubConnected: boolean;
  githubLogin: string | null;
  links: LinkRow[];
}) {
  const t = useTranslations("Projects");
  const router = useRouter();
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "font-arabic" : "font-sans";

  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [repos, setRepos] = useState<GithubRepo[] | null>(null);
  const [, start] = useTransition();
  const fieldCls = `rounded-xl border border-rizq-gold/30 bg-white/70 px-4 py-2.5 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`;

  const attached = new Set((links ?? []).map((l) => l.external_url));

  function loadRepos() {
    setBusy("repos");
    start(async () => {
      const r = await listGithubRepos();
      setBusy(null);
      setRepos(r.ok ? r.repos : []);
    });
  }
  function attachRepo(repo: GithubRepo) {
    setBusy(`r-${repo.full_name}`);
    start(async () => {
      await addProjectIntegration({
        project_id: projectId,
        provider: "github",
        external_url: repo.html_url,
        display_label: repo.full_name,
      });
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
      {/* GitHub — usage of the account connection */}
      <section className="rounded-2xl border border-rizq-gold/20 bg-rizq-cream/60 p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-rizq-ink text-rizq-cream flex items-center justify-center">
              <GithubIcon size={16} />
            </span>
            <span className={`text-sm font-semibold text-rizq-ink ${font}`}>GitHub</span>
            {githubConnected && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs">
                {githubLogin ? t("connectedAs", { login: githubLogin }) : t("statusActive")}
              </span>
            )}
          </span>
          {githubConnected ? (
            <button
              type="button"
              onClick={loadRepos}
              disabled={busy === "repos"}
              className={`inline-flex items-center gap-2 rounded-full border border-rizq-green/40 text-rizq-green px-4 py-2 text-sm font-medium hover:bg-rizq-green/8 transition disabled:opacity-70 ${font}`}
            >
              {busy === "repos" ? <Loader2 size={14} className="animate-spin" /> : <GithubIcon size={14} />}
              {t("browseRepos")}
            </button>
          ) : (
            <Link href="/settings?tab=integrations" className={`inline-flex items-center gap-1.5 text-sm font-medium text-rizq-green hover:underline ${font}`}>
              <Settings2 size={14} /> {t("connectInSettings")}
            </Link>
          )}
        </div>

        {repos && (
          repos.length === 0 ? (
            <p className={`text-sm text-rizq-ink-soft ${font}`}>{t("noRepos")}</p>
          ) : (
            <ul className="space-y-2 max-h-72 overflow-auto">
              {repos.map((repo) => {
                const isAttached = attached.has(repo.html_url);
                return (
                  <li key={repo.full_name} className="flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-white/70 px-4 py-2.5">
                    <span className="min-w-0">
                      <span className={`block text-sm font-medium text-rizq-ink truncate ${font}`}>{repo.full_name}</span>
                      <span className="flex items-center gap-2 text-xs text-rizq-ink-soft/70">
                        {repo.language && <span>{repo.language}</span>}
                        <span className="inline-flex items-center gap-0.5"><Star size={11} /> {repo.stars}</span>
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => attachRepo(repo)}
                      disabled={isAttached || busy === `r-${repo.full_name}`}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition shrink-0 ${
                        isAttached ? "text-rizq-ink-soft/50" : "border border-rizq-green/40 text-rizq-green hover:bg-rizq-green/8"
                      } ${font}`}
                    >
                      {busy === `r-${repo.full_name}` ? <Loader2 size={12} className="animate-spin" /> : isAttached ? t("attached") : t("attach")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )
        )}
      </section>

      {/* Manual links + linked resources */}
      <section>
        <h3 className={`text-sm font-semibold text-rizq-ink mb-3 ${font}`}>{t("linkedResources")}</h3>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
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

        {links.length === 0 ? (
          <p className={`text-sm text-rizq-ink-soft/60 ${font}`}>—</p>
        ) : (
          <ul className="space-y-2">
            {links.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-white/60 px-4 py-3">
                <a href={l.external_url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 min-w-0 text-sm text-rizq-ink hover:text-rizq-green ${font}`}>
                  {l.provider === "github" ? <GithubIcon size={14} className="shrink-0" /> : <ExternalLink size={14} className="shrink-0" />}
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
