import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { site } from '../data/site';

const SITE_URL = 'https://celestialdental.org';
const DEFAULT_IMAGE = `${SITE_URL}/facility/reception-lounge.jpg`;

type SEOProps = {
  title?: string;
  description?: string;
  image?: string;
  type?: 'website' | 'article';
  canonicalPath?: string;
  keywords?: string[];
};

function absoluteUrl(pathOrUrl?: string) {
  if (!pathOrUrl) return DEFAULT_IMAGE;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => element?.setAttribute(key, value));
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

export function SEO({
  title,
  description,
  image,
  type = 'website',
  canonicalPath,
  keywords = [],
}: SEOProps) {
  const location = useLocation();

  useEffect(() => {
    const pageTitle = title || `Dentist in Nairobi (Kasarani), Kamakis–Ruiru, Eldoret & Kiambu Road | ${site.name}`;
    const pageDescription =
      description ||
      'Dental clinic open 7 days in Kasarani (Nairobi), Kamakis–Ruiru, Eldoret, and Kiambu Road: dental checkups, teeth cleaning, braces, implants, root canal treatment, cosmetic dentistry, and same-day emergency dental care. Insurance & M-Pesa accepted.';
    const canonical = `${SITE_URL}${canonicalPath || location.pathname}`;
    const shareImage = absoluteUrl(image);
    const keywordValue = [
      'dentist Kasarani',
      'dentist Kamakis',
      'dentist Eldoret',
      'dentist Kiambu Road',
      'dentist Thindigua',
      'dentist Ruiru',
      'dentist Nairobi',
      'dental clinic Nairobi',
      'braces Kenya',
      'orthodontist Kasarani',
      'dental braces Eldoret',
      'dental implants Kenya',
      'dental implants Eldoret',
      'teeth cleaning Kasarani',
      'dental checkup Nairobi',
      'emergency dentist Nairobi',
      'emergency dentist Kasarani',
      'dental clinic Kenya',
      ...keywords,
    ].join(', ');

    document.title = pageTitle;
    upsertMeta('meta[name="description"]', { name: 'description', content: pageDescription });
    upsertMeta('meta[name="keywords"]', { name: 'keywords', content: keywordValue });
    upsertMeta('meta[name="robots"]', { name: 'robots', content: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' });
    upsertMeta('meta[property="og:title"]', { property: 'og:title', content: pageTitle });
    upsertMeta('meta[property="og:description"]', { property: 'og:description', content: pageDescription });
    upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
    upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonical });
    upsertMeta('meta[property="og:image"]', { property: 'og:image', content: shareImage });
    upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: site.name });
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: pageTitle });
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: pageDescription });
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: shareImage });
    upsertLink('canonical', canonical);
  }, [canonicalPath, description, image, keywords, location.pathname, title, type]);

  return null;
}
