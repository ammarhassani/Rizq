/**
 * ClientCard — Client Book. Pixel-matched to the Wahaj DC clients board:
 * aurora avatar (initial), name + type, priority chip, Space Mono gigs/total footer.
 */
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { fmtMoney } from "@/lib/format/number";

export type ClientRow = {
  id: string;
  name: string;
  name_en: string | null;
  company: string | null;
  client_type: string | null;
  last_contacted_at: string | null;
  total_gigs: number | null;
  total_value_sar: number | null;
  rating: number | null;
  follow_up_priority: string | null;
  tags: string[] | null;
  is_active: boolean | null;
};

type Props = {
  client: ClientRow;
  locale: "ar" | "en";
  /** Optional interactive control (the follow-up priority quick-edit); when
   *  present it takes the board's priority-chip slot. */
  prioritySlot?: React.ReactNode;
};

function fmtPrice(n: number | null, locale: "ar" | "en"): string {
  if (!n || !isFinite(n)) return locale === "ar" ? "٠" : "0";
  return fmtMoney(n, locale);
}

const PRIORITY: Record<string, { cls: string; ar: string; en: string }> = {
  high: { cls: "status-positive", ar: "أولويّة عالية", en: "High" },
  medium: { cls: "status-pending", ar: "متوسّطة", en: "Medium" },
  low: { cls: "status-neutral", ar: "منخفضة", en: "Low" },
};

export function ClientCard({ client, locale }: Props) {
  const tI18n = useTranslations("Clients.list");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const initial = (client.name || "؟").trim().charAt(0) || "؟";
  const type = client.company || client.client_type || "";
  const prio = client.follow_up_priority ? PRIORITY[client.follow_up_priority] : undefined;

  return (
    <Link
      href={`/clients/${client.id}` as `/clients/${string}`}
      dir={dir}
      className="nm-raised block rounded-[18px] bg-[var(--raised)] p-[18px] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)]"
    >
      <div className="mb-3.5 flex items-center gap-3">
        <span
          aria-hidden
          className="aurora-fill grid h-11 w-11 shrink-0 place-items-center rounded-[14px] font-display text-[17px] font-bold"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[13px] font-bold text-[var(--content)] ${font}`}>{client.name}</div>
          {type && <div className={`truncate text-[10px] text-[var(--content-faint)] ${font}`}>{type}</div>}
        </div>
        <div className="shrink-0">
          {prio && (
            <span className={`inline-flex items-center rounded-[10px] px-2 py-0.5 text-[8px] font-semibold ${prio.cls} ${font}`}>
              {isAr ? prio.ar : prio.en}
            </span>
          )}
        </div>
      </div>
      <div className="flex justify-between border-t border-[var(--line-2)] pt-3">
        <div>
          <div className={`text-[9px] text-[var(--content-faint)] ${font}`}>{tI18n("gigs")}</div>
          <div className="font-mono text-[13px] font-bold text-[var(--content)]">{fmtPrice(client.total_gigs, locale)}</div>
        </div>
        <div className="text-end">
          <div className={`text-[9px] text-[var(--content-faint)] ${font}`}>{tI18n("total")}</div>
          <div className="font-mono text-[13px] font-bold text-[var(--acc)]">{fmtPrice(client.total_value_sar, locale)}</div>
        </div>
      </div>
    </Link>
  );
}
