import { useParams, Link, Navigate } from 'react-router-dom';
import { Phone, MessageCircle, ArrowLeft, ChevronRight, Check, Clock } from 'lucide-react';
import { services as staticServices, serviceSlug, site } from '../data/site';
import { useSection } from '../data/siteData';
import { Header } from '../components/Header';
import { Reveal } from '../components/Reveal';
import { BookingProvider, useBooking } from '../components/booking';
import { BookingModal } from '../components/BookingModal';
import { SchemaOrg } from '../components/SchemaOrg';
import { SEO } from '../components/SEO';
import { SiteFooter } from '../components/SiteFooter';
import { PhoneLinks } from '../components/PhoneLinks';

type ServiceFaq = { q: string; a: string };
type Service = {
  title: string;
  description: string;
  image: string;
  faqs?: ServiceFaq[];
};

function ServicePageInner() {
  const { slug } = useParams<{ slug: string }>();
  const services = useSection<Service>('services', staticServices);
  const { openBooking } = useBooking();

  const service = services.find(s => serviceSlug(s.title) === slug);

  // Old-site service URLs had no hyphens (e.g. /services/teethextraction) and
  // omitted "and" (/services/dentalbridgescrowns) — redirect them to the
  // canonical slug instead of showing "Service not found".
  if (!service && slug) {
    const compact = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
    const legacyMatch = services.find(s => {
      const canonical = serviceSlug(s.title).replace(/-/g, '');
      return canonical === compact || canonical.replace(/and/g, '') === compact;
    });
    if (legacyMatch) return <Navigate to={`/services/${serviceSlug(legacyMatch.title)}`} replace />;
  }

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-800 text-ink-900">Service not found</h1>
        <Link to="/services" className="btn-primary">See all services</Link>
      </div>
    );
  }

  const others = services.filter(s => serviceSlug(s.title) !== slug).slice(0, 6);
  const faqs = service.faqs || [];

  // FAQ structured data helps this page win rich results & AI answer citations
  const faqSchema = faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqs.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://celestialdental.org/' },
      { '@type': 'ListItem', position: 2, name: 'Services', item: 'https://celestialdental.org/services' },
      {
        '@type': 'ListItem',
        position: 3,
        name: service.title,
        item: `https://celestialdental.org/services/${serviceSlug(service.title)}`,
      },
    ],
  };

  return (
    <>
      <SEO
        title={`${service.title} in Kasarani, Kamakis, Eldoret & Kiambu Road | ${site.name}`}
        description={`${service.description} Book ${service.title.toLowerCase()} at Celestial Dental Centre — open daily across Kasarani, Kamakis, Eldoret, and Kiambu Road.`}
        image={service.image}
        canonicalPath={`/services/${serviceSlug(service.title)}`}
        keywords={[`${service.title} Nairobi`, `${service.title} Kenya`, `${service.title} Kasarani`, 'dentist Kenya']}
      />
      <SchemaOrg />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Header />
      <main className="pt-28">

        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-gold-50 py-16 lg:py-24">
          <div className="container-page">
            <Reveal>
              <Link to="/services" className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:text-brand-800 mb-6 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                All services
              </Link>
            </Reveal>
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <Reveal>
                  <span className="eyebrow">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
                    Our Services
                  </span>
                </Reveal>
                <Reveal delay={80}>
                  <h1 className="mt-4 text-4xl lg:text-5xl font-900 text-ink-900 leading-tight">{service.title}</h1>
                </Reveal>
                <Reveal delay={120}>
                  <p className="mt-5 text-lg text-ink-500 leading-relaxed">{service.description}</p>
                </Reveal>
                <Reveal delay={160}>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button onClick={() => openBooking(service.title)} className="btn-primary">
                      <Clock className="h-4 w-4" />
                      Book this service
                    </button>
                    <span className="btn-ghost">
                      <Phone className="h-4 w-4" />
                      <span>Call <PhoneLinks phone={site.primaryPhone.label} className="hover:underline" /></span>
                    </span>
                    <a href={site.whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp us
                    </a>
                  </div>
                </Reveal>
              </div>
              <Reveal delay={200}>
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full rounded-3xl border border-brand-100 object-cover shadow-card aspect-[4/3]"
                />
              </Reveal>
            </div>
          </div>
        </section>

        {/* What to expect */}
        <section className="py-16 lg:py-24">
          <div className="container-page max-w-3xl">
            <Reveal>
              <h2 className="text-3xl font-900 text-ink-900">What to expect</h2>
            </Reveal>
            <Reveal delay={80}>
              <ul className="mt-6 space-y-3">
                {[
                  'A calm, unhurried consultation with a qualified dentist.',
                  'A clear explanation of your options and recommended treatment plan.',
                  'Modern equipment and strict sterilisation standards at every branch.',
                  'Care available every day of the week, 07:00–20:00, including walk-ins.',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="text-ink-600 leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* FAQs */}
        {faqs.length > 0 && (
          <section className="py-16 lg:py-24 bg-mint">
            <div className="container-page max-w-3xl">
              <Reveal>
                <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Questions</span>
              </Reveal>
              <Reveal delay={80}>
                <h2 className="mt-4 text-3xl font-900 text-ink-900">{service.title} — common questions</h2>
              </Reveal>
              <div className="mt-8 space-y-4">
                {faqs.map((f, i) => (
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
        )}

        {/* Other services */}
        <section className="py-16 lg:py-24">
          <div className="container-page">
            <Reveal>
              <h2 className="text-3xl font-900 text-ink-900">Explore other services</h2>
            </Reveal>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((s, i) => (
                <Reveal key={s.title} delay={i * 60}>
                  <Link
                    to={`/services/${serviceSlug(s.title)}`}
                    className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-float"
                  >
                    <img loading="lazy" decoding="async" src={s.image} alt={s.title} className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="text-lg font-800 text-ink-900 group-hover:text-brand-700 transition-colors">{s.title}</h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-500">{s.description}</p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-800 text-brand-600">
                        Learn more <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 lg:py-24 bg-mint">
          <div className="container-page max-w-3xl">
            <Reveal>
              <div className="rounded-3xl bg-brand-700 p-8 lg:p-12 text-center">
                <h2 className="text-2xl lg:text-3xl font-900 text-white">Ready to book {service.title.toLowerCase()}?</h2>
                <p className="mt-2 text-sm text-brand-200">
                  Open every day across Kasarani, Kamakis, Eldoret, and Kiambu Road (Kiambu Road 08:00–18:00, other branches 07:00–20:00). Walk-ins welcome — booking ahead saves you time.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button onClick={() => openBooking(service.title)} className="btn-primary bg-white !text-brand-800 !shadow-none hover:!shadow-none">
                    <Clock className="h-4 w-4" />
                    Book an appointment
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

      <SiteFooter />

      <BookingModal />
    </>
  );
}

export function ServicePage() {
  return (
    <BookingProvider>
      <ServicePageInner />
    </BookingProvider>
  );
}
