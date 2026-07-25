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

import { proposalReference } from "@/lib/proposals/artifact";

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
      .select("id, artifact_json, client_name, brief_language, created_at")
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

    // Project title comes from the cover section (AI-drafted, owner-editable).
    const coverContent =
      (artifact.sections.find((s) => s.id === "cover")?.content as
        | Record<string, unknown>
        | undefined) ?? {};
    const projectTitle =
      typeof coverContent["projectTitle"] === "string"
        ? (coverContent["projectTitle"] as string).trim()
        : "";

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

    // Filename: "<project> TO <client> Proposal <creation date>.docx"
    // (creation date, not export date). Each part is omitted when absent.
    const clientName = ((proposal.client_name as string | null) ?? "").trim();
    const createdAt = proposal.created_at as string | null;
    const dateStr = createdAt ? String(createdAt).slice(0, 10) : "";

    const parts: string[] = [];
    if (projectTitle) parts.push(projectTitle);
    if (projectTitle && clientName) parts.push("TO");
    if (clientName) parts.push(clientName);
    parts.push("Proposal");
    if (dateStr) parts.push(dateStr);
    const niceBase = parts.join(" ") || "Rizq Proposal";

    const niceName = `${niceBase}.docx`;
    // An all-Arabic title transliterates to nothing, so slugging the joined string
    // left connectives behind and produced files literally called
    // "TO-Proposal-2026-07-25.docx". Slug each part, drop the ones that vanished,
    // and fall back to the proposal's own reference so the file is still
    // identifiable on a system that uses the ASCII name.
    const asciiParts = parts
      .map((part) => asciiSlug(part))
      .filter((part) => part && part !== "proposal" && part !== "TO");
    const asciiBase = asciiParts.length > 1
      ? asciiParts.join("-")
      : `Rizq-Proposal-${proposalReference(proposal.id as string)}${dateStr ? `-${dateStr}` : ""}`;
    const asciiName = `${asciiBase}.docx`;

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
