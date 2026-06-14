"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Settings, ExternalLink, ChevronDown } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";

type Props = {
  locale: "ar" | "en";
  name: string | null;
  email: string | null;
};

/** Returns up-to-2-char initials from a name or email */
function initials(name: string | null, email: string | null): string {
  const src = name ?? email ?? "؟";
  const words = src.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function UserMenu({ locale, name, email }: Props) {
  const t = useTranslations("AppShell");
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent | KeyboardEvent) {
      if (e instanceof KeyboardEvent && e.key === "Escape") { setOpen(false); return; }
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("keydown", handle);
    };
  }, [open]);

  const ini = initials(name, email);

  return (
    <div ref={ref} className="relative" dir={dir}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("userMenu.signedInAs")}
        className={[
          "inline-flex items-center gap-1.5 rounded-full min-h-[44px] px-2 py-1",
          "text-rizq-ink hover:bg-rizq-green/8 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/60",
          font,
        ].join(" ")}
      >
        {/* Avatar */}
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rizq-green text-rizq-cream text-xs font-bold select-none"
        >
          {ini}
        </span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          aria-hidden
          className={`shrink-0 text-rizq-ink-soft transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className={[
            "absolute top-full mt-1 z-[60]",
            locale === "ar" ? "end-0" : "start-0",
            "w-52 rounded-xl border border-rizq-gold/20 bg-rizq-cream/98 shadow-lg py-1",
            font,
          ].join(" ")}
        >
          {/* Identity */}
          <div className="px-3 py-2 border-b border-rizq-gold/15">
            {name && (
              <p className={`text-sm font-semibold text-rizq-ink truncate ${font}`}>{name}</p>
            )}
            {email && (
              <p className={`text-xs text-rizq-ink-soft/70 truncate ${font}`}>{email}</p>
            )}
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={[
                "flex items-center gap-2.5 px-3 py-2 text-sm text-rizq-ink",
                "hover:bg-rizq-green/8 hover:text-rizq-green transition-colors",
                "focus-visible:outline-none focus-visible:bg-rizq-green/8",
                font,
              ].join(" ")}
            >
              <Settings size={14} strokeWidth={1.6} aria-hidden />
              {t("userMenu.settings")}
            </Link>

            <Link
              href="/"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={[
                "flex items-center gap-2.5 px-3 py-2 text-sm text-rizq-ink",
                "hover:bg-rizq-green/8 hover:text-rizq-green transition-colors",
                "focus-visible:outline-none focus-visible:bg-rizq-green/8",
                font,
              ].join(" ")}
            >
              <ExternalLink size={14} strokeWidth={1.6} aria-hidden />
              {t("userMenu.viewSite")}
            </Link>
          </div>

          {/* Logout */}
          <div className="pt-1 border-t border-rizq-gold/15 px-2 pb-1">
            <LogoutButton locale={locale} />
          </div>
        </div>
      )}
    </div>
  );
}
