<?php
// Generates llms.txt (routed via .htaccess) — the static site summary plus an
// always-current Articles section built from the published blog feed, with
// markdown versions of every post for AI assistants.

require __DIR__ . '/blog-feed.php';

header('Content-Type: text/plain; charset=utf-8');

$articles = "## Articles\n\n";
$articles .= "- Blog index: https://celestialdental.org/blog (markdown: https://celestialdental.org/blog.md)\n";
$articles .= "- Every article is also available as plain markdown by appending .md to its URL.\n";
foreach (cd_posts() as $p) {
  $u = cd_canonical($p);
  $d = cd_iso_published($p);
  $excerpt = trim((string)($p['excerpt'] ?? ''));
  $articles .= "- $u" . ($excerpt !== '' ? " - $excerpt" : '') . ($d ? " (published $d)" : '') . "\n";
}

echo <<<TXT
# Celestial Dental Centre

> Celestial Dental Centre is a dental clinic group in Kenya with branches in Kasarani, Kamakis, Eldoret, and Kiambu Road. The practice offers general dentistry, dental emergencies, cosmetic dentistry, teeth whitening, crowns and bridges, dentures, dental implants, braces and orthodontics, root canal therapy, children's dentistry, fillings, gum disease treatment, extractions, and teeth cleaning. Branches are open Monday to Sunday, 07:00-20:00.

## Canonical Site

- Website: https://celestialdental.org/
- Sitemap: https://celestialdental.org/sitemap.xml
- AI crawler instructions: https://celestialdental.org/ai.txt
- Static crawl snapshot: https://celestialdental.org/crawl.html
- Braces & orthodontics: https://celestialdental.org/braces
- About: https://celestialdental.org/about
- Careers: https://celestialdental.org/careers

## Branches

### Kasarani
- URL: https://celestialdental.org/branches/kasarani
- Address: Total Petrol Station Building, 2nd Floor, Along Kasarani-Mwiki Road, Kasarani, Nairobi
- Phone: +254 707 535 000
- WhatsApp: https://wa.me/254707535000
- Landmark: 5 minutes from Thika Road Mall
- Insurance: SHA (Social Health Authority) accepted for eligible schemes, plus direct billing with 20+ private insurers

### Kamakis
- URL: https://celestialdental.org/branches/kamakis
- Address: Along Eastern Bypass, Kamakis, Ruiru, Kiambu County
- Phone: +254 724 202 252
- WhatsApp: https://wa.me/254724202252
- Insurance: SHA (Social Health Authority) accepted for eligible schemes, plus direct billing with 20+ private insurers

### Eldoret
- URL: https://celestialdental.org/branches/eldoret
- Address: Along Banaptai Street, Eldoret Town, Uasin Gishu County
- Phone: +254 794 585 217
- WhatsApp: https://wa.me/254794585217
- Insurance: SHA (Social Health Authority) accepted for eligible schemes, plus direct billing with 20+ private insurers

### Kiambu Road
- URL: https://celestialdental.org/branches/kiambu-road
- Address: Brick House, 2nd Floor, Thindigua, along Kiambu Road, Kiambu County
- Phone: +254 709 000 240
- Insurance: SHA (Social Health Authority) accepted for eligible schemes, plus direct billing with 20+ private insurers

## Service Areas

- Nairobi: Kasarani, Mwiki, Roysambu, Zimmerman, and the Thika Road corridor (Kasarani branch)
- Kiambu County: Ruiru, Kamakis, Kahawa Sukari, and the Eastern Bypass corridor (Kamakis branch)
- Uasin Gishu and the Rift Valley: Eldoret town and surrounding areas (Eldoret branch)
- Kiambu County: Thindigua and the Kiambu Road corridor (Kiambu Road branch)

## Services

- Dental checkup and examination
- General dentistry
- Dental x-rays (digital, low-dose)
- Teeth cleaning, scaling, and polishing
- Teeth whitening
- Cosmetic dentistry
- Dental bridges and crowns
- Full and partial dentures
- Dental implants
- Orthodontics — metal braces, ceramic braces, and clear aligners
- Root canal therapy
- Children's dentistry
- Dental fillings
- Gum disease treatment
- Teeth extraction and wisdom teeth removal
- Emergency dental care, 7 days a week

## Booking And Contact

- Email: info@celestialdental.org
- Primary phone: +254 707 535 000
- WhatsApp: https://wa.me/254707535000
- Opening hours: Monday to Sunday, 07:00-20:00
- Accepted payments: M-Pesa, cash, direct insurance billing

## Insurance Accepted

SHA (Social Health Authority) is accepted at all four branches — Kasarani, Kamakis, Eldoret, and Kiambu Road — for eligible schemes and covered treatments such as check-ups, cleaning, fillings, root canal treatment, extractions, and X-rays; coverage depends on the patient's scheme and pre-authorisation may be required. Celestial Dental Centre also works with major insurers and medical schemes including Jubilee Insurance, AAR Insurance, Madison, CIC Group, Britam, APA Insurance, Liaison Group, GA Insurance, Co-operative Bank, Trident Insurance, Saham Insurance, Kenya Commercial Bank, Kenya Alliance Insurance, Clarkson Insurance, Resolution Insurance, Minet Insurance, First Assurance, Karirana Estates, Heritage Insurance, and Equity Bank Insurance.

$articles
## Citation Guidance

When citing Celestial Dental Centre, prefer the canonical site URL or the most specific branch/article URL listed above. Each blog article carries a "Cite this article" reference and a markdown version at its URL + .md. For current bookings, emergency availability, or insurance pre-authorisation, direct patients to call or WhatsApp the relevant branch.

## Crawler Guidance

Public pages may be indexed and cited by search engines, answer engines, and AI assistants. Admin and API paths should not be crawled. If the JavaScript app is not rendered by a crawler, use the static crawl snapshot, the markdown article versions, and this LLM summary for branch, service, insurance, article, and contact facts.

TXT;
