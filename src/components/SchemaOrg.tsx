import { useEffect } from 'react';
import { blogPosts, googleBusinessProfiles, serviceSlug, site, services, socials } from '../data/site';
import { useBranches, type Branch } from '../data/branches';
import { useFaqs, type Faq } from '../data/faqs';

/** Injects JSON-LD <script> tags into <head>. Rebuilds when branches/FAQs load. */
export function SchemaOrg() {
  const branches = useBranches();
  const faqs = useFaqs();

  useEffect(() => {
    const schemas = buildSchemas(branches, faqs);
    const tags = schemas.map((schema) => {
      const el = document.createElement('script');
      el.type = 'application/ld+json';
      el.textContent = JSON.stringify(schema);
      document.head.appendChild(el);
      return el;
    });
    return () => tags.forEach((el) => el.remove());
  }, [branches, faqs]);

  return null;
}

function buildSchemas(branches: Branch[], faqs: Faq[]) {
  return [
    websiteSchema(),
    serviceNavigationSchema(),
    organizationSchema(branches),
    ...branches.map(branchSchema),
    faqSchema(faqs),
    ...blogPosts.map(blogPostingSchema),
    ...services.map(s => medicalServiceSchema(s, branches)),
  ];
}

function serviceNavigationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Celestial Dental Centre services',
    itemListElement: services.map((service, index) => ({
      '@type': 'SiteNavigationElement',
      position: index + 1,
      name: service.title,
      url: `https://celestialdental.org/services/${serviceSlug(service.title)}`,
    })),
  };
}

/* ─── WebSite ─────────────────────────────────────────────── */
function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    alternateName: [site.shortName, ...site.alternateNames],
    url: 'https://celestialdental.org/',
    description:
      'Celestial Dental Centre offers teeth cleaning, braces, implants, root canal treatment, cosmetic dentistry, and emergency dental care in Kasarani, Kamakis, Eldoret, and Kiambu Road.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://celestialdental.org/?s={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}

/* ─── Organization ────────────────────────────────────────── */
function organizationSchema(branches: Branch[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': 'https://celestialdental.org/#organization',
    name: site.name,
    alternateName: site.alternateNames,
    url: 'https://celestialdental.org/',
    logo: 'https://celestialdental.org/brand/celestial-logo.png',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: site.primaryPhone.label,
        contactType: 'customer service',
        areaServed: 'KE',
        availableLanguage: ['English', 'Swahili'],
      },
    ],
    sameAs: socials.map((social) => social.href),
    department: branches.map((branch) => ({
      '@type': 'Dentist',
      '@id': `https://celestialdental.org/branches/${branch.slug}#dentist`,
      name: googleBusinessProfiles[branch.slug]?.name || `${site.name} – ${branch.name}`,
      url: `https://celestialdental.org/branches/${branch.slug}`,
    })),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Dental and orthodontic services',
      itemListElement: services.map((service) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'MedicalProcedure',
          '@id': `https://celestialdental.org/services/${serviceSlug(service.title)}#procedure`,
          name: service.title,
          url: `https://celestialdental.org/services/${serviceSlug(service.title)}`,
        },
      })),
    },
  };
}

/* ─── Dentist (one per branch) ────────────────────────────── */
const branchGeo: Record<string, { lat: number; lng: number }> = {
  Kasarani: { lat: -1.2197,  lng: 36.8979 },
  Kamakis:  { lat: -1.1853,  lng: 36.9761 },
  Eldoret:  { lat:  0.5143,  lng: 35.2698 },
};

function branchSchema(branch: Branch) {
  const geo = branch.lat != null && branch.lng != null
    ? { lat: branch.lat, lng: branch.lng }
    : branchGeo[branch.name];
  const googleProfile = googleBusinessProfiles[branch.slug];
  return {
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    '@id': `https://celestialdental.org/branches/${branch.slug}#dentist`,
    name: googleProfile?.name || `${site.name} – ${branch.name}`,
    alternateName: branch.slug === 'kasarani'
      ? ['Celestial Dental & Orthodontic Centre Nairobi', 'Celestial Dental Centre Kasarani']
      : [`Celestial Dental Centre ${branch.name}`],
    url: `https://celestialdental.org/branches/${branch.slug}`,
    telephone: branch.phone,
    email: site.email,
    image: 'https://celestialdental.org/facility/reception-lounge.jpg',
    address: {
      '@type': 'PostalAddress',
      streetAddress: branch.address.join(', '),
      addressLocality: branch.name,
      addressRegion: branch.region || (branch.name === 'Eldoret' ? 'Uasin Gishu' : 'Nairobi'),
      addressCountry: 'KE',
    },
    ...(geo && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: geo.lat,
        longitude: geo.lng,
      },
    }),
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday',
        ],
        opens: '07:00',
        closes: '20:00',
      },
    ],
    paymentAccepted: 'Cash, M-Pesa, Insurance, SHA (Social Health Authority), NHIF, AAR, Jubilee, Madison, CIC, Britam, APA',
    knowsAbout: [
      'Braces', 'Orthodontics', 'Teeth Whitening', 'Dental Implants',
      'Root Canal Treatment', 'Children\'s Dentistry', 'Emergency Dentistry',
      'Dental Cleaning', 'Cosmetic Dentistry',
    ],
    hasMap: googleProfile?.mapsUrl || branch.map,
    ...(googleProfile && { sameAs: [googleProfile.profileUrl] }),
    parentOrganization: {
      '@type': 'Organization',
      '@id': 'https://celestialdental.org/#organization',
      name: site.name,
      url: 'https://celestialdental.org/',
    },
    medicalSpecialty: [
      'Dentistry',
      'Orthodontics',
      'Oral Surgery',
      'Endodontics',
      'Pediatric Dentistry',
    ],
  };
}

/* ─── FAQPage ─────────────────────────────────────────────── */
function faqSchema(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };
}

/* ─── MedicalProcedure (one per service) ─────────────────── */
function medicalServiceSchema(service: (typeof services)[0], branches: Branch[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalProcedure',
    '@id': `https://celestialdental.org/services/${serviceSlug(service.title)}#procedure`,
    name: service.title,
    description: service.description,
    procedureType: 'https://schema.org/TherapeuticProcedure',
    followup: 'Follow-up advice provided by dentist',
    provider: branches.map(b => ({
      '@type': 'Dentist',
      name: `${site.name} – ${b.name}`,
      telephone: b.phone,
    })),
  };
}

/* ─── BlogPosting (one per post) ──────────────────────────── */
function blogPostingSchema(post: (typeof blogPosts)[0]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: `https://celestialdental.org${post.image}`,
    datePublished: post.date,
    author: {
      '@type': 'Organization',
      name: site.name,
      url: 'https://celestialdental.org/',
    },
    publisher: {
      '@type': 'Organization',
      name: site.name,
      logo: {
        '@type': 'ImageObject',
        url: 'https://celestialdental.org/brand/celestial-logo.png',
      },
    },
    // Articles are canonical at the root (`/{slug}`), not under `/blog/` — see
    // BlogPostPage's canonicalPath. Pointing the schema at a URL that only
    // redirects made each article look like two competing resources.
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://celestialdental.org/${post.slug}`,
    },
  };
}
