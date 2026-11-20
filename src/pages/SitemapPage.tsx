import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/Header';
import { BookingProvider } from '../components/booking';
import { BookingModal } from '../components/BookingModal';
import { SEO } from '../components/SEO';
import { SiteFooter } from '../components/SiteFooter';
import { site, services, serviceSlug } from '../data/site';
import { useBranches } from '../data/branches';

type Post = { slug: string; title: string };

const MAIN_PAGES = [
  { label: 'Home', to: '/' },
  { label: 'About Us', to: '/about' },
  { label: 'All Services', to: '/services' },
  { label: 'Braces & Orthodontics', to: '/braces' },
  { label: 'Blog', to: '/blog' },
  { label: 'Careers', to: '/careers' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
];

function LinkList({ title, links }: { title: string; links: { label: string; to: string }[] }) {
  return (
    <section>
      <h2 className="text-lg font-800 text-secondary-900">{title}</h2>
      <ul className="mt-3 space-y-2">
        {links.map(l => (
          <li key={l.to}>
            <Link to={l.to} className="text-brand-600 hover:underline">{l.label}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Human-readable sitemap: every page on the site, linked from the footer. */
export function SitemapPage() {
  const branches = useBranches();
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsError, setPostsError] = useState('');

  useEffect(() => {
    fetch('/api/blog')
      .then(r => {
        if (!r.ok) throw new Error(`the blog list returned HTTP ${r.status}`);
        return r.json();
      })
      .then((data: { posts?: Post[] } | Post[]) => setPosts(Array.isArray(data) ? data : data.posts || []))
      .catch((err: Error) => setPostsError(`Articles could not be listed: ${err.message}.`));
  }, []);

  return (
    <BookingProvider>
      <SEO
        title={`Sitemap | ${site.name}`}
        description="Every page on the Celestial Dental Centre website: dental services, branches in Kasarani, Kamakis, Eldoret and Kiambu Road, blog articles, careers and policies."
        canonicalPath="/sitemap"
      />
      <Header />
      <main className="container-page pt-32 pb-20">
        <h1 className="text-3xl sm:text-4xl font-800 text-secondary-900">Sitemap</h1>
        <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <LinkList title="Main pages" links={MAIN_PAGES} />
          <LinkList
            title="Our branches"
            links={branches.map(b => ({ label: `${b.name} branch`, to: `/branches/${b.slug}` }))}
          />
          <LinkList
            title="Dental services"
            links={services.map(s => ({ label: s.title, to: `/services/${serviceSlug(s.title)}` }))}
          />
        </div>
        <section className="mt-12">
          <h2 className="text-lg font-800 text-secondary-900">Blog articles</h2>
          {postsError && <p className="mt-3 text-sm text-red-600">{postsError}</p>}
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {posts.map(p => (
              <li key={p.slug}>
                <Link to={`/${p.slug}`} className="text-brand-600 hover:underline">{p.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
      <BookingModal />
    </BookingProvider>
  );
}
