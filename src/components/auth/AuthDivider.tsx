type Props = { locale: "ar" | "en"; label: string };

export function AuthDivider({ locale, label }: Props) {
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  return (
    <div className="my-6 flex items-center gap-3" aria-hidden>
      <span className="flex-1 h-px bg-rizq-gold/25" />
      <span className={`text-xs tracking-[0.22em] uppercase text-rizq-ink-soft/60 ${font}`}>
        {label}
      </span>
      <span className="flex-1 h-px bg-rizq-gold/25" />
    </div>
  );
}
