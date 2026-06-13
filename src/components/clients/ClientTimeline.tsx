/**
 * ClientTimeline — activity timeline. Phase-3 task 3.2.
 */

type TimelineEvent = {
  id: string;
  event_type: string;
  event_data: Record<string, unknown> | null;
  ai_summary: string | null;
  created_at: string;
};

type Props = {
  locale: "ar" | "en";
  events: TimelineEvent[];
};

const EVENT_LABELS_AR: Record<string, string> = {
  proposal_sent: "تم إرسال عرض",
  proposal_viewed: "شاهد العميل العرض",
  proposal_accepted: "قبِل العميل العرض",
  proposal_declined: "رفض العميل العرض",
  gig_created: "تم إنشاء مشروع",
  gig_completed: "اكتمل المشروع",
  invoice_sent: "تم إرسال الفاتورة",
  invoice_paid: "تم استلام الدفعة",
  note_added: "تم إضافة ملاحظة",
  contacted: "تم التواصل",
  rating_changed: "تم تحديث التقييم",
  tag_added: "تمت إضافة تصنيف",
  tag_removed: "تمت إزالة تصنيف",
};

const EVENT_LABELS_EN: Record<string, string> = {
  proposal_sent: "Proposal sent",
  proposal_viewed: "Client viewed proposal",
  proposal_accepted: "Client accepted proposal",
  proposal_declined: "Client declined proposal",
  gig_created: "Project created",
  gig_completed: "Project completed",
  invoice_sent: "Invoice sent",
  invoice_paid: "Payment received",
  note_added: "Note added",
  contacted: "Contacted",
  rating_changed: "Rating updated",
  tag_added: "Tag added",
  tag_removed: "Tag removed",
};

function fmtDate(iso: string, locale: "ar" | "en"): string {
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    }).format(new Date(iso));
  } catch { return iso; }
}

export function ClientTimeline({ locale, events }: Props) {
  if (events.length === 0) return null;
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";
  const heading = isAr ? "سجل النشاط" : "Activity";
  const labels = isAr ? EVENT_LABELS_AR : EVENT_LABELS_EN;

  return (
    <section className="mt-6">
      <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{heading}</h2>
      <div className="relative">
        {/* Vertical line */}
        <div className={`absolute top-0 bottom-0 ${isAr ? "end-3" : "start-3"} w-px bg-rizq-gold/20`} aria-hidden />
        <div className="space-y-3">
          {events.map((ev) => (
            <div key={ev.id} dir={dir} className={`flex gap-4 ${font}`}>
              {/* Dot */}
              <div className="relative flex-shrink-0 mt-1.5">
                <span className="block h-3 w-3 rounded-full border-2 border-rizq-gold/40 bg-rizq-cream" />
              </div>
              <div className="min-w-0 pb-3">
                <p className="text-sm font-medium text-rizq-ink">
                  {ev.ai_summary ?? labels[ev.event_type] ?? ev.event_type}
                </p>
                {ev.event_type === "note_added" && ev.event_data?.note != null && (
                  <p className={`text-sm text-rizq-ink-soft mt-0.5 whitespace-pre-wrap ${font}`}>
                    {String(ev.event_data.note)}
                  </p>
                )}
                <p className="text-xs text-rizq-ink-soft/50 mt-0.5">{fmtDate(ev.created_at, locale)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
