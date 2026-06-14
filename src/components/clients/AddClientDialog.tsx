"use client";

/**
 * AddClientDialog — the FULL client module, popped in a dialog.
 *
 * Founder directive: "the add client should not be quick, it should be a full
 * inherited module but in a popped out dialog — no partial data whatsoever."
 * So this renders the complete ClientForm (every field, same validation) inside
 * a focus-trapped, scrollable base-ui Dialog. On create it returns { id, name }
 * to the caller and closes.
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ClientForm } from "@/components/clients/ClientForm";
import { cn } from "@/lib/utils";

export type CreatedClient = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: CreatedClient) => void;
  locale: "ar" | "en";
};

export function AddClientDialog({ open, onOpenChange, onCreated, locale }: Props) {
  const t = useTranslations("Common.addClient");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  function handleCreated(client: CreatedClient) {
    onCreated(client);
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
          {/* Header (sticky) */}
          <div className="border-b border-rizq-gold/20 px-6 pt-6 pb-4 sm:px-8">
            <DialogPrimitive.Title className={cn("text-lg font-semibold text-rizq-ink leading-snug", font)}>
              {t("title")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className={cn("mt-1 text-sm text-rizq-ink-soft/70", font)}>
              {t("subtitle")}
            </DialogPrimitive.Description>
          </div>

          {/* Scrollable full form */}
          <div className="overflow-y-auto px-6 py-5 sm:px-8">
            {/* key=open remounts the form each time the dialog opens → fresh blank fields */}
            <ClientForm
              key={open ? "open" : "closed"}
              locale={locale}
              mode="create"
              embedded
              onCreated={handleCreated}
            />
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
