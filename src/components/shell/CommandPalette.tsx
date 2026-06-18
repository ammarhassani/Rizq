"use client";

/**
 * CommandPalette — the ⌘K / Ctrl+K "jump to anything / do anything" overlay.
 *
 * Mounted once in AppShellClient so it is available on every authed page.
 * Three sections: Navigation (the APPS registry), Quick actions (create flows),
 * and Search results (owner-scoped entities from the commandSearch action,
 * debounced when the query is ≥2 chars).
 *
 * Keyboard: ↑/↓ move the active row across ALL visible rows, Enter activates,
 * Esc closes. Static nav/action rows are filtered client-side with the same
 * Arabic-aware normalize() the Combobox uses; entity rows come from the server.
 *
 * Brand-styled (rounded-3xl, cream popup, gold border), RTL-first, focus-trapped
 * via the base-ui Dialog primitive, reduced-motion safe, ≥44px rows.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  Search,
  FilePlus2,
  ReceiptText,
  TrendingUp,
  UserPlus,
  Palette,
  BookOpen,
  CornerDownLeft,
  FileText,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { APPS } from "@/lib/apps";
import { normalizeSearch } from "@/lib/normalizeSearch";
import { commandSearch, type CommandSearchResult } from "@/app/actions/search/commandSearch";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: "ar" | "en";
};

type RowKind = "nav" | "action" | "result";

type FlatRow = {
  key: string;
  kind: RowKind;
  icon: LucideIcon;
  label: string;
  href: string;
  /** Right-aligned type badge text (results only). */
  badge?: string;
};

type QuickAction = {
  id: string;
  href: string;
  icon: LucideIcon;
};

const QUICK_ACTIONS: QuickAction[] = [
  { id: "newProposal", href: "/proposals/new", icon: FilePlus2 },
  { id: "newInvoice", href: "/invoices/new", icon: ReceiptText },
  { id: "newGig", href: "/income/new", icon: TrendingUp },
  { id: "newClient", href: "/clients/new", icon: UserPlus },
  { id: "studioProfile", href: "/proposals/profile", icon: Palette },
  { id: "methodology", href: "/methodology", icon: BookOpen },
];

const RESULT_ICONS: Record<CommandSearchResult["type"], LucideIcon> = {
  proposal: FileText,
  client: Users,
  invoice: ReceiptText,
};

