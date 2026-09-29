import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Link as LinkIcon, MessageCircle, Facebook } from 'lucide-react';
import { Header } from '../components/Header';
import { Reveal } from '../components/Reveal';
import { BookingProvider, useBooking } from '../components/booking';
import { BookingModal } from '../components/BookingModal';
import { site } from '../data/site';
import { pushEvent } from '../lib/track';
import { describeNetworkError, describeResponseError } from '../lib/errors';
import { Clock } from 'lucide-react';
import { SchemaOrg } from '../components/SchemaOrg';
import reviewer from '../../public/medical-reviewer.json';

// Health content ranks and gets cited on who stands behind it. While the name
// is blank the article reads exactly as it did before, attributed to the
// clinical team; filling in public/medical-reviewer.json switches every post
// to a named clinician, here and in the crawler prerender, in one edit.
const reviewerName = reviewer.name.trim();
const reviewerLine = reviewerName
  ? [reviewerName, reviewer.credentials.trim()].filter(Boolean).join(', ')
    + (reviewer.registration.trim() ? ` · Reg. ${reviewer.registration.trim()}` : '')
  : '';
const reviewerPerson = reviewerName
  ? {
      '@type': 'Person',
      name: reviewerName,
      ...(reviewer.jobTitle.trim() ? { jobTitle: reviewer.jobTitle.trim() } : {}),
      ...(reviewer.url.trim() ? { url: reviewer.url.trim() } : {}),
      ...(reviewer.credentials.trim()
        ? { hasCredential: { '@type': 'EducationalOccupationalCredential', credentialCategory: reviewer.credentials.trim() } }
        : {}),
      ...(reviewer.registration.trim()
        ? { identifier: { '@type': 'PropertyValue', name: 'Practitioner registration', value: reviewer.registration.trim() } }
        : {}),
      worksFor: { '@type': 'Organization', name: 'Celestial Dental Centre' },
    }
  : null;
import { SEO } from '../components/SEO';
import { SiteFooter } from '../components/SiteFooter';
import { Loading } from '../components/Loading';

type Post = {
  id?: string; slug: string; tag: string; title: string; excerpt: string;
  image: string; date: string; readTime: string; body?: string; video?: string; gallery?: string;
};

/* ─── Article body: light markdown so posts get real headings & lists ───
   Supported: ## Heading, ### Subheading, "1. point" numbered lists,
   "- point" bullets, **bold**, *italic*. Everything else is a paragraph. */

type Block =
  | { type: 'h2' | 'h3' | 'p'; text: string; items?: never; src?: never }
  | { type: 'ol' | 'ul'; items: string[]; text?: never; src?: never }
  | { type: 'img'; src: string; text: string; items?: never };

// A line that is just a photo: "![caption](url)" or a bare image URL
function imageLine(line: string): { src: string; caption: string } | null {
  const md = line.match(/^!\[([^\]]*)\]\((\S+)\)$/);
  if (md) return { src: md[2], caption: md[1] };
  if (/^https?:\/\/\S+(\.(jpe?g|png|webp|gif|avif|svg)(\?\S*)?$|\S*blob\.vercel-storage\.com)/i.test(line) && !/\s/.test(line)) {
    return { src: line, caption: '' };
  }
  return null;
}

