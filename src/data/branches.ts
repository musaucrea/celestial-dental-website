import { useEffect, useReducer } from 'react';
import { branches as staticBranches } from './site';

/**
 * Runtime branch model used across the site. Matches the static shape in
 * `site.ts` (so those serve as a build-time fallback) plus optional
 * schema fields (region/lat/lng) that admins can set.
 */
export type Branch = {
  name: string;
  slug: string;
  badge: string;
  tagline: string;
  description: string;
  address: string[];
  landmark: string;
  parking: string;
  phone: string;
  phoneHref: string;
  whatsapp: string;
  map: string;
  hours: string;
  image: string;
  region?: string;
  lat?: number;
  lng?: number;
  /** Branch photo gallery (admin-managed, up to 5 images). */
  photos?: string[];
};

type ApiBranch = {
  slug?: string; name?: string; badge?: string; tagline?: string; description?: string;
  address?: string; landmark?: string; parking?: string; phone?: string; phoneHref?: string;
  whatsapp?: string; map?: string; hours?: string; image?: string;
  region?: string; lat?: string; lng?: string; status?: string; photos?: string;
};

/** The static branches double as the initial value + offline fallback. */
export const fallbackBranches: Branch[] = staticBranches as Branch[];

function normalize(b: ApiBranch): Branch {
  return {
    name: b.name || '',
    slug: b.slug || '',
    badge: b.badge || '',
    tagline: b.tagline || '',
    description: b.description || '',
    address: (b.address || '').split('\n').map(l => l.trim()).filter(Boolean),
    landmark: b.landmark || '',
    parking: b.parking || '',
    phone: b.phone || '',
    phoneHref: b.phoneHref || '',
    whatsapp: b.whatsapp || '',
    map: b.map || '',
    hours: b.hours || '',
    image: b.image || '',
    region: b.region || undefined,
    lat: b.lat ? Number(b.lat) : undefined,
    lng: b.lng ? Number(b.lng) : undefined,
    photos: (b.photos || '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, 5),
  };
}

// ── Module-level cache so we fetch /api/branches only once per page load ──
let current: Branch[] = fallbackBranches;
let started = false;
const listeners = new Set<() => void>();

function load() {
  fetch('/api/branches')
    .then(r => (r.ok ? r.json() : null))
    .then(data => {
      const list: ApiBranch[] = data?.branches || [];
      const mapped = list.map(normalize).filter(b => b.name && b.slug);
      if (mapped.length) {
        current = mapped;
        listeners.forEach(fn => fn());
      }
    })
    .catch(() => {});
}

/**
 * Returns the live branch list. Starts as the static fallback (good for first
 * paint + SEO), then updates to the admin-managed list once it loads.
 */
export function useBranches(): Branch[] {
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
