"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, X, MessageCircleQuestion, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { reviewSubmission } from "@/app/actions/submit/reviewSubmission";

type Props = {
  locale: "ar" | "en";
  submissionId: string;
};

type Action = "approve" | "reject" | "needs_info";

export function ReviewActions({ locale, submissionId }: Props) {
  const t = useTranslations("Admin");
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const router = useRouter();

  const [notes, setNotes] = useState("");
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<Action | null>(null);

  const run = (action: Action) => {
    setPendingAction(action);
    startTransition(async () => {
      const result = await reviewSubmission({
        submission_id: submissionId,
        action,
        moderator_notes: notes.trim() || null,
      });
      if (result.ok) {
        setDone(action);
        router.refresh();
      } else {
        setPendingAction(null);
      }
    });
  };

  if (done === "approve") {
    return (
      <p className={`text-sm text-rizq-green ${font}`}>{t("approveSuccess")}</p>
    );
  }
  if (done === "reject" || done === "needs_info") {
    return (
      <p className={`text-sm text-rizq-ink-soft ${font}`}>
        {t("rejectSuccess")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder={t("moderatorNotesPlaceholder")}
        aria-label={t("moderatorNotesLabel")}
        className={`w-full rounded-xl border border-rizq-gold/30 bg-rizq-cream/50 px-3 py-2 text-sm text-rizq-ink placeholder:text-rizq-ink-soft/55 focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 focus-visible:ring-offset-2 focus-visible:ring-offset-rizq-cream focus:border-rizq-green focus:bg-rizq-cream transition-colors resize-none ${font}`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run("approve")}
          className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-4 py-2 text-sm font-medium hover:bg-rizq-green-dark transition-colors disabled:opacity-60 ${font}`}
        >
          {isPending && pendingAction === "approve" ? (
            <Loader2 size={14} className="animate-spin" strokeWidth={2.2} />
          ) : (
            <Check size={14} strokeWidth={2.2} />
          )}
          <span>
            {isPending && pendingAction === "approve" ? t("approving") : t("approve")}
          </span>
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => run("needs_info")}
          className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/40 bg-rizq-cream/60 text-rizq-ink px-4 py-2 text-sm hover:border-rizq-gold-dark hover:bg-rizq-cream transition-colors disabled:opacity-60 ${font}`}
        >
          {isPending && pendingAction === "needs_info" ? (
            <Loader2 size={14} className="animate-spin" strokeWidth={2.2} />
          ) : (
            <MessageCircleQuestion size={14} strokeWidth={1.8} />
          )}
          <span>
            {isPending && pendingAction === "needs_info"
              ? t("needsInfoing")
              : t("needsInfo")}
          </span>
        </button>

        <button
          type="button"
          disabled={isPending}
          onClick={() => run("reject")}
          className={`inline-flex items-center gap-2 rounded-full border border-red-300/60 text-[var(--over)] hover:bg-red-50 px-4 py-2 text-sm transition-colors disabled:opacity-60 ${font}`}
        >
          {isPending && pendingAction === "reject" ? (
            <Loader2 size={14} className="animate-spin" strokeWidth={2.2} />
          ) : (
            <X size={14} strokeWidth={2.2} />
          )}
          <span>
            {isPending && pendingAction === "reject" ? t("rejecting") : t("reject")}
          </span>
        </button>
      </div>
    </div>
  );
}
