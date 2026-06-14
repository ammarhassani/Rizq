"use client";

/**
 * PrintButton — triggers window.print() for the proposal PDF.
 * Hidden in print media so it doesn't appear in the PDF itself.
 */

type Props = {
  label: string;
  locale?: "ar" | "en";
};

export function PrintButton({ label, locale = "ar" }: Props) {
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`print:hidden inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark hover:-translate-y-0.5 transition-all ${font}`}
    >
      {/* Printer icon — inline SVG, no dep needed */}
      <svg
        width="15"
        height="15"
        viewBox="0 0 15 15"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M3.5 0h8a.5.5 0 0 1 .5.5V4H3V.5a.5.5 0 0 1 .5-.5zM2 4.5A1.5 1.5 0 0 0 .5 6v5A1.5 1.5 0 0 0 2 12.5h.5V14a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1.5H13A1.5 1.5 0 0 0 14.5 11V6A1.5 1.5 0 0 0 13 4.5H2zm9.5 8v1H3.5v-1h8zm0-1.5H3.5V9h8v2zm1-4a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1z"
          fill="currentColor"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
