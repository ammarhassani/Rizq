/**
 * ClientContactLinks — tap-to-contact links. Phase-3 task 3.2.
 */
import { Phone, Mail, MapPin } from "lucide-react";
import { waLink } from "@/lib/contact/whatsapp";

type Props = {
  locale: "ar" | "en";
  phone: string | null;
  email: string | null;
  phoneWhatsapp: string | null;
  linkedinUrl: string | null;
  city: string | null;
};

export function ClientContactLinks({ locale, phone, email, phoneWhatsapp, linkedinUrl, city }: Props) {
  const isAr = locale === "ar";
  const font = isAr ? "font-arabic" : "font-sans";
  const dir = isAr ? "rtl" : "ltr";

  if (!phone && !email && !phoneWhatsapp && !linkedinUrl && !city) return null;

  const label = isAr ? "التواصل" : "Contact";
  // Normalize to international form so local (05XX) numbers produce a valid wa.me link.
  const waUrl = waLink(phoneWhatsapp) ?? waLink(phone);

  return (
    <section className="mt-0 mb-6">
      <h2 className={`eyebrow mb-4 text-rizq-green ${font}`}>{label}</h2>
      <div dir={dir} className="flex flex-wrap gap-3">
        {phone && (
          <a
            href={`tel:${phone}`}
            className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-2.5 text-sm text-rizq-ink hover:border-rizq-green/50 hover:bg-rizq-cream transition-all ${font}`}
          >
            <Phone size={14} className="text-rizq-green" />
            <span className="font-sans" dir="ltr">{phone}</span>
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/30 bg-rizq-cream/60 px-4 py-2.5 text-sm text-rizq-ink hover:border-rizq-green/50 hover:bg-rizq-cream transition-all ${font}`}
          >
            <Mail size={14} className="text-rizq-green" />
            <span className="font-sans" dir="ltr">{email}</span>
          </a>
        )}
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-full bg-[#25D366] text-white px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity ${font}`}
          >
            <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M7.5.5A7 7 0 0 0 1.27 10.9L.5 14.5l3.7-.75A7 7 0 1 0 7.5.5zm0 12.73a5.73 5.73 0 0 1-3-.84l-.22-.13-2.2.45.47-2.14-.14-.23A5.75 5.75 0 1 1 7.5 13.23zm3.15-4.3c-.17-.09-1-.5-1.17-.55-.16-.06-.28-.09-.4.09-.12.17-.47.55-.57.66-.1.12-.21.13-.38.05-.17-.09-.73-.27-1.4-.86a5.23 5.23 0 0 1-.97-1.2c-.1-.17-.01-.27.08-.36.08-.08.17-.21.26-.32.09-.1.12-.18.18-.3.06-.12.03-.22-.02-.31-.05-.09-.4-1-.55-1.37-.14-.36-.29-.31-.4-.32H5.38c-.12 0-.3.04-.46.21C4.76 5.07 4.3 5.5 4.3 6.4s.63 1.77.72 1.9c.08.12 1.24 1.88 3 2.64.42.18.75.29 1 .37.42.13.8.11 1.1.07.34-.05 1.04-.42 1.18-.83.15-.41.15-.76.1-.83-.04-.08-.16-.12-.34-.21z" fill="currentColor"/>
            </svg>
            {isAr ? "واتساب" : "WhatsApp"}
          </a>
        )}
        {linkedinUrl && (
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-full border border-[#0A66C2]/30 text-[#0A66C2] px-4 py-2.5 text-sm font-medium hover:bg-[#0A66C2]/8 transition-all ${font}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </a>
        )}
        {city && (
          <span className={`inline-flex items-center gap-2 rounded-full border border-rizq-gold/20 bg-rizq-cream/40 px-4 py-2.5 text-sm text-rizq-ink-soft ${font}`}>
            <MapPin size={14} className="text-rizq-gold" />
            {city}
          </span>
        )}
      </div>
    </section>
  );
}
