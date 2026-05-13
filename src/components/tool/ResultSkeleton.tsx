export function ResultSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Calculating"
      className="rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-7 sm:p-10 animate-fade-in"
    >
      <div className="h-3 w-24 mb-6 rounded-full bg-rizq-gold/15 overflow-hidden">
        <span
          aria-hidden
          className="block h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(200,169,81,0.18) 0%, rgba(26,95,63,0.22) 50%, rgba(200,169,81,0.18) 100%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.6s linear infinite",
          }}
        />
      </div>
      <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center">
            <div className="h-3 w-12 mb-3 rounded-full bg-rizq-gold/20" />
            <div className="h-12 sm:h-16 w-24 sm:w-32 rounded-2xl bg-rizq-ink/5 overflow-hidden">
              <span
                aria-hidden
                className="block h-full w-full"
                style={{
                  backgroundImage:
                    "linear-gradient(90deg, transparent 0%, rgba(26,95,63,0.12) 50%, transparent 100%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.6s linear infinite",
                  animationDelay: `${i * 0.12}s`,
                }}
              />
            </div>
            <div className="mt-2 h-2 w-10 rounded-full bg-rizq-gold/15" />
          </div>
        ))}
      </div>
      <div className="h-2 w-full rounded-full bg-rizq-gold/15 mb-8" />
      <div className="space-y-3">
        <div className="h-3 w-2/3 rounded-full bg-rizq-ink/8" />
        <div className="h-3 w-1/2 rounded-full bg-rizq-ink/8" />
      </div>
    </div>
  );
}
