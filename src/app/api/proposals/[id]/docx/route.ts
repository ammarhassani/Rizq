/**
 * GET /api/proposals/[id]/docx — export an owned proposal as a Word (.docx).
 *
 * The Studio builds the proposal; this hands it over as an editable Word
 * document (the deliverable a client actually expects). Server-side, owner-
 * scoped (RLS + explicit user_id). Builds the file from the stored
 * artifact_json — no numbers/dates/names are recomputed or invented here.
 *
 * runtime=nodejs (the docx packer needs Node), dynamic=force-dynamic.
 */

import { createClient } from "@/lib/supabase/server";
import { buildProposalDocxBuffer } from "@/lib/proposals/docx";
import type { ArtifactData } from "@/lib/proposals/artifact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** ASCII-safe filename fragment; non-Latin / unsafe chars → '-'. */
function asciiSlug(input: string): string {
  return (
    input
      .normalize("NFKD")
      .replace(/[^\w.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "proposal"
  );
}

export async function GET(
  request: Request,
  { params }: { params: Promise<Params> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ ok: false, code: "unauthorized" }, { status: 401 });
    }

    const { data: proposal, error } = await supabase
      .from("proposals")
      .select("artifact_json, client_name, brief_language")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !proposal) {
      return Response.json({ ok: false, code: "not_found" }, { status: 404 });
    }

    const artifact = proposal.artifact_json as ArtifactData | null;
    if (!artifact || !Array.isArray(artifact.sections) || artifact.sections.length === 0) {
      return Response.json({ ok: false, code: "no_artifact" }, { status: 422 });
    }

    // Locale: explicit ?locale wins, else the proposal's brief language, else ar.
    const qLocale = new URL(request.url).searchParams.get("locale");
    const briefLang = proposal.brief_language as string | null;
    const locale: "ar" | "en" =
      qLocale === "en" || qLocale === "ar"
        ? qLocale
        : briefLang === "en"
          ? "en"
          : "ar";

    const buffer = await buildProposalDocxBuffer(artifact, locale);

    const clientName = (proposal.client_name as string | null) ?? "";
    const base = `Rizq-Proposal${clientName ? "-" + asciiSlug(clientName) : "-" + id.slice(0, 8)}`;
    const niceName = `${clientName ? clientName + " - " : ""}Rizq Proposal.docx`;
    const asciiName = `${base}.docx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(niceName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[proposals/docx] export failed", err);
    return Response.json({ ok: false, code: "error" }, { status: 500 });
  }
}
