// Placeholder — swap for the commissioned seal (founder decision D6).

type Props = {
  size?: number;
  className?: string;
  locale?: "ar" | "en";
};

/**
 * Small, dignified notary-style seal for verified Rizq proposals.
 * Pure presentational — no hooks, no client-only APIs → no "use client" needed.
 *
 * Renders an SVG circle seal with the رِزق logotype and a checkmark,
 * using the Rizq brand palette (green #1A5F3F, gold #C8A951, cream #FAF5EC).
 *
 * Replace the SVG body with the commissioned artwork (founder decision D6)
 * once it is available; the Props interface and aria attributes stay the same.
 */
export function RizqSeal({ size = 80, className, locale = "ar" }: Props) {
  const ariaLabel =
    locale === "ar" ? "ختم رِزق الموثّق" : "Rizq verified seal";

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer ring */}
      <circle
        cx="40"
        cy="40"
        r="38"
        stroke="#C8A951"
        strokeWidth="2.5"
        fill="#FAF5EC"
      />

      {/* Inner filled circle */}
      <circle
        cx="40"
        cy="40"
        r="31"
        fill="#1A5F3F"
      />

      {/* Decorative dashed ring between outer and inner */}
      <circle
        cx="40"
        cy="40"
        r="34.5"
        stroke="#C8A951"
        strokeWidth="0.75"
        strokeDasharray="2.5 2.5"
        fill="none"
      />

      {/* Checkmark — cream colour, centred slightly above middle */}
      <path
        d="M28 39.5 L36 48 L53 31"
        stroke="#FAF5EC"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* رِزق logotype — gold, below the check */}
      <text
        x="40"
        y="62"
        textAnchor="middle"
        fontFamily="Tajawal, Arial, sans-serif"
        fontSize="11"
        fontWeight="700"
        fill="#C8A951"
        /* Arabic text is inherently RTL; explicit direction avoids env issues */
        direction="rtl"
      >
        رِزق
      </text>
    </svg>
  );
}
