/**
 * /[locale]/clients/[id] — Client detail page. Phase-3 task 3.2.
 */
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getPathname, Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/shell/AppShell";
import { ClientDetailActions } from "@/components/clients/ClientDetailActions";
import { ClientContactLinks } from "@/components/clients/ClientContactLinks";
import { ClientGigHistory } from "@/components/clients/ClientGigHistory";
import { ClientInvoiceHistory } from "@/components/clients/ClientInvoiceHistory";
import { ClientTimeline } from "@/components/clients/ClientTimeline";

type Params = { locale: string; id: string };

function fmtPrice(n: number | null, locale: "ar" | "en"): string {
  if (n == null || !isFinite(n)) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", { maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string | null | undefined, locale: "ar" | "en"): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
      year: "numeric", month: "short", day: "numeric",
    }).format(new Date(iso));
  } catch { return iso; }
}

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? "text-rizq-gold" : "text-rizq-gold/25"}>★</span>
      ))}
    </span>
  );
}

const CLIENT_TYPE_LABELS = {
  ar: { individual: "فرد", smb: "شركة ص/م", corporate: "شركة كبرى", government: "جهة حكومية", agency: "وكالة" },
  en: { individual: "Individual", smb: "SMB", corporate: "Corporate", government: "Government", agency: "Agency" },
};

const PROPOSAL_STATUS_STYLES: Record<string, string> = {
  draft: "bg-rizq-ink/8 text-rizq-ink-soft",
  final: "bg-rizq-green/12 text-rizq-green",
  sent: "bg-blue-50 text-blue-700",
  viewed: "bg-purple-50 text-purple-700",
  accepted: "bg-emerald-50 text-emerald-700",
  declined: "bg-red-50 text-red-600",
  expired: "bg-amber-50 text-amber-700",
};

const PROPOSAL_STATUS_AR: Record<string, string> = {
  draft: "مسودة", final: "معتمد", sent: "مُرسَل", viewed: "تمت المشاهدة",
  accepted: "مقبول", declined: "مرفوض", expired: "منتهي الصلاحية",
};

const PROPOSAL_STATUS_EN: Record<string, string> = {
  draft: "Draft", final: "Finalized", sent: "Sent", viewed: "Viewed",
  accepted: "Accepted", declined: "Declined", expired: "Expired",
};

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  return { title: "عميل — رِزق" };
}

