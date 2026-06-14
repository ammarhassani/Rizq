"use client";

/**
 * FeePicker — "add a fee" control for the invoice builder.
 *
 * A searchable Combobox of the freelancer's fee presets (label = name, hint =
 * amount · category) plus a "+ Add fee" footer that opens FeeDialog (the
 * full fee module, popped). Selecting a preset — existing OR just-created —
 * fires onPick({ name, category, amount_sar }); the control then resets. A
 * transient adder, not a bound select.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";
import { FeeDialog } from "@/components/fees/FeeDialog";
import type { CreatedFeePreset } from "@/app/actions/fees/fees";
import type { InvoiceFee } from "@/lib/invoices/items";
import { cn } from "@/lib/utils";

type Props = {
  locale: "ar" | "en";
  presets: CreatedFeePreset[];
  onPick: (fee: InvoiceFee) => void;
  id?: string;
};

export function FeePicker({ locale, presets, onPick, id }: Props) {
  const t = useTranslations("Common.feePicker");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const [localPresets, setLocalPresets] = React.useState<CreatedFeePreset[]>(presets);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  React.useEffect(() => {
    setLocalPresets(presets);
  }, [presets]);

  const fmtAmount = React.useCallback(
    (n: number) =>
      `${new Intl.NumberFormat(isAr ? "ar-SA" : "en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(n)} ${isAr ? "ر.س" : "SAR"}`,
    [isAr]
  );

  const options: ComboboxOption[] = React.useMemo(
    () =>
      localPresets.map((p) => ({
        value: p.id,
        label: p.name,
        hint: p.category ? `${fmtAmount(p.amount_sar)} · ${p.category}` : fmtAmount(p.amount_sar),
      })),
    [localPresets, fmtAmount]
  );

  function handlePick(value: string | null) {
    if (!value) return;
    const preset = localPresets.find((p) => p.id === value);
    if (preset) {
      onPick({ name: preset.name, category: preset.category, amount_sar: preset.amount_sar });
    }
  }

  function handleSaved(preset: CreatedFeePreset) {
    setLocalPresets((prev) => (prev.some((p) => p.id === preset.id) ? prev : [preset, ...prev]));
    onPick({ name: preset.name, category: preset.category, amount_sar: preset.amount_sar });
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

      <FeeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSaved={handleSaved}
        locale={locale}
      />
    </>
  );
}
