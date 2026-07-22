"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { APPS } from "@/lib/apps";

type Props = {
  open: boolean;
  onClose: () => void;
  locale: "ar" | "en";
};

export function AppsLauncher({ open, onClose, locale }: Props) {
  const t = useTranslations("AppShell");
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="sm:max-w-xl w-full max-h-[85dvh] overflow-y-auto bg-rizq-cream/98"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className={`text-base font-semibold text-rizq-ink ${font}`} dir={dir}>
            {t("launcher.title")}
          </DialogTitle>
          <DialogDescription className={`text-xs text-rizq-ink-soft/70 ${font}`} dir={dir}>
            {t("launcher.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div
          dir={dir}
          className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-1"
        >
          {APPS.map((app) => {
            const Icon = app.icon;
            return (
              /* base-ui DialogClose doesn't support asChild — wrap Link in a
                 DialogClose that renders as a <span> then navigate via onClick */
              <DialogClose
                key={app.id}
                render={<span />}
                nativeButton={false}
                className="contents"
              >
                <Link
                  href={app.href as "/dashboard"}
                  onClick={onClose}
                  className={[
                    "group flex flex-col items-center gap-2 rounded-xl border border-rizq-gold/20",
                    "bg-white/60 hover:bg-rizq-green/8 hover:border-rizq-green/30",
                    "px-2 py-3 text-center transition-all min-h-[80px] justify-center",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/60",
                  ].join(" ")}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rizq-green/10 group-hover:bg-rizq-green/18 transition-colors">
                    <Icon
                      size={20}
                      strokeWidth={1.6}
                      aria-hidden
                      className="text-rizq-green"
                    />
                  </span>
                  <span className={`text-xs font-medium text-rizq-ink leading-tight line-clamp-2 ${font}`}>
                    {t(`apps.${app.id}.name`)}
                  </span>
                </Link>
              </DialogClose>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
