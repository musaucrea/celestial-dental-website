import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Clock, Check, MapPin, ChevronRight, Sparkles, Smile, ShieldCheck } from 'lucide-react';
import { site } from '../data/site';
import { useBranches } from '../data/branches';
import { Header } from '../components/Header';
import { Reveal } from '../components/Reveal';
import { BookingProvider, useBooking } from '../components/booking';
import { BookingModal } from '../components/BookingModal';
import { SchemaOrg } from '../components/SchemaOrg';
import { SEO } from '../components/SEO';
import { pushEvent } from '../lib/track';

const BRACE_TYPES = [
  {
    icon: ShieldCheck,
    title: 'Metal braces',
    text: 'The proven, most affordable option — effective for nearly every case, for children, teens, and adults.',
  },
  {
    icon: Sparkles,
    title: 'Ceramic braces',
    text: 'Tooth-coloured brackets that blend in with your smile while working just as hard as metal.',
  },
  {
    icon: Smile,
    title: 'Clear aligners',
    text: 'Removable, nearly invisible trays for simpler cases — easy to clean, easy to live with.',
  },
];

const STEPS = [
  { title: 'Consultation & assessment', text: 'A calm, unhurried orthodontic consultation with X-rays where needed, at the branch nearest to you.' },
  { title: 'Your personalised plan', text: 'A clear recommendation — metal, ceramic, or aligners — with realistic timelines agreed before anything starts.' },
  { title: 'Fitting & adjustments', text: 'Comfortable fitting, then regular check-ins to keep your treatment on track. Most cases take 12–24 months.' },
  { title: 'Your new smile', text: 'Braces off, retainers fitted, and guidance to keep your straightened smile for life.' },
];

const FAQS = [
  {
    q: 'Do you offer braces in Nairobi, Ruiru, Eldoret, and Kiambu Road?',
    a: 'Yes. Orthodontic consultations and braces are available at all four Celestial Dental branches — Kasarani in Nairobi, Kamakis along the Eastern Bypass in Ruiru, central Eldoret, and Thindigua along Kiambu Road. All branches are open every day, 07:00–20:00.',
  },
  {
    q: 'How long does orthodontic treatment take?',
    a: 'Most cases take 12–24 months. Your dentist will give you a personalised timeline at your first consultation after assessing your teeth.',
  },
  {
    q: 'Am I too old for braces?',
    a: 'No — healthy teeth can be straightened at any age. We treat children, teens, and adults, and will recommend the option that fits your case and lifestyle.',
  },
  {
    q: 'What is the difference between metal braces, ceramic braces, and clear aligners?',
    a: 'Metal braces are the most affordable and work for most cases. Ceramic braces are less visible. Clear aligners are removable and nearly invisible but suit simpler cases. We will help you choose at your consultation.',
  },
  {
    q: 'Can I pay with insurance or M-Pesa?',
    a: 'Yes. We accept M-Pesa, cash, and direct insurance billing with schemes like SHA, Jubilee, AAR, CIC, Britam, and Madison. Your treatment plan is agreed with you clearly before treatment begins.',
  },
];

