"use client";

/**
 * CoverTitleEditor — edit the proposal's project title (owner detail page only).
 *
 * The title is AI-drafted during the prose pass and fills the cover heading +
 * the Word export filename. This lets the freelancer rename it before sending.
 * Optimistic + toast + rollback; persists via updateProjectTitle (which patches
 * only the cover section, leaving prose / pricing untouched).
 */

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { updateProjectTitle } from "@/app/actions/proposals/updateSection";

type Props = {
  proposalId: string;
  initialTitle: string;
  locale: "ar" | "en";
};

export function CoverTitleEditor({ proposalId, initialTitle, locale }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const router = useRouter();

  const [value, setValue] = useState(initialTitle);
  const [saved, setSaved] = useState(initialTitle);
  const [isPending, startTransition] = useTransition();

  const dirty = value.trim() !== saved.trim();

  function save() {
    const next = value.trim();
    if (!dirty) return;
    startTransition(async () => {
      const result = await updateProjectTitle({ proposal_id: proposalId, title: next });
      if (result.ok) {
        setSaved(next);
        toast.success(isAr ? "تم حفظ عنوان المشروع" : "Project title saved");
        router.refresh();
      } else {
        toast.error(isAr ? "تعذّر حفظ العنوان." : "Couldn't save the title.");
      }
    });
  }

  return (
    <div
      dir={dir}
      className={`print:hidden mb-4 rounded-2xl border border-rizq-gold/25 bg-rizq-cream/70 p-4 ${font}`}
    >
      <label className={`block text-xs font-medium text-rizq-ink-soft/70 uppercase tracking-wide mb-2 ${font}`}>
        {isAr ? "عنوان المشروع" : "Project title"}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              save();
            }
          }}
          maxLength={140}
          placeholder={isAr ? "مثال: هوية بصرية لمحمصة قهوة" : "e.g. Brand identity for a coffee roastery"}
          className={`flex-1 rounded-xl border border-rizq-gold/30 bg-[var(--raised)] px-3.5 py-2.5 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus:border-rizq-green transition-colors placeholder:text-rizq-ink-soft/50 ${font}`}
        />
        <button
          type="button"
          onClick={save}
          disabled={!dirty || isPending}
          className={`inline-flex items-center gap-1.5 rounded-full bg-rizq-green text-rizq-cream px-4 py-2.5 text-sm font-medium hover:bg-rizq-green-dark transition-all disabled:opacity-50 ${font}`}
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {isAr ? "حفظ" : "Save"}
        </button>
      </div>
    </div>
  );
}
