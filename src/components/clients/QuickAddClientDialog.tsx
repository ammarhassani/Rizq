"use client";

/**
 * QuickAddClientDialog — inline "add client" mini-dialog.
 *
 * A minimal client form (name required + company + phone optional) used to add a
 * client without leaving the current flow (log gig, new invoice, proposal). On
 * success it returns the created { id, name } to the caller via onCreated and
 * closes. Handles quota_exhausted (opens the UpgradeModal) + generic errors.
 *
 * Focus-trapped via base-ui Dialog. RTL-first, ≥44px controls, brand-styled.
 */

import * as React from "react";
import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { createClient } from "@/app/actions/clients/clients";
import { UpgradeModal } from "@/components/upgrade/UpgradeModal";
import { cn } from "@/lib/utils";

export type CreatedClient = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (client: CreatedClient) => void;
  locale: "ar" | "en";
};

export function QuickAddClientDialog({ open, onOpenChange, onCreated, locale }: Props) {
  const t = useTranslations("Common.quickAddClient");
  const tForm = useTranslations("Clients.form");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [isPending, startTransition] = useTransition();
  const [name, setName] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = React.useState(false);

  // Reset the form whenever the dialog (re)opens.
  React.useEffect(() => {
    if (open) {
      setName("");
      setCompany("");
      setPhone("");
      setError(null);
    }
  }, [open]);

  const inputClass = cn(
    "w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-3 text-base text-rizq-ink transition-colors",
    "focus:border-rizq-green focus:bg-rizq-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream",
    "placeholder:text-rizq-ink-soft/50",
    font
  );
  const labelClass = cn("block text-sm font-medium text-rizq-ink mb-2", font);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(tForm("errors.nameRequired"));
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await createClient({
        name: trimmedName,
        company: company.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      if (!result.ok) {
        if (result.code === "quota_exhausted") {
          setShowUpgrade(true);
        } else {
          setError(tForm("errors.generic"));
        }
        return;
      }

      onCreated({ id: result.id, name: trimmedName });
      onOpenChange(false);
    });
  }

  return (
    <>
      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        locale={locale}
        reason="clients"
      />

      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop
            className="fixed inset-0 z-50 bg-rizq-ink/30 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:animate-none"
          />
          <DialogPrimitive.Popup
            dir={dir}
            className={cn(
              "fixed start-1/2 top-1/2 z-50 w-full max-w-[calc(100%-2rem)] -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 sm:max-w-md",
              "rounded-3xl border border-rizq-gold/25 bg-rizq-cream/98 p-6 shadow-xl sm:p-8 outline-none",
              "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:animate-none",
              font
            )}
          >
            <DialogPrimitive.Title
              className={cn("text-base font-semibold text-rizq-ink leading-snug", font)}
            >
              {t("title")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description
              className={cn("mt-1 text-sm text-rizq-ink-soft/70", font)}
            >
              {t("subtitle")}
            </DialogPrimitive.Description>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
              {/* Name (required) */}
              <div>
                <label htmlFor="qac-name" className={labelClass}>
                  {t("nameLabel")} <span className="text-red-500">*</span>
                </label>
                <input
                  id="qac-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className={inputClass}
                  autoComplete="off"
                />
              </div>

              {/* Company (optional) */}
              <div>
                <label htmlFor="qac-company" className={labelClass}>
                  {t("companyLabel")}{" "}
                  <span className="ms-1 font-normal text-rizq-ink-soft/60">
                    ({tForm("optional")})
                  </span>
                </label>
                <input
                  id="qac-company"
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder={t("companyPlaceholder")}
                  className={inputClass}
                  autoComplete="off"
                />
              </div>

              {/* Phone (optional) */}
              <div>
                <label htmlFor="qac-phone" className={labelClass}>
                  {t("phoneLabel")}{" "}
                  <span className="ms-1 font-normal text-rizq-ink-soft/60">
                    ({tForm("optional")})
                  </span>
                </label>
                <input
                  id="qac-phone"
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("phonePlaceholder")}
                  className={cn(inputClass, "font-sans")}
                  dir="ltr"
                  autoComplete="off"
                />
              </div>

              {error && (
                <p role="alert" className={cn("text-sm text-red-700", font)}>
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <DialogPrimitive.Close
                  type="button"
                  disabled={isPending}
                  className={cn(
                    "inline-flex min-h-[44px] items-center justify-center rounded-full border border-rizq-gold/30 bg-transparent px-6 py-3 text-sm text-rizq-ink-soft transition-all hover:border-rizq-ink/30 hover:text-rizq-ink disabled:opacity-60",
                    font
                  )}
                >
                  {t("cancel")}
                </DialogPrimitive.Close>
                <button
                  type="submit"
                  disabled={isPending}
                  className={cn(
                    "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-rizq-green px-7 py-3 text-sm font-medium text-rizq-cream transition-all hover:-translate-y-0.5 hover:bg-rizq-green-dark disabled:opacity-70 disabled:hover:translate-y-0",
                    font
                  )}
                >
                  {isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" strokeWidth={2.2} />
                      <span>{tForm("saving")}</span>
                    </>
                  ) : (
                    <span>{t("add")}</span>
                  )}
                </button>
              </div>
            </form>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
