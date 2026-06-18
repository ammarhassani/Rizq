"use client";

/**
 * CatalogManager — the Catalog module's interactive surface.
 *
 * Two tabs (Products & Services, Tax & Fees), each with:
 *  - a status filter (Active / Archived / All),
 *  - add / edit (full popped dialogs), archive, restore, hard delete,
 *  - multi-select + bulk archive / restore / delete,
 *  - CSV export (current view) and CSV import,
 *  - per-item sales history (items only).
 * Lists arrive from the server page as props; every mutation router.refresh()es.
 */

import * as React from "react";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  Plus, Pencil, Trash2, RotateCcw, History as HistoryIcon,
  Download, Upload, Package, Tags, Loader2, TriangleAlert,
} from "lucide-react";
import { ItemDialog } from "@/components/items/ItemDialog";
import { FeeDialog } from "@/components/fees/FeeDialog";
import { SalesHistoryDialog } from "@/components/catalog/SalesHistoryDialog";
import { setItemsActive, deleteItems, importItems, type CreatedItem } from "@/app/actions/items/items";
import { setFeePresetsActive, deleteFeePresets, importFeePresets, type CreatedFeePreset } from "@/app/actions/fees/fees";
import { MotionList, MotionItem } from "@/components/motion/MotionList";
import { toCsv, csvToRecords, parseMoneyCell } from "@/lib/catalog/csv";
import { cn } from "@/lib/utils";

export type CatalogItem = CreatedItem & { is_active: boolean };
export type CatalogFee = CreatedFeePreset & { is_active: boolean };

type Props = {
  locale: "ar" | "en";
  items: CatalogItem[];
  feePresets: CatalogFee[];
};

type Tab = "items" | "fees";
type StatusFilter = "active" | "archived" | "all";
type PendingConfirm = { op: "archive" | "delete"; kind: Tab; ids: string[] } | null;

