"use client";

/**
 * ProjectFilesClient — Project Workspace (spec 004), Files tab (task T006).
 * Upload a file scoped to the project (input/deliverable), flip a doc's kind,
 * and open it via a signed URL. Reuses the existing Document Vault actions.
 */

import { useRef, useState, useTransition } from "react";
import { Loader2, Upload, FileText, ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { uploadDocument, getDocumentSignedUrl } from "@/app/actions/documents/documentActions";
import { setDocumentKind } from "@/app/actions/projects/documents";

type Kind = "input" | "deliverable";
type Doc = { id: string; title: string; file_name: string; kind: Kind };

export function ProjectFilesClient({
  locale,
  projectId,
  docs,
}: {
  locale: "ar" | "en";
  projectId: string;
  docs: Doc[];
}) {
  const t = useTranslations("Projects");
  const router = useRouter();
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";
  const font = isAr ? "font-arabic" : "font-sans";

  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<Kind>("input");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, startUpload] = useTransition();
  const [, startMutate] = useTransition();

  function handleUpload() {
    setError(null);
    const file = fileRef.current?.files?.[0];
    if (!file || !title.trim()) {
      setError(t("fileRequired"));
      return;
    }
    startUpload(async () => {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("title_ar", title.trim());
      fd.set("project_id", projectId);
      fd.set("project_doc_kind", kind);
      const result = await uploadDocument(fd);
      if (!result.ok) {
        setError(t("uploadError"));
        return;
      }
      setTitle("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  async function handleOpen(id: string) {
    const r = await getDocumentSignedUrl({ id });
    if (r.ok) window.open(r.url, "_blank", "noopener,noreferrer");
  }

  function handleToggleKind(id: string, current: Kind) {
    startMutate(async () => {
      await setDocumentKind({ document_id: id, kind: current === "input" ? "deliverable" : "input" });
      router.refresh();
    });
  }

  const inputs = docs.filter((d) => d.kind === "input");
  const deliverables = docs.filter((d) => d.kind === "deliverable");
  const fieldCls = `w-full rounded-xl border border-rizq-gold/30 bg-white/70 px-4 py-2.5 text-sm text-rizq-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-rizq-green/40 ${font}`;

  const renderGroup = (label: string, items: Doc[]) => (
    <div>
      <p className={`text-xs font-semibold text-rizq-ink-soft/70 uppercase tracking-wide mb-2 ${font}`}>{label}</p>
      {items.length === 0 ? (
        <p className={`text-sm text-rizq-ink-soft/60 mb-3 ${font}`}>—</p>
      ) : (
        <ul className="space-y-2 mb-3">
          {items.map((d) => (
            <li
              key={d.id}
              className={`flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-white/60 px-4 py-3 ${font}`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <FileText size={15} className="text-rizq-ink-soft shrink-0" />
                <span className="min-w-0">
                  <span className={`block text-sm font-medium text-rizq-ink truncate ${font}`}>{d.title}</span>
                  <span className="block text-xs text-rizq-ink-soft/60 truncate">{d.file_name}</span>
                </span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleToggleKind(d.id, d.kind)}
                  title={d.kind === "input" ? t("markAsDeliverable") : t("markAsInput")}
                  className="inline-flex items-center gap-1 text-xs text-rizq-ink-soft hover:text-rizq-green transition-colors"
                >
                  <ArrowLeftRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleOpen(d.id)}
                  className="text-xs font-medium text-rizq-green hover:underline"
                >
                  {t("openFile")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div dir={dir} className={font}>
      {/* Upload */}
      <div className={`rounded-2xl border border-rizq-gold/20 bg-rizq-cream/60 p-5 mb-6 space-y-3 ${font}`}>
        <p className={`text-sm font-semibold text-rizq-ink ${font}`}>{t("filesUploadTitle")}</p>
        <input ref={fileRef} type="file" className={`${fieldCls} file:mr-3 file:rounded-full file:border-0 file:bg-rizq-green/10 file:px-3 file:py-1 file:text-rizq-green`} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("fileNameLabel")}
            className={fieldCls}
          />
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={fieldCls}>
            <option value="input">{t("kindInput")}</option>
            <option value="deliverable">{t("kindDeliverable")}</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading}
            className={`inline-flex items-center gap-2 rounded-full bg-rizq-green text-rizq-cream px-5 py-2.5 text-sm font-medium hover:bg-rizq-green-dark transition-colors disabled:opacity-70 ${font}`}
          >
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {isUploading ? t("uploading") : t("upload")}
          </button>
          {error && <span role="alert" className={`text-sm text-red-700 ${font}`}>{error}</span>}
        </div>
      </div>

      {/* Lists */}
      {docs.length === 0 ? (
        <p className={`text-sm text-rizq-ink-soft ${font}`}>{t("filesEmpty")}</p>
      ) : (
        <div className="space-y-4">
          {renderGroup(t("filesInputs"), inputs)}
          {renderGroup(t("filesDeliverables"), deliverables)}
        </div>
      )}
    </div>
  );
}