function parseBody(body: string): Block[] {
  // Group consecutive non-blank lines; blank lines separate groups. CMS posts
  // are written as single-line paragraphs, standalone question headings, and
  // list items on consecutive lines — so group shape tells us the block type
  // even when the author used no markdown markers.
  const groups: string[][] = [];
  let current: string[] = [];
  for (const raw of body.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) { if (current.length) { groups.push(current); current = []; } continue; }
    current.push(line);
  }
  if (current.length) groups.push(current);

  const isMarked = (line: string) =>
    /^#{1,4}\s/.test(line) || /^\d+[.)]\s*\S/.test(line) || /^[-*•]\s/.test(line) || !!imageLine(line);
  const isQuestionHeading = (line: string) => /\?$/.test(line) && line.length <= 90;

  const blocks: Block[] = [];
  for (const group of groups) {
    // Plain groups (no markdown markers): infer structure from shape —
    // short question lines are headings, runs of 2+ lines are lists.
    if (!group.some(isMarked)) {
      let buf: string[] = [];
      const flushPlain = () => {
        if (!buf.length) return;
        if (buf.length === 1) blocks.push({ type: 'p', text: buf[0] });
        else blocks.push({ type: 'ul', items: buf });
        buf = [];
      };
      for (const line of group) {
        if (isQuestionHeading(line)) { flushPlain(); blocks.push({ type: 'h2', text: line }); }
        else buf.push(line);
      }
      flushPlain();
      continue;
    }

    // Groups with explicit markdown: parse line by line as before.
    let list: { type: 'ol' | 'ul'; items: string[] } | null = null;
    const flush = () => { if (list) { blocks.push(list); list = null; } };
    for (const line of group) {
      const heading = line.match(/^(#{1,4})\s+(.*)/);
      if (heading) { flush(); blocks.push({ type: heading[1].length >= 3 ? 'h3' : 'h2', text: heading[2] }); continue; }
      const img = imageLine(line);
      if (img) { flush(); blocks.push({ type: 'img', src: img.src, text: img.caption }); continue; }
      const numbered = line.match(/^\d+[.)]\s*(\S.*)/);
      if (numbered) {
        if (list?.type !== 'ol') { flush(); list = { type: 'ol', items: [] }; }
        list.items.push(numbered[1]);
        continue;
      }
      const bullet = line.match(/^[-*•]\s+(.*)/);
      if (bullet) {
        if (list?.type !== 'ul') { flush(); list = { type: 'ul', items: [] }; }
        list.items.push(bullet[1]);
        continue;
      }
      flush();
      blocks.push({ type: 'p', text: line });
    }
    flush();
  }
  return blocks;
}

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    return part;
  });
}

function ArticleBody({ body }: { body: string }) {
  const listClass = 'mt-5 space-y-2 pl-6 text-base leading-relaxed text-ink-700';
  return (
    <div className="mt-8">
      {parseBody(body).map((b, i) => {
        if (b.type === 'h2') return <h2 key={i} className="mt-10 text-2xl font-900 text-ink-900">{inline(b.text)}</h2>;
        if (b.type === 'h3') return <h3 key={i} className="mt-8 text-xl font-800 text-ink-900">{inline(b.text)}</h3>;
        if (b.type === 'img') {
          return (
            <figure key={i} className="mt-8">
              <img src={b.src} alt={b.text || 'Article photo'} loading="lazy" decoding="async" className="w-full h-auto rounded-3xl shadow-card" />
              {b.text && <figcaption className="mt-2 text-center text-sm text-ink-500">{b.text}</figcaption>}
            </figure>
          );
        }
        if (b.type === 'ol') return <ol key={i} className={`${listClass} list-decimal`}>{b.items.map((item, j) => <li key={j}>{inline(item)}</li>)}</ol>;
        if (b.type === 'ul') return <ul key={i} className={`${listClass} list-disc`}>{b.items.map((item, j) => <li key={j}>{inline(item)}</li>)}</ul>;
        return <p key={i} className="mt-5 text-base leading-relaxed text-ink-700">{inline(b.text || '')}</p>;
      })}
    </div>
  );
}

type PublicComment = { name: string; message: string; createdAt: string };

