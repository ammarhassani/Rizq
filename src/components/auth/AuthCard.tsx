import type { ReactNode } from "react";

type Props = {
  locale: "ar" | "en";
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({ locale, eyebrow, title, subtitle, children, footer }: Props) {
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  return (
    <div className="w-full max-w-[440px] mx-auto animate-fade-in">
        <div className="relative bg-rizq-cream/85 backdrop-blur-sm border border-rizq-gold/20 rounded-3xl p-8 sm:p-10 shadow-[0_30px_60px_-30px_rgba(26,95,63,0.18)]">
          {/* Gold corner accents — quiet editorial flourish */}
          <span
            aria-hidden
            className="absolute top-0 start-0 h-6 w-6 border-t-2 border-s-2 border-rizq-gold/40 rounded-ts-2xl"
            style={{
              borderTopLeftRadius: "1rem",
              borderTopRightRadius: 0,
              borderBottomLeftRadius: 0,
              borderBottomRightRadius: 0,
            }}
          />
          <span
            aria-hidden
            className="absolute bottom-0 end-0 h-6 w-6 border-b-2 border-e-2 border-rizq-gold/40"
            style={{
              borderBottomRightRadius: "1rem",
              borderTopRightRadius: 0,
              borderBottomLeftRadius: 0,
              borderTopLeftRadius: 0,
            }}
          />

          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h1 className={`text-3xl sm:text-4xl font-bold text-rizq-ink leading-tight ${font}`}>
            {title}
          </h1>
          {subtitle && (
            <p className={`mt-3 text-base text-rizq-ink-soft leading-relaxed ${font}`}>
              {subtitle}
            </p>
          )}

          <div className="mt-8">{children}</div>
        </div>

        {footer && (
          <div className={`mt-6 text-center text-sm text-rizq-ink-soft ${font}`}>
            {footer}
          </div>
        )}
      </div>
  );
}