export function CatalogManager({ locale, items, feePresets }: Props) {
  const t = useTranslations("Catalog");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const currency = isAr ? "ر.س" : "SAR";

  const [tab, setTab] = React.useState<Tab>("items");
  const [status, setStatus] = React.useState<StatusFilter>("active");
  const [selItems, setSelItems] = React.useState<Set<string>>(new Set());
  const [selFees, setSelFees] = React.useState<Set<string>>(new Set());

  const [itemDialog, setItemDialog] = React.useState<{ open: boolean; mode: "create" | "edit"; initialData?: CreatedItem }>({ open: false, mode: "create" });
  const [feeDialog, setFeeDialog] = React.useState<{ open: boolean; mode: "create" | "edit"; initialData?: CreatedFeePreset }>({ open: false, mode: "create" });
  const [historyItem, setHistoryItem] = React.useState<CreatedItem | null>(null);
  const [confirm, setConfirm] = React.useState<PendingConfirm>(null);
  const [importMsg, setImportMsg] = React.useState<string | null>(null);

  const [isMutating, startMutate] = useTransition();
  const [isImporting, startImport] = useTransition();

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Clear selection whenever the filter or tab changes (avoid acting on hidden rows).
  React.useEffect(() => { setSelItems(new Set()); setSelFees(new Set()); }, [status, tab]);

  const fmt = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);

  const matchStatus = React.useCallback(
    (active: boolean) => status === "all" || (status === "active" ? active : !active),
    [status]
  );
  const visibleItems = items.filter((i) => matchStatus(i.is_active));
  const visibleFees = feePresets.filter((f) => matchStatus(f.is_active));

  const sel = tab === "items" ? selItems : selFees;
  const setSel = tab === "items" ? setSelItems : setSelFees;
  const visibleIds = (tab === "items" ? visibleItems : visibleFees).map((r) => r.id);

  function toggleSel(id: string) {
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function selectAllVisible() {
    setSel((prev) => (prev.size === visibleIds.length ? new Set() : new Set(visibleIds)));
  }

  function afterMutation() {
    setSel(new Set());
    router.refresh();
  }

  // ── Archive / restore / delete ───────────────────────────────────────────
  function doRestore(kind: Tab, ids: string[]) {
    if (ids.length === 0) return;
    startMutate(async () => {
      const r = kind === "items"
        ? await setItemsActive({ ids, active: true })
        : await setFeePresetsActive({ ids, active: true });
      if (r.ok) afterMutation();
    });
  }
  function confirmPending() {
    if (!confirm) return;
    const { op, kind, ids } = confirm;
    startMutate(async () => {
      let r: { ok: boolean };
      if (op === "delete") {
        r = kind === "items" ? await deleteItems({ ids }) : await deleteFeePresets({ ids });
      } else {
        r = kind === "items" ? await setItemsActive({ ids, active: false }) : await setFeePresetsActive({ ids, active: false });
      }
      if (r.ok) { setConfirm(null); afterMutation(); }
    });
  }

  // ── CSV export ──────────────────────────────────────────────────────────
  function download(filename: string, csv: string) {
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  function handleExport() {
    if (tab === "items") {
      download("catalog-items.csv", toCsv(visibleItems, [
        { key: "name", header: "name" },
        { key: "category", header: "category" },
        { key: "unit_price_sar", header: "unit_price_sar" },
        { key: "description", header: "description" },
      ]));
    } else {
      download("catalog-fees.csv", toCsv(visibleFees, [
        { key: "name", header: "name" },
        { key: "category", header: "category" },
        { key: "amount_sar", header: "amount_sar" },
      ]));
    }
  }

  // ── CSV import ────────────────────────────────────────────────────────────
  function handleImportClick() {
    setImportMsg(null);
    fileInputRef.current?.click();
  }
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-importing the same file
    if (!file) return;
    const text = await file.text();
    const { records } = csvToRecords(text);

    if (tab === "items") {
      const all = records.map((r) => ({
        name: (r["name"] ?? r["item"] ?? r["service"] ?? "").trim(),
        description: r["description"] || undefined,
        unit_price_sar: parseMoneyCell(r["unitpricesar"] ?? r["unitprice"] ?? r["price"]),
        category: r["category"] || undefined,
      }));
      const rows = all.filter((r) => r.name && r.unit_price_sar != null) as { name: string; description?: string; unit_price_sar: number; category?: string }[];
      const skipped = all.length - rows.length;
      if (rows.length === 0) { setImportMsg(t("importEmpty")); return; }
      startImport(async () => {
        const res = await importItems({ rows });
        setImportMsg(res.ok ? t("importResult", { inserted: res.inserted, skipped }) : t("importError"));
        if (res.ok) router.refresh();
      });
    } else {
      const all = records.map((r) => ({
        name: (r["name"] ?? r["fee"] ?? "").trim(),
        category: r["category"] || undefined,
        amount_sar: parseMoneyCell(r["amountsar"] ?? r["amount"] ?? r["price"]),
      }));
      const rows = all.filter((r) => r.name && r.amount_sar != null) as { name: string; category?: string; amount_sar: number }[];
      const skipped = all.length - rows.length;
      if (rows.length === 0) { setImportMsg(t("importEmpty")); return; }
      startImport(async () => {
        const res = await importFeePresets({ rows });
        setImportMsg(res.ok ? t("importResult", { inserted: res.inserted, skipped }) : t("importError"));
        if (res.ok) router.refresh();
      });
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  const tabBtn = (key: Tab, label: string, count: number) => (
    <button
      type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
        tab === key ? "bg-rizq-green text-rizq-cream shadow-sm" : "border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40 hover:text-rizq-green",
        font
      )}
    >
      <span>{label}</span>
      <span className={cn("tabular font-sans inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs", tab === key ? "bg-rizq-cream/25" : "bg-rizq-ink/8 text-rizq-ink-soft")}>{count}</span>
    </button>
  );

  const filterBtn = (key: StatusFilter, label: string) => (
    <button
      type="button" onClick={() => setStatus(key)} aria-pressed={status === key}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
        status === key ? "bg-rizq-ink/8 text-rizq-ink" : "text-rizq-ink-soft hover:text-rizq-ink",
        font
      )}
    >
      {label}
    </button>
  );

  const currentList = tab === "items" ? visibleItems : visibleFees;
  const allVisibleSelected = visibleIds.length > 0 && sel.size === visibleIds.length;

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className={cn("display-2 text-rizq-ink mb-2", font)}>{t("title")}</h1>
        <p className={cn("text-base leading-relaxed text-rizq-ink-soft", font)}>{t("subtitle")}</p>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label={t("title")} className="mb-4 flex flex-wrap gap-2">
        {tabBtn("items", t("tabItems"), items.length)}
        {tabBtn("fees", t("tabFees"), feePresets.length)}
      </div>

      {/* Toolbar: status filter + add + export/import */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-full border border-rizq-gold/25 bg-rizq-cream/50 p-1">
          {filterBtn("active", t("filterActive"))}
          {filterBtn("archived", t("filterArchived"))}
          {filterBtn("all", t("filterAll"))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={handleExport}
            className={cn("inline-flex items-center gap-1.5 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 px-3.5 py-2 text-sm text-rizq-ink-soft transition-all hover:border-rizq-green/40 hover:text-rizq-green", font)}>
            <Download size={15} aria-hidden /> <span>{t("exportCsv")}</span>
          </button>
          <button type="button" onClick={handleImportClick} disabled={isImporting}
            className={cn("inline-flex items-center gap-1.5 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 px-3.5 py-2 text-sm text-rizq-ink-soft transition-all hover:border-rizq-green/40 hover:text-rizq-green disabled:opacity-60", font)}>
            {isImporting ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <Upload size={15} aria-hidden />}
            <span>{isImporting ? t("importing") : t("importCsv")}</span>
          </button>
          <button type="button"
            onClick={() => (tab === "items" ? setItemDialog({ open: true, mode: "create" }) : setFeeDialog({ open: true, mode: "create" }))}
            className={cn("inline-flex items-center gap-1.5 rounded-full bg-rizq-green px-4 py-2.5 text-sm font-medium text-rizq-cream transition-all hover:-translate-y-0.5 hover:bg-rizq-green-dark", font)}>
            <Plus size={16} strokeWidth={2.4} aria-hidden /> <span>{tab === "items" ? t("addItem") : t("addFee")}</span>
          </button>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" aria-hidden tabIndex={-1} />
      {importMsg && (
        <p role="status" className={cn("mb-4 rounded-xl border border-rizq-green/25 bg-rizq-green/8 px-4 py-2.5 text-sm text-rizq-green", font)}>{importMsg}</p>
      )}

      {/* Bulk bar */}
      {sel.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rizq-green/30 bg-rizq-green/8 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className={cn("text-sm font-medium text-rizq-ink", font)}>{t("selectedCount", { count: sel.size })}</span>
            <button type="button" onClick={selectAllVisible} className={cn("text-xs text-rizq-green hover:underline", font)}>
              {allVisibleSelected ? t("clearSelection") : t("selectAll")}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {status !== "active" && (
              <button type="button" disabled={isMutating} onClick={() => doRestore(tab, [...sel])}
                className={cn("inline-flex items-center gap-1.5 rounded-full border border-rizq-gold/40 bg-rizq-cream px-3.5 py-2 text-sm text-rizq-ink transition-all hover:border-rizq-green/50 hover:text-rizq-green disabled:opacity-60", font)}>
                <RotateCcw size={14} aria-hidden /> <span>{t("bulkRestore")}</span>
              </button>
            )}
            {status !== "archived" && (
              <button type="button" disabled={isMutating} onClick={() => setConfirm({ op: "archive", kind: tab, ids: [...sel] })}
                className={cn("inline-flex items-center gap-1.5 rounded-full border border-rizq-gold/40 bg-rizq-cream px-3.5 py-2 text-sm text-rizq-ink transition-all hover:border-rizq-green/50 hover:text-rizq-green disabled:opacity-60", font)}>
                <Trash2 size={14} aria-hidden /> <span>{t("bulkArchive")}</span>
              </button>
            )}
            <button type="button" disabled={isMutating} onClick={() => setConfirm({ op: "delete", kind: tab, ids: [...sel] })}
              className={cn("inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-3.5 py-2 text-sm text-red-600 transition-all hover:bg-red-50 disabled:opacity-60", font)}>
              <Trash2 size={14} aria-hidden /> <span>{t("bulkDelete")}</span>
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {currentList.length === 0 ? (
        <EmptyState
          icon={tab === "items" ? <Package size={28} strokeWidth={1.5} aria-hidden /> : <Tags size={28} strokeWidth={1.5} aria-hidden />}
          title={status === "archived" ? t("archivedEmptyTitle") : tab === "items" ? t("itemsEmptyTitle") : t("feesEmptyTitle")}
          body={status === "archived" ? t("archivedEmptyBody") : tab === "items" ? t("itemsEmptyBody") : t("feesEmptyBody")}
          font={font}
        />
      ) : (
        <MotionList key={tab} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tab === "items"
            ? visibleItems.map((it) => (
                <Card key={it.id} archived={!it.is_active} selected={selItems.has(it.id)} onToggle={() => toggleSel(it.id)} selectLabel={t("select")} archivedBadge={t("archivedBadge")} font={font}>
                  <h3 className={cn("text-base font-semibold leading-snug text-rizq-ink", font)}>{it.name}</h3>
                  {it.category && <CategoryChip label={it.category} font={font} />}
                  <p className="mt-3 tabular font-sans text-lg font-bold text-rizq-green">{fmt(it.unit_price_sar)}{" "}<span className={cn("text-xs font-normal text-rizq-ink-soft/60", font)}>{currency}</span></p>
                  {it.description && <p className={cn("mt-2 line-clamp-2 text-sm text-rizq-ink-soft", font)}>{it.description}</p>}
                  <RowActions
                    font={font}
                    actions={
                      it.is_active
                        ? [
                            { icon: <Pencil size={15} aria-hidden />, label: t("edit"), onClick: () => setItemDialog({ open: true, mode: "edit", initialData: it }) },
                            { icon: <HistoryIcon size={15} aria-hidden />, label: t("history"), onClick: () => setHistoryItem(it) },
                            { icon: <Trash2 size={15} aria-hidden />, label: t("archive"), onClick: () => setConfirm({ op: "archive", kind: "items", ids: [it.id] }) },
                          ]
                        : [
                            { icon: <RotateCcw size={15} aria-hidden />, label: t("restore"), onClick: () => doRestore("items", [it.id]) },
                            { icon: <Trash2 size={15} aria-hidden />, label: t("delete"), danger: true, onClick: () => setConfirm({ op: "delete", kind: "items", ids: [it.id] }) },
                          ]
                    }
                  />
                </Card>
              ))
            : visibleFees.map((p) => (
                <Card key={p.id} archived={!p.is_active} selected={selFees.has(p.id)} onToggle={() => toggleSel(p.id)} selectLabel={t("select")} archivedBadge={t("archivedBadge")} font={font}>
                  <h3 className={cn("text-base font-semibold leading-snug text-rizq-ink", font)}>{p.name}</h3>
                  {p.category && <CategoryChip label={p.category} font={font} />}
                  <p className="mt-3 tabular font-sans text-lg font-bold text-rizq-green">{fmt(p.amount_sar)}{" "}<span className={cn("text-xs font-normal text-rizq-ink-soft/60", font)}>{currency}</span></p>
                  <RowActions
                    font={font}
                    actions={
                      p.is_active
                        ? [
                            { icon: <Pencil size={15} aria-hidden />, label: t("edit"), onClick: () => setFeeDialog({ open: true, mode: "edit", initialData: p }) },
                            { icon: <Trash2 size={15} aria-hidden />, label: t("archive"), onClick: () => setConfirm({ op: "archive", kind: "fees", ids: [p.id] }) },
                          ]
                        : [
                            { icon: <RotateCcw size={15} aria-hidden />, label: t("restore"), onClick: () => doRestore("fees", [p.id]) },
                            { icon: <Trash2 size={15} aria-hidden />, label: t("delete"), danger: true, onClick: () => setConfirm({ op: "delete", kind: "fees", ids: [p.id] }) },
                          ]
                    }
                  />
                </Card>
              ))}
        </MotionList>
      )}

      {/* Dialogs */}
      <ItemDialog open={itemDialog.open} onOpenChange={(open) => setItemDialog((s) => ({ ...s, open }))} mode={itemDialog.mode} initialData={itemDialog.initialData} onSaved={() => router.refresh()} locale={locale} />
      <FeeDialog open={feeDialog.open} onOpenChange={(open) => setFeeDialog((s) => ({ ...s, open }))} mode={feeDialog.mode} initialData={feeDialog.initialData} onSaved={() => router.refresh()} locale={locale} />
      <SalesHistoryDialog open={historyItem !== null} onOpenChange={(open) => { if (!open) setHistoryItem(null); }} item={historyItem} locale={locale} />

      {/* Confirm (archive / delete) */}
      <DialogPrimitive.Root open={confirm !== null} onOpenChange={(open) => { if (!open && !isMutating) setConfirm(null); }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-rizq-ink/30 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
          <DialogPrimitive.Popup dir={isAr ? "rtl" : "ltr"}
            className={cn("fixed start-1/2 top-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 sm:max-w-md rounded-3xl border border-rizq-gold/25 bg-rizq-cream/98 p-6 shadow-xl sm:p-8 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none", font)}>
            <div className="flex items-start gap-3">
              <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", confirm?.op === "delete" ? "bg-red-50 text-red-600" : "bg-rizq-gold/15 text-rizq-gold-deep")}>
                <TriangleAlert size={18} strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <DialogPrimitive.Title className={cn("text-base font-semibold text-rizq-ink", font)}>
                  {confirm?.op === "delete" ? t("deleteConfirmTitle") : t("archiveConfirmTitle")}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className={cn("mt-1 text-sm text-rizq-ink-soft", font)}>
                  {t(confirm?.op === "delete" ? "deleteConfirmBody" : "archiveConfirmBody", { count: confirm?.ids.length ?? 0 })}
                </DialogPrimitive.Description>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <DialogPrimitive.Close type="button" disabled={isMutating}
                className={cn("inline-flex min-h-[44px] items-center justify-center rounded-full border border-rizq-gold/30 bg-transparent px-6 py-3 text-sm text-rizq-ink-soft transition-all hover:border-rizq-ink/30 hover:text-rizq-ink disabled:opacity-60", font)}>
                {t("confirmCancel")}
              </DialogPrimitive.Close>
              <button type="button" onClick={confirmPending} disabled={isMutating}
                className={cn("inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-medium text-white transition-all disabled:opacity-70",
                  confirm?.op === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-rizq-green hover:bg-rizq-green-dark")}>
                {isMutating ? (
                  <><Loader2 size={16} className="animate-spin" strokeWidth={2.2} aria-hidden /><span>{confirm?.op === "delete" ? t("deleting") : t("archiving")}</span></>
                ) : (
                  <span>{confirm?.op === "delete" ? t("confirmDelete") : t("confirmArchive")}</span>
                )}
              </button>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

// ── Presentational helpers ────────────────────────────────────────────────────

type RowAction = { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean };

function Card({
  children, archived, selected, onToggle, selectLabel, archivedBadge, font,
}: {
  children: React.ReactNode;
  archived: boolean;
  selected: boolean;
  onToggle: () => void;
  selectLabel: string;
  archivedBadge: string;
  font: string;
}) {
  return (
    <MotionItem as="article" className={cn(
      "relative flex flex-col rounded-2xl border bg-rizq-cream/70 p-5 transition-all hover:-translate-y-0.5 hover:shadow-sm",
      selected ? "border-rizq-green/50 ring-1 ring-rizq-green/30" : "border-rizq-gold/25 hover:border-rizq-green/30",
      archived && "opacity-70"
    )}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label={selectLabel}
          className="h-4 w-4 shrink-0 rounded border-rizq-gold/40 text-rizq-green accent-rizq-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40" />
        {archived && (
          <span className={cn("inline-flex items-center rounded-full bg-rizq-ink/8 px-2 py-0.5 text-[11px] text-rizq-ink-soft", font)}>{archivedBadge}</span>
        )}
      </div>
      {children}
    </MotionItem>
  );
}

function RowActions({ actions, font }: { actions: RowAction[]; font: string }) {
  return (
    <div className={cn("mt-4 flex items-center gap-1 border-t border-rizq-gold/15 pt-3", font)}>
      {actions.map((a, i) => (
        <button key={i} type="button" onClick={a.onClick} aria-label={a.label} title={a.label}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2",
            a.danger
              ? "text-red-600 hover:bg-red-50 focus-visible:ring-red-400/40"
              : "text-rizq-ink-soft hover:bg-rizq-green/10 hover:text-rizq-green focus-visible:ring-rizq-green/40"
          )}>
          {a.icon}<span>{a.label}</span>
        </button>
      ))}
    </div>
  );
}

function CategoryChip({ label, font }: { label: string; font: string }) {
  return (
    <span className={cn("mt-2 inline-flex w-fit items-center rounded-full bg-rizq-gold/12 px-2.5 py-0.5 text-xs text-rizq-gold-deep", font)}>{label}</span>
  );
}

function EmptyState({ icon, title, body, font }: { icon: React.ReactNode; title: string; body: string; font: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-rizq-gold/30 bg-rizq-cream/40 px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rizq-green/10 text-rizq-green">{icon}</div>
      <p className={cn("text-base font-semibold text-rizq-ink", font)}>{title}</p>
      <p className={cn("mx-auto mt-1 max-w-sm text-sm text-rizq-ink-soft", font)}>{body}</p>
    </div>
  );
}
