export const site = {
  name: 'Celestial Dental Centre',
  shortName: 'Celestial Dental',
  tagline: 'Your smile matters',
  logo: '/brand/celestial-logo.png',
  email: 'info@celestialdental.org',
  emailHref: 'mailto:info@celestialdental.org',
  primaryPhone: { label: '+254 707 535 000', href: 'tel:+254707535000' },
  whatsappHref: 'https://wa.me/254767207000',
  hours: 'Monday – Sunday · 07:00 – 20:00',
};

export const nav = [
  { label: 'Services', href: '/#services' },
  { label: 'Why Choose Us', href: '/#why' },
  {
    label: 'Branches',
    href: '/#branches',
    dropdown: [
      { label: 'Kasarani', href: '/branches/kasarani' },
      { label: 'Kamakis', href: '/branches/kamakis' },
      { label: 'Eldoret', href: '/branches/eldoret' },
    ],
  },
  { label: 'Gallery', href: '/#gallery' },
  { label: 'Blog', href: '/#blog' },
  { label: 'FAQ', href: '/#faq' },
];

export const heroPills = ['Checkups', 'Braces', 'Implants', 'Emergency care'];

export const stats = [
  { value: '20+', label: 'Years of service' },
  { value: '3', label: 'Accessible branches' },
  { value: '10 min', label: 'Target response time' },
];

export const services = [
  {
    title: "Children's Dentistry",
    description:
      'Gentle, friendly care that helps young patients feel calm — from first visits to cavity care and prevention.',
    image: '/team/clinical-team.jpg',
    priceFrom: 'from KSh 2,000',
    priceNote: 'subject to consultation',
    faqs: [
      { q: 'At what age should my child first see a dentist?', a: 'We recommend bringing your child in as soon as their first tooth appears, or by age one — whichever comes first. Early visits help prevent problems and make dentistry feel normal.' },
      { q: 'How do you keep children calm during treatment?', a: 'Our child-friendly rooms, gentle approach, and patient explanations help kids feel safe. We never rush, and we involve children in what\'s happening at every step.' },
    ],
  },
  {
    title: 'Orthodontics & Braces',
    description:
      'Braces and aligner planning for children, teens, and adults, with clear timelines and progress reviews.',
    image: '/facility/childrens-treatment-room.jpg',
    priceFrom: 'from KSh 80,000',
    priceNote: 'metal braces · subject to consultation',
    faqs: [
      { q: 'How much do braces cost at Celestial Dental?', a: 'Metal braces start from KSh 80,000, ceramic braces from KSh 100,000, and clear aligners from KSh 120,000 — all subject to a consultation. The final cost depends on the complexity of your case and treatment duration.' },
      { q: 'How long does orthodontic treatment take?', a: 'Most cases take 12–24 months. Your dentist will give you a personalised timeline at your first consultation after assessing your teeth.' },
      { q: 'What\'s the difference between metal braces, ceramic, and aligners?', a: 'Metal braces are the most affordable and work for most cases. Ceramic braces are less visible. Clear aligners (like Invisalign-style) are removable and nearly invisible but suit simpler cases. We\'ll help you choose what\'s right for your teeth and lifestyle.' },
    ],
  },
  {
    title: 'Implants & Restorations',
    description:
      'Durable, natural-looking implants, crowns, and restorative work using quality materials.',
    image: '/facility/clinic-hallway.jpg',
    priceFrom: 'from KSh 45,000',
    priceNote: 'per implant · subject to consultation',
    faqs: [
      { q: 'How much do dental implants cost in Nairobi?', a: 'A single dental implant at Celestial Dental starts from KSh 45,000, which includes the titanium post, abutment, and crown. The final price depends on your bone condition and the number of implants needed.' },
      { q: 'Does the implant procedure hurt?', a: 'The procedure is done under local anaesthesia so you should feel little to no pain during placement. Some soreness is normal for a few days after — we provide clear aftercare instructions and a review appointment.' },
    ],
  },
  {
    title: 'Teeth Cleaning & Checkups',
    description:
      'Routine scaling, polishing, and exams that keep your smile healthy and catch issues early.',
    image: '/facility/reception-lounge.jpg',
    priceFrom: 'from KSh 2,500',
    priceNote: 'full-mouth cleaning · subject to consultation',
    faqs: [
      { q: 'How much does a dental cleaning cost?', a: 'A full-mouth scaling and polishing starts from KSh 2,500. A routine checkup with X-rays starts from KSh 1,500. Prices may vary by branch and complexity.' },
      { q: 'How often should I get my teeth cleaned?', a: 'We recommend a professional cleaning every 6 months for most adults. If you have gum disease or heavy tartar build-up, every 3–4 months is better — we\'ll advise you at your first visit.' },
    ],
  },
  {
    title: 'Cosmetic Dentistry',
    description:
      'Whitening, smile restoration, and aesthetic treatments tailored to how you want to look and feel.',
    image: '/facility/waiting-area.jpg',
    priceFrom: 'from KSh 8,000',
    priceNote: 'teeth whitening · subject to consultation',
    faqs: [
      { q: 'How much does teeth whitening cost?', a: 'Professional teeth whitening at Celestial Dental starts from KSh 8,000 for in-office treatment. Take-home whitening kits start from KSh 5,000. Results typically last 1–2 years with good oral hygiene.' },
      { q: 'Are whitening results guaranteed?', a: 'Whitening is designed to lighten natural tooth enamel by several shades. Individual results vary depending on the starting shade and tooth type. We assess your suitability at consultation to give you realistic expectations.' },
    ],
  },
  {
    title: 'Root Canal & Emergency Care',
    description:
      'Prompt relief for tooth pain, root canal treatment, and urgent dental emergencies when you need it.',
    image: '/team/patient-care-team.jpg',
    priceFrom: 'from KSh 15,000',
    priceNote: 'root canal · subject to consultation',
    faqs: [
      { q: 'How much does a root canal cost in Nairobi?', a: 'Root canal treatment at Celestial Dental starts from KSh 15,000 per tooth, subject to the number of canals and complexity. This typically includes the procedure and a temporary filling — a crown may be recommended separately.' },
      { q: 'Do you handle dental emergencies same day?', a: 'Yes. We aim to see emergency patients the same day — call or WhatsApp the nearest branch and we\'ll fit you in as quickly as possible. We\'re open every day, 07:00–20:00.' },
      { q: 'Is a root canal painful?', a: 'Modern root canal treatment is done under local anaesthesia and is designed to relieve pain, not cause it. Most patients are surprised at how comfortable the procedure is. Mild soreness for 1–2 days afterward is normal.' },
    ],
  },
];

