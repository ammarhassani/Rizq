import { getTranslations } from "next-intl/server";
import { Check, FileText, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/Reveal";

type Props = { locale: "ar" | "en" };

/**
 * Landing hero. Two columns on desktop: the pitch (left) + a product glimpse
 * card (right) so a visitor SEES the product above the fold, not just type
 * (audit §L2). The glimpse is a static, representative mock — landing
 * decoration, not live data.
 */
export async function Hero({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "Hero" });
  const tLanding = await getTranslations({ locale, namespace: "Landing" });
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";

  const chips = [
    tLanding("hero.chip1"),
    tLanding("hero.chip2"),
    tLanding("hero.chip3"),
    tLanding("hero.chip4"),
  ];

  const nf = new Intl.NumberFormat(isAr ? "ar-SA" : "en-US");
  const income = nf.format(24800);
  const goal = nf.format(35000);
  const pct = isAr ? "٧٤٪" : "74%";
  const delta = isAr ? "+٪١٨" : "+18%";

  return (
    <section aria-labelledby="hero-heading" className="relative overflow-hidden">
      {/* One signature texture (audit §L3): a single soft aurora glow. */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 55% 45% at 80% 6%, color-mix(in srgb, var(--acc) 13%, transparent), transparent 60%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* ── Left: the pitch ─────────────────────────────────────────── */}
          <div className="flex flex-col">
            <Reveal asMount delay={0.05} direction="side">
              <p className="eyebrow mb-5">{t("eyebrow")}</p>
            </Reveal>

            {/* Board hero: the OS statement is the H1; the tagline is the aurora
                subline underneath (resolves audit §L1 — the board's own call). */}
            <Reveal asMount delay={0.2} direction="side">
              <h1
                id="hero-heading"
                className={`max-w-xl font-display text-[clamp(2.2rem,4.6vw,3.25rem)] font-bold leading-[1.15] text-rizq-ink ${font}`}
              >
                {isAr ? "نظام التشغيل الكامل لِعملك المستقلّ." : "The complete operating system for your freelance work."}
              </h1>
            </Reveal>
            <Reveal asMount delay={0.3} direction="side">
              <div className={`mt-2 max-w-xl font-display text-2xl font-bold leading-tight aurora-text sm:text-[34px] ${font}`}>
                {t("tagline")}
              </div>
            </Reveal>

            <Reveal asMount delay={0.42}>
              <p className={`mt-4 sm:mt-5 max-w-lg text-lg leading-relaxed text-rizq-ink-soft ${font}`}>
                {t("subtitle")}
              </p>
            </Reveal>

            <Reveal asMount delay={0.58}>
              <div className="mt-7 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <Link
                  href="/signup"
                  className={`group inline-flex items-center justify-center gap-2 rounded-full aurora-btn px-7 py-4 text-sm sm:text-base font-medium tracking-wide hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)] focus-visible:ring-offset-2 ${font}`}
                >
                  <span>{t("ctaPrimary")}</span>
                  <span className="inline-block rtl:rotate-180 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5">
                    →
                  </span>
                </Link>

                <a
                  href="#apps"
                  className={`group inline-flex items-center justify-center gap-2 px-2 py-4 text-sm sm:text-base text-rizq-ink-soft hover:text-rizq-green transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)] focus-visible:ring-offset-2 rounded-sm ${font}`}
                >
                  <span>{t("ctaSecondary")}</span>
                  <span className="transition-transform group-hover:translate-y-0.5">↓</span>
                </a>
              </div>
            </Reveal>

            {/* Trust chips — one row, concrete proof */}
            <Reveal asMount delay={0.74}>
              <ul className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2.5">
                {chips.map((chip) => (
                  <li
                    key={chip}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--acc-line)] bg-[var(--acc-soft)] px-3 py-1.5 text-xs font-medium text-[var(--acc-tint)] ${font}`}
                  >
                    <Check size={13} strokeWidth={2.2} aria-hidden />
                    <span>{chip}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* ── Right: product glimpse (show, don't tell — audit §L2) ────── */}
          <Reveal asMount delay={0.5} className="relative">
            <div className="relative mx-auto w-full max-w-md">
              {/* Floating "proposal ready" chip */}
              <div
                className={`absolute -top-4 z-10 nm-raised-sm rounded-2xl bg-[var(--raised)] px-4 py-2.5 flex items-center gap-2.5 ${
                  isAr ? "start-2" : "end-2"
                } ${font}`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg aurora-fill shrink-0">
                  <FileText size={14} strokeWidth={1.9} aria-hidden />
                </span>
                <span className="text-xs font-semibold text-rizq-ink">
                  {isAr ? "عرض «شركة نون» جاهز" : "Noon Co. proposal ready"}
                </span>
              </div>

              {/* Money hero card */}
              <div className="nm-raised rounded-[26px] bg-[var(--raised)] p-6 sm:p-7 pt-9">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`text-sm text-[var(--content-muted)] ${font}`}>
                      {isAr ? "دخل هذا الشهر" : "This month"}
                    </p>
                    <p className="mt-1 flex items-baseline gap-2">
                      <span className="tabular font-sans text-4xl sm:text-5xl font-bold aurora-text-m leading-none">
                        {income}
                      </span>
                      <span className={`text-sm text-[var(--content-muted)] ${font}`}>
                        {isAr ? "ريال" : "SAR"}
                      </span>
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full status-positive px-2.5 py-1 text-xs font-semibold tabular">
                      <TrendingUp size={12} strokeWidth={2.2} aria-hidden />
                      {delta}
                    </span>
                  </div>

                  {/* Goal ring dial */}
                  <div
                    className="relative h-16 w-16 shrink-0 rounded-full"
                    style={{ background: "conic-gradient(var(--acc) 0turn 0.74turn, var(--track) 0.74turn 1turn)" }}
                    aria-hidden
                  >
                    <div className="absolute inset-[6px] rounded-full bg-[var(--raised)] flex items-center justify-center">
                      <span className="tabular text-sm font-bold text-[var(--acc)]">{pct}</span>
                    </div>
                  </div>
                </div>

                {/* Sparkline */}
                <svg
                  viewBox="0 0 220 52"
                  preserveAspectRatio="none"
                  className="mt-5 w-full h-12"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="hero-spark" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="var(--acc)" />
                    </linearGradient>
                  </defs>
                  <polyline
                    points="0,44 31,38 62,40 92,28 123,31 154,18 185,13 220,6"
                    fill="none"
                    stroke="url(#hero-spark)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {/* Goal line */}
                <div className={`mt-4 pt-4 border-t border-[var(--line)] flex items-center justify-between ${font}`}>
                  <span className="text-xs text-[var(--content-muted)]">
                    {isAr ? "الهدف الشهري" : "Monthly goal"}
                  </span>
                  <span className="tabular text-xs font-semibold text-rizq-ink">
                    {goal} {isAr ? "ريال" : "SAR"}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
