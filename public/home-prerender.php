<?php
// Pre-rendered homepage for crawlers and AI assistants.
//
// This lives outside prerender.php on purpose. The generic crawler rewrite in
// .htaccess cannot match "/" — REQUEST_FILENAME resolves to the document root,
// so its !-d condition can never be satisfied — and prerender.php's own
// dispatch sends an empty slug to the SPA shell. The result was that the one
// page that should rank for "dentist Kasarani" was the only route serving
// crawlers no content and no schema, while every /services/* route had both.
// A separate file means the homepage can be routed and deployed on its own,
// without editing the 40KB prerender.php that serves every other route.
//
// Regular visitors never reach this: .htaccess routes only known bot agents.

require __DIR__ . '/blog-feed.php';

$SITE = CD_SITE;
$esc  = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');

// Kept in sync with `services` in src/data/site.ts (slug => display name).
$services = [
  'dental-checkup' => 'Dental checkup and examination', 'general-dentistry' => 'General dentistry',
  'dental-x-rays' => 'Dental X-rays', 'dental-emergencies' => 'Emergency dental care (same-day)',
  'cosmetic-dentistry' => 'Cosmetic dentistry', 'teeth-whitening' => 'Teeth whitening',
  'dental-bridges-and-crowns' => 'Dental bridges and crowns', 'full-and-partial-dentures' => 'Full and partial dentures',
  'dental-implants' => 'Dental implants', 'orthodontics-braces' => 'Braces and orthodontics',
  'root-canal-therapy' => 'Root canal therapy', 'childrens-dentistry' => "Children's dentistry",
  'dental-fillings' => 'Dental fillings', 'gum-disease-treatment' => 'Gum disease treatment',
  'teeth-extraction' => 'Teeth extraction', 'teeth-cleaning' => 'Teeth cleaning (scaling and polishing)',
];

// Mirrors `faqs` in src/data/site.ts (the homepage FAQ section).
$faqs = [
  ['q' => 'What are your opening hours?', 'a' => 'We are open Monday to Sunday, 07:00 to 20:00, across all branches in Kasarani, Kamakis, and Eldoret. Walk-ins are welcome, but booking ahead helps us reserve time for you.'],
  ['q' => 'Do you accept insurance and medical schemes?', 'a' => 'Yes. We work with a wide range of insurers and medical schemes including Jubilee, AAR, Madison, CIC, Britam, APA, SHA, NHIF and many more. Bring your insurance card and our team will handle pre-authorisation and billing.'],
  ['q' => 'Do you accept M-Pesa?', 'a' => 'Yes, we accept M-Pesa, cash, and direct insurance billing. For M-Pesa payments, our team at each branch will provide the till number at reception.'],
  ['q' => 'Is there a dentist open on Sunday in Nairobi?', 'a' => 'Yes. Celestial Dental is open every day of the week, including Sundays and public holidays, from 07:00 to 20:00 across all three branches (Kasarani, Kamakis, and Eldoret).'],
  ['q' => 'Do you handle dental emergencies?', 'a' => 'Yes. Call or WhatsApp the nearest branch and we aim to see you the same day. For severe pain or swelling, come in directly and our team will prioritise you.'],
  ['q' => 'Do you treat children?', 'a' => 'Yes. We offer gentle children\'s dentistry in a calm, child-friendly setting. We recommend a first visit as soon as the first tooth appears, or by age one.'],
];

$title = 'Best Dentist in Nairobi (Kasarani), Kamakis-Ruiru & Eldoret | Braces, Implants & Emergency Care | Celestial Dental Centre';
$desc  = 'Affordable dental clinic open 7 days (07:00-20:00) in Kasarani Nairobi, Kamakis-Ruiru & Eldoret. Checkups, teeth cleaning, braces, implants, root canal and same-day emergency dentist. Insurance & M-Pesa accepted.';

