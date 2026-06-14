"use client";

import { useEffect } from "react";
import { logInvoiceView } from "@/app/actions/invoices/shareActions";

type Props = {
  token: string;
};

/**
 * Fire-and-forget view logger for public invoice share page.
 * Mounts once, calls the server action, ignores the result.
 * Best-effort — errors are silently swallowed per spec.
 */
export function LogInvoiceView({ token }: Props) {
  useEffect(() => {
    // Intentionally not awaited in the render path — best-effort.
    logInvoiceView(token).catch(() => {
      /* best-effort — ignore */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return null;
}
