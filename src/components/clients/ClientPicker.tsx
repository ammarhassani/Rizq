"use client";

/**
 * ClientPicker — the reusable client-linkage field.
 *
 * Composes the searchable Combobox (options = the passed clients) with a footer
 * "+ Add client" action that opens QuickAddClientDialog. On create, the new
 * client is appended to the in-memory option list AND auto-selected (parent
 * onChange fires with the new id). Drop-in replacement for the plain <select>
 * client picker: same value semantics (empty string = none / "بدون عميل").
 */

import * as React from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";
import {
  QuickAddClientDialog,
  type CreatedClient,
} from "@/components/clients/QuickAddClientDialog";
import { cn } from "@/lib/utils";

type ClientOption = { id: string; name: string };

type Props = {
  /** Selected client id. Empty string means "no client" (matches the old select). */
  value: string;
  onChange: (value: string) => void;
  clients: ClientOption[];
  locale: "ar" | "en";
  /** Optional override for the "no client" option label. */
  noneLabel?: string;
  id?: string;
};

export function ClientPicker({
  value,
  onChange,
  clients,
  locale,
  noneLabel,
  id,
}: Props) {
  const t = useTranslations("Common");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  // Local copy so quick-added clients appear immediately without a server round-trip.
  const [localClients, setLocalClients] = React.useState<ClientOption[]>(clients);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Keep in sync if the parent passes a fresh list (e.g. after router.refresh()).
  React.useEffect(() => {
    setLocalClients(clients);
  }, [clients]);

  const options: ComboboxOption[] = React.useMemo(
    () => localClients.map((c) => ({ value: c.id, label: c.name })),
    [localClients]
  );

  function handleCreated(client: CreatedClient) {
    setLocalClients((prev) =>
      prev.some((c) => c.id === client.id) ? prev : [{ id: client.id, name: client.name }, ...prev]
    );
    onChange(client.id);
  }

  const addLabel = t("quickAddClient.footerAdd");

  return (
    <>
      <Combobox
        id={id}
        locale={locale}
        value={value || null}
        onChange={(v) => onChange(v ?? "")}
        options={options}
        placeholder={noneLabel ?? t("clientPicker.none")}
        searchPlaceholder={t("clientPicker.searchPlaceholder")}
        emptyText={t("clientPicker.noResults")}
        allowClear
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
            <span>{addLabel}</span>
          </button>
        }
      />

      <QuickAddClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
        locale={locale}
      />
    </>
  );
}
