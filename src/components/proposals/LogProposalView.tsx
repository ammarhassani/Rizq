"use client";

import { useEffect } from "react";
import { logProposalView } from "@/app/actions/proposals/shareActions";

type Props = {
  token: string;
};

/**
 * Fire-and-forget view logger.
 * Mounts once, calls the server action, ignores the result.
 * Best-effort — errors are silently swallowed per spec.
 */
export function LogProposalView({ token }: Props) {
  useEffect(() => {
    // Intentionally not awaited in the render path — best-effort.
    logProposalView(token).catch(() => {
      /* best-effort — ignore */
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return null;
}