function BracesPageInner() {
  const { openBooking } = useBooking();
  const branches = useBranches();

  const openBracesBooking = (source: string) => {
    pushEvent('booking_open', { service: 'Orthodontics (Braces)', cta: source });
    openBooking('Orthodontics (Braces)');
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <>
      <SEO
        title="Dental Braces in Nairobi, Ruiru, Eldoret & Kiambu Road | Orthodontist | Celestial Dental Centre"
        description="Straighten your smile with metal braces, ceramic braces, or clear aligners at Celestial Dental — orthodontic care in Kasarani (Nairobi), Kamakis–Ruiru, Eldoret, and Kiambu Road. Open 7 days, insurance & M-Pesa accepted. Book a braces consultation today."
        image="/facility/childrens-treatment-room.jpg"
        canonicalPath="/braces"
        keywords={[
          'dental braces Nairobi', 'dental braces Kenya', 'dental braces Eldoret', 'dental braces Kiambu Road',
          'braces Kasarani', 'orthodontist Kasarani', 'orthodontist Nairobi',
          'clear aligners Kenya', 'teeth straightening Kenya',
        ]}
      />
      <SchemaOrg />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Header />
      <main className="pt-28">

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-gold-50 py-16 lg:py-24">
          <div className="container-page">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <Reveal>
                  <span className="eyebrow">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
                    Orthodontics · Braces · Aligners
                  </span>
                </Reveal>
                <Reveal delay={80}>
                  <h1 className="mt-4 text-4xl lg:text-5xl font-900 text-ink-900 leading-tight">
                    Dental braces in Nairobi, Ruiru, Eldoret &amp; Kiambu Road
                  </h1>
                </Reveal>
                <Reveal delay={120}>
                  <p className="mt-5 text-lg text-ink-500 leading-relaxed">
                    Metal braces, ceramic braces, and clear aligners for children, teens, and adults —
                    fitted by a caring team, with clear timelines and a plan agreed before you start.
                    Open every day, 07:00–20:00.
                  </p>
                </Reveal>
                <Reveal delay={160}>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button onClick={() => openBracesBooking('hero')} className="btn-primary">
                      <Clock className="h-4 w-4" />
                      Book a braces consultation
                    </button>
                    <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp us
                    </a>
                  </div>
                </Reveal>
                <Reveal delay={200}>
                  <ul className="mt-8 grid gap-2 text-sm text-ink-600 sm:grid-cols-2">
                    {['Open 7 days a week', 'Insurance & M-Pesa accepted', 'Children, teens & adults', 'Four branches near you'].map(point => (
                      <li key={point} className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              </div>
              <Reveal delay={200}>
                <img loading="lazy" decoding="async"
                  src="/facility/childrens-treatment-room.jpg"
                  alt="Orthodontic treatment at Celestial Dental Centre"
                  className="w-full rounded-3xl border border-brand-100 object-cover shadow-card aspect-[4/3]"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* Types of braces */}
        <section className="py-16 lg:py-24">
          <div className="container-page">
            <Reveal>
              <h2 className="text-3xl font-900 text-ink-900">Which braces are right for you?</h2>
            </Reveal>
            <Reveal delay={60}>
              <p className="mt-3 max-w-2xl text-ink-500">
                Every smile is different. At your consultation we assess your teeth and recommend the
                option that fits your case, your lifestyle, and your budget.
              </p>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {BRACE_TYPES.map((t, i) => (
                <Reveal key={t.title} delay={i * 80}>
                  <div className="h-full rounded-3xl border border-brand-100 bg-white p-7 shadow-card">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                      <t.icon className="h-6 w-6" />
                    </span>
                    <h3 className="mt-5 text-lg font-800 text-ink-900">{t.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-500">{t.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 lg:py-24 bg-mint">
          <div className="container-page max-w-4xl">
            <Reveal>
              <h2 className="text-3xl font-900 text-ink-900">How treatment works</h2>
            </Reveal>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 80}>
                  <div className="h-full rounded-3xl border border-brand-100 bg-white p-7 shadow-card">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-sm font-900 text-white">
                      {i + 1}
                    </span>
                    <h3 className="mt-4 text-lg font-800 text-ink-900">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Branches */}
        <section className="py-16 lg:py-24">
          <div className="container-page">
            <Reveal>
              <h2 className="text-3xl font-900 text-ink-900">Get braces at a branch near you</h2>
            </Reveal>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {branches.map((b, i) => (
                <Reveal key={b.slug} delay={i * 80}>
                  <div className="flex h-full flex-col rounded-3xl border border-brand-100 bg-white p-7 shadow-card">
                    <h3 className="text-lg font-800 text-ink-900">{b.name}</h3>
                    <p className="mt-2 flex items-start gap-2 text-sm text-ink-500">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                      {b.address.join(', ')}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                      <a href={b.phoneHref} className="btn-ghost !px-4 !py-2 text-sm">
                        <Phone className="h-4 w-4" /> Call
                      </a>
                      <a href={b.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-4 !py-2 text-sm">
                        <MessageCircle className="h-4 w-4" /> WhatsApp
                      </a>
                    </div>
                    <Link
                      to={`/branches/${b.slug}`}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-800 text-brand-600 hover:text-brand-800 transition-colors"
                    >
                      Branch details <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="py-16 lg:py-24 bg-mint">
          <div className="container-page max-w-3xl">
            <Reveal>
              <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Questions</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 text-3xl font-900 text-ink-900">Braces — common questions</h2>
            </Reveal>
            <div className="mt-8 space-y-4">
              {FAQS.map((f, i) => (
                <Reveal key={f.q} delay={i * 60}>
                  <div className="rounded-3xl border border-brand-100 bg-white p-6 shadow-card">
                    <h3 className="text-lg font-800 text-ink-900">{f.q}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-500">{f.a}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-24">
          <div className="container-page max-w-3xl">
            <Reveal>
              <div className="rounded-3xl bg-brand-700 p-8 lg:p-12 text-center">
                <h2 className="text-2xl lg:text-3xl font-900 text-white">Ready to straighten your smile?</h2>
                <p className="mt-2 text-sm text-brand-200">
                  Book a braces consultation at Kasarani (Nairobi), Kamakis–Ruiru, Eldoret, or Kiambu Road.
                  Open every day, 07:00–20:00 — walk-ins welcome.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button onClick={() => openBracesBooking('footer-cta')} className="btn-primary bg-white !text-brand-800 !shadow-none hover:!shadow-none">
                    <Clock className="h-4 w-4" />
                    Book a consultation
                  </button>
                  <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-ghost !text-white !border-white/30 !bg-white/10">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp us
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-ink-900 text-white py-12">
        <div className="container-page">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <img src={site.logo} alt={site.name} className="h-10 w-auto brightness-0 invert" />
              <p className="mt-2 text-sm text-white/50">{site.tagline}</p>
            </div>
            <div className="text-sm text-white/50 text-center sm:text-right">
              <p>{site.hours}</p>
              <p className="mt-1">{site.email}</p>
              <p className="mt-1">&copy; {new Date().getFullYear()} {site.name}. Built by MusauCreative.</p>
            </div>
          </div>
        </div>
      </footer>

      <BookingModal />
    </>
  );
}

export function BracesPage() {
  return (
    <BookingProvider>
      <BracesPageInner />
    </BookingProvider>
  );
}
