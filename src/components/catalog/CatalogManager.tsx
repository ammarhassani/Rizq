"use client";

/**
 * CatalogManager — the Catalog module's interactive surface.
 *
 * Two tabs: Products & Services (public.items) and Tax & Fees (public.fee_presets).
 * Each tab lists the owner's active rows with all fields, and supports add / edit
 * (the full ItemDialog / FeeDialog) and archive (soft-delete via is_active=false,
 * with a confirm). Lists come from the server page as props; every mutation
 * router.refresh()es so the server re-fetches the source of truth.
 */

import * as React from "react";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Plus, Pencil, Trash2, Package, Tags, Loader2, TriangleAlert } from "lucide-react";
import { ItemDialog } from "@/components/items/ItemDialog";
import { FeeDialog } from "@/components/fees/FeeDialog";
import { archiveItem, type CreatedItem } from "@/app/actions/items/items";
import { archiveFeePreset, type CreatedFeePreset } from "@/app/actions/fees/fees";
import { cn } from "@/lib/utils";

type Props = {
  locale: "ar" | "en";
  items: CreatedItem[];
  feePresets: CreatedFeePreset[];
};

type Tab = "items" | "fees";

type ItemDialogState = { open: boolean; mode: "create" | "edit"; initialData?: CreatedItem };
type FeeDialogState = { open: boolean; mode: "create" | "edit"; initialData?: CreatedFeePreset };
type ArchiveTarget =
  | { kind: "item"; id: string; name: string }
  | { kind: "fee"; id: string; name: string }
  | null;

