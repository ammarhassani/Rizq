"use client";

/**
 * ArtifactSkeleton — shimmer placeholder shown while generateProposal /
 * answerFollowUps is in flight.
 *
 * Shows 4 labelled processing steps with the active one animated.
 * Mirrors the shimmer approach from ResultSkeleton.tsx.
 */

type Props = {
  locale: "ar" | "en";
  /** 0-based index of the currently active step (0–3). */
  activeStep?: number;
};

const STEPS_AR = [
  "استخراج نطاق العمل…",
  "حساب السعر السوقي…",
  "تحليل تاريخك السابق…",
  "إنشاء العرض التقديمي…",
];

const STEPS_EN = [
  "Extracting scope…",
  "Computing market price…",
  "Analyzing your history…",
  "Generating proposal…",
];

const SHIMMER = {
  backgroundImage:
    "linear-gradient(90deg, rgba(200,169,81,0.18) 0%, rgba(26,95,63,0.22) 50%, rgba(200,169,81,0.18) 100%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.6s linear infinite",
} as const;

export function ArtifactSkeleton({ locale, activeStep = 0 }: Props) {
  const steps = locale === "ar" ? STEPS_AR : STEPS_EN;
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={locale === "ar" ? "جارٍ إنشاء العرض" : "Generating proposal"}
      dir={dir}
      className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-7 sm:p-10 animate-fade-in space-y-8 ${font}`}
    >
      {/* Processing step tracker */}
      <div className="space-y-3">
        {steps.map((label, i) => {
          const isActive = i === activeStep;
          const isDone = i < activeStep;
          return (
            <div key={i} className="flex items-center gap-3">
              {/* Step indicator */}
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium transition-all ${
                  isDone
                    ? "bg-rizq-green text-rizq-cream"
                    : isActive
                      ? "bg-rizq-gold/30 text-rizq-ink"
                      : "bg-rizq-ink/8 text-rizq-ink-soft"
                }`}
              >
                {isDone ? "✓" : i + 1}
              </span>

              {/* Label + shimmer bar */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm mb-1 transition-colors ${
                    isActive
                      ? "text-rizq-ink font-medium"
                      : isDone
                        ? "text-rizq-green"
                        : "text-rizq-ink-soft/60"
                  }`}
                >
                  {label}
                </p>
                {isActive && (
                  <div className="h-1 w-full rounded-full bg-rizq-gold/15 overflow-hidden">
                    <span
                      aria-hidden
                      className="block h-full w-full rounded-full"
                      style={{
                        ...SHIMMER,
                        animationDelay: `${i * 0.1}s`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Document placeholder blocks */}
      <div className="space-y-4 pt-2">
        {/* Header row */}
        <div className="flex gap-4">
          <div className="h-16 w-16 rounded-2xl bg-rizq-gold/10 overflow-hidden shrink-0">
            <span
              aria-hidden
              className="block h-full w-full"
              style={{ ...SHIMMER, animationDelay: "0.05s" }}
            />
          </div>
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-2/3 rounded-full bg-rizq-ink/8 overflow-hidden">
              <span aria-hidden className="block h-full w-full" style={SHIMMER} />
            </div>
            <div className="h-2 w-1/2 rounded-full bg-rizq-gold/12" />
          </div>
        </div>

        {/* Price hero */}
        <div className="rounded-2xl border border-rizq-gold/15 bg-[var(--raised)] p-5 space-y-3">
          <div className="h-2 w-24 rounded-full bg-rizq-gold/20" />
          <div className="h-10 w-40 rounded-xl bg-rizq-green/8 overflow-hidden">
            <span
              aria-hidden
              className="block h-full w-full"
              style={{ ...SHIMMER, animationDelay: "0.15s" }}
            />
          </div>
          <div className="h-1.5 w-full rounded-full bg-rizq-gold/15" />
        </div>

        {/* Scope block */}
        <div className="rounded-2xl border border-rizq-gold/15 bg-[var(--raised)] p-5 space-y-2">
          <div className="h-2 w-28 rounded-full bg-rizq-gold/20" />
          {[0, 1, 2].map((j) => (
            <div
              key={j}
              className="h-2 rounded-full bg-rizq-ink/6 overflow-hidden"
              style={{ width: `${75 - j * 12}%` }}
            >
              <span
                aria-hidden
                className="block h-full w-full"
                style={{ ...SHIMMER, animationDelay: `${j * 0.12}s` }}
              />
            </div>
          ))}
        </div>

        {/* Milestones block */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((k) => (
            <div
              key={k}
              className="rounded-xl border border-rizq-gold/15 bg-[var(--raised)] p-4 space-y-1.5"
            >
              <div className="h-2 w-3/4 rounded-full bg-rizq-ink/6" />
              <div className="h-6 w-12 rounded-lg bg-rizq-green/8 overflow-hidden">
                <span
                  aria-hidden
                  className="block h-full w-full"
                  style={{ ...SHIMMER, animationDelay: `${k * 0.08}s` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
