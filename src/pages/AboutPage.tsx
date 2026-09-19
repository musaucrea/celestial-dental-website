import { Link } from 'react-router-dom';
import { Phone, MapPin, MessageCircle, HeartHandshake, Eye, ChevronRight } from 'lucide-react';
import { site, whyChooseUs as staticWhyChooseUs, gallery as staticGallery, stats as staticStats, team } from '../data/site';
import { useBranches } from '../data/branches';
import { useSection } from '../data/siteData';
import { Header } from '../components/Header';
import { Reveal } from '../components/Reveal';
import { BookingProvider, useBooking } from '../components/booking';
import { BookingModal } from '../components/BookingModal';
import { SchemaOrg } from '../components/SchemaOrg';
import { SEO } from '../components/SEO';

type AboutContent = {
  title: string;
  intro: string;
  story: string;
  mission: string;
  vision: string;
  image: string;
};

const defaultAbout: AboutContent = {
  title: 'Caring for Kenyan smiles, one visit at a time',
  intro:
    'Celestial Dental Centre is a family of modern dental clinics in Kasarani, Kamakis, and Eldoret — built on calm, personalised care for children and adults alike.',
  story:
    'Celestial Dental Centre is a group of dental clinics in Kenya, operating at three branches — Kasarani, Kamakis, and Eldoret.\n' +
    'Each branch offers the same range of dental services, from children\'s first check-ups to orthodontics, implants, and emergency care.\n' +
    'All three branches are open every day of the week, 07:00 – 20:00. Findings and treatment options are explained at the assessment, with the cost, before any treatment begins.',
  // Rule 3(4)(a): advertising must be objective, true and dignified. The previous
  // mission ("highest quality", "state-of-the-art") and vision ("centre of
  // excellence", "regional leader") were superiority claims.
  mission:
    'To provide oral and dental healthcare across our branches, with treatment options explained before they begin.',
  vision: '',
  image: '/team/clinical-team.jpg',
};