export const whyChooseUs = [
  {
    tag: 'Technology',
    title: 'Modern dentistry, clear treatment planning',
    description:
      'From digital workflows to advanced restorative and cosmetic procedures, the team focuses on accurate diagnosis and clearly explained care.',
  },
  {
    tag: 'Materials',
    title: 'Quality materials and equipment',
    description:
      'Treatments use carefully selected instruments and materials from trusted manufacturers for durable, natural-looking results.',
  },
  {
    tag: 'Safety',
    title: 'Sterilization you can trust',
    description:
      'Every appointment is backed by strong sterilization protocols, clean clinical spaces, and consistent infection-control standards.',
  },
  {
    tag: 'Experience',
    title: 'Friendly care for children and adults',
    description:
      'Patients value calm communication, transparent guidance, and support that helps every visit feel manageable.',
  },
];

export const gallery = [
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
    map: 'https://maps.google.com/?q=Celestial+Dental+Centre+Kasarani',
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
    phone: '+254 754 400 500',
    phoneHref: 'tel:+254754400500',
    whatsapp: 'https://wa.me/254754400500',
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

export const testimonials = [
  {
    quote:
      'Their staff are very friendly and welcoming. They have excellent customer care and their prices are affordable.',
    author: 'Nairobi Resident',
  },
  {
    quote:
      'Calm, professional, and thorough. The team explained everything clearly and made my treatment stress-free.',
    author: 'Kasarani Resident',
  },
  {
    quote:
      'My kids actually look forward to their dental visits now. Patient, gentle, and genuinely caring.',
    author: 'Parent from Thika Road',
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
  { name: 'Equity Bank Insurance', logo: '/insurance/equity.svg' },
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
    q: 'How much does a dental checkup cost?',
    a: 'A routine checkup and consultation starts from KSh 1,500, and a full-mouth scaling and polishing (teeth cleaning) starts from KSh 2,500 — subject to consultation. We\'ll always explain costs upfront before any treatment begins.',
  },
  {
    q: 'How much do braces cost at Celestial Dental?',
    a: 'Metal braces start from KSh 80,000, ceramic braces from KSh 100,000, and clear aligners from KSh 120,000 — all subject to a full orthodontic consultation. The exact cost depends on the complexity of your case and expected treatment duration.',
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
    a: 'Use the "Book Appointment" button on this page, message us on WhatsApp, or call the branch nearest to you. We aim to respond within about 10 minutes during opening hours.',
  },
  {
    q: 'What should I expect on my first visit?',
    a: 'A warm welcome, a thorough examination, X-rays if needed, and a clear explanation of any treatment required — with a plan tailored to your priorities and budget. No pressure, no surprises.',
  },
];

export const referralSources = [
  'Google / online search',
  'ChatGPT / AI assistant',
  'Instagram',
  'Facebook',
  'WhatsApp',
  'Friend or family referral',
  'Doctor / hospital referral',
  'Walk-in / passed by the clinic',
  'Other',
];

export const serviceOptions = [
  'General checkup & cleaning',
  'Braces / orthodontics',
  'Dental implants',
  'Root canal treatment',
  "Children's dentistry",
  'Cosmetic dentistry',
  'Emergency / tooth pain',
  'Other',
];
