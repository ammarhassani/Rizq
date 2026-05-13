import { Link } from "@/i18n/navigation";
import { LocaleToggle } from "@/components/landing/LocaleToggle";

type Section = { title: string; body: string };

type Props = {
  locale: "ar" | "en";
  title: string;
  intro: string;
  sections: Section[];
  contactLine: string;
  lastUpdated: string;
  backHomeLabel: string;
};

/**
 * Long-form legal layout. Same paper-grain background as the rest of the
 * site, narrow column for readability, gold rule between sections, and a
 * small "last updated" line.
 */
export function LegalShell({
  locale,
  title,
  intro,
  sections,
  contactLine,
  lastUpdated,
  backHomeLabel,
}: Props) {
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <div className="relative min-h-screen flex flex-col bg-paper">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.45] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200, 169, 81, 0.16) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      />

      <header className="relative z-10 backdrop-blur-md bg-rizq-cream/70 border-b border-rizq-gold/15">
        <div className="mx-auto w-full max-w-3xl px-6 sm:px-10 h-16 flex items-center justify-between">
          <Link href="/" className="group inline-flex items-baseline gap-2">
            <span className="font-arabic text-2xl font-bold text-rizq-green tracking-tight transition-colors group-hover:text-rizq-green-dark">
              رِزق
            </span>
          </Link>
          <LocaleToggle />
        </div>
      </header>

      <main className="relative z-10 flex-1 mx-auto w-full max-w-3xl px-6 sm:px-10 py-12 sm:py-16 lg:py-20">
        <p className="eyebrow mb-4">{lastUpdated}</p>
        <h1 className={`display-2 text-rizq-ink mb-6 ${font}`}>{title}</h1>
        <p className={`text-base sm:text-lg leading-relaxed text-rizq-ink-soft mb-12 ${font}`}>
          {intro}
        </p>

        <div className="space-y-10 sm:space-y-12 border-t border-rizq-gold/15 pt-10">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className={`text-xl sm:text-2xl font-semibold text-rizq-ink mb-3 ${font}`}>
                {s.title}
              </h2>
              <p className={`text-base leading-relaxed text-rizq-ink-soft ${font}`}>
                {s.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-rizq-gold/15">
          <p className={`text-sm text-rizq-ink-soft ${font}`}>{contactLine}</p>
          <Link
            href="/"
            className={`mt-6 inline-flex items-center gap-1 text-sm text-rizq-green hover:text-rizq-green-dark transition-colors ${font}`}
          >
            <span className="inline-block rtl:rotate-180">←</span>
            <span>{backHomeLabel}</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