// ── Branch blocks + per-branch schema ──
$branchHtml = '';
$branchSchema = [];
foreach (cd_branches() as $b) {
  $name = $b['name'] ?? '';
  if ($name === '') continue;
  $bslug = $b['slug'] ?? '';
  $canonical = "$SITE/branches/" . rawurlencode($bslug);
  // The address is stored as free text with line breaks; flatten to one line.
  $addr = trim(preg_replace('/\s+/', ' ', (string)($b['address'] ?? '')), " ,.");
  $phone = $b['phone'] ?? '+254 707 535 000';
  $branchHtml .= "<h3><a href=\"$canonical\">Celestial Dental Centre - {$esc($name)}</a></h3>\n"
    . ($addr !== '' ? "<p>{$esc($addr)}</p>\n" : '')
    . "<p>Phone: <a href=\"tel:" . preg_replace('/\s+/', '', $phone) . "\">{$esc($phone)}</a> &middot; Open every day 07:00-20:00</p>\n";

  $entry = [
    '@type'     => 'Dentist',
    'name'      => "Celestial Dental Centre - $name Branch",
    'url'       => $canonical,
    'telephone' => $phone,
    'address'   => [
      '@type'           => 'PostalAddress',
      'streetAddress'   => $addr,
      'addressLocality' => $name,
      'addressRegion'   => $b['region'] ?? '',
      'addressCountry'  => 'KE',
    ],
    'openingHoursSpecification' => [[
      '@type'     => 'OpeningHoursSpecification',
      'dayOfWeek' => ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
      'opens'     => '07:00',
      'closes'    => '20:00',
    ]],
  ];
  if (!empty($b['lat']) && !empty($b['lng'])) {
    $entry['geo'] = ['@type' => 'GeoCoordinates', 'latitude' => (float)$b['lat'], 'longitude' => (float)$b['lng']];
  }
  $branchSchema[] = $entry;
}

$dentist = [
  '@context'        => 'https://schema.org',
  '@type'           => 'Dentist',
  'name'            => 'Celestial Dental Centre',
  'alternateName'   => 'Celestial Dental & Orthodontic Centre',
  'url'             => "$SITE/",
  'telephone'       => '+254 707 535 000',
  'image'           => "$SITE/facility/reception-lounge.jpg",
  'priceRange'      => 'KES',
  'paymentAccepted' => 'Cash, M-Pesa, Insurance, SHA (Social Health Authority), NHIF, AAR, Jubilee, Madison, CIC, Britam, APA',
  'areaServed'      => ['Nairobi', 'Kasarani', 'Ruiru', 'Kamakis', 'Eldoret', 'Kenya'],
  'openingHoursSpecification' => [[
    '@type'     => 'OpeningHoursSpecification',
    'dayOfWeek' => ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
    'opens'     => '07:00',
    'closes'    => '20:00',
  ]],
  'description'     => 'Affordable dental clinic group in Kenya with branches in Kasarani (Nairobi), Kamakis (Ruiru) and Eldoret. Open every day 07:00-20:00.',
];
if ($branchSchema) $dentist['department'] = $branchSchema;

$faqEntities = [];
foreach ($faqs as $f) {
  $faqEntities[] = ['@type' => 'Question', 'name' => $f['q'], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f['a']]];
}

$schemas = [
  $dentist,
  ['@context' => 'https://schema.org', '@type' => 'WebSite', 'name' => 'Celestial Dental Centre', 'url' => "$SITE/"],
  ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => $faqEntities],
];

// One source of truth for the homepage's three core schemas. Vite injects the
// same JSON into the SPA shell at build time, so every user agent receives it
// in the initial HTML. Keep the generated arrays above as a safe fallback if a
// partial deployment ever leaves the shared file unavailable or invalid.
$sharedSchemaJson = @file_get_contents(__DIR__ . '/home-schema.json');
$sharedSchemas = $sharedSchemaJson ? json_decode($sharedSchemaJson, true) : null;
if (is_array($sharedSchemas) && count($sharedSchemas) === 3) {
  $schemas = $sharedSchemas;
}

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: index, follow');

