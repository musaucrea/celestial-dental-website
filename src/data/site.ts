/**
 * Google Tag Manager container id (format: GTM-XXXXXXX). Leave empty to keep
 * GTM off. Loaded only after the visitor accepts the cookie banner.
 * NOTE: this file is also imported by the serverless API (Node), so it must
 * not reference import.meta.env — Vite-only syntax crashes the functions.
 */
export const gtmId = 'GTM-K8ZDP7VF';

/** GA4 web stream. Loaded directly after consent so analytics remains
 * operational while Google's malware scanner reviews the GTM container. */
export const ga4Id = 'G-VK0ZKB97KW';

export const site = {
  name: 'Celestial Dental Centre',
  shortName: 'Celestial Dental',
  alternateNames: [
    'Celestial Dental & Orthodontic Centre',
    'Celestial Dental & Orthodontic Centre Nairobi',
  ],
  tagline: 'Your smile matters',
  logo: '/brand/celestial-logo.png',
  email: 'info@celestialdental.org',
  emailHref: 'mailto:info@celestialdental.org',
  primaryPhone: { label: '+254 707 535 000', href: 'tel:+254707535000' },
  whatsappHref: 'https://wa.me/254767207000',
  hours: 'Monday – Sunday · 07:00 – 20:00',
};

export const socials = [
  { label: 'Facebook', href: 'https://www.facebook.com/CelestialDentalCentre/' },
  { label: 'Instagram', href: 'https://www.instagram.com/celestial_dental/' },
  { label: 'X', href: 'https://twitter.com/celestialdental' },
  { label: 'LinkedIn', href: 'https://ke.linkedin.com/company/celestial-dental-centre' },
  { label: 'WhatsApp', href: 'https://wa.me/254767207000' },
];

/**
 * Canonical Google Business Profile entities.
 *
 * Keep these separate from admin-managed directions links so the website,
 * structured data, and review calls-to-action consistently identify the
 * verified branch selected by the clinic.
 */
export const googleBusinessProfiles: Record<string, {
  name: string;
  profileUrl: string;
  mapsUrl: string;
}> = {
  kasarani: {
    name: 'Celestial Dental Centre -Kasarani Branch',
    profileUrl: 'https://share.google/g8vcwFAtSxwSbhEUW',
    mapsUrl: 'https://www.google.com/maps?cid=6616178097052496250',
  },
  eldoret: {
    name: 'Celestial Dental Centre -Eldoret Branch',
    profileUrl: 'https://share.google/1DW9GobEX1VWO4dUB',
    mapsUrl: 'https://share.google/1DW9GobEX1VWO4dUB',
  },
  kamakis: {
    name: 'Celestial Dental Centre -Kamakis Branch',
    profileUrl: 'https://share.google/DxCzsY8twDIjZrzoE',
    mapsUrl: 'https://share.google/DxCzsY8twDIjZrzoE',
  },
};

export const team = [
  { name: 'Dennis Onyango', image: '/team/staff/dennis-onyango.jpg' },
  { name: 'Ann Wambui', image: '/team/staff/ann-wambui.jpg' },
  { name: 'Amos Njega', image: '/team/staff/amos-njega.jpg' },
  { name: 'Doris Murithi', image: '/team/staff/doris-murithi.jpg' },
  { name: 'Millicent Nyongesa', image: '/team/staff/millicent-nyongesa.jpg' },
];

/** URL-safe slug from a title, e.g. "Orthodontics (Braces)" → "orthodontics-braces". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Stable slug for a service, used for its dedicated /services/<slug> page. */
export const serviceSlug = (title: string) => slugify(title);

export const nav = [
  { label: 'About Us', href: '/about' },
  { label: 'Services', href: '/services', dropdown: 'services' as const },
  { label: 'Why Choose Us', href: '/#why' },
  {
    label: 'Branches',
    href: '/#branches',
    dropdown: 'branches' as const,
  },
  { label: 'Gallery', href: '/#gallery' },
  { label: 'Blog', href: '/blog' },
  { label: 'Careers', href: '/careers' },
  { label: 'FAQ', href: '/#faq' },
];

export const heroPills = ['Checkups', 'Braces', 'Implants', 'Emergency care'];

export const stats = [
  { value: '20+', label: 'Years of service' },
  { value: '3', label: 'Accessible branches' },
  { value: '07:00–20:00', label: 'Open every day' },
];

