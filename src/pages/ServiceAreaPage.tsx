import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Clock, MapPin, MessageCircle, Phone, Search, ShieldCheck } from 'lucide-react';
import { branchHours, googleBusinessProfiles, noInsuranceYetSlugs, serviceSlug, services as staticServices, shaBranchSlugs, site } from '../data/site';
import {
  areasForBranch,
  findServiceArea,
  serviceAreaBranchOrder,
  serviceAreaBranches,
  serviceAreas,
  type ServiceArea,
} from '../data/serviceAreas';
import { useBranches, type Branch } from '../data/branches';
import { useSection } from '../data/siteData';
import { Header } from '../components/Header';
import { Reveal } from '../components/Reveal';
import { BookingProvider, useBooking } from '../components/booking';
import { BookingModal } from '../components/BookingModal';
import { SchemaOrg } from '../components/SchemaOrg';
import { SEO } from '../components/SEO';
import { SiteFooter } from '../components/SiteFooter';
import { PhoneLinks } from '../components/PhoneLinks';
import { AreaChips } from '../components/AreaChips';

const SITE_URL = 'https://celestialdental.org';

/** One-line address; admin-entered lines sometimes already end in a comma. */
const oneLine = (lines: string[]) => lines.map(l => l.trim().replace(/,+$/, '')).filter(Boolean).join(', ');

/** Payment wording per branch; mirrors the branch page. */
function paymentText(branch: Branch) {
  if (noInsuranceYetSlugs.includes(branch.slug)) {
    return `The ${branch.name} branch accepts M-Pesa and cash. We are yet to start accepting insurance at this branch; for insurance or SHA, our Kasarani and Kamakis branches handle pre-authorisation.`;
  }
  const sha = shaBranchSlugs.includes(branch.slug);
  return `${sha ? 'SHA (for eligible schemes and covered treatments) and direct billing with 20+ insurers' : 'Direct billing with 20+ insurers'}, including Jubilee, AAR, Madison, CIC, Britam and APA, at the ${branch.name} branch. Bring your insurance card${sha ? ' or SHA details' : ''} and the front desk will handle pre-authorisation. M-Pesa and cash are also accepted.`;
}

function areaFaqs(area: ServiceArea, branch: Branch, other?: Branch) {
  const hours = branchHours[branch.slug]?.text || branch.hours;
  const place = serviceAreaBranches[branch.slug]?.place || branch.name;
  return [
    {
      q: `Is there a Celestial Dental clinic near ${area.name}?`,
      a: `Yes. Patients from ${area.name} visit our ${branch.name} branch in ${place}: ${oneLine(branch.address)}. From ${area.name}, ${area.route}.${other ? ` Our ${other.name} branch is also convenient from ${area.name}.` : ''}`,
    },
    {
      q: `What are the ${branch.name} branch's opening hours?`,
      a: `${hours.replace(/ · /g, ' ')}. For public holidays, call the branch to confirm.`,
    },
    {
      q: `Do you accept insurance for patients from ${area.name}?`,
      a: paymentText(branch),
    },
    {
      q: 'Can I book for my children and family?',
      a: `Yes. The ${branch.name} branch sees adults and children, including children's dentistry. Book online, call ${branch.phone.split('/')[0].trim()} or WhatsApp the branch and say how many people are coming.`,
    },
    {
      q: `What should I do in a dental emergency in ${area.name}?`,
      a: `Call or WhatsApp the ${branch.name} branch. We aim to see emergency patients the same day and will fit you in as quickly as we can.`,
    },
  ];
}