function AboutPageInner() {
  const { openBooking } = useBooking();
  const branches = useBranches();
  const about = useSection<AboutContent>('about', [defaultAbout])[0] ?? defaultAbout;
  const whyChooseUs = useSection<{ tag: string; title: string; description: string }>('whyChooseUs', staticWhyChooseUs);
  const gallery = useSection<{ src: string; caption: string }>('gallery', staticGallery);
  const stats = useSection<{ value: string; label: string }>('stats', staticStats);
  const staff = useSection<{ name: string; role?: string; image: string }>('team', team);
  /**
   * Set to true only when every person in `team` has a completed register row on
   * the verified fact sheet (name, cadre, title, position, qualifications and
   * registration number) and their card renders those fields. Until then the
   * individual cards stay hidden; the group photographs below carry no claim
   * about any named individual.
   */
  const practitionersVerified = false;
  const storyParagraphs = (about.story || '')
    .replace(/honest pricing/gi, 'honest guidance')
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  return (
    <>
      <SEO
        title={`About ${site.name} | Dental Clinics in Kasarani, Kamakis & Eldoret`}
        description="Learn about Celestial Dental Centre, a Kenyan dental clinic group serving Kasarani, Kamakis, and Eldoret with modern equipment, clear treatment planning, insurance support, and family-friendly care."
        image={about.image || defaultAbout.image}
        canonicalPath="/about"
        keywords={['about Celestial Dental Centre', 'dental clinic Kenya', 'family dentist Kenya']}
      />
      <SchemaOrg />
      <Header />

      {/* ── Page hero ─────────────────────────────────── */}
      <section className="bg-mint pt-36 pb-16 lg:pt-44 lg:pb-20">
        <div className="container-page">
          <Reveal>
            <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />About Us</span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-4 max-w-3xl text-4xl lg:text-5xl font-900 text-ink-900 leading-tight">{about.title}</h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-5 max-w-2xl text-lg text-ink-500 leading-relaxed">{about.intro}</p>
          </Reveal>
        </div>
      </section>

      {/* ── Story ─────────────────────────────────────── */}
      <section className="py-16 lg:py-24">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Our Story</span>
              <h2 className="mt-4 text-3xl font-900 text-ink-900">A friendlier kind of dental care</h2>
              <div className="mt-5 space-y-4">
                {storyParagraphs.map((para, i) => (
                  <p key={i} className="text-ink-500 leading-relaxed">{para}</p>
                ))}
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <button onClick={() => openBooking()} className="btn-primary">
                  <MessageCircle className="h-4 w-4" />Appointments
                </button>
                <a href={site.primaryPhone.href} className="btn-ghost">
                  <Phone className="h-4 w-4" />{site.primaryPhone.label}
                </a>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="relative">
              <img
                src={about.image || defaultAbout.image}
                alt={`The ${site.name} team`}
                className="w-full rounded-3xl object-cover shadow-float aspect-[4/3]"
              />
              <div className="absolute -bottom-5 left-6 rounded-2xl bg-white px-5 py-3.5 shadow-float border border-brand-100">
                <p className="font-display text-2xl font-900 text-brand-600">{stats[0]?.value}</p>
                <p className="text-xs font-700 uppercase tracking-wider text-ink-500">{stats[0]?.label}</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Mission & Vision ──────────────────────────── */}
      <section className="py-16 lg:py-20 bg-mint">
        <div className={`container-page grid gap-6 ${about.vision ? 'sm:grid-cols-2' : ''}`}>
          <Reveal>
            <div className="h-full rounded-3xl bg-white border border-brand-100 p-8 shadow-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-800 text-ink-900">Our Mission</h3>
              <p className="mt-2 text-ink-500 leading-relaxed">{about.mission}</p>
            </div>
          </Reveal>
          {about.vision && (
            <Reveal delay={100}>
              <div className="h-full rounded-3xl bg-white border border-brand-100 p-8 shadow-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-300/30 text-gold-600">
                  <Eye className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-800 text-ink-900">Our Vision</h3>
                <p className="mt-2 text-ink-500 leading-relaxed">{about.vision}</p>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ── Stats band ────────────────────────────────── */}
      <section className="py-14">
        <div className="container-page grid gap-6 sm:grid-cols-2 text-center">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div>
                <p className="font-display text-4xl font-900 text-brand-600">{s.value}</p>
                <p className="mt-1 text-sm font-700 uppercase tracking-wider text-ink-500">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Meet the team ─────────────────────────────── */}
      <section className="py-16 lg:py-20">
        <div className="container-page">
          <Reveal>
            <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Our Team</span>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 text-3xl font-900 text-ink-900 max-w-xl">Our team</h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-3 text-ink-500 max-w-2xl leading-relaxed">
              Our team supports calm, patient-first care across all our branches.
            </p>
          </Reveal>
          {/*
            Individual practitioner cards are withheld pending the verified fact
            sheet. Publishing a name requires the title and cadre as registered,
            the position held, the qualifications and the registration number, in
            that order; a bare name alongside advertised procedures is the gap the
            10 September 2026 ruling turned on. Each card must be built from a
            completed register row, never from the admin sheet's free-text fields.
            Restore this block once the fact sheet is signed.
          */}
          {staff.length > 0 && practitionersVerified && (
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {staff.map((member, i) => (
                <Reveal key={member.name} delay={i * 80}>
                  <div className="group h-full overflow-hidden rounded-3xl bg-white border border-brand-100 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-float">
                    <div className="aspect-[4/5] overflow-hidden bg-brand-50">
                      <img decoding="async"
                        src={member.image}
                        alt={`${member.name}, Celestial Dental Centre team member`}
                        loading="lazy"
                        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-800 text-ink-900">{member.name}</h3>
                      {member.role && <p className="mt-1 text-sm font-600 text-brand-600">{member.role}</p>}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}

          {/* Group photos of the full team */}
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            <Reveal>
              <figure className="overflow-hidden rounded-3xl border border-brand-100 shadow-card">
                <img decoding="async"
                  src="/team/clinical-team.jpg"
                  alt="The Celestial Dental clinical team at reception"
                  loading="lazy"
                  className="w-full object-cover aspect-[3/2]"
                />
              </figure>
            </Reveal>
            <Reveal delay={100}>
              <figure className="overflow-hidden rounded-3xl border border-brand-100 shadow-card">
                <img decoding="async"
                  src="/team/patient-care-team.jpg"
                  alt="The Celestial Dental patient-care team"
                  loading="lazy"
                  className="w-full object-cover aspect-[3/2]"
                />
              </figure>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Values ────────────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-mint">
        <div className="container-page">
          <Reveal>
            <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />What We Stand For</span>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="mt-4 text-3xl font-900 text-ink-900 max-w-xl">The values behind every visit</h2>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {whyChooseUs.map((w, i) => (
              <Reveal key={w.title} delay={i * 80}>
                <div className="h-full rounded-3xl bg-white border border-brand-100 p-7 shadow-card">
                  <span className="eyebrow text-gold-600">{w.tag}</span>
                  <h3 className="mt-3 text-lg font-800 text-ink-900">{w.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-500">{w.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gallery strip ─────────────────────────────── */}
      <section className="py-16">
        <div className="container-page">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {gallery.slice(0, 4).map((g, i) => (
              <Reveal key={g.src} delay={i * 60}>
                <img loading="lazy" decoding="async" src={g.src} alt={g.caption || 'Celestial Dental Centre clinic and facilities'} className="w-full h-auto rounded-3xl shadow-card" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Branches + CTA ────────────────────────────── */}
      <section className="py-16 lg:py-20 bg-mint">
        <div className="container-page">
          <Reveal>
            <h2 className="text-2xl font-900 text-ink-900 mb-8">Find us near you</h2>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-3">
            {branches.map((b, i) => (
              <Reveal key={b.slug} delay={i * 80}>
                <Link
                  to={`/branches/${b.slug}`}
                  className="group flex items-center justify-between rounded-3xl bg-white border border-brand-100 p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-float"
                >
                  <div>
                    <p className="font-800 text-ink-900">{b.name}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                      <MapPin className="h-3.5 w-3.5 text-brand-500" />{b.address[0]}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-brand-400 transition-transform group-hover:translate-x-1" />
                </Link>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <div className="mt-12 rounded-3xl bg-gradient-to-br from-gold-400 to-gold-600 p-8 text-center">
              <h3 className="text-2xl font-900 text-ink-900">Come and meet us in person</h3>
              <p className="mt-2 text-sm font-600 text-ink-900/70">Open 7 days a week · 07:00 – 20:00 · Walk-ins welcome</p>
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

      {/* ── Simple footer ─────────────────────────────── */}
      <footer className="bg-ink-900 py-10">
        <div className="container-page">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
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

export function AboutPage() {
  return (
    <BookingProvider>
      <AboutPageInner />
    </BookingProvider>
  );
}