export default async function ClientDetailPage({ params }: { params: Promise<Params> }) {
  const { locale, id } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const loginPath = getPathname({ href: "/login", locale: locale as "ar" | "en" });
    redirect(loginPath);
  }

  const t = await getTranslations({ locale, namespace: "Clients.detail" });
  const font = locale === "ar" ? "font-arabic" : "font-sans";
  const isAr = locale === "ar";
  const dir = isAr ? "rtl" : "ltr";

  // Fetch client (RLS owner-only)
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (clientErr || !client) notFound();

  // Fetch gigs
  const { data: gigs } = await supabase
    .from("gigs")
    .select("id, title, amount_sar, status, delivery_date, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  // Fetch proposals linked to this client
  const { data: proposals } = await supabase
    .from("proposals")
    .select("id, status, price_anchor, created_at, client_name")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  // Fetch invoices for this client (owner-scoped via RLS + explicit user_id)
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_sar, status, due_date, created_at")
    .eq("client_id", id)
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  // Fetch timeline
  const { data: timeline } = await supabase
    .from("client_timeline")
    .select("id, event_type, event_data, ai_summary, created_at")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  const clientTypeLabel = CLIENT_TYPE_LABELS[isAr ? "ar" : "en"][client.client_type as keyof typeof CLIENT_TYPE_LABELS.ar] ?? client.client_type;

  return (
    <AppShell locale={locale as "ar" | "en"} title={client.name as string} maxWidth="reading">
      <div dir={dir}>
        {/* Back */}
        <Link
          href="/clients"
          className={`inline-flex items-center gap-1.5 text-sm text-rizq-ink-soft hover:text-rizq-ink transition-colors mb-8 ${font}`}
        >
          <span className="inline-block ltr:rotate-180">→</span>
          {isAr ? "دفتر العملاء" : "Client Book"}
        </Link>

        {/* Header */}
        <div className={`rounded-3xl border border-rizq-gold/25 bg-rizq-cream/85 p-7 sm:p-10 mb-6 ${font}`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className={`text-2xl font-bold text-rizq-ink leading-snug ${font}`}>
                {client.name}
              </h1>
              {client.name_en && isAr && (
                <p className="text-sm text-rizq-ink-soft font-sans mt-0.5">{client.name_en}</p>
              )}
              {client.company && (
                <p className={`text-base text-rizq-ink-soft mt-1 ${font}`}>{client.company}</p>
              )}
              {client.title && (
                <p className={`text-sm text-rizq-ink-soft/70 ${font}`}>{client.title}</p>
              )}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-2">
              <span className={`inline-flex items-center rounded-full bg-rizq-green/10 text-rizq-green px-3 py-1 text-xs font-medium ${font}`}>
                {clientTypeLabel}
              </span>
              <StarRating rating={client.rating} />
            </div>
          </div>

          {/* Tags */}
          {client.tags && client.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(client.tags as string[]).map((tag: string) => (
                <span key={tag} className={`inline-flex items-center rounded-full bg-rizq-gold/15 text-rizq-ink px-2.5 py-0.5 text-xs ${font}`}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className={`mt-5 flex flex-wrap gap-4 pt-4 border-t border-rizq-gold/20 ${font}`}>
            <div>
              <p className="text-xs text-rizq-ink-soft/60 mb-0.5">{t("totalGigs")}</p>
              <p className="tabular text-lg font-semibold text-rizq-ink">{client.total_gigs ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-rizq-ink-soft/60 mb-0.5">{t("totalValue")}</p>
              <p className="tabular text-lg font-semibold text-rizq-green">{fmtPrice(client.total_value_sar, locale as "ar" | "en")}</p>
            </div>
            {client.last_contacted_at && (
              <div>
                <p className="text-xs text-rizq-ink-soft/60 mb-0.5">{t("lastContact")}</p>
                <p className={`text-sm font-medium text-rizq-ink ${font}`}>{fmtDate(client.last_contacted_at, locale as "ar" | "en")}</p>
              </div>
            )}
            {client.avg_payment_days != null && (
              <div>
                <p className="text-xs text-rizq-ink-soft/60 mb-0.5">{t("avgPaymentDays")}</p>
                <p className={`text-sm font-medium text-rizq-ink ${font}`}>{Math.round(client.avg_payment_days)} {isAr ? "يوم" : "days"}</p>
              </div>
            )}
          </div>
        </div>

        {/* AI Insight card — only when present */}
        {(client.client_persona || client.ai_notes || client.next_action_suggestion) && (
          <div className={`rounded-2xl border border-rizq-gold/30 bg-rizq-gold/5 p-5 mb-6 space-y-2 ${font}`}>
            <p className="text-xs font-semibold text-rizq-gold-dark tracking-wide uppercase">{t("aiInsightLabel")}</p>
            {client.client_persona && (
              <p className={`text-sm text-rizq-ink ${font}`}>{client.client_persona}</p>
            )}
            {client.ai_notes && (
              <p className={`text-sm text-rizq-ink-soft ${font}`}>{client.ai_notes}</p>
            )}
            {client.next_action_suggestion && (
              <p className={`text-sm font-medium text-rizq-green ${font}`}>↗ {client.next_action_suggestion}</p>
            )}
          </div>
        )}

        {/* Contact */}
        <ClientContactLinks
          locale={locale as "ar" | "en"}
          phone={client.phone}
          email={client.email}
          phoneWhatsapp={client.phone_whatsapp}
          linkedinUrl={client.linkedin_url}
          city={client.city}
        />

        {/* Gig history */}
        <ClientGigHistory
          locale={locale as "ar" | "en"}
          gigs={(gigs ?? []) as Array<{ id: string; title: string; amount_sar: number; status: string; delivery_date: string | null; created_at: string }>}
        />

        {/* Invoice history */}
        <ClientInvoiceHistory
          locale={locale as "ar" | "en"}
          invoices={(invoices ?? []) as Array<{ id: string; invoice_number: string; total_sar: number; status: string; due_date: string | null; created_at: string }>}
        />

        {/* Proposals sent */}
        {proposals && proposals.length > 0 && (
          <section className="mt-6">
            <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{t("proposals")}</h2>
            <div className="space-y-2">
              {proposals.map((p) => (
                <Link
                  key={p.id}
                  href={`/proposals/${p.id}` as `/proposals/${string}`}
                  className={`flex items-center justify-between gap-3 rounded-xl border border-rizq-gold/15 bg-white/60 px-4 py-3 hover:border-rizq-green/30 hover:bg-rizq-cream/80 transition-all ${font}`}
                >
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PROPOSAL_STATUS_STYLES[p.status ?? "draft"] ?? PROPOSAL_STATUS_STYLES.draft}`}>
                    {isAr ? PROPOSAL_STATUS_AR[p.status ?? "draft"] : PROPOSAL_STATUS_EN[p.status ?? "draft"]}
                  </span>
                  <span className="tabular font-sans text-sm font-semibold text-rizq-ink">
                    {p.price_anchor ? fmtPrice(p.price_anchor, locale as "ar" | "en") : "—"}
                    {p.price_anchor ? <span className={`ms-1 text-xs text-rizq-ink-soft/60 ${font}`}>{isAr ? "ريال" : "SAR"}</span> : null}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Notes */}
        {client.notes && (
          <section className="mt-6">
            <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{t("notes")}</h2>
            <div className={`rounded-2xl border border-rizq-gold/20 bg-white/60 px-5 py-4 text-sm text-rizq-ink whitespace-pre-wrap ${font}`}>
              {client.notes}
            </div>
          </section>
        )}

        {/* Timeline */}
        <ClientTimeline
          locale={locale as "ar" | "en"}
          events={(timeline ?? []) as Array<{ id: string; event_type: string; event_data: Record<string, unknown> | null; ai_summary: string | null; created_at: string }>}
        />

        {/* Actions island */}
        <div className="mt-8">
          <ClientDetailActions
            locale={locale as "ar" | "en"}
            clientId={id}
            clientName={client.name}
            initialNotes={client.notes ?? ""}
            totalGigs={client.total_gigs ?? 0}
          />
        </div>
      </div>
    </AppShell>
  );
}
