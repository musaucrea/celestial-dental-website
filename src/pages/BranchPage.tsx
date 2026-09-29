import { useParams, Link } from 'react-router-dom';
import { Phone, MapPin, MessageCircle, Clock, Car, ChevronRight, ArrowLeft, ShieldCheck, Star } from 'lucide-react';
import { googleBusinessProfiles, services as staticServices, site } from '../data/site';
import { useBranches } from '../data/branches';
import { useSection } from '../data/siteData';
import { Header } from '../components/Header';
import { Reveal } from '../components/Reveal';
import { BookingProvider, useBooking } from '../components/booking';
import { BookingModal } from '../components/BookingModal';
import { SchemaOrg } from '../components/SchemaOrg';
import { SEO } from '../components/SEO';
import { SiteFooter } from '../components/SiteFooter';

function BranchPageInner() {
  const { slug } = useParams<{ slug: string }>();
  const branches = useBranches();
  const branch = branches.find(b => b.slug === slug);
  const { openBooking } = useBooking();
  const services = useSection<{ title: string; description: string; image: string }>('services', staticServices);

  if (!branch) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-800 text-ink-900">Branch not found</h1>
        <Link to="/" className="btn-primary">Back to home</Link>
      </div>
    );
  }

  const otherBranches = branches.filter(b => b.slug !== slug);
  const googleProfile = googleBusinessProfiles[branch.slug];
  const mapUrl = googleProfile?.profileUrl || branch.map;

  // Search phrasing includes the wider locality, not just the branch name
  // (e.g. people search "dentist in ruiru" for Kamakis, "nairobi" for Kasarani).
  const locality = { kasarani: 'Kasarani, Nairobi', kamakis: 'Kamakis, Ruiru', 'kiambu-road': 'Thindigua, Kiambu Road' }[branch.slug] || branch.name;

  return (
    <>
      <SEO
        title={`Dentist in ${locality} | ${site.name}`}
        description={`${branch.description} Open daily 07:00-20:00. SHA and 20+ insurance schemes accepted. Call ${branch.phone} to book dental checkups, braces, implants, root canal treatment, teeth cleaning, cosmetic dentistry, and emergency dental care.`}
        image={branch.image}
        canonicalPath={`/branches/${branch.slug}`}
        keywords={[
          `dentist ${branch.name}`,
          `dental clinic ${branch.name}`,
          `emergency dentist ${branch.name}`,
          `braces ${branch.name}`,
          `orthodontist ${branch.name}`,
          `dental implants ${branch.name}`,
          `teeth cleaning ${branch.name}`,
          `dental checkup ${branch.name}`,
        ]}
      />
      <SchemaOrg />
      <Header />
      <main className="pt-28">

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-gold-50 py-16 lg:py-24">
          <div className="container-page">
            <Reveal>
              <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-800 mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                All branches
              </Link>
            </Reveal>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <Reveal>
                  <span className="eyebrow">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
                    {branch.badge}
                  </span>
                </Reveal>
                <Reveal delay={80}>
                  <h1 className="mt-4 text-4xl lg:text-5xl font-900 text-ink-900 leading-tight">
                    Celestial Dental<br />
                    <span className="text-brand-600">{branch.name}</span>
                  </h1>
                </Reveal>
                <Reveal delay={120}>
                  <p className="mt-5 text-lg text-ink-500 leading-relaxed max-w-lg">{branch.description}</p>
                </Reveal>
                <Reveal delay={160}>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button onClick={() => openBooking()} className="btn-primary">
                      <MessageCircle className="h-4 w-4" />
                      Appointments
                    </button>
                    <a href={branch.phoneHref} className="btn-ghost">
                      <Phone className="h-4 w-4" />
                      {branch.phone}
                    </a>
                  </div>
                </Reveal>
              </div>
              <Reveal delay={100}>
                <div className="relative overflow-hidden rounded-3xl shadow-float">
                  <img
                    src={branch.image}
                    alt={`Celestial Dental ${branch.name}`}
                    className="w-full h-72 lg:h-96 object-cover"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Branch info cards */}
        <section className="py-16 bg-mint">
          <div className="container-page">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Reveal>
                <div className="rounded-3xl bg-white p-6 shadow-card flex flex-col gap-3">
                  <MapPin className="h-6 w-6 text-brand-500" />
                  <div>
                    <p className="text-xs font-800 text-ink-400 uppercase tracking-wider mb-1">Address</p>
                    <address className="not-italic text-sm text-ink-700 leading-relaxed">
                      {branch.address.map((line, i) => <span key={i} className="block">{line}</span>)}
                    </address>
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-800 text-brand-600 hover:text-brand-800 transition-colors"
                    >
                      View on map <ChevronRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={60}>
                <div className="rounded-3xl bg-white p-6 shadow-card flex flex-col gap-3">
                  <Clock className="h-6 w-6 text-brand-500" />
                  <div>
                    <p className="text-xs font-800 text-ink-400 uppercase tracking-wider mb-1">Opening Hours</p>
                    <p className="text-sm text-ink-700 leading-relaxed">{branch.hours}</p>
                    <p className="mt-1 text-xs text-brand-600 font-bold">Open 7 days a week</p>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={120}>
                <div className="rounded-3xl bg-white p-6 shadow-card flex flex-col gap-3">
                  <Phone className="h-6 w-6 text-brand-500" />
                  <div>
                    <p className="text-xs font-800 text-ink-400 uppercase tracking-wider mb-1">Contact</p>
                    <a href={branch.phoneHref} className="block text-sm font-bold text-ink-700 hover:text-brand-700 transition-colors">{branch.phone}</a>
                    <a href={branch.whatsapp} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-800 text-brand-600 hover:text-brand-800 transition-colors">
                      WhatsApp us <ChevronRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </Reveal>

              <Reveal delay={180}>
                <div className="rounded-3xl bg-white p-6 shadow-card flex flex-col gap-3">
                  <Car className="h-6 w-6 text-brand-500" />
                  <div>
                    <p className="text-xs font-800 text-ink-400 uppercase tracking-wider mb-1">Getting Here</p>
                    <p className="text-sm text-ink-700 leading-relaxed">{branch.landmark}</p>
                    <p className="mt-1 text-xs text-ink-500">{branch.parking}</p>
                  </div>
                </div>
              </Reveal>
            </div>

            <Reveal delay={240}>
              <div className="mt-6 rounded-3xl bg-white p-6 shadow-card flex items-start gap-4">
                <ShieldCheck className="h-6 w-6 shrink-0 text-brand-500" />
                <div>
                  <p className="text-xs font-800 text-ink-400 uppercase tracking-wider mb-1">Insurance &amp; SHA</p>
                  <p className="text-sm text-ink-700 leading-relaxed">
                    We accept SHA (Social Health Authority) for eligible schemes and covered treatments at our {branch.name} branch,
                    plus direct billing with 20+ insurers including Jubilee, AAR, Madison, CIC, Britam, APA and Equity Bank Insurance.
                    Bring your insurance card or SHA details and our front desk will handle pre-authorisation. M-Pesa and cash also accepted.
                  </p>
                </div>
              </div>
            </Reveal>

            {googleProfile && (
              <Reveal delay={280}>
                <div className="mt-6 rounded-3xl border border-gold-200 bg-gold-50 p-6 shadow-card sm:flex sm:items-center sm:justify-between sm:gap-6">
                  <div className="flex items-start gap-4">
                    <Star className="h-6 w-6 shrink-0 fill-gold-400 text-gold-500" />
                    <div>
                      <p className="font-900 text-ink-900">Visited our {branch.name} branch?</p>
                      <p className="mt-1 text-sm leading-relaxed text-ink-600">
                        Read the current feedback or share an honest review on our official Google Business Profile.
                        Every genuine patient experience helps people make a better-informed choice.
                      </p>
                    </div>
                  </div>
                  <a
                    href={googleProfile.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-ghost mt-5 shrink-0 text-sm sm:mt-0"
                  >
                    View or review on Google
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </Reveal>
            )}
          </div>
        </section>

        {/* Branch photo gallery (admin-managed, up to 5 photos) */}
        {branch.photos && branch.photos.length > 0 && (
          <section className="py-16 lg:py-20 bg-mint">
            <div className="container-page">
              <Reveal>
                <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Photo Tour</span>
              </Reveal>
              <Reveal delay={80}>
                <h2 className="mt-4 text-3xl font-900 text-ink-900">Inside our {branch.name} branch</h2>
              </Reveal>
              <div className="mt-10 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {branch.photos.slice(0, 5).map((src, i) => (
                  <Reveal key={`${src}-${i}`} delay={i * 50}>
                    <div className={`group overflow-hidden rounded-2xl shadow-card transition-all duration-300 hover:shadow-float ${i === 0 ? 'col-span-2' : ''}`}>
                      <img
                        src={src}
                        alt={`Celestial Dental ${branch.name} — photo ${i + 1}`}
                        loading="lazy"
                        className="w-full h-auto group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Services */}
        <section className="py-20 lg:py-28">
          <div className="container-page">
            <Reveal>
              <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Services at {branch.name}</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 text-4xl font-900 text-ink-900 max-w-xl">Everything your smile needs</h2>
            </Reveal>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s, i) => (
                <Reveal key={s.title} delay={i * 60}>
                  <div className="group overflow-hidden rounded-3xl bg-white shadow-card border border-brand-100 hover:-translate-y-1 transition-transform duration-300">
                    <div className="relative h-48 overflow-hidden">
                      <img loading="lazy" decoding="async" src={s.image} alt={s.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-800 text-ink-900">{s.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.description}</p>
                      <button onClick={() => openBooking(s.title)} className="mt-4 text-sm font-800 text-brand-600 hover:text-brand-800 transition-colors">What this involves →</button>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 lg:py-28">
          <div className="container-page max-w-3xl">
            <Reveal>
              <div className="rounded-3xl bg-brand-700 p-8 lg:p-12 text-center">
                <h3 className="text-2xl lg:text-3xl font-900 text-white">Book at our {branch.name} branch</h3>
                <p className="mt-2 text-sm text-brand-200">Open 7 days a week · 07:00 – 20:00</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button onClick={() => openBooking()} className="btn-primary bg-white !text-brand-800 !shadow-none hover:!shadow-none">
                    <MessageCircle className="h-4 w-4" />
                    Appointments
                  </button>
                  <a href={branch.phoneHref} className="btn-ghost !text-white !border-white/30 !bg-white/10">
                    <Phone className="h-4 w-4" />{branch.phone}
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Other branches */}
        <section className="py-16 bg-mint">
          <div className="container-page">
            <Reveal>
              <h2 className="text-2xl font-900 text-ink-900 mb-8">Other branches</h2>
            </Reveal>
            <div className="grid gap-6 sm:grid-cols-2">
              {otherBranches.map((b, i) => (
                <Reveal key={b.slug} delay={i * 80}>
                  <Link
                    to={`/branches/${b.slug}`}
                    className="group flex flex-col gap-4 rounded-3xl bg-white border border-brand-100 p-7 shadow-card hover:-translate-y-1 transition-transform duration-300"
                  >
                    <span className="eyebrow text-brand-600">{b.badge}</span>
                    <div className="flex gap-3">
                      <MapPin className="h-5 w-5 shrink-0 text-brand-500 mt-0.5" />
                      <address className="not-italic text-sm text-ink-700 leading-relaxed">
                        {b.address.map((line, j) => <span key={j} className="block">{line}</span>)}
                      </address>
                    </div>
                    <span className="mt-auto text-sm font-800 text-brand-600 group-hover:text-brand-800 transition-colors">
                      View branch →
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

      </main>

      <SiteFooter />

      <BookingModal />
    </>
  );
}

export function BranchPage() {
  return (
    <BookingProvider>
      <BranchPageInner />
    </BookingProvider>
  );
}
