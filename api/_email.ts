// Shared branded email shell. Every message the site sends should go through
// emailShell() so the logo, spacing and footer stay consistent — previously each
// endpoint hand-rolled its own markup and only the careers emails were branded.
//
// Not a route: the leading underscore keeps this out of Vercel's function count.

// Absolute URL — email clients cannot resolve site-relative paths. The alt text
// carries the brand for the many clients that block images by default.
export const LOGO_URL = 'https://celestialdental.org/brand/celestial-logo.png';

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function textToHtml(value: string) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

export type EmailAction = { label: string; href: string };

/**
 * @param footer overrides the signature line — e.g. "Recruitment Team" for
 *               careers mail, the default for everything else.
 */
export function emailShell(
  title: string,
  body: string,
  action?: EmailAction,
  footer = 'Celestial Dental Centre · Kasarani · Kamakis · Eldoret · Kiambu Road',
) {
  return `<div style="background:#f2faf8;padding:28px 12px">
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;background:#fff;border:1px solid #d4e9e6;border-radius:18px;padding:32px;color:#153536;line-height:1.6">
      <img src="${LOGO_URL}" alt="Celestial Dental Centre" width="150" height="60" style="display:block;border:0;outline:none;text-decoration:none;width:150px;height:60px;margin:0 0 18px">
      <h1 style="font-size:24px;line-height:1.25;margin:10px 0 18px;color:#0d1f1e">${escapeHtml(title)}</h1>
      <div style="font-size:15px">${body}</div>
      ${action ? `<p style="margin:26px 0 4px"><a href="${escapeHtml(action.href)}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;border-radius:999px;padding:12px 22px;font-weight:700">${escapeHtml(action.label)}</a></p>` : ''}
      <p style="font-size:12px;color:#718080;margin:28px 0 0">${escapeHtml(footer)}</p>
    </div>
  </div>`;
}
