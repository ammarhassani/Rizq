"use client";

/**
 * GigDetailActions — client island for gig detail page. Phase-3 task 3.7.
 */

import { useState, useTransition } from "react";
import { Loader2, Edit2, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { markGigStatus, deleteGig } from "@/app/actions/gigs/gigs";
import { track } from "@/lib/analytics/track";
import { GigForm } from "./GigForm";
import type { GigRow } from "./GigCard";

type ClientOption = { id: string; name: string };

type Props = {
  locale: "ar" | "en";
  gig: GigRow & {
    category?: string | null;
    description?: string | null;
    payment_method?: string | null;
    payment_notes?: string | null;
  };
  clients?: ClientOption[];
};

export function GigDetailActions({ locale, gig, clients = [] }: Props) {
  const t = useTranslations("Income.detail");
  const router = useRouter();
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [isMarkingPaid, startMarkPaidTransition] = useTransition();
  const [isMarkingOverdue, startMarkOverdueTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  function handleMarkPaid() {
    startMarkPaidTransition(async () => {
      const result = await markGigStatus({ id: gig.id, status: "paid" });
      if (result.ok) {
        track("gig_marked_paid", { locale });
        router.refresh();
      }
    });
  }

  function handleMarkOverdue() {
    startMarkOverdueTransition(async () => {
      const result = await markGigStatus({ id: gig.id, status: "overdue" });
      if (result.ok) {
        track("gig_marked_overdue", { locale });
        router.refresh();
      }
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteGig({ id: gig.id });
      if (result.ok) {
        track("gig_deleted", { locale });
        router.push("/income" as "/income");
      }
    });
  }

  if (showEdit) {
    return (
      <GigForm
        locale={locale}
        mode="edit"
        initialData={{
          id: gig.id,
          title: gig.title,
          amount_sar: gig.amount_sar,
          client_id: gig.client_id,
          status: gig.status,
          delivery_date: gig.delivery_date,
          category: gig.category,
          payment_method: gig.payment_method,
          payment_notes: gig.payment_notes,
        }}
        clients={clients}
        onSuccess={() => { setShowEdit(false); router.refresh(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div dir={dir} className={`rounded-2xl border border-rizq-gold/20 bg-rizq-cream/85 p-5 ${font}`}>
        <p className="text-xs font-medium text-rizq-ink-soft/70 tracking-wide uppercase mb-4">
          {isAr ? "الإجراءات" : "Actions"}
        </p>
        <div className="flex flex-wrap gap-3">
          {/* Edit */}
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 text-rizq-ink-soft px-5 py-2.5 text-sm font-medium hover:border-rizq-green/40 hover:text-rizq-green transition-all ${font}`}
          >
            <Edit2 size={14} />
            {t("edit")}
          </button>

          {/* Mark Paid */}
          {gig.status !== "paid" && gig.status !== "cancelled" && (
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={isMarkingPaid}
              className={`inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-70 ${font}`}
            >
              {isMarkingPaid ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {t("markPaid")}
            </button>
          )}

          {/* Mark Overdue */}
          {!["paid", "cancelled", "overdue"].includes(gig.status) && (
            <button
              type="button"
              onClick={handleMarkOverdue}
              disabled={isMarkingOverdue}
              className={`inline-flex items-center gap-2 rounded-full border border-red-300/50 text-red-600 px-5 py-2.5 text-sm font-medium hover:bg-red-50 transition-all disabled:opacity-70 ${font}`}
            >
              {isMarkingOverdue ? <Loader2 size={14} className="animate-spin" /> : <AlertCircle size={14} />}
              {t("markOverdue")}
            </button>
          )}

          {/* Delete */}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className={`inline-flex items-center gap-2 rounded-full border border-red-300/50 text-red-600 px-5 py-2.5 text-sm font-medium hover:bg-red-50 transition-all ${font}`}
          >
            <Trash2 size={14} />
            {t("delete")}
          </button>
        </div>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div dir={dir} className={`rounded-2xl border border-red-200 bg-red-50/60 p-5 space-y-3 animate-fade-in ${font}`}>
          <p className={`text-sm font-medium text-rizq-ink ${font}`}>{t("deleteConfirm")}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className={`inline-flex items-center gap-2 rounded-full bg-red-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-70 ${font}`}
            >
              {isDeleting ? <><Loader2 size={14} className="animate-spin" />{t("deleting")}</> : t("deleteConfirmBtn")}
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className={`text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors ${font}`}
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
