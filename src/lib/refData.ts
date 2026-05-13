// Reference data for onboarding & forms. When the cities/specialties tables
// land in Sprint 3, swap these constants for DB-backed queries.

export const CITIES = [
  { slug: "riyadh", ar: "الرياض", en: "Riyadh" },
  { slug: "jeddah", ar: "جدة", en: "Jeddah" },
  { slug: "dammam", ar: "الدمام", en: "Dammam" },
  { slug: "khobar", ar: "الخبر", en: "Khobar" },
  { slug: "makkah", ar: "مكة", en: "Makkah" },
  { slug: "medina", ar: "المدينة المنورة", en: "Medina" },
  { slug: "other", ar: "مدن سعودية أخرى", en: "Other Saudi cities" },
] as const;

export const SPECIALTIES = [
  { slug: "graphic-design", ar: "تصميم جرافيك", en: "Graphic Design" },
  { slug: "logo-design", ar: "تصميم شعار", en: "Logo Design" },
  { slug: "ui-ux-design", ar: "تصميم واجهات", en: "UI/UX Design" },
  { slug: "web-dev", ar: "برمجة مواقع", en: "Web Development" },
  { slug: "mobile-dev", ar: "برمجة تطبيقات", en: "Mobile App Development" },
  { slug: "content-writing", ar: "كتابة محتوى عربي", en: "Content Writing (Arabic)" },
  { slug: "translation", ar: "ترجمة إنجليزي عربي", en: "Translation EN↔AR" },
  { slug: "digital-marketing", ar: "تسويق رقمي", en: "Digital Marketing" },
  { slug: "video-editing", ar: "مونتاج فيديو", en: "Video Editing" },
  { slug: "photography", ar: "تصوير فوتوغرافي", en: "Photography" },
  { slug: "voice-over", ar: "تعليق صوتي", en: "Voice Over" },
  { slug: "data-entry", ar: "إدخال بيانات", en: "Data Entry" },
] as const;

export type CitySlug = (typeof CITIES)[number]["slug"];
export type SpecialtySlug = (typeof SPECIALTIES)[number]["slug"];