export const services = [
  {
    title: 'Dental Checkup',
    description:
      'A thorough examination of your teeth, gums, and mouth to catch problems early — the simplest way to keep your smile healthy.',
    image: '/facility/reception-lounge.jpg',
    faqs: [
      { q: 'How often should I have a dental checkup?', a: 'For most people, every 6 months — even when nothing hurts. Regular checkups catch small problems early, when they are simpler to treat.' },
      { q: 'What happens during a dental checkup?', a: 'We examine your teeth and gums, check for decay, gum disease, and other issues, and discuss anything we find. If needed, we may recommend a cleaning, x-rays, or treatment — always explained clearly first.' },
    ],
  },
  {
    title: 'General Dentistry',
    description:
      'Everyday dental care and diagnosis for the whole family — your first stop for a healthy smile.',
    image: '/team/clinical-team.jpg',
    faqs: [
      { q: 'How often should I visit the dentist?', a: 'We recommend a checkup every 6 months, even when nothing hurts — small problems caught early are simpler to fix.' },
    ],
  },
  {
    title: 'Dental X-rays',
    description:
      'Safe, low-dose digital x-rays that reveal what the eye cannot see — hidden decay, bone health, and issues below the gumline.',
    image: '/facility/clinic-hallway.jpg',
    faqs: [
      { q: 'Are dental x-rays safe?', a: 'Yes. We use modern digital x-rays, which use a very low dose of radiation — far less than older film x-rays. We only take them when they will genuinely help your diagnosis.' },
      { q: 'Why do I need a dental x-ray?', a: 'X-rays let us see between and inside teeth, check the roots and jawbone, and spot problems like hidden decay or infection early — things a visual exam alone can miss.' },
    ],
  },
  {
    title: 'Dental Emergencies',
    description:
      'Same-day relief for severe tooth pain, swelling, knocked-out teeth, and urgent dental problems — 7 days a week.',
    image: '/facility/reception-lounge.jpg',
    faqs: [
      { q: 'Do you handle dental emergencies same day?', a: 'Yes. We aim to see emergency patients the same day — call or WhatsApp the nearest branch and we\'ll fit you in as quickly as possible. We\'re open every day, 07:00–20:00.' },
    ],
  },
  {
    title: 'Cosmetic Dentistry',
    description:
      'Smile makeovers, veneers, and aesthetic treatments tailored to how you want to look and feel.',
    image: '/facility/waiting-area.jpg',
  },
  {
    title: 'Teeth Whitening',
    description:
      'Professional in-office whitening and take-home kits that safely lift your smile by several shades.',
    image: '/team/patient-care-team.jpg',
    faqs: [
      { q: 'Are whitening results guaranteed?', a: 'Whitening is designed to lighten natural tooth enamel by several shades. Individual results vary depending on the starting shade and tooth type. We assess your suitability at consultation to give you realistic expectations.' },
    ],
  },
  {
    title: 'Dental Bridges & Crowns',
    description:
      'Strong, natural-looking crowns and bridges that restore damaged or missing teeth to full function.',
    image: '/facility/clinic-hallway.jpg',
  },
  {
    title: 'Full & Partial Dentures',
    description:
      'Comfortable, well-fitted dentures — full or partial — that restore your smile, speech, and chewing.',
    image: '/facility/waiting-area.jpg',
  },
  {
    title: 'Dental Implants',
    description:
      'Durable titanium implants with natural-looking crowns — the closest thing to a real tooth.',
    image: '/facility/clinic-hallway.jpg',
    faqs: [
      { q: 'Does the implant procedure hurt?', a: 'The procedure is done under local anaesthesia so you should feel little to no pain during placement. Some soreness is normal for a few days after — we provide clear aftercare instructions and a review appointment.' },
    ],
  },
  {
    title: 'Orthodontics (Braces)',
    description:
      'Metal braces, ceramic braces, and clear aligners for children, teens, and adults — with clear timelines.',
    image: '/facility/childrens-treatment-room.jpg',
    faqs: [
      { q: 'How long does orthodontic treatment take?', a: 'Most cases take 12–24 months. Your dentist will give you a personalised timeline at your first consultation after assessing your teeth.' },
      { q: 'What\'s the difference between metal braces, ceramic, and aligners?', a: 'Metal braces are the most affordable and work for most cases. Ceramic braces are less visible. Clear aligners (like Invisalign-style) are removable and nearly invisible but suit simpler cases. We\'ll help you choose what\'s right for your teeth and lifestyle.' },
    ],
  },
  {
    title: 'Root Canal Therapy',
    description:
      'Pain-relieving root canal treatment that saves your natural tooth — done gently under local anaesthesia.',
    image: '/team/patient-care-team.jpg',
    faqs: [
      { q: 'Is a root canal painful?', a: 'Modern root canal treatment is done under local anaesthesia and is designed to relieve pain, not cause it. Most patients are surprised at how comfortable the procedure is. Mild soreness for 1–2 days afterward is normal.' },
    ],
  },
  {
    title: "Children's Dentistry",
    description:
      'Gentle, friendly care that helps young patients feel calm — from first visits to cavity care and prevention.',
    image: '/facility/childrens-treatment-room.jpg',
    faqs: [
      { q: 'At what age should my child first see a dentist?', a: 'We recommend bringing your child in as soon as their first tooth appears, or by age one — whichever comes first. Early visits help prevent problems and make dentistry feel normal.' },
      { q: 'How do you keep children calm during treatment?', a: 'Our child-friendly rooms, gentle approach, and patient explanations help kids feel safe. We never rush, and we involve children in what\'s happening at every step.' },
    ],
  },
  {
    title: 'Dental Fillings',
    description:
      'Tooth-coloured fillings that stop cavities in their tracks and blend invisibly with your natural teeth.',
    image: '/team/clinical-team.jpg',
  },
  {
    title: 'Gum Disease Treatment',
    description:
      'Deep cleaning and gum therapy that treats bleeding gums, bad breath, and periodontal disease.',
    image: '/facility/reception-lounge.jpg',
  },
  {
    title: 'Teeth Extraction',
    description:
      'Safe, comfortable removal of damaged teeth and wisdom teeth, with clear aftercare and healing support.',
    image: '/facility/clinic-hallway.jpg',
  },
  {
    title: 'Teeth Cleaning',
    description:
      'Professional scaling and polishing that removes plaque and stains, keeping your gums healthy and breath fresh.',
    image: '/facility/reception-lounge.jpg',
    faqs: [
      { q: 'How often should I get my teeth cleaned?', a: 'We recommend a professional cleaning every 6 months for most adults. If you have gum disease or heavy tartar build-up, every 3–4 months is better — we\'ll advise you at your first visit.' },
    ],
  },
];

