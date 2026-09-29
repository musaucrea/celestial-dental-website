import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Header } from '../components/Header';
import { Reveal } from '../components/Reveal';
import { SchemaOrg } from '../components/SchemaOrg';
import { SEO } from '../components/SEO';
import { BookingProvider } from '../components/booking';
import { BookingModal } from '../components/BookingModal';
import { SiteFooter } from '../components/SiteFooter';
import { serviceSlug, services as staticServices, site } from '../data/site';
import { useSection } from '../data/siteData';

type Service = { title: string; description: string; image: string };

function ServicesPageInner() {
  const services = useSection<Service>('services', staticServices);

  return (
    <>
      <SEO
        title={`Dental Services in Kasarani, Kamakis, Eldoret & Kiambu Road | ${site.name}`}
        description="Explore dental checkups, teeth cleaning, braces, implants, root canal treatment, children's dentistry, cosmetic dentistry and emergency care at Celestial Dental Centre."
        canonicalPath="/services"
        keywords={['dental services Kenya', 'dentist Kasarani', 'dentist Kamakis', 'dentist Eldoret', 'dentist Kiambu Road']}
      />
      <SchemaOrg />
      <Header />
      <main className="bg-mint pb-24 pt-36 lg:pt-44">
        <div className="container-page">
          <Reveal>
            <span className="eyebrow">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
              Our Services
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-4 max-w-3xl text-4xl font-900 leading-tight text-ink-900 lg:text-5xl">
              Complete dental care across all our branches
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-500">
              Explore every treatment available at Celestial Dental Centre in Kasarani, Kamakis, Eldoret and Kiambu Road.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <Reveal key={service.title} delay={(index % 6) * 50}>
                <Link
                  to={`/services/${serviceSlug(service.title)}`}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-card transition hover:-translate-y-1 hover:shadow-float"
                >
                  <img loading="lazy" decoding="async" src={service.image} alt={service.title} className="h-48 w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="flex flex-1 flex-col p-6">
                    <h2 className="text-xl font-900 text-ink-900 group-hover:text-brand-700">{service.title}</h2>
                    <p className="mt-3 flex-1 text-sm leading-7 text-ink-500">{service.description}</p>
                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-800 text-brand-600">
                      View service <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
      <BookingModal />
    </>
  );
}

export function ServicesPage() {
  return (
    <BookingProvider>
      <ServicesPageInner />
    </BookingProvider>
  );
}
