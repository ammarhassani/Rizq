"use client";

import { useEffect } from "react";

/**
 * Last-resort error boundary for runtime errors during root-layout render.
 * Replaces the entire document, so it must define <html> and <body>.
 * Keep this minimal and free of i18n / Supabase / Framer dependencies —
 * if a problem reaches this far, those subsystems may be the cause.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("[global-error]", { digest: error.digest });
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          fontFamily:
            "Tajawal, system-ui, sans-serif",
          backgroundColor: "#FAF5EC",
          color: "#1A1A1A",
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <p
            style={{
              fontSize: 12,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: "#9E8A3D",
              marginBottom: 16,
            }}
          >
            خطأ
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
            حدث خطأ غير متوقع.
          </h1>
          <p style={{ color: "#3D3D3D", lineHeight: 1.6 }}>
            حاول تحديث الصفحة. سُجّل الخطأ تلقائيًا.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 24,
                fontSize: 10,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(61,61,61,0.6)",
              }}
            >
              ref · {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