export const whyChooseUs = [
  {
    tag: 'Treatment planning',
    title: 'Written treatment plans',
    description:
      'Findings and treatment options are explained at the assessment and set out in writing, with the cost, before any treatment begins.',
  },
  {
    tag: 'Equipment',
    title: 'Instruments and materials',
    description:
      'Treatments use instruments and materials from established manufacturers, chosen for the procedure being carried out.',
  },
  {
    tag: 'Infection control',
    title: 'Instrument sterilisation',
    description:
      'Instruments are sterilised between patients and clinical areas are cleaned to documented infection-control procedures.',
  },
  {
    tag: 'Appointments',
    title: 'Care for children and adults',
    description:
      'Appointments allow time to explain what is being done, for both adults and children, at all three branches.',
  },
];

export const gallery = [
  { src: '/facility/clinic-exterior-night.jpg', caption: 'Celestial Dental clinic lit up at night' },
  { src: '/facility/clinic-hallway-evening.jpg', caption: 'Our bright treatment corridor with signature chandelier' },
  { src: '/team/receptionist.jpg', caption: 'We listen first, then make every visit feel easier' },
  { src: '/facility/reception-lounge.jpg', caption: 'Warm reception & patient lounge' },
  { src: '/facility/waiting-area.jpg', caption: 'Comfortable waiting area' },
  { src: '/facility/childrens-treatment-room.jpg', caption: 'Child-friendly treatment room' },
  { src: '/facility/clinic-hallway.jpg', caption: 'Bright, private treatment corridors' },
];

