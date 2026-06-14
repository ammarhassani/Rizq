-- ─────────────────────────────────────────────────────────────────────────
-- Phase 6.1 — Methodology & Trust Hub (M7): config-driven content sections.
-- Public-read. Content describes the REAL pricing pipeline (3 collectors,
-- weighted percentile, freshness decay, provenance+confidence, personal-history
-- weighting, and what Rizq deliberately does NOT do). Adding a section = INSERT.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.methodology_sections (
  id            text primary key,
  parent_id     text references public.methodology_sections(id),
  sort_order    int not null,
  title_ar      text not null,
  title_en      text not null,
  content_ar    text not null,
  content_en    text not null,
  icon          text,
  deep_link     text,
  last_updated  date,
  enabled       boolean not null default true
);
alter table public.methodology_sections enable row level security;
revoke all on public.methodology_sections from anon, authenticated;
grant select on public.methodology_sections to anon, authenticated;
drop policy if exists methodology_sections_read on public.methodology_sections;
create policy methodology_sections_read on public.methodology_sections for select to anon, authenticated using (enabled = true);

insert into public.methodology_sections (id, sort_order, title_ar, title_en, content_ar, content_en, icon, deep_link, last_updated) values
('how-we-collect', 1,
 'كيف نجمع البيانات',
 'How we collect data',
 'تعتمد أسعار رِزق على ثلاثة مصادر مستقلة: تقديرات منطقية مبنية على الذكاء الاصطناعي، ومراجع منشورة علنًا، وبيانات حكومية مفتوحة. لا نعتمد أبدًا على كشط (scraping) منصات العمل الحر. كل رقم يحمل مصدره ودرجة الثقة فيه.',
 'Rizq''s rates draw on three independent sources: AI reasoned estimates, publicly published references, and Saudi open data. We never scrape freelance marketplaces. Every number carries its source and a confidence score.',
 'layers', '#how-we-collect', '2026-06-14'),

('reasoned-priors', 2,
 'التقديرات المنطقية (تحليل رِزق)',
 'Reasoned priors (Rizq analysis)',
 'في غياب بيانات كافية لتخصص أو مدينة معيّنة، يولّد رِزق تقديرًا أوّليًا منطقيًا باستخدام نموذج ذكاء اصطناعي. هذه الأرقام تُوسم دائمًا بوضوح بعبارة «تحليل رِزق —» وتُعامل كأقل المصادر ثقةً. ليست بيانات سوق حقيقية، بل نقطة انطلاق تُصحَّح تلقائيًا كلما توفّرت مراجع أو مساهمات فعلية.',
 'When there isn''t enough data for a specialty or city, Rizq generates a reasoned starting estimate using an AI model. These numbers are always labeled "تحليل رِزق —" (Rizq analysis) and treated as the lowest-confidence source. They are not real market data — they are a starting point that is automatically corrected as published references or real submissions arrive.',
 'sparkles', '#reasoned-priors', '2026-06-14'),

('published-references', 3,
 'المراجع المنشورة',
 'Published references',
 'نُدرج أسعارًا من بطاقات أسعار وتقارير منشورة علنًا من جهات ووكالات سعودية. كل مرجع يُسجَّل مع رابط مصدره وتاريخ نشره، ويُمنح ثقة أعلى من التقديرات المنطقية.',
 'We incorporate rates from publicly published rate cards and reports from Saudi entities and agencies. Each reference is recorded with its source link and publication date, and is weighted higher than reasoned estimates.',
 'file-text', '#published-references', '2026-06-14'),

('open-data', 4,
 'البيانات الحكومية المفتوحة',
 'Saudi open data',
 'نستفيد من مجموعات البيانات الحكومية السعودية المفتوحة حيثما توفّرت ذات صلة بأسعار الخدمات. تُعدّ من أعلى المصادر ثقةً لأنها رسمية وقابلة للتحقق.',
 'We use Saudi government open datasets where they are available and relevant to service pricing. These are among our highest-confidence sources because they are official and verifiable.',
 'landmark', '#open-data', '2026-06-14'),

('weighted-percentile', 5,
 'كيف نحسب النطاق',
 'How we compute the range',
 'لكل استعلام نعرض حدًّا أدنى ووسيطًا وحدًّا أعلى. تُحسب هذه القيم كنِسب مئوية مرجّحة: كل نقطة بيانات يزيد وزنها بحسب درجة ثقتها وحداثتها. المصادر الرسمية والحديثة تؤثّر أكثر من التقديرات القديمة أو الأقل ثقة.',
 'For every query we show a minimum, median, and maximum. These are computed as weighted percentiles: each data point is weighted by its confidence and freshness. Official, recent sources influence the result more than older or lower-confidence estimates.',
 'bar-chart-3', '#weighted-percentile', '2026-06-14'),

('freshness-decay', 6,
 'تقادم البيانات',
 'Data freshness',
 'الأسعار تتغيّر مع الزمن. كلما قَدُمت نقطة البيانات، قلّ وزنها في الحساب. نعرض دائمًا حجم العيّنة ومدى حداثتها حتى تعرف مدى قوة الرقم.',
 'Prices change over time. The older a data point, the less weight it carries in the calculation. We always show the sample size and how recent the data is, so you know how strong the number is.',
 'clock', '#freshness-decay', '2026-06-14'),

('provenance-confidence', 7,
 'المصدر ودرجة الثقة',
 'Provenance and confidence',
 'كل رقم في رِزق مصحوب باستشهاد يوضّح مصدره السائد وحجم العيّنة. لا نعرض رقمًا أبدًا دون أن نُخبرك من أين أتى ومدى ثقتنا فيه. هذا هو جوهر «معمارية الصدق» في رِزق.',
 'Every number in Rizq comes with a citation stating its dominant source and sample size. We never show a number without telling you where it came from and how confident we are. This is the core of Rizq''s "honesty architecture".',
 'shield-check', '#provenance-confidence', '2026-06-14'),

('personal-history-weighting', 8,
 'وزن سجلّك الشخصي',
 'Your personal history',
 'عند توليد عرض سعر، يأخذ رِزق في الاعتبار أسعارك السابقة المسجّلة لديك إلى جانب بيانات السوق، ليقترب الرقم من واقعك. سجلّك يبقى خاصًّا بك ولا يُستخدم لغيرك.',
 'When generating a proposal, Rizq factors in your own recorded past prices alongside market data so the number reflects your reality. Your history stays private to you and is never used for anyone else.',
 'user', '#personal-history-weighting', '2026-06-14'),

('what-we-dont-do', 9,
 'ما لا نفعله',
 'What we don''t do',
 'لا نكشط بيانات من منصّات العمل الحر (احترامًا لنظام مكافحة الجرائم المعلوماتية ونظام حماية البيانات الشخصية PDPL). لا نختلق أرقامًا ونقدّمها كحقائق. لا نبيع بياناتك. رِزق ليست جهة حكومية ولا تقدّم استشارات مالية أو قانونية.',
 'We do not scrape data from freelance marketplaces (out of respect for the Anti-Cyber Crime Law and the Personal Data Protection Law / PDPL). We do not fabricate numbers and present them as facts. We do not sell your data. Rizq is not a government entity and does not provide financial or legal advice.',
 'ban', '#what-we-dont-do', '2026-06-14')
on conflict (id) do nothing;
