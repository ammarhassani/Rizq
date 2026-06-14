"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "@/i18n/navigation";
import { uploadDocument, suggestCategoryAction, suggestExpiryAction } from "@/app/actions/documents/documentActions";
import { Loader2, Sparkles, CheckCircle } from "lucide-react";

type CategoryOption = { id: string; name_ar: string; name_en: string };

type Props = {
  locale: "ar" | "en";
  categories: CategoryOption[];
};

type AISuggest<T> = { value: T; confidence: number; accepted: boolean } | null;

export function DocumentUploadForm({ locale, categories }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [titleAr, setTitleAr] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  const [categoryAI, setCategoryAI] = useState<AISuggest<string>>(null);
  const [expiryAI, setExpiryAI] = useState<AISuggest<string | null>>(null);
  const [aiLoading, setAiLoading] = useState(false);

  async function onFileChange(f: File) {
    setFile(f);
    // Auto AI suggest category
    setAiLoading(true);
    try {
      const res = await suggestCategoryAction({
        filename: f.name,
        file_type: f.type,
        title: titleAr || undefined,
        description: description || undefined,
      });
      if (res.ok) {
        setCategoryAI({ value: res.category, confidence: res.confidence, accepted: false });
      }
    } finally {
      setAiLoading(false);
    }
  }

  async function onSuggestExpiry() {
    if (!titleAr) return;
    setAiLoading(true);
    try {
      const res = await suggestExpiryAction({
        title: titleAr,
        description: description || undefined,
        category: category || undefined,
      });
      if (res.ok) {
        setExpiryAI({ value: res.expiry_date, confidence: res.confidence, accepted: false });
      }
    } finally {
      setAiLoading(false);
    }
  }

  function acceptCategory() {
    if (!categoryAI) return;
    setCategory(categoryAI.value);
    setCategoryAI({ ...categoryAI, accepted: true });
  }

  function acceptExpiry() {
    if (!expiryAI || !expiryAI.value) return;
    setExpiryDate(expiryAI.value);
    setExpiryAI({ ...expiryAI, accepted: true });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError(isAr ? "اختر ملفًا" : "Choose a file"); return; }
    setError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title_ar", titleAr);
      if (category) fd.append("category", category);
      if (description) fd.append("description", description);
      if (tags) fd.append("tags", tags);
      if (expiryDate) fd.append("expiry_date", expiryDate);

      const res = await uploadDocument(fd);
      if (!res.ok) {
        if (res.code === "quota_exhausted") {
          setError(isAr ? "وصلت للحد الأقصى من الوثائق. ترقَّ لتضيف المزيد." : "Document quota reached. Upgrade to add more.");
        } else {
          setError(isAr ? "حدث خطأ. حاول مرة أخرى." : "Something went wrong. Try again.");
        }
        return;
      }
      router.push(`/documents/${res.id}`);
    });
  }

  const catName = (id: string) => {
    const c = categories.find((c) => c.id === id);
    return c ? (isAr ? c.name_ar : c.name_en) : id;
  };

  return (
    <form onSubmit={onSubmit} dir={dir} className={`space-y-5 ${font}`}>
      {/* File picker */}
      <div>
        <label className="block text-sm font-medium text-rizq-ink mb-1.5">
          {isAr ? "الملف" : "File"} <span className="text-red-500">*</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,image/*"
          required
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileChange(f);
          }}
          className="block w-full text-sm text-rizq-ink-soft file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:bg-rizq-green/10 file:text-rizq-green hover:file:bg-rizq-green/20"
        />
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-rizq-ink mb-1.5">
          {isAr ? "العنوان" : "Title"} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={titleAr}
          onChange={(e) => setTitleAr(e.target.value)}
          required
          placeholder={isAr ? "مثال: شهادة ضريبة القيمة المضافة 2026" : "e.g. VAT Certificate 2026"}
          className={`w-full rounded-xl border border-rizq-gold/30 bg-white/70 px-4 py-2.5 text-sm text-rizq-ink focus:outline-none focus:ring-2 focus:ring-rizq-green/30 ${font}`}
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-rizq-ink mb-1.5">
          {isAr ? "التصنيف" : "Category"}
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={`w-full rounded-xl border border-rizq-gold/30 bg-white/70 px-4 py-2.5 text-sm text-rizq-ink focus:outline-none focus:ring-2 focus:ring-rizq-green/30 ${font}`}
        >
          <option value="">{isAr ? "— اختر —" : "— Select —"}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{isAr ? c.name_ar : c.name_en}</option>
          ))}
        </select>
        {/* AI category suggestion chip */}
        {categoryAI && !categoryAI.accepted && (
          <div className={`mt-2 flex items-center gap-2 ${font}`}>
            <span className="flex items-center gap-1 text-xs text-rizq-ink-soft">
              <Sparkles size={12} className="text-rizq-gold" />
              {isAr ? "تصنيف مقترح بالذكاء الاصطناعي:" : "AI suggested:"}
              <strong>{catName(categoryAI.value)}</strong>
              <span className="opacity-60">({Math.round(categoryAI.confidence * 100)}%)</span>
            </span>
            <button
              type="button"
              onClick={acceptCategory}
              className={`inline-flex items-center gap-1 rounded-full bg-rizq-green/10 text-rizq-green px-2.5 py-0.5 text-xs hover:bg-rizq-green/20 transition-colors ${font}`}
            >
              <CheckCircle size={11} />
              {isAr ? "قبول" : "Accept"}
            </button>
          </div>
        )}
        {categoryAI?.accepted && (
          <p className={`mt-1 text-xs text-emerald-600 flex items-center gap-1 ${font}`}>
            <CheckCircle size={11} />
            {isAr ? "تم قبول التصنيف المقترح" : "AI suggestion accepted"}
          </p>
        )}
        {aiLoading && (
          <p className={`mt-1 text-xs text-rizq-ink-soft/60 flex items-center gap-1 ${font}`}>
            <Loader2 size={11} className="animate-spin" />
            {isAr ? "يحلل الملف..." : "Analyzing..."}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-rizq-ink mb-1.5">
          {isAr ? "وصف (اختياري)" : "Description (optional)"}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className={`w-full rounded-xl border border-rizq-gold/30 bg-white/70 px-4 py-2.5 text-sm text-rizq-ink focus:outline-none focus:ring-2 focus:ring-rizq-green/30 resize-none ${font}`}
        />
      </div>

      {/* Expiry date */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-rizq-ink">
            {isAr ? "تاريخ الانتهاء (اختياري)" : "Expiry date (optional)"}
          </label>
          <button
            type="button"
            onClick={onSuggestExpiry}
            disabled={!titleAr || aiLoading}
            className={`inline-flex items-center gap-1 text-xs text-rizq-gold hover:text-rizq-green transition-colors disabled:opacity-40 ${font}`}
          >
            <Sparkles size={11} />
            {isAr ? "اقتراح ذكاء اصطناعي" : "AI suggest"}
          </button>
        </div>
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className={`w-full rounded-xl border border-rizq-gold/30 bg-white/70 px-4 py-2.5 text-sm text-rizq-ink focus:outline-none focus:ring-2 focus:ring-rizq-green/30 ${font}`}
        />
        {/* AI expiry suggestion */}
        {expiryAI && !expiryAI.accepted && expiryAI.value && (
          <div className={`mt-2 flex items-center gap-2 ${font}`}>
            <span className="flex items-center gap-1 text-xs text-rizq-ink-soft">
              <Sparkles size={12} className="text-rizq-gold" />
              {isAr ? "تاريخ انتهاء مقترح:" : "AI suggested expiry:"}
              <strong>{expiryAI.value}</strong>
              <span className="opacity-60">({Math.round(expiryAI.confidence * 100)}%)</span>
            </span>
            <button
              type="button"
              onClick={acceptExpiry}
              className={`inline-flex items-center gap-1 rounded-full bg-rizq-green/10 text-rizq-green px-2.5 py-0.5 text-xs hover:bg-rizq-green/20 transition-colors ${font}`}
            >
              <CheckCircle size={11} />
              {isAr ? "قبول" : "Accept"}
            </button>
          </div>
        )}
        {expiryAI && !expiryAI.value && !aiLoading && (
          <p className={`mt-1 text-xs text-rizq-ink-soft/60 ${font}`}>
            {isAr ? "لم يُرصَد تاريخ انتهاء واضح" : "No clear expiry detected"}
          </p>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-rizq-ink mb-1.5">
          {isAr ? "وسوم (افصل بفاصلة)" : "Tags (comma-separated)"}
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder={isAr ? "مثال: 2026، رسمي" : "e.g. 2026, official"}
          className={`w-full rounded-xl border border-rizq-gold/30 bg-white/70 px-4 py-2.5 text-sm text-rizq-ink focus:outline-none focus:ring-2 focus:ring-rizq-green/30 ${font}`}
        />
      </div>

      {error && (
        <p className={`rounded-xl bg-red-50 text-red-700 px-4 py-2.5 text-sm ${font}`}>{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || !file}
        className={`w-full rounded-full bg-rizq-green text-rizq-cream py-3 text-sm font-medium hover:bg-rizq-green-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 ${font}`}
      >
        {isPending && <Loader2 size={15} className="animate-spin" />}
        {isAr ? "رفع الوثيقة" : "Upload document"}
      </button>
    </form>
  );
}
