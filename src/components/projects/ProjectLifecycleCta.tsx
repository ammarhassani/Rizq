"use client";

/**
 * ProjectLifecycleCta — Project Lifecycle Wizard (spec 003), task T010/T013.
 *
 * The single "continue" action for the current lifecycle stage on the project
 * page. Reuses existing actions — no new conversion logic:
 *   create_invoice → createInvoiceFromGig → invoice editor
 *   send_invoice / mark_paid → open the invoice (send/mark there)
 *   set_up_project → createProjectFromProposal (rare on an existing project)
 */

import { useState, useTransition } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { createInvoiceFromGig } from "@/app/actions/invoices/createInvoiceFromGig";
import { track } from "@/lib/analytics/track";
import { withOrigin } from "@/lib/nav/origin";
import type { LifecycleNextAction } from "@/lib/projects/lifecycle";

type Props = {
  locale: "ar" | "en";
  nextAction: LifecycleNextAction;
  projectId: string;
  gigId: string | null;
  invoiceId: string | null;
};

const CTA_KEY: Record<NonNullable<LifecycleNextAction>, string> = {
  finalize_proposal: "ctaFinalizeProposal",
  set_up_project: "ctaSetUpProject",
  create_invoice: "ctaCreateInvoice",
  send_invoice: "ctaSendInvoice",
  mark_paid: "ctaMarkPaid",
};

export function ProjectLifecycleCta({ locale, nextAction, projectId, gigId, invoiceId }: Props) {
  const t = useTranslations("Wizard");
  const router = useRouter();
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!nextAction) return null;

    // Carry the project context into the invoice editor so its back/return
    // stays in the guided flow (feature 005, US2).
    const origin = { type: "project" as const, id: projectId };

  function handle() {
    setError(null);
    startTransition(async () => {
      if (nextAction === "create_invoice" && gigId) {
        const result = await createInvoiceFromGig({ gig_id: gigId });
        if (!result.ok) {
          setError(t("error"));
          return;
        }
        track("lifecycle_create_invoice", { locale, project_id: projectId, invoice_id: result.invoice_id });
        router.push(withOrigin(`/invoices/${result.invoice_id}`, origin, true) as `/invoices/${string}`);
        return;
      }
      if ((nextAction === "send_invoice" || nextAction === "mark_paid") && invoiceId) {
        router.push(withOrigin(`/invoices/${invoiceId}`, origin, true) as `/invoices/${string}`);
        return;
      }
      // Fallbacks (rare on an existing project page): nudge to the relevant area.
      router.refresh();
    });
  }

  return (
    <div className={font}>
      <button
        type="button"
        onClick={handle}
        disabled={isPending}
        className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:hover:translate-y-0 ${font}`}
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} className="ltr:rotate-0 rtl:rotate-180" />}
        {isPending ? t("working") : t(CTA_KEY[nextAction])}
      </button>
      {error && (
        <p role="alert" className={`mt-1 text-xs text-[var(--over)] ${font}`}>
          {error}
        </p>
      )}
    </div>
  );
}
