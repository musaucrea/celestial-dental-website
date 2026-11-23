/**
 * Campaign attribution — remembers which link brought a visitor here so a
 * booking made days later can still be credited to it.
 *
 * Braces are a weeks-long decision: someone sees an influencer's video on
 * Monday, reads /braces, and books the following weekend. Attribution that
 * only lives in the URL of the current page loses every one of those, so the
 * campaign parameters are stored on first arrival and read back at booking
 * time.
 *
 * First touch wins. The creator who introduced the patient keeps the credit
 * even if the patient later arrives through a different link, which is how
 * the clinic pays out on the campaign. The "which influencer?" field on the
 * booking form is the human cross-check for the cases this gets wrong.
 */

const STORAGE_KEY = 'cd_attribution';
// Long enough to cover a braces decision cycle without crediting a creator
// for a patient who first showed up half a year ago.
const TTL_DAYS = 90;

export type Attribution = {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  landedAt: string;
};

function read(): Attribution | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Attribution>;
    if (!parsed?.landedAt) return null;
    const age = Date.now() - Date.parse(parsed.landedAt);
    if (!Number.isFinite(age) || age > TTL_DAYS * 86400000) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return {
      source: parsed.source || '',
      medium: parsed.medium || '',
      campaign: parsed.campaign || '',
      content: parsed.content || '',
      landedAt: parsed.landedAt,
    };
  } catch {
    return null; // private mode / storage disabled
  }
}

/** Lowercase, strip @ and anything that isn't url-safe, so `@Nasra` and
 *  `nasra` are one creator rather than two rows in the report. */
function normalize(value: string | null): string {
  return String(value || '').trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9._-]/g, '').slice(0, 60);
}

/**
 * Call once on page load. Stores campaign parameters from the landing URL if
 * this is the first campaign touch we've seen.
 */
export function captureAttribution(): Attribution | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(window.location.search);
  } catch {
    return read();
  }

  const source = normalize(params.get('utm_source'));
  const medium = normalize(params.get('utm_medium'));
  const campaign = normalize(params.get('utm_campaign'));
  // `via` is the short hand-typed form for print, chair-side cards and any
  // place a full UTM string would be absurd: celestialdental.org/braces?via=nasra
  const content = normalize(params.get('utm_content') || params.get('via'));

  const existing = read();
  // Nothing campaign-ish in this URL — keep whatever we already had.
  if (!source && !campaign && !content) return existing;
  // First touch wins.
  if (existing) return existing;

  const attribution: Attribution = {
    source, medium, campaign, content,
    landedAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
  } catch { /* storage unavailable — attribution is best-effort */ }
  return attribution;
}

export function getAttribution(): Attribution | null {
  return read();
}

/**
 * The influencer's code in the form patients say it and reception writes it:
 * uppercase, no punctuation. Empty when the visit wasn't campaign-tagged.
 */
export function attributionCode(): string {
  return (read()?.content || '').toUpperCase();
}

/**
 * Add the creator's code to a wa.me link's prefilled message, so a chat that
 * starts from a campaign visit arrives already labelled and reception doesn't
 * have to ask. Returns the href untouched when there's no code, when one is
 * already present, or when the URL doesn't parse.
 */
export function withWhatsAppCode(href: string, code = attributionCode()): string {
  if (!code) return href;
  try {
    const url = new URL(href, window.location.origin);
    const existing = url.searchParams.get('text') || '';
    if (/\bcode:/i.test(existing)) return href;
    url.searchParams.set('text', existing ? `${existing} Code: ${code}` : `Code: ${code}`);
    return url.toString();
  } catch {
    return href;
  }
}

/**
 * Compact one-cell provenance for the Source column of the Appointments
 * sheet, e.g. `instagram/influencer/braces_2026/nasra`. Falls back to
 * 'Website' so untagged bookings look exactly as they always have.
 */
export function attributionSource(): string {
  const a = read();
  if (!a) return 'Website';
  const parts = [a.source, a.medium, a.campaign, a.content].filter(Boolean);
  return parts.length ? parts.join('/') : 'Website';
}
