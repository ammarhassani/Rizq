"use client";

/**
 * ShareModal — Phase-2 task 2.9 (frontend, part 2)
 *
 * Modal/sheet for sharing a proposal.
 * - Toggle sharing on/off via setProposalShare.
 * - Once enabled: copy link, open PDF (share-page print), WhatsApp deep link.
 * - PDF strategy: the user opens the public share page in a new tab and uses
 *   the browser's print function. No separate PDF route needed.
 * - Logs whatsapp/pdf_download via logShareChannel (best-effort).
 */

import { useState, useTransition, useRef, useEffect } from "react";
import { X, Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { setProposalShare, logShareChannel } from "@/app/actions/proposals/shareActions";
import { Link } from "@/i18n/navigation";

// ---------------------------------------------------------------------------
// WhatsApp SVG icon (inline to avoid an import)
// ---------------------------------------------------------------------------

function WhatsAppIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 15 15"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7.5.5A7 7 0 0 0 1.27 10.9L.5 14.5l3.7-.75A7 7 0 1 0 7.5.5zm0 12.73a5.73 5.73 0 0 1-3-.84l-.22-.13-2.2.45.47-2.14-.14-.23A5.75 5.75 0 1 1 7.5 13.23zm3.15-4.3c-.17-.09-1-.5-1.17-.55-.16-.06-.28-.09-.4.09-.12.17-.47.55-.57.66-.1.12-.21.13-.38.05-.17-.09-.73-.27-1.4-.86a5.23 5.23 0 0 1-.97-1.2c-.1-.17-.01-.27.08-.36.08-.08.17-.21.26-.32.09-.1.12-.18.18-.3.06-.12.03-.22-.02-.31-.05-.09-.4-1-.55-1.37-.14-.36-.29-.31-.4-.32H5.38c-.12 0-.3.04-.46.21C4.76 5.07 4.3 5.5 4.3 6.4s.63 1.77.72 1.9c.08.12 1.24 1.88 3 2.64.42.18.75.29 1 .37.42.13.8.11 1.1.07.34-.05 1.04-.42 1.18-.83.15-.41.15-.76.1-.83-.04-.08-.16-.12-.34-.21z"
        fill="currentColor"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  locale: "ar" | "en";
  proposalId: string;
  initialShared: boolean;
  initialToken: string | null;
  /** False when the document carries no email, phone or WhatsApp the client can use. */
  hasClientContact: boolean;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShareModal({
  locale,
  proposalId,
  initialShared,
  initialToken,
  hasClientContact,
  onClose,
}: Props) {
  const t = useTranslations("Proposals.detail.shareModal");
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  // Local share state (optimistic)
  const [isShared, setIsShared] = useState(initialShared);
  const [token, setToken] = useState<string | null>(initialToken);

  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus trap — focus close button on mount
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  // Dismiss on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const shareUrl =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/${locale}/p/${token}`
      : null;

  const waText = shareUrl
    ? isAr
      ? `عرض تقديمي احترافي من رِزق. سعّر بثقة.\n${shareUrl}`
      : `A professional proposal from Rizq. Price with confidence.\n${shareUrl}`
    : "";

  const waHref = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(waText)}`
    : null;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleToggle() {
    const nextShare = !isShared;
    startTransition(async () => {
      const result = await setProposalShare({
        proposal_id: proposalId,
        share: nextShare,
      });
      if (result.ok) {
        setIsShared(nextShare);
        if (nextShare && result.token) {
          setToken(result.token);
        }
      }
    });
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silent */
    }
  }

  function handlePdf() {
    if (!shareUrl) return;
    logShareChannel({ token: token!, channel: "pdf_download" });
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  function handleWhatsApp() {
    if (!waHref || !token) return;
    logShareChannel({ token, channel: "whatsapp" });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={t("title")}
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-rizq-ink/30 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet / modal panel */}
      <div
        dir={dir}
        className={`relative w-full sm:max-w-md mx-4 sm:mx-auto rounded-t-3xl sm:card-wahaj shadow-xl p-6 sm:p-8 animate-fade-in ${font}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-semibold text-rizq-ink ${font}`}>
            {t("title")}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-rizq-ink-soft hover:text-rizq-ink hover:bg-rizq-ink/8 transition-colors"
            aria-label={t("close")}
          >
            <X size={18} />
          </button>
        </div>

        {/* Toggle row */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-rizq-gold/20 bg-[var(--raised)] px-4 py-3 mb-5">
          <span className={`text-sm font-medium text-rizq-ink ${font}`}>
            {isShared ? t("disableShare") : t("enableShare")}
          </span>
          <button
            type="button"
            onClick={handleToggle}
            disabled={isPending}
            aria-pressed={isShared}
            // The label sits in a sibling <span>, so without this the switch has no
            // accessible name at all — a screen reader announces just "button".
            aria-label={isShared ? t("disableShare") : t("enableShare")}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/50 disabled:opacity-60 ${
              isShared ? "bg-rizq-green" : "bg-rizq-ink/20"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
                isAr
                  ? isShared
                    ? "-translate-x-5"
                    : "-translate-x-0.5"
                  : isShared
                  ? "translate-x-5"
                  : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Share note */}
        {isShared && (
          <p className={`text-xs text-rizq-ink-soft mb-4 ${font}`}>
            {t("shareNote")}
          </p>
        )}

        {/* The document no longer falls back to the sign-in address, so a freelancer with
            no contact details has nothing on it for the client to reply to. Nudge, never
            block — the link still works (FR-008). */}
        {!hasClientContact && (
          <p
            className={`mb-4 rounded-xl border border-rizq-gold/30 bg-rizq-gold/10 px-3 py-2 text-xs text-rizq-ink-soft ${font}`}
          >
            {t("noContactNudge")}{" "}
            <Link
              href="/settings/profile"
              className="text-rizq-green underline underline-offset-2 hover:text-rizq-green-dark"
            >
              {t("noContactCta")}
            </Link>
          </p>
        )}

        {/* Enabling spinner */}
        {isPending && (
          <div className="flex items-center gap-2 text-sm text-rizq-ink-soft mb-4">
            <Loader2 size={14} className="animate-spin" />
            <span className={font}>{t("enabling")}</span>
          </div>
        )}

        {/* Actions — only when shared + have a token */}
        {isShared && shareUrl && !isPending && (
          <div className="space-y-3">
            {/* Copy link */}
            <button
              type="button"
              onClick={handleCopy}
              className={`w-full flex items-center gap-3 rounded-xl border border-rizq-gold/25 bg-[var(--raised)] hover:bg-rizq-cream/90 px-4 py-3 text-sm font-medium text-rizq-ink transition-colors ${font}`}
            >
              <span className="shrink-0 text-rizq-green">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </span>
              <span className="flex-1 text-start">
                {copied ? t("copied") : t("copyLink")}
              </span>
            </button>

            {/* Download PDF (opens share page in new tab → user prints) */}
            <button
              type="button"
              onClick={handlePdf}
              className={`w-full flex items-center gap-3 rounded-xl border border-rizq-gold/25 bg-[var(--raised)] hover:bg-rizq-cream/90 px-4 py-3 text-sm font-medium text-rizq-ink transition-colors ${font}`}
            >
              <span className="shrink-0 text-rizq-ink-soft">
                <ExternalLink size={16} />
              </span>
              <div className="flex-1 text-start min-w-0">
                <span className="block">{t("downloadPdf")}</span>
                <span className={`text-xs text-rizq-ink-soft/70 block mt-0.5 ${font}`}>
                  {t("downloadPdfNote")}
                </span>
              </div>
            </button>

            {/* WhatsApp */}
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleWhatsApp}
                className={`w-full flex items-center gap-3 rounded-xl border border-[#25D366]/30 bg-[#25D366]/8 hover:bg-[#25D366]/15 px-4 py-3 text-sm font-medium text-rizq-ink transition-colors ${font}`}
              >
                <span className="shrink-0 text-[#25D366]">
                  <WhatsAppIcon size={16} />
                </span>
                <span className="flex-1 text-start">{t("whatsapp")}</span>
              </a>
            )}

            {/* URL display */}
            <p className="text-[11px] text-rizq-ink-soft/50 break-all font-sans px-1">
              {shareUrl}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
