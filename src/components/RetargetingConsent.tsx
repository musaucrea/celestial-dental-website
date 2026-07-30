import { useEffect, useState } from 'react';
import { Cookie, Megaphone, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ga4Id, gtmId } from '../data/site';

type Consent = 'accepted' | 'declined' | null;

const CONSENT_KEY = 'cd_cookie_consent';
const CONSENT_EVENT = 'cd-cookie-consent-change';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

function readConsent(): Consent {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

function writeConsent(value: Exclude<Consent, null>) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // Keep the UI usable if storage is blocked.
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

function clearRetargetingCookie() {
  document.cookie = 'cd_vid=; Max-Age=0; Path=/; SameSite=Lax';
}

function ensureVisitorCookie() {
  const existing = document.cookie.match('(?:^|; )cd_vid=([^;]*)');
  const vid = existing?.[1] || `v${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  document.cookie = `cd_vid=${encodeURIComponent(decodeURIComponent(vid))}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function loadScript(id: string, src: string) {
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function initMetaPixel(pixelId: string) {
  if (window.fbq) return;
  window.fbq = function (...args: unknown[]) {
    ((window.fbq as unknown as { queue?: unknown[] }).queue ||= []).push(args);
  };
  (window.fbq as unknown as { loaded: boolean; version: string; queue: unknown[] }).loaded = true;
  (window.fbq as unknown as { loaded: boolean; version: string; queue: unknown[] }).version = '2.0';
  (window.fbq as unknown as { loaded: boolean; version: string; queue: unknown[] }).queue = [];
  loadScript('meta-pixel', 'https://connect.facebook.net/en_US/fbevents.js');
  window.fbq('init', pixelId);
}

function initGtm(containerId: string) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  loadScript('gtm', `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`);
}

function initGoogleAds(adsId: string) {
  window.dataLayer = window.dataLayer || [];
  // gtag.js only processes `arguments` objects pushed to the dataLayer — a
  // plain array (from rest args) is silently ignored and the event never sends.
  window.gtag = window.gtag || function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments as unknown);
  };
  loadScript('google-ads-gtag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(adsId)}`);
  window.gtag('js', new Date());
  window.gtag('config', adsId, { send_page_view: false });
}

function initGoogleAnalytics(measurementId: string) {
  window.dataLayer = window.dataLayer || [];
  // Must push `arguments` (not a rest-args array) — see initGoogleAds.
  window.gtag = window.gtag || function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments as unknown);
  };
  loadScript('google-analytics-gtag', `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`);
  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });
}

function useRetargetingPixels(consent: Consent) {
  const location = useLocation();
  const metaPixelId = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
  const googleAdsId = import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined;

  useEffect(() => {
    if (consent !== 'accepted') {
      clearRetargetingCookie();
      return;
    }

    ensureVisitorCookie();
    if (ga4Id) initGoogleAnalytics(ga4Id);
    if (gtmId) initGtm(gtmId);
    if (metaPixelId) initMetaPixel(metaPixelId);
    if (googleAdsId) initGoogleAds(googleAdsId);
  }, [consent, metaPixelId, googleAdsId]);

  useEffect(() => {
    if (consent !== 'accepted') return;

    const path = `${location.pathname}${location.search}`;
    window.fbq?.('track', 'PageView');
    if (ga4Id) {
      window.gtag?.('event', 'page_view', {
        page_path: path,
        page_location: window.location.href,
        send_to: ga4Id,
      });
    }
    if (googleAdsId) {
      window.gtag?.('event', 'page_view', {
        page_path: path,
        page_location: window.location.href,
        send_to: googleAdsId,
      });
    }
  }, [consent, googleAdsId, location.pathname, location.search]);
}

export function RetargetingConsent() {
  const [consent, setConsent] = useState<Consent>(() => readConsent());
  useRetargetingPixels(consent);

  useEffect(() => {
    const handleConsent = () => setConsent(readConsent());
    window.addEventListener(CONSENT_EVENT, handleConsent);
    return () => window.removeEventListener(CONSENT_EVENT, handleConsent);
  }, []);

  if (consent) return null;

  const accept = () => {
    writeConsent('accepted');
    setConsent('accepted');
  };
  const decline = () => {
    clearRetargetingCookie();
    writeConsent('declined');
    setConsent('declined');
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[80] px-4 pb-4 sm:px-6 sm:pb-6" role="dialog" aria-live="polite" aria-label="Cookie consent">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 rounded-2xl border border-brand-100 bg-white p-4 shadow-float sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <Cookie className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-900 text-ink-900">Cookies for better follow-up</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-500">
              We use cookies to understand visits and, with your permission, show helpful dental care reminders after you leave this site.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={decline} className="btn-ghost !px-4 !py-2 text-xs" aria-label="Decline marketing cookies">
            <X className="h-4 w-4" />
            Decline
          </button>
          <button type="button" onClick={accept} className="btn-primary !px-4 !py-2 text-xs" aria-label="Allow marketing cookies">
            <Megaphone className="h-4 w-4" />
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
