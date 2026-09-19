/**
 * Conversion tracking helpers.
 *
 * Everything funnels through the GTM dataLayer: events are queued even before
 * GTM loads (or if the visitor never consents, in which case they go nowhere),
 * so call sites never need to know whether tracking is active.
 */

import { ga4Id } from '../data/site';
import { withWhatsAppCode } from './attribution';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export function pushEvent(event: string, params: Record<string, unknown> = {}) {
  window.dataLayer = window.dataLayer || [];
  const eventParams = { page_path: window.location.pathname, ...params };
  window.dataLayer.push({ event, ...eventParams });

  // Direct GA4 fallback. GTM remains queued above, while this path keeps
  // conversions working if Google's container malware scanner pauses GTM.
  let consented = false;
  try { consented = window.localStorage.getItem('cd_cookie_consent') === 'accepted'; } catch { /* storage unavailable */ }
  if (consented && ga4Id) window.gtag?.('event', event, { ...eventParams, send_to: ga4Id });
}

/**
 * Site-wide click tracking for the two "contact" conversions, via event
 * delegation so every tel:/WhatsApp link is covered — header, footer, branch
 * cards, floating button, landing pages — without wiring each one.
 */
let installed = false;
export function installContactClickTracking() {
  if (installed) return;
  installed = true;

  document.addEventListener(
    'click',
    e => {
      const anchor = (e.target as Element | null)?.closest?.('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';

      if (href.startsWith('tel:')) {
        pushEvent('call_click', {
          phone_number: href.slice(4),
          link_text: (anchor.textContent || '').trim().slice(0, 80),
        });
        window.fbq?.('track', 'Contact');
      } else if (/wa\.me|api\.whatsapp\.com|whatsapp:/i.test(href)) {
        // Stamp the campaign code into the prefilled message. Done here rather
        // than at each link so every WhatsApp entry point is covered — floating
        // button, header, footer, branch cards, /braces CTAs. The capture-phase
        // listener runs before the browser follows the link, so rewriting the
        // href now is what actually gets opened.
        const tagged = withWhatsAppCode(href);
        if (tagged !== href) anchor.setAttribute('href', tagged);

        pushEvent('whatsapp_click', {
          link_url: tagged.slice(0, 120),
          link_text: (anchor.textContent || '').trim().slice(0, 80),
        });
        window.fbq?.('track', 'Contact');
      }
    },
    true, // capture: fire even when the page navigates right after the click
  );
}