export const branches = [
  {
    name: 'Kasarani',
    slug: 'kasarani',
    badge: 'Kasarani Branch',
    tagline: 'Your smile, close to home in Kasarani',
    description:
      'Our Kasarani branch is conveniently located on the Kasarani–Mwiki Road, just minutes from Thika Road Mall. We offer the full range of Celestial Dental services in a calm, modern setting — from children\'s dentistry and routine check-ups to orthodontics, implants, and emergency care.',
    address: ['Total Petrol Station Building, 2nd Floor', 'Along Kasarani – Mwiki Road', 'Kasarani, Nairobi'],
    landmark: '5 minutes from Thika Road Mall',
    parking: 'Parking available at the Total Petrol Station',
    phone: '+254 707 535 000',
    phoneHref: 'tel:+254707535000',
    whatsapp: 'https://wa.me/254707535000',
    map: 'https://www.google.com/maps?cid=6616178097052496250',
    hours: 'Monday – Sunday · 07:00 – 20:00',
    image: '/facility/reception-lounge.jpg',
  },
  {
    name: 'Kamakis',
    slug: 'kamakis',
    badge: 'Kamakis Branch',
    tagline: 'Quality dental care along the Eastern Bypass',
    description:
      'The Kamakis branch serves Ruiru and surrounding areas with the same high standard of care as our flagship clinic. Easily accessible off the Eastern Bypass, the branch offers ample parking and the full range of dental services for the whole family.',
    address: ['Along Eastern Bypass', 'Kamakis, Ruiru', 'Kiambu County'],
    landmark: 'Easy access from the Eastern Bypass',
    parking: 'Ample parking available on-site',
    phone: '+254 724 202 252',
    phoneHref: 'tel:+254724202252',
    whatsapp: 'https://wa.me/254724202252',
    map: 'https://maps.google.com/?q=Celestial+Dental+Centre+Kamakis',
    hours: 'Monday – Sunday · 07:00 – 20:00',
    image: '/facility/waiting-area.jpg',
  },
  {
    name: 'Eldoret',
    slug: 'eldoret',
    badge: 'Eldoret Branch',
    tagline: 'Trusted dental care in the heart of Eldoret',
    description:
      'Celestial Dental Eldoret brings the same warm, professional care to the Rift Valley region. Located centrally along Banaptai Street, our Eldoret branch is easily accessible and offers all services — from preventive care and braces to implants and emergency treatment.',
    address: ['Along Banaptai Street', 'Eldoret Town', 'Uasin Gishu County'],
    landmark: 'Central Eldoret — easily accessible from all directions',
    parking: 'Street parking available nearby',
    phone: '+254 794 585 217',
    phoneHref: 'tel:+254794585217',
    whatsapp: 'https://wa.me/254794585217',
    map: 'https://maps.google.com/?q=Celestial+Dental+Centre+Eldoret',
    hours: 'Monday – Sunday · 07:00 – 20:00',
    image: '/facility/childrens-treatment-room.jpg',
  },
];

// Real Google reviews from the Kasarani & Kamakis Google Business profiles.
export const testimonials = [
  {
    quote:
      "Just had a root canal at this facility today, I was attended by Dr. Belinda, she was so kind. The place is cosy, comfortable waiting area, modern machines & before you realize it, you're done. They make a 'usually uncomfortable root canal procedure' so easy, painless and seamless.",
    author: 'Verified patient review',
    branch: 'Kamakis',
    stars: 5,
  },
  {
    quote:
      'Perfect experience all through, talked me through my course of treatment, a very warm, and professional dental practice this one.',
    author: 'Verified patient review',
    branch: 'Kamakis',
    stars: 5,
  },
  {
    quote:
      'Clean, warm and efficient reception. Great customer service and service delivery by the medical team.',
    author: 'Verified patient review',
    branch: 'Kasarani',
    stars: 4,
  },
];

export const insurers = [
  { name: 'Jubilee Insurance', logo: '/insurance/jubilee.png' },
  { name: 'AAR Insurance', logo: '/insurance/aar.png' },
  { name: 'Madison', logo: '/insurance/madison.png' },
  { name: 'CIC Group', logo: '/insurance/cic.png' },
  { name: 'Britam', logo: '/insurance/britam.png' },
  { name: 'SHA', logo: '/insurance/sha.png' },
  { name: 'APA Insurance', logo: '/insurance/apa.png' },
  { name: 'Liaison Group', logo: '/insurance/liaison.png' },
  { name: 'GA Insurance', logo: '/insurance/ga-insurance.svg' },
  { name: 'Co-operative Bank', logo: '/insurance/co-operative-bank.jpeg' },
  { name: 'Trident Insurance', logo: '/insurance/trident-insurance.jpeg' },
  { name: 'Saham Insurance', logo: '/insurance/saham-insurance.jpg' },
  { name: 'Kenya Commercial Bank', logo: '/insurance/kcb.png' },
  { name: 'Kenya Alliance Insurance', logo: '/insurance/kenya-alliance.png' },
  { name: 'Clarkson Insurance', logo: '/insurance/clarkson-insurance.png' },
  { name: 'Resolution Insurance', logo: '/insurance/resolution-insurance.png' },
  { name: 'Minet Insurance', logo: '/insurance/minet.png' },
  { name: 'First Assurance', logo: '/insurance/first-assurance.png' },
  { name: 'Karirana Estates', logo: '/insurance/karirana-estates.png' },
  { name: 'Heritage Insurance', logo: '/insurance/heritage.png' },
  { name: 'Equity Bank Insurance', logo: '/insurance/equity-bank.png' },
];