function ServiceAreaInner({ area }: { area: ServiceArea }) {
  const branches = useBranches();
  const { openBooking } = useBooking();
  const services = useSection<{ title: string; description: string; image: string }>('services', staticServices);
  const branch = branches.find(b => b.slug === area.branch);
  const other = area.alsoNear ? branches.find(b => b.slug === area.alsoNear) : undefined;
  if (!branch) return <Navigate to="/service-areas" replace />;

  const hours = branchHours[branch.slug]?.text || branch.hours;
  const place = serviceAreaBranches[branch.slug]?.place || branch.name;
  const mapUrl = googleBusinessProfiles[branch.slug]?.profileUrl || branch.map;
  const faqs = areaFaqs(area, branch, other);
  const canonicalPath = `/service-areas/${area.slug}`;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Service areas', item: `${SITE_URL}/service-areas` },
      { '@type': 'ListItem', position: 3, name: area.name, item: `${SITE_URL}${canonicalPath}` },
    ],
  };

  return (
    <>
      <SEO
        title={`Dentist near ${area.name} | ${branch.name} Branch | ${site.name}`}
        description={`Dental care for ${area.name} residents at Celestial Dental ${branch.name} (${place}). From ${area.name}, ${area.route}. Open ${hours.replace(/ · /g, ' ').replace('Every day', 'every day')}. Checkups, cleaning, braces, implants, root canal treatment and emergency care.`}
        image={branch.image}
        canonicalPath={canonicalPath}
        keywords={[`dentist ${area.name}`, `dentist near ${area.name}`, `dental clinic ${area.name}`, `braces ${area.name}`, `emergency dentist ${area.name}`]}
      />
      <SchemaOrg />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Header />
      <main className="pt-28">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-gold-50 py-16 lg:py-24">
          <div className="container-page">
            <Reveal>
              <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-sm font-bold text-brand-600">
                <Link to="/" className="hover:text-brand-800">Home</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <Link to="/service-areas" className="hover:text-brand-800">Service areas</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-ink-500">{area.name}</span>
              </nav>
            </Reveal>
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <Reveal>
                  <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Serving {area.name}</span>
                </Reveal>
                <Reveal delay={80}>
                  <h1 className="mt-4 text-4xl font-900 leading-tight text-ink-900 lg:text-5xl">
                    Dentist near <span className="text-brand-600">{area.name}</span>
                  </h1>
                </Reveal>
                <Reveal delay={120}>
                  <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-500">
                    {area.name} residents visit our <Link to={`/branches/${branch.slug}`} className="font-bold text-brand-700 hover:underline">{branch.name} branch</Link> in {place}.
                    From {area.name}, {area.route}.
                  </p>
                </Reveal>
                <Reveal delay={160}>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <button onClick={() => openBooking()} className="btn-primary">
                      <MessageCircle className="h-4 w-4" />
                      Book Appointment
                    </button>
                    <a href={branch.whatsapp} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp {branch.name}
                    </a>
                  </div>
                </Reveal>
              </div>
              <Reveal delay={100}>
                <div className="rounded-3xl bg-white p-6 shadow-float sm:p-8">
                  <p className="text-xs font-800 uppercase tracking-wider text-ink-400">Your nearest branch</p>
                  <p className="mt-2 text-2xl font-900 text-ink-900">Celestial Dental {branch.name}</p>
                  <div className="mt-5 space-y-4 text-sm text-ink-700">
                    <div className="flex gap-3">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
                      <div>
                        <address className="not-italic leading-relaxed">
                          {branch.address.map((line, i) => <span key={i} className="block">{line}</span>)}
                        </address>
                        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-800 text-brand-600 hover:text-brand-800">
                          Open in Google Maps <ChevronRight className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
                      <p>{hours}</p>
                    </div>
                    <div className="flex gap-3">
                      <Phone className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" />
                      <p className="font-bold"><PhoneLinks phone={branch.phone} className="hover:text-brand-700" /></p>
                    </div>
                  </div>
                  {other && (
                    <p className="mt-5 border-t border-brand-100 pt-4 text-sm text-ink-500">
                      Also convenient from {area.name}: our{' '}
                      <Link to={`/branches/${other.slug}`} className="font-bold text-brand-700 hover:underline">{other.name} branch</Link>.
                    </p>
                  )}
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Getting there + payment */}
        <section className="bg-mint py-16">
          <div className="container-page grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="h-full rounded-3xl bg-white p-7 shadow-card">
                <h2 className="text-xl font-900 text-ink-900">Getting to the clinic from {area.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-700">From {area.name}, {area.route}.</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">Landmark: {branch.landmark}. {branch.parking}.</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">Not sure of the way? Call or WhatsApp the branch and the front desk will direct you.</p>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="h-full rounded-3xl bg-white p-7 shadow-card">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-brand-500" />
                  <h2 className="text-xl font-900 text-ink-900">Insurance &amp; payment</h2>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-ink-700">{paymentText(branch)}</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Services */}
        <section className="py-20">
          <div className="container-page">
            <Reveal>
              <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Services</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 max-w-xl text-3xl font-900 text-ink-900 lg:text-4xl">Dental care for {area.name} families</h2>
            </Reveal>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((s, i) => (
                <Reveal key={s.title} delay={(i % 8) * 40}>
                  <Link
                    to={`/services/${serviceSlug(s.title)}`}
                    className="group flex h-full items-center justify-between gap-3 rounded-2xl border border-brand-100 bg-white px-5 py-4 text-sm font-800 text-ink-900 shadow-card transition-colors hover:border-brand-400 hover:text-brand-700"
                  >
                    {s.title}
                    <ChevronRight className="h-4 w-4 shrink-0 text-brand-500 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Other areas served by this branch */}
        <section className="bg-mint py-20">
          <div className="container-page">
            <Reveal>
              <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Service areas</span>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="mt-4 text-3xl font-900 text-ink-900 lg:text-4xl">Our {branch.name} Branch Serves:</h2>
              <p className="mt-3 text-ink-500">If you're not based in {area.name} but nearby, you're served by the same branch.</p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mt-8">
                <AreaChips branchSlug={branch.slug} current={area.slug} />
              </div>
            </Reveal>
            <Reveal delay={160}>
              <Link to="/service-areas" className="mt-8 inline-flex items-center gap-1 text-sm font-800 text-brand-600 hover:text-brand-800">
                See areas near all our branches <ChevronRight className="h-4 w-4" />
              </Link>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-20">
          <div className="container-page max-w-3xl">
            <Reveal>
              <h2 className="text-3xl font-900 text-ink-900">{area.name} patient FAQs</h2>
            </Reveal>
            <div className="mt-8 space-y-3">
              {faqs.map(f => (
                <details key={f.q} className="group rounded-2xl border border-brand-100 bg-white p-5 shadow-card">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-800 text-ink-900">
                    {f.q}
                    <ChevronRight className="h-4 w-4 shrink-0 text-brand-500 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-ink-700">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20">
          <div className="container-page max-w-3xl">
            <Reveal>
              <div className="rounded-3xl bg-brand-700 p-8 text-center lg:p-12">
                <h2 className="text-2xl font-900 text-white lg:text-3xl">Ready to book from {area.name}?</h2>
                <p className="mt-2 text-sm text-brand-200">{branch.name} branch · {hours}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <button onClick={() => openBooking()} className="btn-primary bg-white !text-brand-800 !shadow-none hover:!shadow-none">
                    <MessageCircle className="h-4 w-4" />
                    Book Appointment
                  </button>
                  <span className="btn-ghost !border-white/30 !bg-white/10 !text-white">
                    <Phone className="h-4 w-4" /><span><PhoneLinks phone={branch.phone} className="hover:underline" /></span>
                  </span>
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

export function ServiceAreaPage() {
  const { slug } = useParams<{ slug: string }>();
  const home = serviceAreas.find(a => a.slug === slug && a.home);
  // A branch's own area (e.g. Kasarani) is the branch page itself.
  if (home) return <Navigate to={`/branches/${home.branch}`} replace />;
  const area = findServiceArea(slug);
  if (!area) return <Navigate to="/service-areas" replace />;
  return (
    <BookingProvider>
      <ServiceAreaInner key={area.slug} area={area} />
    </BookingProvider>
  );
}

/** /service-areas — every area, grouped by the branch that serves it. */
function ServiceAreasIndexInner() {
  const branches = useBranches();
  const { openBooking } = useBooking();
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const groups = useMemo(
    () =>
      serviceAreaBranchOrder
        .map(slug => ({ slug, areas: areasForBranch(slug).filter(a => !q || a.name.toLowerCase().includes(q)) }))
        .filter(g => g.areas.length > 0),
    [q],
  );
  const areaCount = serviceAreas.length;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Service areas', item: `${SITE_URL}/service-areas` },
    ],
  };

  return (
    <>
      <SEO
        title={`Areas We Serve | Dentist near you in Nairobi, Ruiru, Kiambu Road & Eldoret | ${site.name}`}
        description={`Find the Celestial Dental branch nearest you. Our Kasarani, Kamakis, Kiambu Road and Eldoret branches serve ${areaCount} neighbourhoods, including Roysambu, Mwiki, Ruiru, Kahawa Sukari, Runda, Ridgeways, Elgon View and Langas.`}
        canonicalPath="/service-areas"
      />
      <SchemaOrg />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <Header />
      <main className="pt-28">
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-gold-50 py-16 lg:py-24">
          <div className="container-page">
            <Reveal>
              <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 transition-colors hover:text-brand-800">
                <ArrowLeft className="h-4 w-4" />
                Home
              </Link>
            </Reveal>
            <Reveal>
              <span className="eyebrow"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />Service areas</span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="mt-4 max-w-3xl text-4xl font-900 leading-tight text-ink-900 lg:text-5xl">
                Areas we serve
              </h1>
            </Reveal>
            <Reveal delay={120}>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-500">
                Four branches, {areaCount} neighbourhoods. Find your area to see which branch is nearest, how to get there and its opening hours.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <label className="mt-8 flex max-w-md items-center gap-3 rounded-full border border-brand-200 bg-white px-5 py-3 shadow-card focus-within:border-brand-500">
                <Search className="h-4 w-4 shrink-0 text-brand-500" />
                <span className="sr-only">Find your area</span>
                <input
                  type="search"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Find your area, e.g. Runda"
                  className="w-full bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
                />
              </label>
            </Reveal>
          </div>
        </section>

        <section className="py-16 lg:py-20">
          <div className="container-page space-y-14">
            {groups.length === 0 && (
              <div className="rounded-3xl bg-mint p-8 text-ink-700">
                <p className="font-800 text-ink-900">"{query}" isn't on our list yet.</p>
                <p className="mt-2 text-sm">
                  Call {site.primaryPhone.label} or <button onClick={() => openBooking()} className="font-bold text-brand-700 hover:underline">send a booking request</button> and we'll tell you which branch is closest.
                </p>
              </div>
            )}
            {groups.map(g => {
              const branch = branches.find(b => b.slug === g.slug);
              const name = branch?.name || serviceAreaBranches[g.slug]?.name || g.slug;
              return (
                <div key={g.slug}>
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-800 uppercase tracking-wider text-gold-600">{serviceAreaBranches[g.slug]?.place}</p>
                      <h2 className="mt-1 text-2xl font-900 text-ink-900 lg:text-3xl">Our {name} Branch Serves:</h2>
                    </div>
                    <Link to={`/branches/${g.slug}`} className="inline-flex items-center gap-1 text-sm font-800 text-brand-600 hover:text-brand-800">
                      View branch <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                  {branch && (
                    <p className="mt-2 text-sm text-ink-500">
                      {oneLine(branch.address)} · {branchHours[g.slug]?.text || branch.hours}
                    </p>
                  )}
                  <div className="mt-6">
                    <AreaChips branchSlug={g.slug} areas={g.areas} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
      <BookingModal />
    </>
  );
}

export function ServiceAreasIndexPage() {
  return (
    <BookingProvider>
      <ServiceAreasIndexInner />
    </BookingProvider>
  );
}
