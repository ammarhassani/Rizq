"use client";

/**
 * AddFeeDialog — the full fee module, popped in a dialog.
 *
 * Same popped-window workflow as adding an item: when the freelancer wants a
 * fee that isn't a preset yet, they create it here (full form, saved as a
 * reusable preset) and it's returned to be added onto the current invoice.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { FeeForm } from "@/components/fees/FeeForm";
import type { CreatedFeePreset } from "@/app/actions/fees/fees";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (preset: CreatedFeePreset) => void;
  locale: "ar" | "en";
};

export function AddFeeDialog({ open, onOpenChange, onCreated, locale }: Props) {
  const t = useTranslations("Fees.dialog");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  function handleCreated(preset: CreatedFeePreset) {
    onCreated(preset);
    onOpenChange(false);
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-rizq-ink/30 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none" />
        <DialogPrimitive.Popup
          dir={dir}
          className={cn(
            "fixed start-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 flex-col sm:max-w-lg",
            "rounded-3xl border border-rizq-gold/25 bg-rizq-cream/98 shadow-xl outline-none",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none",
            font
          )}
        >
          <div className="border-b border-rizq-gold/20 px-6 pt-6 pb-4 sm:px-8">
            <DialogPrimitive.Title className={cn("text-lg font-semibold text-rizq-ink leading-snug", font)}>
              {t("title")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className={cn("mt-1 text-sm text-rizq-ink-soft/70", font)}>
              {t("subtitle")}
            </DialogPrimitive.Description>
          </div>

          <div className="overflow-y-auto px-6 py-5 sm:px-8">
            <FeeForm
              key={open ? "open" : "closed"}
              locale={locale}
              embedded
              onCreated={handleCreated}
            />
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
