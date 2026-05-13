import { Link } from "@/i18n/navigation";
import { LocaleToggle } from "@/components/landing/LocaleToggle";

export default function AuthRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Faint gold dot grid texture, same as hero */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.45] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(200, 169, 81, 0.20) 1px, transparent 1.6px)",
          backgroundSize: "30px 30px",
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 12%, black 88%, transparent 100%)",
        }}
      />

      <header className="relative z-10">
        <div className="mx-auto w-full max-w-6xl px-6 sm:px-10 lg:px-16 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-baseline gap-2"
          >
            <span className="font-arabic text-2xl font-bold text-rizq-green tracking-tight transition-colors group-hover:text-rizq-green-dark">
              رِزق
            </span>
            <span aria-hidden className="hidden sm:inline-block h-3 w-px bg-rizq-gold/50" />
            <span className="hidden sm:inline-block text-[10px] tracking-[0.24em] uppercase text-rizq-ink-soft/70">
              beta
            </span>
          </Link>
          <LocaleToggle />
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-10 sm:py-14">
        {children}
      </main>
    </div>
  );
}