function timeAgo(iso: string) {
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff)) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Comments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  const load = () => {
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.comments) setComments(d.comments); })
      .catch(() => {});
  };
  useEffect(load, [slug]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || message.trim().length < 2) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, message, website }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null) as { error?: string } | null;
        console.error('Comment failed', res.status, detail);
        setError(describeResponseError(res.status, detail?.error, { action: 'post your comment' }));
        setStatus('error');
        return;
      }
      setName(''); setMessage('');
      setStatus('done');
      load();
    } catch (err) {
      console.error('Comment request failed', err);
      setError(describeNetworkError(err, { action: 'post your comment' }));
      setStatus('error');
    }
  };

  return (
    <section className="mt-12 border-t border-brand-100 pt-10">
      <h2 className="text-2xl font-900 text-ink-900">
        Comments{comments.length ? ` (${comments.length})` : ''}
      </h2>

      <div className="mt-6 space-y-5">
        {comments.length === 0 && (
          <p className="text-sm text-ink-500">Be the first to leave a comment.</p>
        )}
        {comments.map((c, i) => (
          <div key={i} className="rounded-2xl border border-brand-100 bg-brand-50/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-800 text-ink-900">{c.name}</span>
              <span className="text-xs text-ink-500">{timeAgo(c.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-700 whitespace-pre-line">{c.message}</p>
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="mt-8 rounded-3xl border border-brand-100 bg-white p-6 shadow-card">
        <h3 className="text-lg font-800 text-ink-900">Leave a comment</h3>
        {/* Honeypot: hidden from real users, catches bots */}
        <input
          type="text" tabIndex={-1} autoComplete="off" value={website}
          onChange={e => setWebsite(e.target.value)}
          className="hidden" aria-hidden="true"
        />
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="mt-4 w-full rounded-xl border border-brand-100 px-4 py-2.5 text-sm outline-none focus:border-brand-400"
          maxLength={80}
          required
        />
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Share your thoughts…"
          className="mt-3 w-full rounded-xl border border-brand-100 px-4 py-2.5 text-sm outline-none focus:border-brand-400 min-h-[110px]"
          maxLength={2000}
          required
        />
        <div className="mt-4 flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={status === 'sending'}>
            {status === 'sending' ? 'Posting…' : 'Post comment'}
          </button>
          {status === 'done' && <span className="text-sm font-700 text-brand-600">Thanks — your comment is posted!</span>}
          {status === 'error' && <span className="text-sm font-700 text-red-500">{error}</span>}
        </div>
      </form>
    </section>
  );
}

/** Turn a YouTube/Vimeo/MP4 URL into an embeddable player, or null if unusable. */
function VideoEmbed({ url }: { url: string }) {
  const u = url.trim();
  if (!u) return null;

  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  let src = '';
  if (yt) src = `https://www.youtube.com/embed/${yt[1]}`;
  else if (vimeo) src = `https://player.vimeo.com/video/${vimeo[1]}`;

  if (src) {
    return (
      <div className="mt-8 aspect-video w-full overflow-hidden rounded-3xl shadow-card">
        <iframe
          src={src}
          title="Video"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u)) {
    return <video src={u} controls className="mt-8 w-full rounded-3xl shadow-card" />;
  }
  return null;
}

function ShareRow({ title }: { title: string }) {
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const share = async (network: 'whatsapp' | 'facebook' | 'x' | 'copy') => {
    if (network === 'copy') {
      try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
      return;
    }
    const t = encodeURIComponent(title);
    const u = encodeURIComponent(url);
    const links = {
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      x: `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
    };
    window.open(links[network], '_blank', 'noopener,noreferrer');
  };
  const btn = 'inline-flex items-center gap-2 rounded-full border border-brand-100 px-4 py-2 text-sm font-800 text-ink-700 hover:border-brand-400 hover:text-brand-700 transition-colors';
  return (
    <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-brand-100 pt-6">
      <span className="text-sm font-800 text-ink-500">Share:</span>
      <button onClick={() => share('whatsapp')} className={btn}><MessageCircle className="h-4 w-4" /> WhatsApp</button>
      <button onClick={() => share('facebook')} className={btn}><Facebook className="h-4 w-4" /> Facebook</button>
      <button onClick={() => share('x')} className={btn}>𝕏 Post</button>
      <button onClick={() => share('copy')} className={btn}><LinkIcon className="h-4 w-4" /> Copy link</button>
    </div>
  );
}

// End-of-article conversion prompts: book straight into the modal, or open a
// WhatsApp chat with the clinic team.
function ArticleCta({ postTitle }: { postTitle: string }) {
  const { openBooking } = useBooking();
  const waText = encodeURIComponent(`Hi Celestial Dental! I just read "${postTitle}" on your website and I'd like to talk to a dentist.`);
  return (
    <div className="mt-12 rounded-3xl bg-brand-700 p-8 text-center">
      <h2 className="text-2xl font-900 text-white">Have questions about your smile?</h2>
      <p className="mt-2 text-sm text-brand-200">
        Our dentists are here every day, 07:00–20:00, in Kasarani (Nairobi), Kamakis–Ruiru, Eldoret, and Kiambu Road.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => { pushEvent('booking_open', { cta: 'blog-post' }); openBooking(); }}
          className="btn-primary bg-white !text-brand-800 !shadow-none hover:!shadow-none"
        >
          <Clock className="h-4 w-4" />
          Book an appointment
        </button>
        <a
          href={`${site.whatsappHref}?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost !text-white !border-white/30 !bg-white/10"
        >
          <MessageCircle className="h-4 w-4" />
          Talk to a dentist
        </a>
      </div>
    </div>
  );
}

function BlogPostInner({ rootLevel = false }: { rootLevel?: boolean }) {
  const { slug } = useParams<{ slug: string }>();
  const [posts, setPosts] = useState<Post[] | null>(null);

  useEffect(() => {
    setPosts(null);
    fetch('/api/blog')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setPosts(data?.posts ?? []))
      .catch(() => setPosts([]));
    window.scrollTo(0, 0);
  }, [slug]);

  // Old URLs used the row id (post-<timestamp>) as the slug — match either.
  const post = posts?.find(p => p.slug === slug || p.id === slug);

  if (posts === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading label="Loading article…" />
      </div>
    );
  }

  if (!post) {
    // At root level any unknown path lands here — behave like the 404 route
    if (rootLevel) return <Navigate to="/" replace />;
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-800 text-ink-900">Article not found</h1>
        <Link to="/blog" className="btn-primary">Back to blog</Link>
      </div>
    );
  }

  // Canonical article URL is the root-level slug (celestialdental.org/<slug>);
  // legacy /blog/... and id-based URLs redirect there.
  if (!rootLevel || slug !== post.slug) return <Navigate to={`/${post.slug}`} replace />;

  const galleryImages = (post.gallery || '')
    .split(/[|\n]/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    ...(post.image ? { image: post.image } : {}),
    datePublished: post.date,
    mainEntityOfPage: `https://celestialdental.org/${post.slug}`,
    author: reviewerPerson ?? { '@type': 'Organization', name: 'Celestial Dental Centre' },
    ...(reviewerPerson ? { reviewedBy: reviewerPerson } : {}),
    publisher: {
      '@type': 'Organization',
      name: 'Celestial Dental Centre',
      logo: { '@type': 'ImageObject', url: 'https://celestialdental.org/brand/celestial-logo.png' },
    },
  };

  return (
    <div className="bg-white">
      <SEO
        title={`${post.title} | ${post.tag} | Celestial Dental Centre`}
        description={post.excerpt}
        image={post.image}
        type="article"
        canonicalPath={`/${post.slug}`}
        keywords={[post.tag, 'dental advice Kenya', 'Celestial Dental blog']}
      />
      <SchemaOrg />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <Header />
      <main className="pt-28 pb-20">
        <article className="container-page max-w-3xl">
          <Reveal>
            <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm font-800 text-brand-600 hover:text-brand-800 transition-colors">
              <ArrowLeft className="h-4 w-4" /> All articles
            </Link>
          </Reveal>
          <Reveal delay={60}>
            <span className="mt-6 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-800 text-brand-700">{post.tag}</span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="mt-4 text-3xl sm:text-4xl font-900 text-ink-900 leading-tight">{post.title}</h1>
          </Reveal>
          <Reveal delay={140}>
            <div className="mt-4 flex items-center gap-3 text-sm text-ink-500 font-medium">
              <span>{post.date}</span>
              {post.readTime && <><span className="h-1 w-1 rounded-full bg-ink-500/40" /><span>{post.readTime}</span></>}
            </div>
            {reviewerLine && (
              <p className="mt-2 text-sm text-ink-500 font-medium">
                Medically reviewed by <span className="text-ink-700 font-700">{reviewerLine}</span>
              </p>
            )}
          </Reveal>
          {post.image && !post.video && (
            <Reveal delay={180}>
              <img src={post.image} alt={post.title} className="mt-8 w-full h-auto rounded-3xl shadow-card" />
            </Reveal>
          )}
          {post.video && (
            <Reveal delay={180}>
              <VideoEmbed url={post.video} />
            </Reveal>
          )}
          <Reveal delay={220}>
            <ArticleBody body={post.body || post.excerpt || ''} />
          </Reveal>
          {galleryImages.length > 0 && (
            <Reveal delay={240}>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {galleryImages.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`${post.title} — photo ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className={`w-full h-auto rounded-2xl shadow-card ${galleryImages.length % 2 === 1 && i === 0 ? 'sm:col-span-2' : ''}`}
                  />
                ))}
              </div>
            </Reveal>
          )}
          <Reveal delay={260}>
            <ShareRow title={post.title} />
          </Reveal>
          <Reveal delay={280}>
            <ArticleCta postTitle={post.title} />
          </Reveal>
          <Reveal delay={300}>
            <Comments slug={post.slug} />
          </Reveal>
        </article>
      </main>
      <SiteFooter />
      <BookingModal />
    </div>
  );
}

export function BlogPostPage({ rootLevel = false }: { rootLevel?: boolean }) {
  return (
    <BookingProvider>
      <BlogPostInner rootLevel={rootLevel} />
    </BookingProvider>
  );
}
