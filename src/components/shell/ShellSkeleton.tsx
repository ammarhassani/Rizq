/**
 * ShellSkeleton — shell-silhouette loading fallback for the signed-in app.
 *
 * AppShell is a per-page wrapper (not a persistent layout), so a route's
 * `loading.tsx` fallback renders WITHOUT the sidebar/top-bar chrome unless we
 * draw it. This component paints a lightweight silhouette — sidebar rail +
 * top-bar + shimmering content blocks — so navigation never flashes to a bare
 * page while the server component streams in.
 *
 * Server component, no params: it inherits `dir` from <html> (set by the locale
 * layout) and uses logical CSS (border-s / ms-auto / start) so it mirrors for
 * RTL automatically. Shimmer respects the global reduced-motion CSS guard.
 *
 * `variant` controls the content silhouette:
 *   - "list"     → header + a column of row cards (proposals, clients, income…)
 *   - "grid"     → header + a responsive widget grid (dashboard)
 *   - "detail"   → back link + summary strip + a tall artifact block
 *   - "calendar" → header + a month-grid block
 */
import { ShellSkeletonLabel } from "./ShellSkeletonLabel";

type Variant = "list" | "grid" | "detail" | "calendar";

const MAX_WIDTH_CLASS: Record<"wide" | "reading", string> = {
  wide: "max-w-5xl",
  reading: "max-w-3xl",
};

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-rizq-ink/[0.06] ${className}`}>
      <span
        aria-hidden
        className="absolute inset-0 block"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0%, rgba(26,95,63,0.10) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.6s linear infinite",
        }}
      />
    </div>
  );
}

function ContentSilhouette({ variant }: { variant: Variant }) {
  // Shared page header (eyebrow + big title + subtitle)
  const Header = (
    <div className="mb-8">
      <Shimmer className="h-2.5 w-24 mb-4 rounded-full" />
      <Shimmer className="h-9 w-2/3 max-w-sm mb-3 rounded-2xl" />
      <Shimmer className="h-3 w-1/2 max-w-xs rounded-full" />
    </div>
  );

  if (variant === "grid") {
    return (
      <>
        {Header}
        <Shimmer className="h-28 w-full mb-5 rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-40 w-full rounded-3xl" />
          ))}
        </div>
      </>
    );
  }

  if (variant === "detail") {
    return (
      <>
        <Shimmer className="h-3 w-20 mb-8 rounded-full" />
        <Shimmer className="h-16 w-full mb-6 rounded-2xl" />
        <Shimmer className="h-80 w-full rounded-3xl" />
      </>
    );
  }

  if (variant === "calendar") {
    return (
      <>
        {Header}
        <Shimmer className="h-[420px] w-full rounded-3xl" />
      </>
    );
  }

  // "list"
  return (
    <>
      {Header}
      <Shimmer className="h-28 w-full mb-6 rounded-3xl" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Shimmer key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </>
  );
}

export function ShellSkeleton({
  variant = "list",
  maxWidth = "wide",
}: {
  variant?: Variant;
  maxWidth?: "wide" | "reading";
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      className="relative min-h-screen flex bg-paper flex-row"
    >
      <ShellSkeletonLabel />
      {/* Dot-grid backdrop — mirrors the real shell */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200, 169, 81, 0.18) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          zIndex: 0,
        }}
      />

      {/* Sidebar rail placeholder (desktop only — matches lg:flex sidebar) */}
      <aside
        aria-hidden
        className="hidden lg:flex flex-col shrink-0 w-[220px] sticky top-0 h-screen bg-rizq-cream/98 border-s border-rizq-gold/20"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-4 border-b border-rizq-gold/15">
          <Shimmer className="h-6 w-16 rounded-lg" />
          <Shimmer className="h-8 w-8 rounded-lg" />
        </div>
        <div className="flex flex-col gap-1.5 px-3 py-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <Shimmer key={i} className="h-9 w-full rounded-xl" />
          ))}
        </div>
      </aside>

      {/* Main column: top-bar placeholder + content silhouette */}
      <div className="relative z-10 flex flex-1 flex-col min-w-0 min-h-screen">
        <header className="sticky top-0 z-40 flex items-center gap-2 h-14 bg-rizq-cream/95 border-b border-rizq-gold/15 px-4 sm:px-6">
          <Shimmer className="h-9 w-9 rounded-xl lg:hidden" />
          <Shimmer className="hidden sm:block h-3 w-28 rounded-full" />
          <div className="ms-auto flex items-center gap-2">
            <Shimmer className="h-9 w-9 rounded-xl" />
            <Shimmer className="h-8 w-16 rounded-full" />
            <Shimmer className="h-9 w-9 rounded-full" />
          </div>
        </header>

        <main className="flex-1">
          <div className={`mx-auto w-full px-5 sm:px-8 lg:px-10 py-6 sm:py-8 pb-16 ${MAX_WIDTH_CLASS[maxWidth]}`}>
            <ContentSilhouette variant={variant} />
          </div>
        </main>
      </div>
    </div>
  );
}