export function CatalogManager({ locale, items, feePresets }: Props) {
  const t = useTranslations("Catalog");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const currency = isAr ? "ر.س" : "SAR";

  const [tab, setTab] = React.useState<Tab>("items");
  const [itemDialog, setItemDialog] = React.useState<ItemDialogState>({ open: false, mode: "create" });
  const [feeDialog, setFeeDialog] = React.useState<FeeDialogState>({ open: false, mode: "create" });
  const [archiveTarget, setArchiveTarget] = React.useState<ArchiveTarget>(null);
  const [isArchiving, startArchive] = useTransition();

  const fmt = (n: number) =>
    new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);

  function handleSaved() {
    // The dialog already closed; re-fetch the server lists.
    router.refresh();
  }

  function confirmArchive() {
    if (!archiveTarget) return;
    const target = archiveTarget;
    startArchive(async () => {
      const result =
        target.kind === "item"
          ? await archiveItem({ id: target.id })
          : await archiveFeePreset({ id: target.id });
      if (result.ok) {
        setArchiveTarget(null);
        router.refresh();
      }
    });
  }

  const tabBtn = (key: Tab, label: string, count: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === key}
      onClick={() => setTab(key)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
        tab === key
          ? "bg-rizq-green text-rizq-cream shadow-sm"
          : "border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink hover:border-rizq-green/40 hover:text-rizq-green",
        font
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "tabular font-sans inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs",
          tab === key ? "bg-rizq-cream/25" : "bg-rizq-ink/8 text-rizq-ink-soft"
        )}
      >
        {count}
      </span>
    </button>
  );

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className={cn("display-2 text-rizq-ink mb-2", font)}>{t("title")}</h1>
        <p className={cn("text-base leading-relaxed text-rizq-ink-soft", font)}>{t("subtitle")}</p>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label={t("title")} className="mb-6 flex flex-wrap gap-2">
        {tabBtn("items", t("tabItems"), items.length)}
        {tabBtn("fees", t("tabFees"), feePresets.length)}
      </div>

      {/* ── Products & Services ─────────────────────────────────────────────── */}
      {tab === "items" && (
        <section aria-label={t("tabItems")}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className={cn("text-sm text-rizq-ink-soft", font)}>{t("itemsHeading")}</p>
            <button
              type="button"
              onClick={() => setItemDialog({ open: true, mode: "create" })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-rizq-green px-4 py-2.5 text-sm font-medium text-rizq-cream transition-all hover:-translate-y-0.5 hover:bg-rizq-green-dark",
                font
              )}
            >
              <Plus size={16} strokeWidth={2.4} aria-hidden />
              <span>{t("addItem")}</span>
            </button>
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon={<Package size={28} strokeWidth={1.5} aria-hidden />}
              title={t("itemsEmptyTitle")}
              body={t("itemsEmptyBody")}
              font={font}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => (
                <article
                  key={it.id}
                  className="flex flex-col rounded-2xl border border-rizq-gold/25 bg-rizq-cream/70 p-5 transition-all hover:-translate-y-0.5 hover:border-rizq-green/30 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={cn("text-base font-semibold leading-snug text-rizq-ink", font)}>
                      {it.name}
                    </h3>
                    <RowActions
                      onEdit={() => setItemDialog({ open: true, mode: "edit", initialData: it })}
                      onArchive={() => setArchiveTarget({ kind: "item", id: it.id, name: it.name })}
                      editLabel={t("edit")}
                      archiveLabel={t("archive")}
                    />
                  </div>
                  {it.category && <CategoryChip label={it.category} font={font} />}
                  <p className="mt-3 tabular font-sans text-lg font-bold text-rizq-green">
                    {fmt(it.unit_price_sar)}{" "}
                    <span className={cn("text-xs font-normal text-rizq-ink-soft/60", font)}>{currency}</span>
                  </p>
                  {it.description && (
                    <p className={cn("mt-2 line-clamp-2 text-sm text-rizq-ink-soft", font)}>{it.description}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Tax & Fees ──────────────────────────────────────────────────────── */}
      {tab === "fees" && (
        <section aria-label={t("tabFees")}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className={cn("text-sm text-rizq-ink-soft", font)}>{t("feesHeading")}</p>
            <button
              type="button"
              onClick={() => setFeeDialog({ open: true, mode: "create" })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full bg-rizq-green px-4 py-2.5 text-sm font-medium text-rizq-cream transition-all hover:-translate-y-0.5 hover:bg-rizq-green-dark",
                font
              )}
            >
              <Plus size={16} strokeWidth={2.4} aria-hidden />
              <span>{t("addFee")}</span>
            </button>
          </div>

          {feePresets.length === 0 ? (
            <EmptyState
              icon={<Tags size={28} strokeWidth={1.5} aria-hidden />}
              title={t("feesEmptyTitle")}
              body={t("feesEmptyBody")}
              font={font}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {feePresets.map((p) => (
                <article
                  key={p.id}
                  className="flex flex-col rounded-2xl border border-rizq-gold/25 bg-rizq-cream/70 p-5 transition-all hover:-translate-y-0.5 hover:border-rizq-green/30 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={cn("text-base font-semibold leading-snug text-rizq-ink", font)}>{p.name}</h3>
                    <RowActions
                      onEdit={() => setFeeDialog({ open: true, mode: "edit", initialData: p })}
                      onArchive={() => setArchiveTarget({ kind: "fee", id: p.id, name: p.name })}
                      editLabel={t("edit")}
                      archiveLabel={t("archive")}
                    />
                  </div>
                  {p.category && <CategoryChip label={p.category} font={font} />}
                  <p className="mt-3 tabular font-sans text-lg font-bold text-rizq-green">
                    {fmt(p.amount_sar)}{" "}
                    <span className={cn("text-xs font-normal text-rizq-ink-soft/60", font)}>{currency}</span>
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Dialogs */}
      <ItemDialog
        open={itemDialog.open}
        onOpenChange={(open) => setItemDialog((s) => ({ ...s, open }))}
        mode={itemDialog.mode}
        initialData={itemDialog.initialData}
        onSaved={handleSaved}
        locale={locale}
      />
      <FeeDialog
        open={feeDialog.open}
        onOpenChange={(open) => setFeeDialog((s) => ({ ...s, open }))}
        mode={feeDialog.mode}
        initialData={feeDialog.initialData}
        onSaved={handleSaved}
        locale={locale}
      />

      {/* Archive confirm */}
      <DialogPrimitive.Root
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isArchiving) setArchiveTarget(null);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-rizq-ink/30 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
          <DialogPrimitive.Popup
            dir={isAr ? "rtl" : "ltr"}
            className={cn(
              "fixed start-1/2 top-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 sm:max-w-md",
              "rounded-3xl border border-rizq-gold/25 bg-rizq-cream/98 p-6 shadow-xl sm:p-8 outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none",
              font
            )}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <TriangleAlert size={18} strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <DialogPrimitive.Title className={cn("text-base font-semibold text-rizq-ink", font)}>
                  {archiveTarget?.kind === "fee" ? t("archiveFeeTitle") : t("archiveItemTitle")}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className={cn("mt-1 text-sm text-rizq-ink-soft", font)}>
                  {t(archiveTarget?.kind === "fee" ? "archiveFeeBody" : "archiveItemBody", {
                    name: archiveTarget?.name ?? "",
                  })}
                </DialogPrimitive.Description>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <DialogPrimitive.Close
                type="button"
                disabled={isArchiving}
                className={cn(
                  "inline-flex min-h-[44px] items-center justify-center rounded-full border border-rizq-gold/30 bg-transparent px-6 py-3 text-sm text-rizq-ink-soft transition-all hover:border-rizq-ink/30 hover:text-rizq-ink disabled:opacity-60",
                  font
                )}
              >
                {t("archiveCancel")}
              </DialogPrimitive.Close>
              <button
                type="button"
                onClick={confirmArchive}
                disabled={isArchiving}
                className={cn(
                  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-red-600 px-7 py-3 text-sm font-medium text-white transition-all hover:bg-red-700 disabled:opacity-70",
                  font
                )}
              >
                {isArchiving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" strokeWidth={2.2} />
                    <span>{t("archiving")}</span>
                  </>
                ) : (
                  <span>{t("archiveConfirm")}</span>
                )}
              </button>
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}

// ── Small presentational helpers ──────────────────────────────────────────────

function RowActions({
  onEdit,
  onArchive,
  editLabel,
  archiveLabel,
}: {
  onEdit: () => void;
  onArchive: () => void;
  editLabel: string;
  archiveLabel: string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={onEdit}
        aria-label={editLabel}
        title={editLabel}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rizq-ink-soft/70 transition-colors hover:bg-rizq-green/10 hover:text-rizq-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40"
      >
        <Pencil size={15} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onArchive}
        aria-label={archiveLabel}
        title={archiveLabel}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rizq-ink-soft/70 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40"
      >
        <Trash2 size={15} aria-hidden />
      </button>
    </div>
  );
}

function CategoryChip({ label, font }: { label: string; font: string }) {
  return (
    <span
      className={cn(
        "mt-2 inline-flex w-fit items-center rounded-full bg-rizq-gold/12 px-2.5 py-0.5 text-xs text-rizq-gold-deep",
        font
      )}
    >
      {label}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  body,
  font,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  font: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-rizq-gold/30 bg-rizq-cream/40 px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rizq-green/10 text-rizq-green">
        {icon}
      </div>
      <p className={cn("text-base font-semibold text-rizq-ink", font)}>{title}</p>
      <p className={cn("mx-auto mt-1 max-w-sm text-sm text-rizq-ink-soft", font)}>{body}</p>
    </div>
  );
}
