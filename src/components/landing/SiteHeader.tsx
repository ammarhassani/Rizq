import { Link } from "@/i18n/navigation";
import { LocaleToggle } from "./LocaleToggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-rizq-cream/70 border-b border-rizq-gold/15">
      <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16 h-16 flex items-center justify-between">
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

        <nav className="flex items-center gap-6 sm:gap-8">
          <a
            href="#waitlist"
            className="text-xs tracking-[0.18em] uppercase text-rizq-ink-soft hover:text-rizq-green transition-colors hidden sm:inline-block"
          >
            <span className="font-sans">→</span>
          </a>
          <LocaleToggle />
        </nav>
      </div>
    </header>
  );
}
