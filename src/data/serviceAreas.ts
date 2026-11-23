import data from '../../public/service-areas.json';

/**
 * Neighbourhoods each branch serves, with one page per area at
 * /service-areas/<slug>. The list lives in public/service-areas.json so the
 * crawler renderer (prerender.php) and sitemap.xml read the same file.
 */
export type ServiceArea = {
  slug: string;
  name: string;
  branch: string;
  /** The branch's own location: its chip links to the branch page. */
  home?: boolean;
  /** Finishes the sentence "From <name>, …". */
  route?: string;
  /** A second branch that is also convenient. */
  alsoNear?: string;
};

export const serviceAreaBranches = data.branches as Record<string, { name: string; place: string }>;
export const serviceAreas = data.areas as ServiceArea[];

/** Branch order used on the index page (matches the site's branch order). */
export const serviceAreaBranchOrder = ['kasarani', 'kamakis', 'kiambu-road', 'eldoret'];

export const areasForBranch = (branchSlug: string) => serviceAreas.filter(a => a.branch === branchSlug);

export const findServiceArea = (slug?: string) => serviceAreas.find(a => a.slug === slug && !a.home);

/** Where an area's chip points: the branch page for the branch's own area, else its area page. */
export const areaHref = (a: ServiceArea) => (a.home ? `/branches/${a.branch}` : `/service-areas/${a.slug}`);

/**
 * Area names per branch, for the branch page and schema.org areaServed.
 * Not in site.ts: that file is also bundled into the serverless API.
 */
export const branchAreas: Record<string, string[]> = serviceAreas.reduce<Record<string, string[]>>((acc, a) => {
  (acc[a.branch] ||= []).push(a.name);
  return acc;
}, {});