export function CommandPalette({ open, onOpenChange, locale }: Props) {
  const t = useTranslations("CommandPalette");
  const tApps = useTranslations("AppShell");
  const router = useRouter();

  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [results, setResults] = React.useState<CommandSearchResult[]>([]);
  const [searching, setSearching] = React.useState(false);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const rowRefs = React.useRef<Array<HTMLLIElement | null>>([]);
  const reactId = React.useId();
  const listboxId = `${reactId}-cmd-listbox`;

  // ── Global ⌘K / Ctrl+K listener (mount once, clean up on unmount) ─────────
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  // ── Reset query + focus the input each time the palette opens ─────────────
  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setActiveIndex(0);
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // ── Debounced entity search (≥2 chars) ────────────────────────────────────
  React.useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let cancelled = false;
    const handle = setTimeout(async () => {
      const found = await commandSearch(q);
      if (!cancelled) {
        setResults(found);
        setSearching(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, open]);

  // ── Build the flat row list (nav + actions, filtered) + results ───────────
  const navLabel = React.useCallback(
    (id: string) => tApps(`apps.${id}.name`),
    [tApps]
  );

  const { rows, sections } = React.useMemo(() => {
    const nq = normalizeSearch(query);

    const navRows: FlatRow[] = APPS.map((app) => ({
      key: `nav-${app.id}`,
      kind: "nav" as const,
      icon: app.icon,
      label: navLabel(app.id),
      href: app.href,
    })).filter((r) => !nq || normalizeSearch(r.label).includes(nq));

    const actionRows: FlatRow[] = QUICK_ACTIONS.map((a) => ({
      key: `action-${a.id}`,
      kind: "action" as const,
      icon: a.icon,
      label: t(`actions.${a.id}`),
      href: a.href,
    })).filter((r) => !nq || normalizeSearch(r.label).includes(nq));

    const resultRows: FlatRow[] = results.map((r) => ({
      key: `result-${r.type}-${r.id}`,
      kind: "result" as const,
      icon: RESULT_ICONS[r.type],
      label: r.label,
      href: r.href,
      badge: t(`types.${r.type}`),
    }));

    const flat = [...navRows, ...actionRows, ...resultRows];

    // Section metadata for headings + the index range each occupies.
    const sectionMeta: Array<{ heading: string; start: number; end: number }> = [];
    let cursor = 0;
    if (navRows.length) {
      sectionMeta.push({ heading: t("sections.navigation"), start: cursor, end: cursor + navRows.length });
      cursor += navRows.length;
    }
    if (actionRows.length) {
      sectionMeta.push({ heading: t("sections.actions"), start: cursor, end: cursor + actionRows.length });
      cursor += actionRows.length;
    }
    if (resultRows.length) {
      sectionMeta.push({ heading: t("sections.results"), start: cursor, end: cursor + resultRows.length });
      cursor += resultRows.length;
    }

    return { rows: flat, sections: sectionMeta };
  }, [query, results, navLabel, t]);

  // Keep the active row in range as the row set changes.
  React.useEffect(() => {
    setActiveIndex((prev) => {
      if (rows.length === 0) return 0;
      return Math.min(prev, rows.length - 1);
    });
  }, [rows.length]);

  // Scroll active row into view.
  React.useEffect(() => {
    if (!open) return;
    rowRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function activate(row: FlatRow | undefined) {
    if (!row) return;
    onOpenChange(false);
    // i18n router prefixes the locale; href is a typed-route literal at runtime.
    router.push(row.href as "/dashboard");
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (rows.length ? (i + 1) % rows.length : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(rows.length ? rows.length - 1 : 0);
        break;
      case "Enter":
        e.preventDefault();
        activate(rows[activeIndex]);
        break;
      // Escape is handled by the Dialog primitive (closes + restores focus).
    }
  }

  const showEmpty = rows.length === 0 && !searching;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-rizq-ink/30 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
        <DialogPrimitive.Popup
          dir={dir}
          aria-label={t("title")}
          className={cn(
            "fixed start-1/2 top-[12vh] z-50 flex max-h-[76vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 rtl:translate-x-1/2 flex-col sm:max-w-xl",
            "rounded-3xl border border-rizq-gold/30 bg-rizq-cream/98 shadow-xl outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none",
            font
          )}
        >
          <DialogPrimitive.Title className="sr-only">{t("title")}</DialogPrimitive.Title>

          {/* Search field */}
          <div className="flex items-center gap-2 border-b border-rizq-gold/20 px-4 py-3">
            <Search size={18} className="shrink-0 text-rizq-ink-soft/50" aria-hidden strokeWidth={1.8} />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={rows[activeIndex] ? `${listboxId}-opt-${activeIndex}` : undefined}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onInputKeyDown}
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              autoComplete="off"
              className={cn(
                "min-w-0 flex-1 bg-transparent text-base text-rizq-ink outline-none",
                "placeholder:text-rizq-ink-soft/50"
              )}
            />
          </div>

          {/* Results list */}
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={t("title")}
            className="min-h-0 flex-1 overflow-y-auto p-2"
          >
            {showEmpty ? (
              <li role="presentation" className="px-3 py-6 text-center text-sm text-rizq-ink-soft/60">
                {t("noResults")}
              </li>
            ) : (
              rows.map((row, idx) => {
                const Icon = row.icon;
                const isActive = idx === activeIndex;
                const heading = sections.find((s) => s.start === idx)?.heading;
                return (
                  <React.Fragment key={row.key}>
                    {heading && (
                      <li
                        role="presentation"
                        className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-rizq-ink-soft/55"
                      >
                        {heading}
                      </li>
                    )}
                    <li
                      ref={(el) => {
                        rowRefs.current[idx] = el;
                      }}
                      id={`${listboxId}-opt-${idx}`}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => activate(row)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                        isActive ? "bg-rizq-green/10" : "hover:bg-rizq-green/8"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          row.kind === "action"
                            ? "bg-rizq-gold/15 text-rizq-gold-dark"
                            : "bg-rizq-green/10 text-rizq-green"
                        )}
                      >
                        <Icon size={16} strokeWidth={1.7} aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-rizq-ink">{row.label}</span>
                      {row.badge && (
                        <span className="shrink-0 rounded-full bg-rizq-ink/5 px-2 py-0.5 text-[11px] text-rizq-ink-soft/70">
                          {row.badge}
                        </span>
                      )}
                      {isActive && (
                        <CornerDownLeft
                          size={14}
                          className="shrink-0 text-rizq-ink-soft/40"
                          aria-hidden
                        />
                      )}
                    </li>
                  </React.Fragment>
                );
              })
            )}
          </ul>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
