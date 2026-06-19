import { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { Phone, MapPin, MessageCircle, ChevronDown, Star } from 'lucide-react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Reveal } from './components/Reveal';
import { BookingProvider, useBooking } from './components/booking';
import { BookingModal } from './components/BookingModal';
import { SchemaOrg } from './components/SchemaOrg';
import { BranchPage } from './pages/BranchPage';
import {
  services,
  whyChooseUs,
  gallery,
  branches,
  testimonials,
  insurers,
  faqs,
  blogPosts,
  site,
} from './data/site';

function Services() {
  const { openBooking } = useBooking();
  return (
    <section id="services" className="py-20 lg:py-28 bg-mint">
      <div className="container-page">
        <Reveal>
          <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Our Services</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 text-4xl font-900 text-ink-900 max-w-xl">Everything your smile needs, under one roof</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s, i) => (
            <Reveal key={s.title} delay={i * 60}>
              <div className="group overflow-hidden rounded-3xl bg-white shadow-card hover:-translate-y-1 transition-transform duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img src={s.image} alt={s.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-800 text-ink-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.description}</p>
                  {'priceFrom' in s && s.priceFrom && (
                    <p className="mt-3 text-sm font-800 text-brand-700">
                      {s.priceFrom}
                      {s.priceNote && <span className="text-xs font-500 text-ink-400 ml-1">· {s.priceNote}</span>}
                    </p>
                  )}
                  <button onClick={() => openBooking(s.title)} className="mt-4 text-sm font-800 text-brand-600 hover:text-brand-800 transition-colors">Book this →</button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyUs() {
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
          {whyChooseUs.map((w, i) => (
            <Reveal key={w.title} delay={i * 80}>
              <div className="rounded-3xl border border-brand-100 bg-white p-7 shadow-card">
                <span className="eyebrow text-gold-600">{w.tag}</span>
                <h3 className="mt-3 text-xl font-800 text-ink-900">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{w.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Gallery() {
  return (
    <section id="gallery" className="py-20 lg:py-28 bg-mint">
      <div className="container-page">
        <Reveal>
          <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Our Clinic</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 text-4xl font-900 text-ink-900 max-w-xl">A space designed for comfort</h2>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {gallery.map((g, i) => (
            <Reveal key={g.src} delay={i * 60}>
              <div className="group relative overflow-hidden rounded-3xl shadow-card">
                <img src={g.src} alt={g.caption} className="h-56 w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 p-4">
                  <p className="text-xs font-700 text-white">{g.caption}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container-page">
        <Reveal>
          <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Patient Stories</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 text-4xl font-900 text-ink-900 max-w-xl">Loved by the community</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="rounded-3xl border border-brand-100 bg-white p-7 shadow-card">
                <div className="flex gap-1 text-gold-500 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => <Star key={j} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-sm leading-relaxed text-ink-700 italic">"{t.quote}"</p>
                <p className="mt-4 text-xs font-800 text-ink-500">— {t.author}</p>
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
  return (
    <section id="branches" className="py-20 lg:py-28 bg-mint">
      <div className="container-page">
        <Reveal>
          <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Our Branches</span>
        </Reveal>
        <Reveal delay={80}>
          <h2 className="mt-4 text-4xl font-900 text-ink-900 max-w-xl">Three locations, one standard of care</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {branches.map((b, i) => (
            <Reveal key={b.name} delay={i * 80}>
              <div className="rounded-3xl bg-white border border-brand-100 p-7 shadow-card flex flex-col gap-4">
                <span className="eyebrow text-brand-600">{b.badge}</span>
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
                    <MessageCircle className="h-4 w-4" />Book
                  </button>
                </div>
                <Link to={`/branches/${b.slug}`} className="mt-2 text-sm font-800 text-brand-600 hover:text-brand-800 transition-colors">
                  View branch page →
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Insurers() {
  return (
    <section className="py-16 border-y border-brand-100 overflow-hidden">
      <div className="container-page mb-8">
        <Reveal>
          <p className="text-center text-sm font-800 text-ink-500 uppercase tracking-widest">We accept major insurance & medical schemes</p>
        </Reveal>
      </div>
      <div className="mask-fade-x">
        <div className="flex gap-8 animate-marquee w-max">
          {[...insurers, ...insurers].map((ins, i) => (
            <div key={i} className="flex items-center justify-center h-12 w-32 shrink-0 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
              <img src={ins.logo} alt={ins.name} className="max-h-10 max-w-28 object-contain" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

type ApiBlogPost = {
  id: string; status: string; slug: string; tag: string;
  title: string; excerpt: string; image: string; date: string; readTime: string;
};

function Blog() {
  const [apiPosts, setApiPosts] = useState<ApiBlogPost[] | null>(null);

  useEffect(() => {
    fetch('/api/blog')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.posts?.length) setApiPosts(data.posts); })
      .catch(() => {});
  }, []);

  const posts = apiPosts ?? blogPosts;

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
            <a
              href="#blog"
              className="btn-ghost text-sm !px-5 !py-2.5 shrink-0"
            >
              View all posts →
            </a>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <Reveal key={post.slug} delay={i * 80}>
              <article className="group flex flex-col overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-card hover:-translate-y-1 transition-transform duration-300">
                <div className="relative h-48 overflow-hidden">
                  <img
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
                  <a
                    href={`#blog/${post.slug}`}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-800 text-brand-600 hover:text-brand-800 transition-colors"
                  >
                    Read more
                    <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
                  </a>
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
          <div className="mt-12 rounded-3xl bg-brand-700 p-8 text-center">
            <h3 className="text-2xl font-900 text-white">Ready to book?</h3>
            <p className="mt-2 text-sm text-brand-200">Open 7 days a week · 07:00 – 20:00 · Fast response guaranteed</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button onClick={() => openBooking()} className="btn-primary bg-white !text-brand-800 !shadow-none hover:!shadow-none">
                <MessageCircle className="h-4 w-4" />Book Appointment
              </button>
              <a href={site.primaryPhone.href} className="btn-ghost !text-white !border-white/30 !bg-white/10">
                <Phone className="h-4 w-4" />{site.primaryPhone.label}
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  const { openBooking } = useBooking();
  return (
    <footer className="bg-ink-900 text-white">
      {/* Main footer grid */}
      <div className="container-page py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

          {/* Brand column */}
          <div className="lg:col-span-1">
            <img src={site.logo} alt={site.name} className="h-11 w-auto brightness-0 invert" />
            <p className="mt-3 text-sm leading-relaxed text-white/50 max-w-xs">
              Calm, modern dental care for every smile — children, adults, and families.
            </p>
            <div className="mt-5 flex gap-3">
              <a
                href={site.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-800 text-white hover:bg-white/20 transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </a>
              <a
                href={site.primaryPhone.href}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-800 text-white hover:bg-white/20 transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                Call us
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-800 uppercase tracking-widest text-white/40 mb-4">Quick links</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Services', href: '#services' },
                { label: 'Why Choose Us', href: '#why' },
                { label: 'Our Branches', href: '#branches' },
                { label: 'Gallery', href: '#gallery' },
                { label: 'Blog', href: '#blog' },
                { label: 'FAQ', href: '#faq' },
              ].map(link => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-white/60 hover:text-white transition-colors">{link.label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Branches */}
          <div>
            <h4 className="text-xs font-800 uppercase tracking-widest text-white/40 mb-4">Our branches</h4>
            <ul className="space-y-4">
              {branches.map(b => (
                <li key={b.name}>
                  <p className="text-sm font-800 text-white">{b.name}</p>
                  <p className="text-xs text-white/50 mt-0.5 leading-relaxed">{b.address[0]}</p>
                  <a href={b.phoneHref} className="text-xs text-brand-300 hover:text-brand-200 transition-colors mt-0.5 block">{b.phone}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours & contact */}
          <div>
            <h4 className="text-xs font-800 uppercase tracking-widest text-white/40 mb-4">Hours & contact</h4>
            <div className="space-y-3 text-sm text-white/60">
              <div>
                <p className="font-800 text-white text-xs uppercase tracking-wide mb-1">Opening hours</p>
                <p>Monday – Sunday</p>
                <p>07:00 – 20:00</p>
              </div>
              <div>
                <p className="font-800 text-white text-xs uppercase tracking-wide mb-1">Email</p>
                <a href={site.emailHref} className="hover:text-white transition-colors">{site.email}</a>
              </div>
              <div>
                <p className="font-800 text-white text-xs uppercase tracking-wide mb-1">Phone</p>
                <a href={site.primaryPhone.href} className="hover:text-white transition-colors">{site.primaryPhone.label}</a>
              </div>
            </div>
            <button
              onClick={() => openBooking()}
              className="mt-6 btn-primary text-sm !px-5 !py-2.5 w-full justify-center"
            >
              <MessageCircle className="h-4 w-4" />
              Book Appointment
            </button>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container-page py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/35">
          <p>&copy; {new Date().getFullYear()} {site.name}. All rights reserved.</p>
          <p>{site.tagline}</p>
        </div>
      </div>
    </footer>
  );
}

function AppInner() {
  return (
    <>
      <SchemaOrg />
      <Header />
      <main>
        <Hero />
        <Insurers />
        <Services />
        <WhyUs />
        <Testimonials />
        <Gallery />
        <Branches />
        <Blog />
        <FAQ />
      </main>
      <Footer />
      <BookingModal />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <BookingProvider>
            <AppInner />
          </BookingProvider>
        }
      />
      <Route path="/branches/:slug" element={<BranchPage />} />
    </Routes>
  );
}
