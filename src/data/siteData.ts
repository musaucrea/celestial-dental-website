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

/** Live items for a section; `fallback` renders until the API loads. */
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
  const items = sections[section];
  return items ? (items as T[]) : fallback;
}
