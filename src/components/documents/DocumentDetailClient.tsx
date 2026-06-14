"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  getDocumentSignedUrl,
  deleteDocument,
  setDocumentShare,
} from "@/app/actions/documents/documentActions";
import { ExternalLink, Trash2, Share2, CheckCircle, Copy } from "lucide-react";

type DocumentFull = {
  id: string;
  title_ar: string;
  file_name: string;
  file_type: string;
  file_size: number;
  category: string | null;
  expiry_date: string | null;
  share_token: string | null;
  share_expires_at: string | null;
  tags: string[];
  description_ar: string | null;
  created_at: string;
};

type CategoryOption = { id: string; name_ar: string; name_en: string };

type Props = {
  doc: DocumentFull;
  locale: "ar" | "en";
  categories: CategoryOption[];
};

export function DocumentDetailClient({ doc, locale, categories }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [shareEnabled, setShareEnabled] = useState(
    doc.share_expires_at ? new Date(doc.share_expires_at) > new Date() : false
  );
  const [shareToken, setShareToken] = useState(doc.share_token);
  const [shareHours, setShareHours] = useState(72);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleView() {
    startTransition(async () => {
      const res = await getDocumentSignedUrl({ id: doc.id });
      if (res.ok) {
        window.open(res.url, "_blank", "noopener,noreferrer");
      } else {
        setError(isAr ? "تعذّر تحميل الملف" : "Could not load file");
      }
    });
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    startTransition(async () => {
      const res = await deleteDocument({ id: doc.id });
      if (res.ok) {
        router.push("/documents");
        router.refresh();
      } else {
        setError(isAr ? "تعذّر الحذف" : "Could not delete");
        setConfirmDelete(false);
      }
    });
  }

  async function handleShareToggle() {
    startTransition(async () => {
      const res = await setDocumentShare({
        id: doc.id,
        share: !shareEnabled,
        expires_in_hours: shareHours,
      });
      if (res.ok) {
        setShareEnabled(!shareEnabled);
        if (!shareEnabled && res.token) setShareToken(res.token);
      }
    });
  }

  function copyShareLink() {
    if (!shareToken) return;
    const url = `${window.location.origin}/${locale}/d/${shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const shareUrl = shareToken ? `/${locale}/d/${shareToken}` : null;

  return (
    <div dir={dir} className={`space-y-6 ${font}`}>
      {/* Action row */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleView}
          disabled={isPending}
          className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark disabled:opacity-50 transition-all ${font}`}
        >
          <ExternalLink size={15} />
          {isAr ? "عرض / تحميل" : "View / Download"}
        </button>

        <button
          onClick={handleDelete}
          disabled={isPending}
          className={`inline-flex items-center gap-2 rounded-full border border-red-200 text-red-600 px-5 py-2.5 text-sm hover:bg-red-50 disabled:opacity-50 transition-all ${font}`}
        >
          <Trash2 size={15} />
          {confirmDelete
            ? (isAr ? "تأكيد الحذف" : "Confirm delete")
            : (isAr ? "حذف" : "Delete")}
        </button>
        {confirmDelete && (
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className={`text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors ${font}`}
          >
            {isAr ? "إلغاء" : "Cancel"}
          </button>
        )}
      </div>

      {error && (
        <p className={`rounded-xl bg-red-50 text-red-700 px-4 py-2.5 text-sm ${font}`}>{error}</p>
      )}

      {/* Share section */}
      <div className="rounded-2xl border border-rizq-gold/20 bg-white/60 p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-rizq-ink-soft" />
            <span className={`text-sm font-medium text-rizq-ink ${font}`}>
              {isAr ? "مشاركة الوثيقة" : "Share document"}
            </span>
          </div>
          <button
            onClick={handleShareToggle}
            disabled={isPending}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${shareEnabled ? "bg-rizq-green" : "bg-rizq-ink/20"}`}
            aria-pressed={shareEnabled}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${shareEnabled ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>

        {!shareEnabled && (
          <div className="flex items-center gap-2">
            <label className={`text-xs text-rizq-ink-soft ${font}`}>
              {isAr ? "صلاحية:" : "Expires after:"}
            </label>
            <select
              value={shareHours}
              onChange={(e) => setShareHours(Number(e.target.value))}
              className={`rounded-lg border border-rizq-gold/30 bg-white/70 px-2 py-1 text-xs ${font}`}
            >
              <option value={24}>{isAr ? "٢٤ ساعة" : "24 hours"}</option>
              <option value={72}>{isAr ? "٣ أيام" : "3 days"}</option>
              <option value={168}>{isAr ? "أسبوع" : "1 week"}</option>
              <option value={720}>{isAr ? "شهر" : "1 month"}</option>
            </select>
          </div>
        )}

        {shareEnabled && shareUrl && (
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={`${typeof window !== "undefined" ? window.location.origin : ""}${shareUrl}`}
              className={`flex-1 rounded-xl border border-rizq-gold/20 bg-white/70 px-3 py-1.5 text-xs text-rizq-ink-soft truncate ${font}`}
            />
            <button
              type="button"
              onClick={copyShareLink}
              className={`inline-flex items-center gap-1 rounded-full bg-rizq-green/10 text-rizq-green px-3 py-1.5 text-xs hover:bg-rizq-green/20 transition-colors ${font}`}
            >
              {copied ? <CheckCircle size={12} /> : <Copy size={12} />}
              {copied ? (isAr ? "تم النسخ" : "Copied!") : (isAr ? "نسخ" : "Copy")}
            </button>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="rounded-2xl border border-rizq-gold/20 bg-white/60 p-5 space-y-3">
        <h3 className={`text-sm font-semibold text-rizq-ink ${font}`}>
          {isAr ? "بيانات الوثيقة" : "Document info"}
        </h3>
        <dl className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <dt className={`text-rizq-ink-soft/60 shrink-0 w-24 ${font}`}>{isAr ? "الاسم" : "Filename"}</dt>
            <dd className={`text-rizq-ink truncate ${font}`}>{doc.file_name}</dd>
          </div>
          <div className="flex items-start gap-2">
            <dt className={`text-rizq-ink-soft/60 shrink-0 w-24 ${font}`}>{isAr ? "الحجم" : "Size"}</dt>
            <dd className="tabular text-rizq-ink">
              {doc.file_size > 1024 * 1024
                ? `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`
                : `${Math.round(doc.file_size / 1024)} KB`}
            </dd>
          </div>
          {doc.expiry_date && (
            <div className="flex items-start gap-2">
              <dt className={`text-rizq-ink-soft/60 shrink-0 w-24 ${font}`}>{isAr ? "تاريخ الانتهاء" : "Expiry"}</dt>
              <dd className="tabular text-rizq-ink">{new Date(doc.expiry_date).toLocaleDateString(isAr ? "ar-SA" : "en-US")}</dd>
            </div>
          )}
          {doc.tags.length > 0 && (
            <div className="flex items-start gap-2">
              <dt className={`text-rizq-ink-soft/60 shrink-0 w-24 ${font}`}>{isAr ? "الوسوم" : "Tags"}</dt>
              <dd className="flex flex-wrap gap-1">
                {doc.tags.map((tag) => (
                  <span key={tag} className={`rounded-full bg-rizq-gold/10 text-rizq-ink-soft px-2 py-0.5 text-xs ${font}`}>{tag}</span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
