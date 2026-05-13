"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { startOAuth, type OAuthProvider } from "@/app/actions/auth/oauthRedirect";

type Props = { locale: "ar" | "en" };

const PROVIDERS: { id: OAuthProvider; key: "Google" | "Apple" | "LinkedIn" }[] = [
  { id: "google", key: "Google" },
  { id: "apple", key: "Apple" },
  { id: "linkedin_oidc", key: "LinkedIn" },
];

export function OAuthButtons({ locale }: Props) {
  const t = useTranslations("Auth.shared");
  const font = locale === "ar" ? "font-arabic" : "font-sans";

  const [isPending, startTransition] = useTransition();
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onClick = (provider: OAuthProvider) => {
    setError(null);
    setPendingProvider(provider);
    startTransition(async () => {
      const result = await startOAuth(provider, locale);
      if (result.ok) {
        window.location.href = result.url;
        return;
      }
      setPendingProvider(null);
      setError(
        result.code === "provider_not_configured"
          ? t("providerNotConfigured")
          : t("genericError")
      );
    });
  };

  return (
    <div className="space-y-3">
      {PROVIDERS.map(({ id, key }) => {
        const labelKey =
          key === "Google"
            ? "continueWithGoogle"
            : key === "Apple"
              ? "continueWithApple"
              : "continueWithLinkedIn";

        const isThisPending = isPending && pendingProvider === id;

        return (
          <button
            key={id}
            type="button"
            disabled={isPending}
            onClick={() => onClick(id)}
            className={`group w-full inline-flex items-center justify-center gap-3 rounded-full border border-rizq-gold/35 bg-rizq-cream/60 px-5 py-3 text-sm sm:text-base text-rizq-ink hover:bg-rizq-cream hover:border-rizq-green/40 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:hover:translate-y-0 ${font}`}
          >
            {isThisPending ? (
              <Loader2 size={18} className="animate-spin text-rizq-green" strokeWidth={2.2} />
            ) : (
              <ProviderIcon provider={id} />
            )}
            <span>{t(labelKey)}</span>
          </button>
        );
      })}

      {error && (
        <p
          role="alert"
          className={`mt-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 ${font}`}
        >
          {error}
        </p>
      )}
    </div>
  );
}

function ProviderIcon({ provider }: { provider: OAuthProvider }) {
  if (provider === "google") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
        />
        <path
          fill="#FBBC04"
          d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.74.13-1.45.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.66-2.84Z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
        />
      </svg>
    );
  }
  if (provider === "apple") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden fill="currentColor">
        <path d="M16.36 1.43c0 1.14-.42 2.21-1.25 3.18-.99 1.15-2.18 1.82-3.48 1.72-.04-1.13.41-2.31 1.27-3.27.85-.96 2.12-1.61 3.46-1.63ZM20.6 17.5c-.61 1.4-.91 2.03-1.7 3.27-1.1 1.73-2.65 3.88-4.57 3.89-1.71.02-2.15-1.12-4.47-1.1-2.32.01-2.8 1.12-4.51 1.1-1.92-.01-3.39-1.96-4.49-3.69C-1.7 18.04-2.06 13.36 1.86 11c2.66-1.6 5.06-1.55 6.97-.55 1.39.73 2.49.85 4.13.42 1.79-.47 3.5-.79 5.78.46-1.94.97-3.07 2.4-3.18 4.41-.1 1.96 1.07 3.52 2.06 4.21.42.29.91.51 1.43.72.04.02-.45.43-.45.83Z" />
      </svg>
    );
  }
  // LinkedIn
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#0A66C2"
        d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.95v5.66H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0Z"
      />
    </svg>
  );
}
