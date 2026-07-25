/**
 * Bilingual labels + templated defaults for the proposal document.
 *
 * PURE module: no React, no next-intl, no server/client deps. Lives here (not in
 * ProposalArtifact.tsx) so BOTH the on-screen renderer AND the Word (.docx)
 * export builder reuse the EXACT same wording. That guarantees the handed-over
 * .docx matches the preview, especially on terms and pricing clauses, and keeps
 * the docx builder testable in isolation.
 */
/** Arabic-Indic digits — the artifact renders every other number this way. */
const arNum = (n: number): string =>
  new Intl.NumberFormat("ar-SA", { useGrouping: false }).format(n);

/**
 * Arabic counted-noun agreement: "2 مراجعات" is wrong; it is "مراجعتان". Applies
 * singular / dual / plural-of-paucity (3-10) / tamyīz (11+).
 */
function arCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${arNum(n)} ${few}`;
  return `${arNum(n)} ${many}`;
}

export const PROPOSAL_STRINGS = {
  ar: {
    sections: {
      // new document model
      cover: "عرض مشروع",
      cover_letter: "خطاب تقديمي",
      understanding: "فهم المتطلبات",
      approach: "منهجية العمل",
      scope_of_work: "نطاق العمل",
      assumptions: "الافتراضات والاستثناءات",
      timeline: "الجدول الزمني",
      pricing: "التسعير",
      milestones: "مراحل الدفع",
      about: "نبذة عن المستقل",
      terms: "الشروط والأحكام",
      next_steps: "الخطوات التالية",
      verification: "التحقق",
      // legacy
      branding: "المقدم",
      client_ref: "مُقدَّم إلى",
      ip_terms: "الملكية الفكرية",
      terms_footer: "الشروط العامة",
    },
    currency: "ريال",
    revisionsCount: (n: number) => arCount(n, "مراجعة واحدة", "مراجعتان", "مراجعات", "مراجعةً"),
    deposit: "دفعة مقدمة",
    delivery: "عند التسليم",
    startDate: "تاريخ البدء",
    deliveryDate: "تاريخ التسليم",
    validUntil: "صالح حتى",
    validityDays: (n: number) => arCount(n, "يوم واحد", "يومان", "أيام", "يومًا"),
    jurisdiction: "الاختصاص القضائي",
    ksa: "المملكة العربية السعودية",
    ipFull: "تنتقل كامل حقوق الملكية الفكرية للعميل عند اكتمال الدفع.",
    ipLicense: "يحتفظ المستقل بحقوق الملكية الفكرية ويمنح العميل ترخيصًا للاستخدام.",
    ipPerProject: "تُحدَّد حقوق الملكية الفكرية لكل مشروع وفق الاتفاق الخاص به.",
    proposalId: "رقم العرض",
    generatedBy: "صُنع عبر رِزق، نظام تشغيل المستقل السعودي",
    methodologyLink: "كيف نحسب هذا السعر؟",
    anchor: "السعر المقترح",
    priceRange: "النطاق السعري",
    min: "الأدنى",
    max: "الأعلى",
    citation: "المصدر",
    noClient: "عميل محترم",
    noDescription: "—",
    noDeliverables: "سيُحدَّد النطاق الكامل عند توقيع العقد.",
    noDates: "يُتفق عليه",
    triggerDeposit: "دفعة مقدمة عند البدء",
    triggerDelivery: "عند استلام التسليم النهائي",
    ofTotal: "من الإجمالي",
    // --- honesty badge (non-removable on AI-drafted prose) ---
    aiBadge: "صيغت بالذكاء الاصطناعي، راجِعها قبل الإرسال",
    // --- cover ---
    coverDocLabel: "عرض مشروع",
    preparedFor: "مُقدَّم إلى",
    issuedOn: "تاريخ الإصدار",
    // --- cover letter (templated default) ---
    coverLetterDefault: (client: string) =>
      `نشكر ${client} على إتاحة الفرصة لتقديم هذا العرض. يسعدنا أن نضع خبرتنا في خدمة هذا المشروع، ونقدّم فيما يلي تصوّرًا واضحًا للنطاق والجدول الزمني والاستثمار المقترح. نتطلّع إلى التعاون معكم لتحقيق النتائج المرجوّة.`,
    // --- understanding (templated default) ---
    understandingDefault:
      "يعكس النطاق التالي المتطلبات التي عبّر عنها العميل، وقد جرت صياغته بناءً على المعطيات المتاحة حتى تاريخه. نرحّب بأي توضيح إضافي لضمان توافق العرض الكامل مع التطلّعات.",
    // --- approach (templated default phases) ---
    approachDefault: [
      { title: "الاستكشاف والمواءمة", body: "مراجعة المتطلبات والاتفاق على الأهداف والمخرجات قبل البدء." },
      { title: "التنفيذ", body: "إنجاز العمل وفق النطاق المتفق عليه مع تحديثات دورية للتقدّم." },
      { title: "المراجعة والتسليم", body: "مراجعة المخرجات وإجراء التعديلات المتفق عليها ثم التسليم النهائي." },
    ] as { title: string; body: string }[],
    // --- scope ---
    scopeDeliverables: "المخرجات",
    // --- assumptions (templated defaults) ---
    assumptionsTitle: "الافتراضات",
    exclusionsTitle: "الاستثناءات",
    assumptionsDefault: [
      "تقديم العميل للملاحظات والموافقات في الوقت المناسب.",
      "الالتزام بعدد المراجعات المتفق عليه ضمن النطاق.",
      "توفير المحتوى والمواد اللازمة من جهة العميل عند الحاجة.",
    ],
    exclusionsDefault: [
      "تكاليف الأطراف الثالثة (تراخيص، خطوط، صور، استضافة).",
      "الصيانة أو الدعم المستمر بعد التسليم النهائي.",
    ],
    // --- pricing ---
    included: "يشمل السعر",
    depositLabel: (pct: number) => `دفعة مقدمة ${pct}%`,
    // --- about ---
    yearsExp: "سنوات الخبرة",
    projectsDone: "مشروع منجز",
    notableClientsLabel: "عملاء سابقون",
    portfolioLabel: "أعمال مختارة",
    testimonialsLabel: "آراء العملاء",
    // --- terms ---
    termsPayment: "الدفع",
    termsPaymentClause: (deposit: number, remainder: number) =>
      `يُستحق ${deposit}% كدفعة مقدمة عند بدء العمل، و${remainder}% المتبقية عند التسليم النهائي.`,
    termsRevisions: "المراجعات",
    termsRevisionsClause: (n: number) =>
      `يشمل العرض ${arCount(n, "مراجعة واحدة", "مراجعتين", "مراجعات", "مراجعةً")} ضمن النطاق المتفق عليه؛ تُحتسب المراجعات الإضافية بشكل منفصل.`,
    termsRevisionsClauseNone:
      "يُتفق على عدد المراجعات المشمولة قبل بدء العمل؛ تُحتسب المراجعات الإضافية بشكل منفصل.",
    termsIp: "الملكية الفكرية",
    termsConfidentiality: "السرّية",
    termsConfidentialityClause:
      "يلتزم الطرفان بالحفاظ على سرّية المعلومات المتبادلة وعدم إفشائها لأي طرف ثالث دون إذن خطّي.",
    termsValidity: "صلاحية العرض",
    termsValidityClause: (n: number) =>
      `هذا العرض صالح لمدة ${n} يومًا من تاريخ إصداره.`,
    termsCancellation: "الإلغاء",
    termsCancellationClause:
      "في حال إلغاء المشروع بعد البدء، تُستحق قيمة العمل المنجز حتى تاريخ الإلغاء وتُعدّ الدفعة المقدمة غير قابلة للاسترداد.",
    // --- next steps ---
    nextStepsCta:
      "للمضيّ قُدُمًا، يرجى تأكيد الموافقة على هذا العرض وسنبدأ فورًا بترتيب الخطوات الأولى.",
    acceptanceBlock: "إقرار القبول",
    clientName: "اسم العميل",
    signature: "التوقيع",
    date: "التاريخ",
    contactLabel: "للتواصل",
  },
  en: {
    sections: {
      // new document model
      cover: "Project Proposal",
      cover_letter: "Cover Letter",
      understanding: "Understanding of Requirements",
      approach: "Our Approach",
      scope_of_work: "Scope of Work",
      assumptions: "Assumptions & Exclusions",
      timeline: "Timeline",
      pricing: "Pricing",
      milestones: "Payment Milestones",
      about: "About the Freelancer",
      terms: "Terms & Conditions",
      next_steps: "Next Steps",
      verification: "Verification",
      // legacy
      branding: "Submitted by",
      client_ref: "Prepared for",
      ip_terms: "Intellectual Property",
      terms_footer: "Terms",
    },
    currency: "SAR",
    revisionsCount: (n: number) => `${n} ${n === 1 ? "revision" : "revisions"}`,
    deposit: "Deposit",
    delivery: "On delivery",
    startDate: "Start date",
    deliveryDate: "Delivery date",
    validUntil: "Valid until",
    validityDays: (n: number) => `${n} ${n === 1 ? "day" : "days"}`,
    jurisdiction: "Jurisdiction",
    ksa: "Kingdom of Saudi Arabia",
    ipFull: "All intellectual property rights transfer to the client upon full payment.",
    ipLicense: "The freelancer retains IP rights and grants the client a usage licence.",
    ipPerProject: "IP rights are defined per-project in a separate agreement.",
    proposalId: "Proposal ID",
    generatedBy: "Generated by Rizq, the Saudi Freelancer OS",
    methodologyLink: "How is this price calculated?",
    anchor: "Proposed price",
    priceRange: "Price range",
    min: "Low",
    max: "High",
    citation: "Source",
    noClient: "Valued client",
    noDescription: "—",
    noDeliverables: "Full scope to be defined upon contract signing.",
    noDates: "To be agreed",
    triggerDeposit: "Deposit upon project start",
    triggerDelivery: "Upon receipt of final delivery",
    ofTotal: "of total",
    // --- honesty badge ---
    aiBadge: "AI-drafted, review before sending",
    // --- cover ---
    coverDocLabel: "Project Proposal",
    preparedFor: "Prepared for",
    issuedOn: "Issued on",
    // --- cover letter (templated default) ---
    coverLetterDefault: (client: string) =>
      `Thank you, ${client}, for the opportunity to submit this proposal. We are glad to bring our expertise to this project and outline below a clear view of the scope, timeline, and proposed investment. We look forward to collaborating with you to achieve the results you are aiming for.`,
    // --- understanding (templated default) ---
    understandingDefault:
      "The scope set out below reflects the requirements as stated by the client and has been prepared from the information available to date. We welcome any further clarification to ensure the full proposal aligns with your expectations.",
    // --- approach (templated default phases) ---
    approachDefault: [
      { title: "Discovery & alignment", body: "Review requirements and agree on goals and deliverables before starting." },
      { title: "Execution", body: "Deliver the work per the agreed scope with regular progress updates." },
      { title: "Review & handover", body: "Review the deliverables, apply agreed revisions, then hand over the final work." },
    ] as { title: string; body: string }[],
    // --- scope ---
    scopeDeliverables: "Deliverables",
    // --- assumptions (templated defaults) ---
    assumptionsTitle: "Assumptions",
    exclusionsTitle: "Exclusions",
    assumptionsDefault: [
      "The client provides feedback and approvals in a timely manner.",
      "Work stays within the agreed number of revisions.",
      "Required content and materials are supplied by the client when needed.",
    ],
    exclusionsDefault: [
      "Third-party costs (licences, fonts, imagery, hosting).",
      "Ongoing maintenance or support after final delivery.",
    ],
    // --- pricing ---
    included: "Price includes",
    depositLabel: (pct: number) => `${pct}% deposit`,
    // --- about ---
    yearsExp: "Years of experience",
    projectsDone: "Projects completed",
    notableClientsLabel: "Past clients",
    portfolioLabel: "Selected work",
    testimonialsLabel: "What clients say",
    // --- terms ---
    termsPayment: "Payment",
    termsPaymentClause: (deposit: number, remainder: number) =>
      `${deposit}% is due as a deposit upon project start, with the remaining ${remainder}% due on final delivery.`,
    termsRevisions: "Revisions",
    termsRevisionsClause: (n: number) =>
      `This proposal includes ${n} revisions within the agreed scope; additional revisions are billed separately.`,
    termsRevisionsClauseNone:
      "The number of included revisions is agreed before work begins; additional revisions are billed separately.",
    termsIp: "Intellectual Property",
    termsConfidentiality: "Confidentiality",
    termsConfidentialityClause:
      "Both parties agree to keep shared information confidential and not to disclose it to any third party without written consent.",
    termsValidity: "Validity",
    termsValidityClause: (n: number) =>
      `This proposal is valid for ${n} days from its issue date.`,
    termsCancellation: "Cancellation",
    termsCancellationClause:
      "If the project is cancelled after it begins, work completed up to the cancellation date is payable and the deposit is non-refundable.",
    // --- next steps ---
    nextStepsCta:
      "To proceed, please confirm your acceptance of this proposal and we will begin arranging the first steps right away.",
    acceptanceBlock: "Acceptance",
    clientName: "Client name",
    signature: "Signature",
    date: "Date",
    contactLabel: "Contact",
  },
} as const;

export type ProposalStrings = typeof PROPOSAL_STRINGS;
