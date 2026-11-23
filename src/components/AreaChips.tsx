import { Link } from 'react-router-dom';
import { areaHref, areasForBranch, type ServiceArea } from '../data/serviceAreas';

/**
 * Pill links for every area a branch serves. The area being viewed is shown
 * highlighted and not linked (a page shouldn't link to itself).
 */
export function AreaChips({ branchSlug, current, areas }: { branchSlug: string; current?: string; areas?: ServiceArea[] }) {
  const list = areas ?? areasForBranch(branchSlug);
  return (
    <ul className="flex flex-wrap gap-3">
      {list.map(a => (
        <li key={a.slug}>
          {a.slug === current ? (
            <span
              aria-current="page"
              className="inline-flex min-w-28 justify-center rounded-full border border-gold-500 bg-gold-500 px-5 py-2.5 text-sm font-800 text-white shadow-card"
            >
              {a.name}
            </span>
          ) : (
            <Link
              to={areaHref(a)}
              className="inline-flex min-w-28 justify-center rounded-full border border-ink-900/15 bg-white px-5 py-2.5 text-sm font-700 text-ink-900 transition-colors hover:border-brand-500 hover:text-brand-700"
            >
              {a.name}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