echo "<!doctype html>\n<html lang=\"en\">\n<head>\n";
echo '<meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />' . "\n";
echo "<title>{$esc($title)}</title>\n";
echo '<meta name="description" content="' . $esc($desc) . '" />' . "\n";
echo '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />' . "\n";
echo '<link rel="canonical" href="' . $SITE . '/" />' . "\n";
echo '<meta property="og:title" content="' . $esc($title) . '" /><meta property="og:description" content="' . $esc($desc) . '" />' . "\n";
echo '<meta property="og:type" content="website" /><meta property="og:url" content="' . $SITE . '/" />' . "\n";
echo '<meta property="og:site_name" content="Celestial Dental Centre" /><meta property="og:image" content="' . $SITE . '/facility/reception-lounge.jpg" />' . "\n";
foreach ($schemas as $s) {
  echo '<script type="application/ld+json">' . json_encode($s, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "</script>\n";
}
echo "</head>\n<body>\n<main>\n";

echo "<h1>Dentist in Kasarani (Nairobi), Kamakis-Ruiru and Eldoret</h1>\n";
echo "<p>Celestial Dental Centre is an affordable dental clinic group in Kenya with three branches, open every day from 07:00 to 20:00 including Sundays and public holidays. We provide checkups, teeth cleaning, braces and orthodontics, implants, root canal treatment, children's dentistry, cosmetic dentistry and same-day emergency dental care. SHA, 20+ private insurers, M-Pesa and cash are accepted.</p>\n";
echo "<p><a href=\"$SITE/?book=1\">Book an appointment</a> &middot; Call or WhatsApp +254 707 535 000</p>\n";

echo "<h2>Dental services we offer</h2>\n<ul>\n";
foreach ($services as $sSlug => $sName) {
  echo "<li><a href=\"$SITE/services/$sSlug\">{$esc($sName)}</a></li>\n";
}
echo "</ul>\n<p><a href=\"$SITE/services\">All dental services</a></p>\n";

echo "<h2>Our branches</h2>\n" . $branchHtml;

echo "<h2>Insurance, SHA and payment</h2>\n";
echo "<p>SHA (Social Health Authority) is accepted for eligible schemes and covered treatments, including check-ups, cleaning, fillings, root canal treatment, extractions and X-rays, depending on your cover. We also bill more than 20 insurers directly, including Jubilee, AAR, Madison, CIC, Britam, APA, GA, Heritage, First Assurance, Minet and Equity Bank Insurance. M-Pesa and cash are accepted at every branch. See <a href=\"$SITE/dental-insurance-and-sha-coverage\">insurance and SHA coverage</a>.</p>\n";

// Latest articles: gives the blog a crawl path from the highest-authority page
// on the site instead of only from /blog.
$posts = cd_posts();
if ($posts) {
  echo "<h2>Latest from our dental health blog</h2>\n<ul>\n";
  foreach (array_slice($posts, 0, 8) as $p) {
    echo "<li><a href=\"" . cd_canonical($p) . "\">{$esc($p['title'] ?? '')}</a></li>\n";
  }
  echo "</ul>\n<p><a href=\"$SITE/blog\">All dental health articles</a></p>\n";
}

echo "<h2>Common questions</h2>\n";
foreach ($faqs as $f) {
  echo "<h3>{$esc($f['q'])}</h3>\n<p>{$esc($f['a'])}</p>\n";
}

echo about_home_section($SITE);
echo "</main>\n</body>\n</html>\n";

function about_home_section($SITE) {
  return "<hr />\n<section>\n<h2>About Celestial Dental Centre</h2>\n"
    . "<p>Celestial Dental Centre is also known as Celestial Dental &amp; Orthodontic Centre. The Kasarani location's official Google Business Profile is named Celestial Dental Centre -Kasarani Branch.</p>\n"
    . "<p>Celestial Dental Centre is an affordable dental clinic group in Kenya with branches in Kasarani (Nairobi), Kamakis (Ruiru), and Eldoret, open every day, 07:00-20:00. Services include dental checkups, teeth cleaning, braces and orthodontics, implants, root canal therapy, children's dentistry, and same-day emergency care. M-Pesa and major insurance schemes accepted.</p>\n"
    . "<p>Book an appointment: <a href=\"$SITE/?book=1\">$SITE/?book=1</a> &middot; Call: +254 707 535 000 &middot; WhatsApp: https://wa.me/254707535000</p>\n</section>\n";
}