export const blogPosts = [
  {
    slug: 'how-often-should-you-visit-dentist',
    tag: 'Preventive Care',
    title: 'How Often Should You Really Visit the Dentist?',
    excerpt:
      "Most people wait until something hurts. Here's why regular check-ups — even when everything feels fine — can save you time, money, and discomfort down the line.",
    image: '/facility/reception-lounge.jpg',
    date: 'May 20, 2025',
    readTime: '4 min read',
  },
  {
    slug: 'braces-vs-aligners',
    tag: 'Orthodontics',
    title: 'Braces vs Clear Aligners: Which Is Right for You?',
    excerpt:
      'Both options can straighten your teeth — but the right choice depends on your lifestyle, age, and the complexity of your case. We break it down simply.',
    image: '/facility/childrens-treatment-room.jpg',
    date: 'Apr 8, 2025',
    readTime: '5 min read',
  },
  {
    slug: 'children-first-dental-visit',
    tag: "Children's Dentistry",
    title: "Making Your Child's First Dental Visit a Good One",
    excerpt:
      'A calm first visit sets the tone for a lifetime of healthy habits. Here are practical tips for parents to help their child feel safe and confident in the dental chair.',
    image: '/team/patient-care-team.jpg',
    date: 'Mar 15, 2025',
    readTime: '3 min read',
  },
];

export const faqs = [
  {
    q: 'What are your opening hours?',
    a: 'We are open Monday to Sunday, 07:00 to 20:00, across all branches in Kasarani, Kamakis, and Eldoret. Walk-ins are welcome, but booking ahead helps us reserve time for you.',
  },
  {
    q: 'Do you accept insurance and medical schemes?',
    a: 'Yes. We work with a wide range of insurers and medical schemes including Jubilee, AAR, Madison, CIC, Britam, APA, SHA, NHIF and many more. Bring your insurance card and our team will handle pre-authorisation and billing.',
  },
  {
    q: 'Do you accept M-Pesa?',
    a: 'Yes, we accept M-Pesa, cash, and direct insurance billing. For M-Pesa payments, our team at each branch will provide the till number at reception.',
  },
  {
    q: 'Is there a dentist open on Sunday in Nairobi?',
    a: 'Yes — Celestial Dental is open every day of the week, including Sundays and public holidays, from 07:00 to 20:00 across all three branches (Kasarani, Kamakis, and Eldoret).',
  },
  {
    q: 'Do you handle dental emergencies?',
    a: 'Yes. Call or WhatsApp the nearest branch and we\'ll aim to see you the same day. We\'re open 7 days a week, 07:00–20:00. For severe pain or swelling, come in directly and our team will prioritise you.',
  },
  {
    q: 'Do you treat children?',
    a: 'Absolutely. We offer gentle children\'s dentistry in a calm, child-friendly setting. We recommend bringing children for their first visit as soon as the first tooth appears, or by age one. Early visits build good habits and prevent anxiety.',
  },
  {
    q: 'How do I book an appointment?',
    a: 'Use the "Book Appointment" button on this page, message us on WhatsApp, or call the branch nearest to you. We aim to respond within about 5 minutes during opening hours.',
  },
  {
    q: 'What should I expect on my first visit?',
    a: 'A warm welcome, a thorough examination, X-rays if needed, and a clear explanation of any treatment required — with a plan tailored to your priorities and budget. No pressure, no surprises.',
  },
  {
    q: 'Where can I find an emergency dentist in Kasarani, Ruiru, or Eldoret?',
    a: 'Celestial Dental offers same-day emergency dental care at all three branches — Kasarani in Nairobi, Kamakis along the Eastern Bypass in Ruiru, and central Eldoret. Call or WhatsApp the nearest branch, or walk in directly; severe pain, swelling, or knocked-out teeth are prioritised. We are open every day, 07:00–20:00.',
  },
  {
    q: 'Do you offer braces and orthodontic treatment?',
    a: 'Yes. Orthodontic consultations and dental braces for children, teens, and adults are available at our Kasarani, Kamakis (Ruiru), and Eldoret branches. Book a consultation and our team will assess your smile and recommend the right treatment plan.',
  },
  {
    q: 'Do you place dental implants?',
    a: 'Yes. Dental implants are available at all our branches, including Eldoret. An implant consultation includes a thorough examination and X-rays, followed by a clear, personalised treatment plan to permanently replace missing teeth.',
  },
  {
    q: 'Do you offer teeth cleaning and dental check-ups?',
    a: 'Yes — professional teeth cleaning (scaling and polishing) and comprehensive dental check-ups are available daily at our Kasarani, Kamakis (Ruiru), and Eldoret branches. We recommend a check-up and cleaning every six months to keep your smile healthy.',
  },
  {
    q: 'How do I pay, and do you bill insurance directly?',
    a: 'Every treatment starts with a clear, personalised plan agreed with you upfront, including the cost, before any work begins. You can pay via M-Pesa, cash, or direct insurance billing with schemes like SHA, Jubilee, AAR, CIC, Britam, and Madison.',
  },
  {
    q: 'Which areas do you serve?',
    a: 'Our Kasarani branch serves Nairobi — including Mwiki, Roysambu, Zimmerman, and the wider Thika Road area. The Kamakis branch serves Ruiru, Kahawa Sukari, and the Eastern Bypass corridor. Our Eldoret branch serves Eldoret town and the greater Rift Valley region. If you are searching for a dentist near you in any of these areas, we are close by and open daily.',
  },
];

