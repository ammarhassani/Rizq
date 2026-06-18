"use server";

/**
 * commandSearch — owner-scoped entity lookup for the ⌘K command palette.
 *
 * Auth-guarded and owner-scoped (`.eq("user_id", uid)`); RLS also enforces.
 * Returns a flat, capped list of jump targets across proposals, clients, and
 * invoices. Never throws — any failure resolves to [] so the palette degrades
 * gracefully. The Supabase client is untyped, so rows are defensively cast.
 */

import { createClient as createSupabaseClient } from "@/lib/supabase/server";

export type CommandSearchResult = {
  type: "proposal" | "client" | "invoice";
  id: string;
  label: string;
  href: string;
};

const PER_TYPE_LIMIT = 5;
const TOTAL_CAP = 12;

/** Escape ILIKE wildcards so user input can't broaden the match. */
function escapeIlike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export async function commandSearch(
  query: string
): Promise<CommandSearchResult[]> {
  try {
    const q = (query ?? "").trim();
    if (q.length < 2) return [];

    const supabase = await createSupabaseClient();

    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return [];

    const pattern = `%${escapeIlike(q)}%`;

    const [proposalsRes, clientsRes, invoicesRes] = await Promise.all([
      supabase
        .from("proposals")
        .select("id, client_name")
        .eq("user_id", uid)
        .ilike("client_name", pattern)
        .order("created_at", { ascending: false })
        .limit(PER_TYPE_LIMIT),
      supabase
        .from("clients")
        .select("id, name")
        .eq("user_id", uid)
        .ilike("name", pattern)
        .order("created_at", { ascending: false })
        .limit(PER_TYPE_LIMIT),
      supabase
        .from("invoices")
        .select("id, invoice_number")
        .eq("user_id", uid)
        .ilike("invoice_number", pattern)
        .order("created_at", { ascending: false })
        .limit(PER_TYPE_LIMIT),
    ]);

    const results: CommandSearchResult[] = [];

    for (const row of (proposalsRes.data ?? []) as Array<{
      id: string;
      client_name: string | null;
    }>) {
      results.push({
        type: "proposal",
        id: row.id,
        label: row.client_name?.trim() || "Proposal",
        href: `/proposals/${row.id}`,
      });
    }

    for (const row of (clientsRes.data ?? []) as Array<{
      id: string;
      name: string | null;
    }>) {
      results.push({
        type: "client",
        id: row.id,
        label: row.name?.trim() || "Client",
        href: `/clients/${row.id}`,
      });
    }

    for (const row of (invoicesRes.data ?? []) as Array<{
      id: string;
      invoice_number: string | null;
    }>) {
      results.push({
        type: "invoice",
        id: row.id,
        label: row.invoice_number?.trim() || "Invoice",
        href: `/invoices/${row.id}`,
      });
    }

    return results.slice(0, TOTAL_CAP);
  } catch {
    return [];
  }
}
