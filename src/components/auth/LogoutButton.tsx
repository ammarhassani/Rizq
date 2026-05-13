"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogOut, Loader2 } from "lucide-react";
import { logOut } from "@/app/actions/auth/logout";

type Props = { locale: "ar" | "en" };

export function LogoutButton({ locale }: Props) {
  const t = useTranslations("Dashboard");
  const [isPending, startTransition] = useTransition();
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <button
      type="button"
      onClick={() => startTransition(async () => { await logOut(locale); })}
      disabled={isPending}
      className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 hover:bg-rizq-cream hover:border-rizq-green/40 px-4 py-2 text-sm text-rizq-ink transition-all disabled:opacity-60 ${font}`}
    >
      {isPending ? (
        <>
          <Loader2 size={14} className="animate-spin" strokeWidth={2.2} />
          <span>{t("logoutLoading")}</span>
        </>
      ) : (
        <>
          <LogOut size={14} strokeWidth={1.6} />
          <span>{t("logout")}</span>
        </>
      )}
    </button>
  );
}