export const referralSources = [
  'Google / online search',
  'ChatGPT / AI assistant',
  'Instagram',
  'Facebook',
  'WhatsApp',
  'Influencer',
  'Friend or family referral',
  'Doctor / hospital referral',
  'Walk-in / passed by the clinic',
  'Other',
];

export const serviceOptions = [
  'General Dentistry',
  'Dental Emergencies',
  'Cosmetic Dentistry',
  'Teeth Whitening',
  'Dental Bridges & Crowns',
  'Full & Partial Dentures',
  'Dental Implants',
  'Orthodontics (Braces)',
  'Root Canal Therapy',
  "Children's Dentistry",
  'Dental Fillings',
  'Gum Disease Treatment',
  'Teeth Extraction',
  'Teeth Cleaning',
  'Other',
];

export const careers = {
  email: 'hr@celestialdental.org',
  emailHref: 'mailto:hr@celestialdental.org',
  intro:
    'We\'re a growing dental group across all our branches, built on calm, patient-first care. If you take pride in your craft and genuinely enjoy helping people, we\'d love to hear from you.',
  perks: [
    {
      tag: 'Growth',
      title: 'Room to grow',
      description:
        'Mentorship, continuous professional development, and clear paths to take on more responsibility across all our branches.',
    },
    {
      tag: 'Team',
      title: 'A supportive team',
      description:
        'Work alongside friendly, experienced clinicians and support staff who back each other every day.',
    },
    {
      tag: 'Tools',
      title: 'Modern equipment',
      description:
        'Practise with quality materials and well-maintained equipment in clean, purpose-built clinical spaces.',
    },
    {
      tag: 'Balance',
      title: 'Fair, flexible scheduling',
      description:
        'Open 7 days means shifts that can flex around your life, with a workload that respects your wellbeing.',
    },
  ],
  openings: [
    {
      title: 'Dental Officer / Dentist',
      type: 'Full-time',
      location: 'Kasarani · Kamakis · Eldoret',
      description:
        'Provide general and restorative dental care, from check-ups and cleanings to fillings, extractions, and root canals.',
    },
    {
      title: 'Orthodontist',
      type: 'Full-time / Sessional',
      location: 'Kasarani · Eldoret',
      description:
        'Plan and deliver braces and aligner treatment for children, teens, and adults. Relevant postgraduate orthodontic qualification required.',
    },
    {
      title: 'Dental Hygienist',
      type: 'Full-time',
      location: 'Kasarani · Kamakis',
      description:
        'Carry out scaling, polishing, and preventive care, and coach patients on oral hygiene. Diploma in dental hygiene and a warm, patient-friendly manner required.',
    },
    {
      title: 'Front Office / Patient Coordinator',
      type: 'Full-time',
      location: 'Kamakis · Eldoret',
      description:
        'Be the welcoming first point of contact — manage bookings, insurance pre-authorisation, and M-Pesa billing while keeping the patient experience smooth and friendly.',
    },
  ],
};
