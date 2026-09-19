import { useEffect, useReducer } from 'react';

/**
 * Generic admin-managed content store. All sections live in one sheet behind
 * /api/site-data; one fetch per page load hydrates every section. Components
 * fall back to the static content in site.ts until (or if) the API responds.
 */

type ApiItem = {
  id: string;
  section: string;
  status: string;
  data: Record<string, unknown>;
};

let sections: Record<string, Record<string, unknown>[]> = {};
let started = false;
const listeners = new Set<() => void>();

function load() {
  fetch('/api/site-data')
    .then(r => (r.ok ? r.json() : null))
    .then(payload => {
      const items: ApiItem[] = payload?.items || [];
      if (!items.length) return;
      const next: typeof sections = {};
      for (const item of items) {
        if (!item.section || !item.data) continue;
        (next[item.section] ||= []).push(item.data);
      }
      next.team ||= [];
      sections = next;
      listeners.forEach(fn => fn());
    })
    .catch(() => {});
}

/**
 * Sections whose content is regulated advertising copy, and which therefore come
 * from code rather than from the admin sheet.
 *
 * Background: the audit of 16 September 2026 found that the homepage patient
 * testimonial naming "Dr. Belinda", the "5 min target response time" stat, the
 * "4 accessible branches" count and the outcome-promise service descriptions
 * ("lift your smile by several shades", "the closest thing to a real tooth")
 * were all being served from the sheet, which overrides the vetted defaults in
 * site.ts wholesale. Copy in these sections has to clear an advertising-rules
 * review before it is published, and a free-text CMS field is not a review.
 *
 * Consequence to be aware of: edits made to these sections in the admin portal
 * still save, but are ignored at render time. Changing this copy — including
 * adding or renaming a service — is now a code change.
 *
 * Not pinned, and still fully admin-editable: gallery, insurers, team, branches,
 * blog posts, careers.
 */
const PINNED_SECTIONS = new Set([
  'hero',
  'stats',
  'testimonials',
  'about',
  'services',
  'whyChooseUs',
]);

/**
 * Live items for a section; `fallback` renders until the API loads.
 * For a pinned section the vetted `fallback` is always what renders.
 */
export function useSection<T>(section: string, fallback: T[]): T[] {
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
  if (PINNED_SECTIONS.has(section)) return fallback;
  const items = sections[section];
  return items ? (items as T[]) : fallback;
}
