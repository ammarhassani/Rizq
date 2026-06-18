/**
 * DownloadWordButton — exports the proposal as an editable Word (.docx).
 *
 * A plain anchor to the owner-authenticated GET route; the server sets the
 * download filename via Content-Disposition. Server-safe (no client JS needed),
 * hidden in print. This is the deliverable the freelancer hands to a client.
 */
import { FileText } from "lucide-react";

type Props = {
  proposalId: string;
  label: string;
  locale: "ar" | "en";
};

export function DownloadWordButton({ proposalId, label, locale }: Props) {
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  return (
    <a
      href={`/api/proposals/${proposalId}/docx?locale=${locale}`}
      className={`print:hidden inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
    >
      <FileText size={15} strokeWidth={1.9} aria-hidden className="shrink-0" />
      <span>{label}</span>
    </a>
  );
}
