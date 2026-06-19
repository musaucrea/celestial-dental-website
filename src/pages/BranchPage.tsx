import { useParams, Link } from 'react-router-dom';
import { Phone, MapPin, MessageCircle, Clock, Car, ChevronRight, ArrowLeft } from 'lucide-react';
import { branches, services, testimonials, site } from '../data/site';
import { Header } from '../components/Header';
import { Reveal } from '../components/Reveal';
import { BookingProvider, useBooking } from '../components/booking';
import { BookingModal } from '../components/BookingModal';
import { SchemaOrg } from '../components/SchemaOrg';

function BranchPageInner() {
  const { slug } = useParams<{ slug: string }>();
  const branch = branches.find(b => b.slug === slug);
  const { openBooking } = useBooking();

  if (!branch) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-800 text-ink-900">Branch not found</h1>
        <Link to="/" className="btn-primary">Back to home</Link>
      </div>
    );
  }

  const otherBranches = branches.filter(b => b.slug !== slug);

  return (
    <>
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
                      Book Appointment
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
                      href={branch.map}
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
          </div>
        </section>

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
                      <img src={s.image} alt={s.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-800 text-ink-900">{s.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink-500">{s.description}</p>
                      <button onClick={() => openBooking(s.title)} className="mt-4 text-sm font-800 text-brand-600 hover:text-brand-800 transition-colors">Book this →</button>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 lg:py-28 bg-mint">
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
                      {Array.from({ length: 5 }).map((_, j) => (
                        <svg key={j} className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed text-ink-700 italic">"{t.quote}"</p>
                    <p className="mt-4 text-xs font-800 text-ink-500">— {t.author}</p>
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
                <p className="mt-2 text-sm text-brand-200">Open 7 days a week · 07:00 – 20:00 · Fast response guaranteed</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button onClick={() => openBooking()} className="btn-primary bg-white !text-brand-800 !shadow-none hover:!shadow-none">
                    <MessageCircle className="h-4 w-4" />
                    Book Appointment
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
              <p className="mt-1">&copy; {new Date().getFullYear()} {site.name}</p>
            </div>
          </div>
        </div>
      </footer>

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
