import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, MessageCircle } from 'lucide-react';
import { Header } from '../components/Header';
import { Reveal } from '../components/Reveal';
import { BookingProvider, useBooking } from '../components/booking';
import { BookingModal } from '../components/BookingModal';
import { site } from '../data/site';
import { pushEvent } from '../lib/track';
import { SEO } from '../components/SEO';
import { Loading } from '../components/Loading';

type BlogPost = {
  id: string;
  status: string;
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  readTime: string;
};

function BlogCardCta({ postTitle }: { postTitle: string }) {
  const { openBooking } = useBooking();
  const waText = encodeURIComponent(`Hi Celestial Dental! I saw "${postTitle}" on your blog and I'd like to contact the practice.`);
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <button
        onClick={() => { pushEvent('booking_open', { cta: 'blog-list' }); openBooking(); }}
        className="btn-primary !px-4 !py-2 text-xs"
      >
        <Clock className="h-3.5 w-3.5" />
        Appointments
      </button>
      <a
        href={`${site.whatsappHref}?text=${waText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-ghost !px-4 !py-2 text-xs"
      >
        <MessageCircle className="h-3.5 w-3.5" />
        Contact us
      </a>
    </div>
  );
}

function BlogPageInner() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);

  useEffect(() => {
    fetch('/api/blog')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setPosts(data?.posts ?? []))
      .catch(() => setPosts([]));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <SEO
        title="Dental Blog | Celestial Dental Centre"
        description="Read dental care advice, treatment guides, clinic updates, and oral health tips from Celestial Dental Centre."
        canonicalPath="/blog"
        keywords={['dental blog Kenya', 'oral health tips', 'Celestial Dental blog']}
      />
      <Header />
      <main className="pt-32 pb-20">
        <section className="container-page">
          <Reveal>
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-800 text-brand-600 hover:text-brand-800 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back home
            </Link>
          </Reveal>
          <Reveal delay={80}>
            <span className="eyebrow mt-8"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Dental Tips & News</span>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="mt-4 max-w-2xl text-4xl font-900 text-ink-900 lg:text-6xl">From our dental team</h1>
          </Reveal>

          {posts === null ? (
            <div className="mt-12"><Loading label="Loading posts…" /></div>
          ) : posts.length === 0 ? (
            <div className="mt-12 rounded-3xl border border-brand-100 bg-mint p-8">
              <h2 className="text-2xl font-900 text-ink-900">No blog posts right now</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-500">
                New dental tips and clinic updates will appear here once they are published.
              </p>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post, i) => (
                <Reveal key={post.slug} delay={i * 80}>
                  <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-card transition-transform duration-300 hover:-translate-y-1">
                    <Link to={`/${post.slug}`} className="relative block h-48 overflow-hidden">
                      <img
                        src={post.image}
                        alt={post.title}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-800 text-brand-700 shadow-sm backdrop-blur-sm">
                        {post.tag}
                      </span>
                    </Link>
                    <div className="flex flex-1 flex-col p-6">
                      <div className="mb-3 flex items-center gap-3 text-xs font-medium text-ink-500">
                        <span>{post.date}</span>
                        {post.readTime && <><span className="h-1 w-1 rounded-full bg-ink-500/40" /><span>{post.readTime}</span></>}
                      </div>
                      <Link to={`/${post.slug}`}>
                        <h2 className="text-lg font-800 leading-snug text-ink-900 transition-colors group-hover:text-brand-700">
                          {post.title}
                        </h2>
                      </Link>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">{post.excerpt}</p>
                      <Link
                        to={`/${post.slug}`}
                        className="mt-5 inline-flex items-center gap-1.5 text-sm font-800 text-brand-600 transition-colors hover:text-brand-800"
                      >
                        Read more
                        <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                      </Link>
                      <BlogCardCta postTitle={post.title} />
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </main>
      <BookingModal />
    </div>
  );
}

export function BlogPage() {
  return (
    <BookingProvider>
      <BlogPageInner />
    </BookingProvider>
  );
}
