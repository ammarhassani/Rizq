"use client";

/**
 * ItemPicker — "add a line from the catalog" control for the invoice builder.
 *
 * A searchable Combobox of the freelancer's catalog items (label = name, hint =
 * unit price) plus a "+ Add item" footer that opens ItemDialog (the full
 * item module, popped). Selecting an item — existing OR just-created — fires
 * onPick(item); the control then resets so the next item can be added. This is
 * a transient "adder", not a bound select, so its own value clears after each
 * pick.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";
import { ItemDialog } from "@/components/items/ItemDialog";
import type { CreatedItem } from "@/app/actions/items/items";
import { cn } from "@/lib/utils";

type Props = {
  locale: "ar" | "en";
  items: CreatedItem[];
  onPick: (item: CreatedItem) => void;
  id?: string;
};

export function ItemPicker({ locale, items, onPick, id }: Props) {
  const t = useTranslations("Common.itemPicker");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [localItems, setLocalItems] = React.useState<CreatedItem[]>(items);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const fmtPrice = React.useCallback(
    (n: number) =>
      `${new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(n)} ${t("sar")}`,
    [isAr]
  );

  const options: ComboboxOption[] = React.useMemo(
    () =>
      localItems.map((it) => ({
        value: it.id,
        label: it.name,
        hint: fmtPrice(it.unit_price_sar),
      })),
    [localItems, fmtPrice]
  );

  function handlePick(value: string | null) {
    if (!value) return;
    const item = localItems.find((i) => i.id === value);
    if (item) onPick(item);
    // Transient adder: value is never retained.
  }

  function handleSaved(item: CreatedItem) {
    setLocalItems((prev) => (prev.some((i) => i.id === item.id) ? prev : [item, ...prev]));
    onPick(item);
  }

  return (
    <>
      <Combobox
        id={id}
        locale={locale}
        value={null}
        onChange={handlePick}
        options={options}
        placeholder={t("placeholder")}
        // No visible label of its own: named by the placeholder, which IS the visible affordance.
        aria-label={t("placeholder")}
        searchPlaceholder={t("searchPlaceholder")}
        emptyText={t("noResults")}
        footer={
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className={cn(
              "flex min-h-[40px] w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rizq-green transition-colors hover:bg-rizq-green/10",
              font
            )}
          >
            <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
            <span>{t("footerAdd")}</span>
          </button>
        }
      />

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={handleSaved}
        locale={locale}
      />
    </>
  );
}
