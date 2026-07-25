/**
 * ProposalPrintStyles — shared print/PDF stylesheet for the proposal document.
 *
 * Rendered by both the owner detail page (`/proposals/[id]`) and the public
 * share page (`/p/[token]`) so the printed PDF is identical. Server-safe (just a
 * <style> tag). Browser print handles Arabic shaping natively, so no PDF lib.
 *
 * Layout: A4 with margins, the cover section becomes its own page, sections
 * never split across a page break, app chrome is hidden, and a small brand
 * footer repeats on every printed page (position:fixed repeats per page in
 * print engines; the bottom @page margin reserves room for it).
 */
export function ProposalPrintStyles() {
  return (
    <style>{`
      .proposal-print-footer { display: none; }
      @media print {
        nav, header, .print-hidden { display: none !important; }
        body { background: #ffffff !important; }
        /* The printed/PDF document is always the light paper version, whatever
           theme the viewer's browser is in — a dark-themed client must not print
           an unreadable (or ink-flooding) proposal. */
        #proposal-artifact, #proposal-artifact * { color: #1A1A1A !important; }
        #proposal-artifact section { background: #ffffff !important; }
        #proposal-artifact { max-width: 100% !important; margin: 0 auto !important; }
        #proposal-artifact section { break-inside: avoid; page-break-inside: avoid; }
        #proposal-artifact .proposal-cover-page { break-after: page; page-break-after: always; }
        .proposal-print-footer {
          display: block;
          position: fixed;
          bottom: 6mm;
          inset-inline: 0;
          text-align: center;
          font-size: 9px;
          letter-spacing: 0.04em;
          color: #6b5a23;
        }
        @page { size: A4; margin: 16mm 14mm 20mm; }
      }
    `}</style>
  );
}
