import { useEffect, useReducer } from 'react';
import { faqs as staticFaqs } from './site';

export type Faq = { q: string; a: string };

type ApiFaq = { question?: string; answer?: string; status?: string };

export const fallbackFaqs: Faq[] = staticFaqs as Faq[];

function normalize(f: ApiFaq): Faq {
  return { q: f.question || '', a: f.answer || '' };
}

function isPricingFaq(f: Faq) {
  return /\b(how much|price|pricing|cost|fee|ksh|kes)\b/i.test(`${f.q} ${f.a}`);
}

let current: Faq[] = fallbackFaqs;
let started = false;
const listeners = new Set<() => void>();

function load() {
  fetch('/api/faqs')
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      const list: ApiFaq[] = data?.faqs || [];
      const mapped = list.map(normalize).filter(f => f.q && f.a && !isPricingFaq(f));
      if (mapped.length) {
        // Merge rather than replace: admin-managed answers win on duplicate
        // questions, but curated static FAQs (SEO/keyword coverage) still show.
        const seen = new Set(mapped.map(f => f.q.trim().toLowerCase()));
        current = [...mapped, ...fallbackFaqs.filter(f => !seen.has(f.q.trim().toLowerCase()))];
        listeners.forEach(fn => fn());
      }
    })
    .catch(() => {});
}

/** Live FAQ list — static fallback first, then the admin-managed list. */
export function useFaqs(): Faq[] {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(force);
    if (!started) {
      started = true;
      load();
    }
    return () => {
      listeners.delete(force);
    };
  }, []);
  return current;
}
