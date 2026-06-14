"use client";

import { FileText, Image, Lock, FileCheck, Building2, Receipt, File } from "lucide-react";

export type DocumentRow = {
  id: string;
  title_ar: string;
  file_name: string;
  file_type: string;
  category: string | null;
  expiry_date: string | null;
  reminder_days_before: number;
  tags: string[];
  created_at: string;
};

type CategoryMeta = { name_ar: string; name_en: string };

type Props = {
  doc: DocumentRow;
  locale: "ar" | "en";
  categories: Record<string, CategoryMeta>;
  onClick?: () => void;
};

const ICON_MAP: Record<string, React.ReactNode> = {
  freelance_doc: <FileCheck size={18} />,
  commercial_reg: <Building2 size={18} />,
  tax_cert: <Receipt size={18} />,
  contract: <FileText size={18} />,
  portfolio: <Image size={18} />,
  nda: <Lock size={18} />,
  other: <File size={18} />,
};

function getExpiryInfo(
  expiryDate: string | null,
  reminderDays: number
): { label: string | null; style: "ok" | "warn" | "expired" } {
  if (!expiryDate) return { label: null, style: "ok" };
  const now = new Date();
  const exp = new Date(expiryDate);
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: `منتهية`, style: "expired" };
  if (diffDays <= reminderDays) {
    return { label: `تنتهي في ${diffDays} يوم`, style: "warn" };
  }
  return { label: `تنتهي ${exp.toLocaleDateString("ar-SA")}`, style: "ok" };
}

const EXPIRY_STYLES = {
  ok: "bg-emerald-50 text-emerald-700",
  warn: "bg-amber-50 text-amber-700",
  expired: "bg-red-50 text-red-700",
};

export function DocumentCard({ doc, locale, categories, onClick }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const catMeta = doc.category ? categories[doc.category] : null;
  const catLabel = catMeta ? (isAr ? catMeta.name_ar : catMeta.name_en) : null;
  const icon = doc.category ? (ICON_MAP[doc.category] ?? ICON_MAP.other) : ICON_MAP.other;
  const { label: expiryLabel, style: expiryStyle } = getExpiryInfo(
    doc.expiry_date,
    doc.reminder_days_before
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-start rounded-2xl border border-rizq-gold/20 bg-white/60 hover:bg-rizq-cream/60 hover:border-rizq-gold/40 transition-all px-5 py-4 flex items-start gap-3 group ${font}`}
    >
      <span className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-xl bg-rizq-green/8 flex items-center justify-center text-rizq-green">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-rizq-ink truncate ${font}`}>{doc.title_ar}</p>
        <p className="text-xs text-rizq-ink-soft/60 truncate mt-0.5">{doc.file_name}</p>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {catLabel && (
            <span className={`inline-flex items-center gap-1 rounded-full bg-rizq-green/8 text-rizq-green px-2.5 py-0.5 text-xs ${font}`}>
              {icon}
              {catLabel}
            </span>
          )}
          {expiryLabel && (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs ${EXPIRY_STYLES[expiryStyle]} ${font}`}>
              {expiryLabel}
            </span>
          )}
        </div>
      </div>
      <span className="shrink-0 text-rizq-ink-soft/40 group-hover:text-rizq-ink-soft transition-colors rtl:rotate-180 mt-1">
        →
      </span>
    </button>
  );
}
