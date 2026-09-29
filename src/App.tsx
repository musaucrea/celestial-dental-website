import { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { Phone, MapPin, MessageCircle, ChevronDown, Cpu, Gem, ShieldCheck, HeartHandshake, Clock } from 'lucide-react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Reveal } from './components/Reveal';
import { BookingProvider, useBooking } from './components/booking';
import { BookingModal } from './components/BookingModal';
import { SEO } from './components/SEO';
import { SiteFooter } from './components/SiteFooter';
// Route-level code splitting. The homepage is the landing page for almost all
// traffic and stays in the main bundle; every other page is fetched only when
// someone navigates to it. Most visitors arrive on mobile data, where the
// single 520KB bundle delayed first render on every one of these routes.
const BranchPage = lazy(() => import('./pages/BranchPage').then(m => ({ default: m.BranchPage })));
const BlogPostPage = lazy(() => import('./pages/BlogPostPage').then(m => ({ default: m.BlogPostPage })));
const BlogPage = lazy(() => import('./pages/BlogPage').then(m => ({ default: m.BlogPage })));
const CareersPage = lazy(() => import('./pages/CareersPage').then(m => ({ default: m.CareersPage })));
const ServicePage = lazy(() => import('./pages/ServicePage').then(m => ({ default: m.ServicePage })));
const ServicesPage = lazy(() => import('./pages/ServicesPage').then(m => ({ default: m.ServicesPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const BracesPage = lazy(() => import('./pages/BracesPage').then(m => ({ default: m.BracesPage })));
import { AccessibilityWidget } from './components/AccessibilityWidget';
import { RetargetingConsent } from './components/RetargetingConsent';
import { installContactClickTracking } from './lib/track';
import { captureAttribution } from './lib/attribution';
import { WhatsAppButton } from './components/WhatsAppButton';
import {
  services as staticServices,
  whyChooseUs as staticWhyChooseUs,
  gallery as staticGallery,
  insurers as staticInsurers,
  site,
  serviceSlug,
} from './data/site';
import { useBranches } from './data/branches';
import { useFaqs } from './data/faqs';
import { useSection } from './data/siteData';

export type ServiceItem = { title: string; description: string; image: string };
type WhyItem = { tag: string; title: string; description: string };
type GalleryItem = { src: string; caption: string };
type InsurerItem = { name: string; logo: string };
const COUNT_WORDS = ['zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const countWord = (n: number) => COUNT_WORDS[n] ?? String(n);

// Insurer logos that read too small at the default size and need enlarging.
const BIG_LOGOS = new Set(['First Assurance']);

function Services() {
  const { openBooking } = useBooking();
  const services = useSection<ServiceItem>('services', staticServices);
  return (
    <section id="services" className="py-20 lg:py-28 bg-mint">
      <div className="container-page">
        <Reveal>
          <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Our Services</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 text-4xl font-900 text-ink-900 max-w-xl">Everything your smile needs, under one roof</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {services.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <div className="group h-full overflow-hidden rounded-3xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-float">
                <Link to={`/services/${serviceSlug(s.title)}`} className="block">
                  <div className="relative h-48 overflow-hidden">
                    <img loading="lazy" decoding="async" src={s.image} alt={s.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </Link>
                <div className="p-6">
                  <Link to={`/services/${serviceSlug(s.title)}`}>
                    <h3 className="text-lg font-800 text-ink-900 group-hover:text-brand-700 transition-colors">{s.title}</h3>
                  </Link>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.description}</p>
                  <div className="mt-4 flex items-center gap-4">
                    <Link to={`/services/${serviceSlug(s.title)}`} className="inline-flex items-center gap-1.5 text-sm font-800 text-brand-600 hover:text-brand-800 transition-colors">
                      Learn more
                      <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                    <button onClick={() => openBooking(s.title)} className="text-sm font-800 text-ink-400 hover:text-brand-700 transition-colors">
                      What this involves
                    </button>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const WHY_ICONS = [Cpu, Gem, ShieldCheck, HeartHandshake];

function WhyUs() {
  const whyChooseUs = useSection<WhyItem>('whyChooseUs', staticWhyChooseUs);
  return (
    <section id="why" className="py-20 lg:py-28">
      <div className="container-page">
        <Reveal>
          <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Why Choose Us</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 text-4xl font-900 text-ink-900 max-w-xl">Care you can count on, every visit</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {whyChooseUs.map((w, i) => {
            const Icon = WHY_ICONS[i % WHY_ICONS.length];
            return (
              <Reveal key={w.title} delay={i * 80}>
                <div className="group h-full rounded-3xl border border-brand-100 bg-white p-7 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-float hover:border-brand-200">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="eyebrow text-gold-600">{w.tag}</span>
                      <h3 className="mt-3 text-xl font-800 text-ink-900">{w.title}</h3>
                    </div>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition-all duration-300 group-hover:bg-brand-500 group-hover:text-white group-hover:scale-110">
                      <Icon className="h-6 w-6" strokeWidth={2} />
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{w.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  const managedGallery = useSection<GalleryItem>('gallery', staticGallery);
  const featuredGallery: GalleryItem[] = [
    {
      src: '/facility/clinic-exterior-night.jpg',
      caption: 'Open Monday–Sunday · 07:00–20:00',
    },
    {
      src: '/team/receptionist.jpg',
      caption: 'We listen first, then make every visit feel easier',
    },
  ];
  const gallery = [
    ...managedGallery,
    ...featuredGallery.filter(featured => !managedGallery.some(item => item.src === featured.src)),
  ];
  return (
    <section id="gallery" className="py-20 lg:py-28 bg-mint">
      <div className="container-page">
        <Reveal>
          <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Our Clinic</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 text-4xl font-900 text-ink-900 max-w-xl">A space designed for comfort</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((g, i) => (
            <Reveal key={g.src} delay={i * 60}>
              <div className="group relative overflow-hidden rounded-3xl shadow-card transition-all duration-300 hover:shadow-float">
                <img loading="lazy" decoding="async" src={g.src} alt={g.caption || 'Celestial Dental Centre clinic and facilities'} className="w-full h-auto group-hover:scale-105 transition-transform duration-700 ease-out" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pt-10 pb-4 px-4">
                  <p className="text-xs font-700 text-white translate-y-0 group-hover:-translate-y-0.5 transition-transform duration-300">{g.caption}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Branches() {
  const { openBooking } = useBooking();
  const branches = useBranches();
  return (
    <section id="branches" className="py-20 lg:py-28 bg-mint">
      <div className="container-page">
        <Reveal>
          <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Our Branches</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 text-4xl font-900 text-ink-900 max-w-xl">{countWord(branches.length)} locations, one standard of care</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {branches.map((b, i) => (
            <Reveal key={b.name} delay={i * 80}>
              <div className="group h-full overflow-hidden rounded-3xl bg-white border border-brand-100 shadow-card flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-float">
                <div className="relative h-40 overflow-hidden">
                  <img loading="lazy" decoding="async" src={b.image} alt={`Celestial Dental ${b.name}`} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-4 text-sm font-900 uppercase tracking-wider text-white drop-shadow">{b.badge}</span>
                  <span className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-800 text-brand-700 backdrop-blur-sm">
                    <Clock className="h-3 w-3" />Open 7 days
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex gap-3">
                    <MapPin className="h-5 w-5 shrink-0 text-brand-500 mt-0.5" />
                    <address className="not-italic text-sm text-ink-700 leading-relaxed">
                      {b.address.map((line, j) => <span key={j} className="block">{line}</span>)}
                    </address>
                  </div>
                  <div className="flex gap-3 mt-auto flex-wrap">
                    <a href={b.phoneHref} className="btn-ghost text-sm !px-4 !py-2.5">
                      <Phone className="h-4 w-4" />{b.phone}
                    </a>
                    <button onClick={() => openBooking()} className="btn-primary text-sm !px-4 !py-2.5">
                      <MessageCircle className="h-4 w-4" />Appointments
                    </button>
                  </div>
                  <Link to={`/branches/${b.slug}`} className="inline-flex items-center gap-1.5 text-sm font-800 text-brand-600 hover:text-brand-800 transition-colors">
                    View branch page
                    <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </Link>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Insurers() {
  const insurers = useSection<InsurerItem>('insurers', staticInsurers);
  return (
    <section className="py-16 border-y border-brand-100 overflow-hidden">
      <div className="container-page mb-10 text-center">
        <Reveal>
          <span className="eyebrow justify-center"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Payment</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-3 text-3xl lg:text-4xl font-900 text-ink-900">
            Insurance and <span className="text-brand-600">SHA</span>
          </h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="mt-3 text-sm lg:text-base text-ink-500 max-w-xl mx-auto">
            Bring your insurance or SHA details to your appointment. Confirm that your scheme is accepted, and what it covers, with the branch before treatment.
          </p>
        </Reveal>
      </div>
      <div className="mask-fade-x">
        <div className="flex gap-6 animate-marquee w-max px-6 [&:hover]:[animation-play-state:paused]">
          {[...insurers, ...insurers].map((ins, i) => (
            <div key={i} className="relative flex items-center justify-center h-16 w-28 shrink-0 grayscale opacity-70 transition-all duration-300 hover:z-10 hover:scale-[1.35] hover:grayscale-0 hover:opacity-100">
              <img loading="lazy" decoding="async"
                src={ins.logo}
                alt={`${ins.name} insurance accepted at Celestial Dental Centre`}
                className={`object-contain ${BIG_LOGOS.has(ins.name) ? 'max-h-14 max-w-28' : 'max-h-11 max-w-24'}`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/*
 * The Google Reviews section was removed on 2026-09-19 under Rule 5(1)(a),(b).
 * Reproducing patient reviews on the site is patient testimony in advertising
 * whatever the source, and the live feed's top review named a practitioner as
 * "Dr." without a stated cadre. The review CTA cards on the branch pages, which
 * invite patients to leave a review on Google, are unaffected.
 */

type ApiBlogPost = {
  id: string; status: string; slug: string; tag: string;
  title: string; excerpt: string; image: string; date: string; readTime: string;
};

function Blog() {
  const [apiPosts, setApiPosts] = useState<ApiBlogPost[] | null>(null);

  useEffect(() => {
    fetch('/api/blog')
      .then(r => r.ok ? r.json() : null)
      .then(data => setApiPosts(data?.posts ?? []))
      .catch(() => setApiPosts([]));
  }, []);

  // Only the newest few belong on the landing page — the rest live on /blog.
  const posts = (apiPosts ?? []).slice(0, 3);

  if (apiPosts !== null && posts.length === 0) return null;

  return (
    <section id="blog" className="py-20 lg:py-28">
      <div className="container-page">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Reveal>
              <span className="eyebrow">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
                Dental Tips & News
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 text-4xl font-900 text-ink-900 max-w-xl">
                From our dental team
              </h2>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <Link
              to="/blog"
              className="btn-ghost text-sm !px-5 !py-2.5 shrink-0"
            >
              View all posts →
            </Link>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {posts.map((post, i) => (
            <Reveal key={post.slug} delay={i * 80}>
              <article className="group flex flex-col overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-card hover:-translate-y-1 transition-transform duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img loading="lazy" decoding="async"
                    src={post.image}
                    alt={post.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-800 text-brand-700 backdrop-blur-sm shadow-sm">
                    {post.tag}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-3 text-xs text-ink-500 font-medium mb-3">
                    <span>{post.date}</span>
                    <span className="h-1 w-1 rounded-full bg-ink-500/40" />
                    <span>{post.readTime}</span>
                  </div>
                  <h3 className="text-lg font-800 text-ink-900 leading-snug group-hover:text-brand-700 transition-colors">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500 flex-1">
                    {post.excerpt}
                  </p>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-800 text-brand-600 hover:text-brand-800 transition-colors"
                  >
                    Read more
                    <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                  </Link>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);
  const { openBooking } = useBooking();
  const faqs = useFaqs();
  return (
    <section id="faq" className="py-20 lg:py-28">
      <div className="container-page max-w-3xl">
        <Reveal>
          <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />FAQ</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 text-4xl font-900 text-ink-900">Common questions</h2>
        </Reveal>
        <div className="mt-10 divide-y divide-brand-100">
          {faqs.map((f, i) => (
            <Reveal key={i} delay={i * 50}>
              <div>
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left"
                >
                  <span className="font-800 text-ink-900">{f.q}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-brand-500 transition-transform ${open === i ? 'rotate-180' : ''}`} />
                </button>
                {open === i && (
                  <p className="pb-5 text-sm leading-relaxed text-ink-500">{f.a}</p>
                )}
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={200}>
          <div className="mt-12 rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 p-8 text-center">
            <h3 className="text-2xl font-900 text-ink-900">Contact Celestial Dental Centre</h3>
            <p className="mt-2 text-sm font-600 text-ink-900/70">Open 7 days a week · 07:00 – 20:00</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={() => openBooking()} className="btn-primary !bg-none !bg-ink-900 !text-white !shadow-none hover:!shadow-none">
                <MessageCircle className="h-4 w-4" />Appointments
              </button>
              <a href={site.primaryPhone.href} className="btn-ghost !text-ink-900 !border-ink-900/25 !bg-white/25 hover:!bg-white/40">
                <Phone className="h-4 w-4" />{site.primaryPhone.label}
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function AppInner() {
  const { openBooking } = useBooking();
  const location = useLocation();
  // Old-site /appointment links 301 here as /?book=1 — open the booking modal.
  useEffect(() => {
    if (new URLSearchParams(location.search).has('book')) openBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      <SEO
        title="Dentist in Nairobi (Kasarani), Kamakis–Ruiru, Eldoret & Kiambu Road | Celestial Dental Centre"
        description="Dental clinic in Kasarani (Nairobi), Kamakis–Ruiru, Eldoret, and Kiambu Road: dental checkups, teeth cleaning, braces, implants, root canal treatment, cosmetic dentistry, and same-day emergency dental care. Open daily 07:00-20:00. Insurance & M-Pesa accepted."
        canonicalPath="/"
        keywords={['teeth cleaning Nairobi', 'root canal Nairobi', 'children dentist Kenya', 'cosmetic dentistry Kenya', 'dentist Ruiru', 'dental clinic Kenya']}
      />
      <Header />
      <main>
        <Hero />
        <Insurers />
        <Services />
        <WhyUs />
        <Gallery />
        <Branches />
        <Blog />
        <FAQ />
      </main>
      <SiteFooter />
      <BookingModal />
    </>
  );
}

/**
 * Scrolls to the element named in the URL hash after route changes. The app is
 * client-rendered, so on a fresh load the target section doesn't exist yet —
 * we retry briefly until it mounts. Plain route changes scroll to the top.
 */
function ScrollToHash() {
  const location = useLocation();
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (location.hash) {
      const id = location.hash.slice(1);
      let attempts = 0;
      const tryScroll = () => {
        const target = document.getElementById(id);
        if (!target) {
          if (attempts++ < 30) timers.push(setTimeout(tryScroll, 100));
          return;
        }
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Images above the target keep loading and push it further down —
        // re-correct a few times until the layout settles on it.
        for (let i = 1; i <= 6; i++) {
          timers.push(setTimeout(() => {
            const rect = target.getBoundingClientRect();
            if (Math.abs(rect.top) > 10) {
              target.scrollIntoView({ behavior: i <= 2 ? 'smooth' : 'auto', block: 'start' });
            }
          }, i * 450));
        }
      };
      tryScroll();
    } else {
      window.scrollTo(0, 0);
    }
    return () => timers.forEach(clearTimeout);
  }, [location.pathname, location.hash]);
  return null;
}

export default function App() {
  useEffect(() => {
    installContactClickTracking();
    // Read campaign parameters off the landing URL before any navigation can
    // drop them, so a booking made days later is still credited.
    captureAttribution();
  }, []);
  return (
    <>
      <ScrollToHash />
      {/* The fallback is deliberately empty: these chunks land in a few hundred
          milliseconds and a flashed spinner reads as jank, not as progress. */}
      <Suspense fallback={null}>
      <Routes>
        <Route
          path="/"
          element={
            <BookingProvider>
              <AppInner />
            </BookingProvider>
          }
        />
        <Route path="/braces" element={<BracesPage />} />
        <Route path="/services/:slug" element={<ServicePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/branches/:slug" element={<BranchPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/careers" element={<CareersPage />} />
        {/* Blog articles live at root-level keyword slugs (e.g. /braces-after-a-root-canal);
            anything that doesn't match a post redirects home like the old catch-all */}
        <Route path="/:slug" element={<BlogPostPage rootLevel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      <AccessibilityWidget />
      <RetargetingConsent />
      <WhatsAppButton />
    </>
  );
}
