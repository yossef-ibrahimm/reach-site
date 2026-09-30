/**
 * Single source of truth for company/contact details.
 *
 * The repo ships with EMPTY contact fields on purpose: we never invent a phone
 * number, WhatsApp handle or address. The UI renders the placeholder copy until
 * the owner fills these in (see README → "Add your real contact details").
 *
 * Only `href`/`display` are rendered — nothing here is ever passed to
 * `dangerouslySetInnerHTML`.
 */
export type ContactLink = {
  /** Pre-formatted value shown to the visitor, e.g. "+20 100 000 0000". */
  readonly display: string;
  /** Fully-formed URL. Must be http(s), tel: or wa.me — validated below. */
  readonly href: string;
};

export type SiteConfig = {
  readonly nameAr: string;
  readonly nameEn: string;
  /** Single character shown inside the logo tile. */
  readonly mark: string;
  /** Shown in the footer / contact card when it has a value. */
  readonly phone: ContactLink | null;
  readonly whatsapp: ContactLink | null;
  /** Free-text address line, shown as-is. */
  readonly address: string;
  /** Business e-mail shown on the contact block. */
  readonly email: string;
};

const SAFE_HREF = /^(https?:\/\/|tel:)[^\s]+$/i;

function contact(display: string, href: string): ContactLink | null {
  const trimmedDisplay = display.trim();
  const trimmedHref = href.trim();
  if (!trimmedDisplay || !trimmedHref) return null;
  if (!SAFE_HREF.test(trimmedHref)) return null;
  return { display: trimmedDisplay, href: trimmedHref };
}

const config: SiteConfig = {
  nameAr: "شركة التوكل",
  nameEn: "Eltawkol Fire",
  mark: "ت",
  phone: contact("", ""),
  whatsapp: contact("", ""),
  address: "",
  email: "",
};

/** `true` when the owner has filled in at least one contact channel. */
export function hasContactDetails(cfg: SiteConfig = config): boolean {
  return Boolean(cfg.phone || cfg.whatsapp || cfg.address.trim() || cfg.email.trim());
}

/** Short line for the top strip: phone if present, otherwise e-mail/address. */
export function contactSummary(cfg: SiteConfig = config): string | null {
  if (cfg.phone) return cfg.phone.display;
  if (cfg.whatsapp) return cfg.whatsapp.display;
  if (cfg.email.trim()) return cfg.email.trim();
  if (cfg.address.trim()) return cfg.address.trim();
  return null;
}

export const siteConfig = config;
