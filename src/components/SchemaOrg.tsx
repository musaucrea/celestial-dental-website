import { useEffect } from 'react';
import { branches, faqs, blogPosts, site, services } from '../data/site';

/** Injects JSON-LD <script> tags into <head> on mount. */
export function SchemaOrg() {
  useEffect(() => {
    const schemas = buildSchemas();
    const tags = schemas.map((schema) => {
      const el = document.createElement('script');
      el.type = 'application/ld+json';
      el.textContent = JSON.stringify(schema);
      document.head.appendChild(el);
      return el;
    });
    return () => tags.forEach((el) => el.remove());
  }, []);

  return null;
}

function buildSchemas() {
  return [
    websiteSchema(),
    organizationSchema(),
    ...branches.map(branchSchema),
    faqSchema(),
    ...blogPosts.map(blogPostingSchema),
    ...services.filter(s => 'priceFrom' in s && s.priceFrom).map(medicalServiceSchema),
  ];
}

/* ─── WebSite ─────────────────────────────────────────────── */
function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: site.name,
    url: 'https://celestialdental.org/',
    description:
      'Celestial Dental Centre offers teeth cleaning, braces, implants, root canal treatment, cosmetic dentistry, and emergency dental care in Kasarani, Kamakis, and Eldoret.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://celestialdental.org/?s={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}

/* ─── Organization ────────────────────────────────────────── */
function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
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
    sameAs: [site.whatsappHref],
  };
}

/* ─── Dentist (one per branch) ────────────────────────────── */
const branchGeo: Record<string, { lat: number; lng: number }> = {
  Kasarani: { lat: -1.2197,  lng: 36.8979 },
  Kamakis:  { lat: -1.1853,  lng: 36.9761 },
  Eldoret:  { lat:  0.5143,  lng: 35.2698 },
};

function branchSchema(branch: (typeof branches)[0]) {
  const geo = branchGeo[branch.name];
  return {
    '@context': 'https://schema.org',
    '@type': 'Dentist',
    name: `${site.name} – ${branch.name}`,
    url: 'https://celestialdental.org/',
    telephone: branch.phone,
    email: site.email,
    image: 'https://celestialdental.org/facility/reception-lounge.jpg',
    address: {
      '@type': 'PostalAddress',
      streetAddress: branch.address[0],
      addressLocality: branch.name,
      addressRegion: branch.name === 'Eldoret' ? 'Uasin Gishu' : 'Nairobi',
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
    priceRange: '$$',
    currenciesAccepted: 'KES',
    paymentAccepted: 'Cash, M-Pesa, Insurance, NHIF, AAR, Jubilee, Madison, CIC, Britam, SHA, APA',
    knowsAbout: [
      'Braces', 'Orthodontics', 'Teeth Whitening', 'Dental Implants',
      'Root Canal Treatment', 'Children\'s Dentistry', 'Emergency Dentistry',
      'Dental Cleaning', 'Cosmetic Dentistry',
    ],
    hasMap: branch.map,
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
function faqSchema() {
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

/* ─── MedicalService (one per service with pricing) ──────── */
function medicalServiceSchema(service: (typeof services)[0]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'MedicalProcedure',
    name: service.title,
    description: service.description,
    procedureType: 'https://schema.org/TherapeuticProcedure',
    followup: 'Follow-up advice provided by dentist',
    ...('priceFrom' in service && service.priceFrom ? {
      offers: {
        '@type': 'Offer',
        priceCurrency: 'KES',
        description: `${service.priceFrom}${service.priceNote ? ' — ' + service.priceNote : ''}`,
        availability: 'https://schema.org/InStock',
        seller: { '@type': 'Organization', name: site.name },
      },
    } : {}),
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
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://celestialdental.org/blog/${post.slug}`,
    },
  };
}
