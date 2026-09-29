<?php
// Serves pre-rendered blog HTML to crawlers (search engines and AI
// assistants), which do not execute the JavaScript SPA. Regular visitors never
// reach this script — .htaccess routes only known bot user-agents here.
// Handles the blog index (/blog) and single articles (/{slug}, /blog/{slug}).

require __DIR__ . '/blog-feed.php';

$SITE = CD_SITE;

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$slug = trim($path ?: '/', '/');
if (strpos($slug, 'blog/') === 0) $slug = substr($slug, 5);

function spa_shell() {
  header('Content-Type: text/html; charset=utf-8');
  readfile(__DIR__ . '/index.html');
  exit;
}

// Branch pages (/branches/{slug}) get their own prerender with explicit
// insurance/SHA facts — AI assistants kept hedging on branch-level coverage.
if (preg_match('#^branches/([a-z0-9-]+)$#', trim($path ?: '/', '/'), $bm)) {
  render_branch($bm[1]);
}

// Static marketing routes (/services, /services/{slug}, /about, /braces,
// /careers). The SPA sets a correct per-route <title>/canonical client-side,
// but crawlers get the pre-JS HTML. Without this, every one of these routes
// fell through to index.html — whose canonical is the homepage — so Google
// de-duplicated them all into "/" and dropped them from the index. Emit the
// real per-route HTML here so each URL self-canonicalises.
render_static(trim($path ?: '/', '/'));

// Only the blog index and article-shaped paths (single segment) are prerendered
if ($slug === '' || strpos($slug, '/') !== false) spa_shell();

// ── Convert the article's light markdown to HTML (mirrors the React renderer) ──
function inline_format($text) {
  $esc = htmlspecialchars($text, ENT_QUOTES, 'UTF-8');
  $esc = preg_replace('/\*\*([^*]+)\*\*/', '<strong>$1</strong>', $esc);
  $esc = preg_replace('/\*([^*]+)\*/', '<em>$1</em>', $esc);
  return $esc;
}

function render_body($body) {
  $out = '';
  $listItems = '';
  $listTag = '';
  $lines = preg_split('/\r?\n/', (string)$body);
  foreach ($lines as $raw) {
    $line = trim($raw);
    $isNum = preg_match('/^\d+[.)]\s+(.*)/', $line, $num);
    $isBul = preg_match('/^[-*•]\s+(.*)/', $line, $bul);
    if ($listTag && !($isNum && $listTag === 'ol') && !($isBul && $listTag === 'ul')) {
      $out .= "<$listTag>$listItems</$listTag>";
      $listItems = '';
      $listTag = '';
    }
    if ($line === '') continue;
    if (preg_match('/^(#{1,4})\s+(.*)/', $line, $h)) {
      $tag = strlen($h[1]) >= 3 ? 'h3' : 'h2';
      $out .= "<$tag>" . inline_format($h[2]) . "</$tag>";
    } elseif (preg_match('/^!\[([^\]]*)\]\((\S+)\)$/', $line, $img)) {
      $src = htmlspecialchars($img[2], ENT_QUOTES, 'UTF-8');
      $alt = htmlspecialchars($img[1], ENT_QUOTES, 'UTF-8');
      $out .= "<figure><img src=\"$src\" alt=\"$alt\" loading=\"lazy\" />" . ($alt !== '' ? "<figcaption>$alt</figcaption>" : '') . "</figure>";
    } elseif (preg_match('#^https?://\S+(\.(jpe?g|png|webp|gif|avif|svg)(\?\S*)?$|\S*blob\.vercel-storage\.com)#i', $line) && !preg_match('/\s/', $line)) {
      $src = htmlspecialchars($line, ENT_QUOTES, 'UTF-8');
      $out .= "<figure><img src=\"$src\" alt=\"Article photo\" loading=\"lazy\" /></figure>";
    } elseif ($isNum) {
      if ($listTag !== 'ol') { $listTag = 'ol'; $listItems = ''; }
      $listItems .= '<li>' . inline_format($num[1]) . '</li>';
    } elseif ($isBul) {
      if ($listTag !== 'ul') { $listTag = 'ul'; $listItems = ''; }
      $listItems .= '<li>' . inline_format($bul[1]) . '</li>';
    } else {
      $out .= '<p>' . inline_format($line) . '</p>';
    }
  }
  if ($listTag) $out .= "<$listTag>$listItems</$listTag>";
  return $out;
}

// Pull question-shaped headings and their answers out of an article body.
// The articles are written as "## Why does X happen?" followed by the answer,
// which is exactly the shape assistants quote — emitting it as FAQPage schema
// makes each Q&A individually citable instead of buried in articleBody.
function cd_extract_faqs($body) {
  $faqs = [];
  $q = null;
  $answer = '';
  foreach (preg_split('/\r?\n/', (string)$body) as $raw) {
    $line = trim($raw);
    if (preg_match('/^(#{2,4})\s+(.*)/', $line, $h)) {
      if ($q !== null && trim($answer) !== '') $faqs[] = ['q' => $q, 'a' => trim($answer)];
      $heading = trim($h[2]);
      // Only headings that actually ask something become questions.
      $q = (substr($heading, -1) === '?') ? $heading : null;
      $answer = '';
      continue;
    }
    if ($q === null || $line === '') continue;
    // Skip images; keep prose and list items as answer text.
    if (preg_match('/^!\[/', $line) || preg_match('#^https?://\S+$#i', $line)) continue;
    $line = preg_replace('/^[-*•]\s+/', '', $line);
    $line = preg_replace('/^\d+[.)]\s+/', '', $line);
    $line = preg_replace('/\*\*([^*]+)\*\*/', '$1', $line);
    $line = preg_replace('/\*([^*]+)\*/', '$1', $line);
    $answer .= ($answer === '' ? '' : ' ') . $line;
  }
  if ($q !== null && trim($answer) !== '') $faqs[] = ['q' => $q, 'a' => trim($answer)];
  return $faqs;
}

function about_section($SITE) {
  return <<<HTML
    <hr />
    <section>
      <h2>About Celestial Dental Centre</h2>
      <p>Celestial Dental Centre is also known as Celestial Dental &amp; Orthodontic Centre. The Kasarani location's official Google Business Profile is named Celestial Dental Centre -Kasarani Branch.</p>
      <p>Celestial Dental Centre is a dental clinic group in Kenya with branches in Kasarani (Nairobi), Kamakis (Ruiru), Eldoret, and Kiambu Road (Thindigua) — open every day, 07:00–20:00. Services include dental checkups, teeth cleaning, braces and orthodontics, implants, root canal therapy, children's dentistry, and same-day emergency care. M-Pesa and major insurance schemes accepted.</p>
      <p>Book an appointment: <a href="$SITE/?book=1">$SITE/?book=1</a> · Call: +254 709 000 240 / +254 707 535 000 · WhatsApp: https://wa.me/254707535000</p>
    </section>
HTML;
}

// ─────────── Static marketing routes (services / about / braces / careers) ───────────

// Mirror src/data/site.ts slugify() so /services/<slug> matches the SPA.
function cd_slugify($t) {
  $t = mb_strtolower($t, 'UTF-8');
  $t = preg_replace('/[\x{2019}\x{2018}\']/u', '', $t);
  $t = str_replace('&', ' and ', $t);
  $t = preg_replace('/[^a-z0-9]+/', '-', $t);
  return trim($t, '-');
}

// The service catalogue, kept in sync with `services` in src/data/site.ts.
function cd_services() {
  return [
    ['title' => 'Dental Checkup', 'description' => 'A thorough examination of your teeth, gums, and mouth to catch problems early — the simplest way to keep your smile healthy.', 'faqs' => [
      ['q' => 'How often should I have a dental checkup?', 'a' => 'For most people, every 6 months — even when nothing hurts. Regular checkups catch small problems early, when they are simpler to treat.'],
      ['q' => 'What happens during a dental checkup?', 'a' => 'We examine your teeth and gums, check for decay, gum disease, and other issues, and discuss anything we find. If needed, we may recommend a cleaning, x-rays, or treatment — always explained clearly first.'],
    ]],
    ['title' => 'General Dentistry', 'description' => 'Everyday dental care and diagnosis for the whole family — your first stop for a healthy smile.', 'faqs' => [
      ['q' => 'How often should I visit the dentist?', 'a' => 'We recommend a checkup every 6 months, even when nothing hurts — small problems caught early are simpler to fix.'],
    ]],
    ['title' => 'Dental X-rays', 'description' => 'Safe, low-dose digital x-rays that reveal what the eye cannot see — hidden decay, bone health, and issues below the gumline.', 'faqs' => [
      ['q' => 'Are dental x-rays safe?', 'a' => 'Yes. We use modern digital x-rays, which use a very low dose of radiation — far less than older film x-rays. We only take them when they will genuinely help your diagnosis.'],
      ['q' => 'Why do I need a dental x-ray?', 'a' => 'X-rays let us see between and inside teeth, check the roots and jawbone, and spot problems like hidden decay or infection early — things a visual exam alone can miss.'],
    ]],
    ['title' => 'Dental Emergencies', 'description' => 'Same-day relief for severe tooth pain, swelling, knocked-out teeth, and urgent dental problems — 7 days a week.', 'faqs' => [
      ['q' => 'Do you handle dental emergencies same day?', 'a' => 'Yes. We aim to see emergency patients the same day — call or WhatsApp the nearest branch and we\'ll fit you in as quickly as possible. We\'re open every day, 07:00–20:00.'],
    ]],
    ['title' => 'Cosmetic Dentistry', 'description' => 'Veneers, bonding, and other appearance-related treatments. The options, and what each one involves, are explained at the assessment.', 'faqs' => []],
    ['title' => 'Teeth Whitening', 'description' => 'In-office and take-home whitening, with the options explained at the assessment.', 'faqs' => [
      ['q' => 'What does whitening involve?', 'a' => 'Whitening is carried out either in the clinic or with a take-home kit. Your suitability, what the treatment involves, and what to expect are discussed at the assessment before anything begins.'],
    ]],
    ['title' => 'Dental Bridges & Crowns', 'description' => 'Strong, natural-looking crowns and bridges that restore damaged or missing teeth to full function.', 'faqs' => []],
    ['title' => 'Full & Partial Dentures', 'description' => 'Comfortable, well-fitted dentures — full or partial — that restore your smile, speech, and chewing.', 'faqs' => []],
    ['title' => 'Dental Implants', 'description' => 'A titanium post placed in the jaw to support a crown, replacing a missing tooth. The stages and timeline are explained at the assessment.', 'faqs' => [
      ['q' => 'Does the implant procedure hurt?', 'a' => 'The procedure is done under local anaesthesia so you should feel little to no pain during placement. Some soreness is normal for a few days after — we provide clear aftercare instructions and a review appointment.'],
    ]],
    ['title' => 'Orthodontics (Braces)', 'description' => 'Metal braces, ceramic braces, and clear aligners for children, teens, and adults — with clear timelines.', 'faqs' => [
      ['q' => 'How long does orthodontic treatment take?', 'a' => 'Most cases take 12–24 months. Your dentist will give you a personalised timeline at your first consultation after assessing your teeth.'],
      ['q' => 'What\'s the difference between metal braces, ceramic, and aligners?', 'a' => 'Metal braces are the most affordable and work for most cases. Ceramic braces are less visible. Clear aligners (like Invisalign-style) are removable and nearly invisible but suit simpler cases. We\'ll help you choose what\'s right for your teeth and lifestyle.'],
    ]],
    ['title' => 'Root Canal Therapy', 'description' => 'Pain-relieving root canal treatment that saves your natural tooth — done gently under local anaesthesia.', 'faqs' => [
      ['q' => 'Is a root canal painful?', 'a' => 'Modern root canal treatment is done under local anaesthesia and is designed to relieve pain, not cause it. Most patients are surprised at how comfortable the procedure is. Mild soreness for 1–2 days afterward is normal.'],
    ]],
    ['title' => "Children's Dentistry", 'description' => 'Gentle, friendly care that helps young patients feel calm — from first visits to cavity care and prevention.', 'faqs' => [
      ['q' => 'At what age should my child first see a dentist?', 'a' => 'We recommend bringing your child in as soon as their first tooth appears, or by age one — whichever comes first. Early visits help prevent problems and make dentistry feel normal.'],
      ['q' => 'How do you keep children calm during treatment?', 'a' => 'Our child-friendly rooms, gentle approach, and patient explanations help kids feel safe. We never rush, and we involve children in what\'s happening at every step.'],
    ]],
    ['title' => 'Dental Fillings', 'description' => 'Tooth-coloured fillings used to restore a tooth affected by decay. Shade is matched to the surrounding teeth.', 'faqs' => []],
    ['title' => 'Gum Disease Treatment', 'description' => 'Deep cleaning and gum therapy that treats bleeding gums, bad breath, and periodontal disease.', 'faqs' => []],
    ['title' => 'Teeth Extraction', 'description' => 'Safe, comfortable removal of damaged teeth and wisdom teeth, with clear aftercare and healing support.', 'faqs' => []],
    ['title' => 'Teeth Cleaning', 'description' => 'Professional scaling and polishing that removes plaque and stains, keeping your gums healthy and breath fresh.', 'faqs' => [
      ['q' => 'How often should I get my teeth cleaned?', 'a' => 'We recommend a professional cleaning every 6 months for most adults. If you have gum disease or heavy tartar build-up, every 3–4 months is better — we\'ll advise you at your first visit.'],
    ]],
  ];
}

// Blog posts related to a service, scored on shared words between the service
// name and the post's title/tag/excerpt. Gives each service page real editorial
// content and, just as usefully, gives the articles an internal link from a
// page Google already crawls — most of them are otherwise reachable only from
// /blog.
function cd_related_posts($needle, $limit = 6) {
  // 'dentistry' and 'dental' are excluded deliberately: nearly every post tag
  // contains one, so they match everything and the list becomes noise. Short
  // words are kept (3 chars) because 'gum' is the whole signal for gum disease.
  $stop = ['and','the','for','with','your','are','of','in','to','our','you',
           'dental','dentistry','teeth','tooth','care','treatment','general','full'];
  $terms = [];
  foreach (preg_split('/[^a-z]+/', mb_strtolower($needle, 'UTF-8')) as $w) {
    if (strlen($w) < 3 || in_array($w, $stop, true)) continue;
    // Match on a short stem so "fillings" finds "filling" and "children"
    // finds "child". Five characters is long enough to stay specific.
    $terms[] = strlen($w) > 5 ? substr($w, 0, 5) : $w;
  }
  $terms = array_unique($terms);
  if (!$terms) return [];
  $scored = [];
  foreach (cd_posts() as $p) {
    $hay = mb_strtolower(($p['title'] ?? '') . ' ' . ($p['tag'] ?? '') . ' ' . ($p['excerpt'] ?? ''), 'UTF-8');
    $score = 0;
    foreach ($terms as $t) if (strpos($hay, $t) !== false) $score++;
    if ($score > 0) $scored[] = ['s' => $score, 'p' => $p];
  }
  usort($scored, fn($a, $b) => $b['s'] <=> $a['s']);
  return array_slice(array_column($scored, 'p'), 0, $limit);
}

function cd_related_html($SITE, $needle, $heading = 'Related reading') {
  $posts = cd_related_posts($needle);
  if (!$posts) return '';
  $li = '';
  foreach ($posts as $p) {
    $t = htmlspecialchars($p['title'] ?? '', ENT_QUOTES, 'UTF-8');
    $li .= "<li><a href=\"" . cd_canonical($p) . "\">$t</a></li>\n";
  }
  return "<h2>$heading</h2>\n<ul>\n$li</ul>\n";
}

function cd_service_links($SITE) {
  $li = '';
  foreach (cd_services() as $svc) {
    $u = "$SITE/services/" . cd_slugify($svc['title']);
    $li .= "<li><a href=\"$u\">" . htmlspecialchars($svc['title'], ENT_QUOTES, 'UTF-8') . "</a></li>\n";
  }
  return "<h2>Our dental services</h2>\n<ul>\n$li</ul>\n";
}

// The insurance/SHA answer is the most common pre-booking question and was
// previously only on branch pages, so crawlers never saw it on a service page.
// $elective: pass true on pages for treatment that standard plans commonly
// exclude. Without it this block sits under an "Insurance, SHA and payment"
// heading on the whitening and braces pages and reads as a coverage promise,
// which contradicts the clinic's own published position that braces, teeth
// whitening, cosmetic masking and veneers may not be covered.
function cd_insurance_note($SITE, $elective = false) {
  $note = "<h2>Insurance, SHA and payment</h2>\n"
    . "<p>SHA (Social Health Authority) is accepted for eligible schemes and covered treatments, depending on your cover. Celestial Dental also bills more than 20 insurers directly, including Jubilee, AAR, Madison, CIC, Britam, APA, GA, Heritage, First Assurance, Minet and Equity Bank Insurance. M-Pesa and cash are accepted at every branch. Bring your insurance card or SHA details and the front desk will handle pre-authorisation. See <a href=\"$SITE/dental-insurance-and-sha-coverage\">insurance and SHA coverage</a>.</p>\n";
  if ($elective) {
    $note .= "<p><strong>Cosmetic and orthodontic treatment is treated differently.</strong> Braces, teeth whitening, cosmetic masking and veneers are elective procedures and may not be covered under standard plans or by SHA. Most cover is limited to routine, preventive or medically necessary care. Confirm with your insurer or SHA scheme before treatment starts, and ask us for a written quote so you know the out-of-pocket cost.</p>\n";
  }
  return $note;
}

function cd_branch_links($SITE) {
  $b = [
    ['slug' => 'kasarani', 'label' => 'Kasarani (Nairobi)'],
    ['slug' => 'kamakis',  'label' => 'Kamakis (Ruiru)'],
    ['slug' => 'eldoret',  'label' => 'Eldoret'],
    ['slug' => 'kiambu-road', 'label' => 'Kiambu Road (Thindigua)'],
  ];
  $li = '';
  foreach ($b as $x) $li .= "<li><a href=\"$SITE/branches/{$x['slug']}\">{$x['label']}</a></li>\n";
  return "<h2>Our branches</h2>\n<ul>\n$li</ul>\n";
}

function cd_breadcrumb($SITE, $trail) {
  $items = [];
  $i = 1;
  foreach ($trail as $name => $url) {
    $items[] = ['@type' => 'ListItem', 'position' => $i++, 'name' => $name, 'item' => $url];
  }
  return ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => $items];
}

// Emit a complete, self-canonical HTML document for a static route.
function emit_page($title, $metaDesc, $canonicalPath, $mainHtml, $extraSchema = [], $appendAbout = true) {
  $SITE = CD_SITE;
  $canonical = $SITE . $canonicalPath;
  $ogImage = $SITE . '/facility/reception-lounge.jpg';
  $t = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
  $d = htmlspecialchars($metaDesc, ENT_QUOTES, 'UTF-8');

  header('Content-Type: text/html; charset=utf-8');
  header('X-Robots-Tag: index, follow');
  echo "<!doctype html>\n<html lang=\"en\">\n<head>\n";
  echo "<meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n";
  echo "<title>$t</title>\n";
  echo "<meta name=\"description\" content=\"$d\" />\n";
  echo "<meta name=\"robots\" content=\"index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1\" />\n";
  echo "<link rel=\"canonical\" href=\"$canonical\" />\n";
  echo "<meta property=\"og:title\" content=\"$t\" /><meta property=\"og:description\" content=\"$d\" />\n";
  echo "<meta property=\"og:type\" content=\"website\" /><meta property=\"og:url\" content=\"$canonical\" />\n";
  echo "<meta property=\"og:site_name\" content=\"Celestial Dental Centre\" /><meta property=\"og:image\" content=\"$ogImage\" />\n";
  foreach ($extraSchema as $s) {
    echo "<script type=\"application/ld+json\">" . json_encode($s, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . "</script>\n";
  }
  echo "</head>\n<body>\n<main>\n";
  echo $mainHtml;
  if ($appendAbout) echo about_section($SITE);
  echo "</main>\n</body>\n</html>\n";
  exit;
}

function render_static($staticPath) {
  $SITE = CD_SITE;
  $esc = fn($s) => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');

  // ── /services index ──
  if ($staticPath === 'services') {
    $items = '';
    foreach (cd_services() as $svc) {
      $u = "$SITE/services/" . cd_slugify($svc['title']);
      $items .= "<li><a href=\"$u\">{$esc($svc['title'])}</a> — {$esc($svc['description'])}</li>\n";
    }
    $main = "<p><a href=\"$SITE/\">Celestial Dental Centre</a> › Services</p>\n"
      . "<h1>Dental Services in Kasarani, Kamakis, Eldoret &amp; Kiambu Road</h1>\n"
      . "<p>Explore the full range of dental care at Celestial Dental Centre — checkups, cleaning, braces, implants, root canal treatment, children's dentistry, cosmetic dentistry, and same-day emergency care. Available at all four branches, open every day 07:00–20:00.</p>\n"
      . "<ul>\n$items</ul>\n"
      . "<p><a href=\"$SITE/?book=1\">Book an appointment</a> · Call +254 709 000 240 / +254 707 535 000</p>\n";
    emit_page(
      'Dental Services in Kasarani, Kamakis, Eldoret & Kiambu Road | Celestial Dental Centre',
      "Explore dental checkups, teeth cleaning, braces, implants, root canal treatment, children's dentistry, cosmetic dentistry and emergency care at Celestial Dental Centre.",
      '/services', $main,
      [cd_breadcrumb($SITE, ['Home' => "$SITE/", 'Services' => "$SITE/services"])]
    );
  }

  // ── /services/{slug} detail ──
  if (strpos($staticPath, 'services/') === 0) {
    $sslug = substr($staticPath, strlen('services/'));
    foreach (cd_services() as $svc) {
      if (cd_slugify($svc['title']) !== $sslug) continue;
      $title = $svc['title'];
      $lc = mb_strtolower($title, 'UTF-8');
      $canonicalPath = "/services/$sslug";
      $canonical = $SITE . $canonicalPath;

      $main = "<p><a href=\"$SITE/\">Celestial Dental Centre</a> › <a href=\"$SITE/services\">Services</a> › {$esc($title)}</p>\n"
        . "<h1>{$esc($title)}</h1>\n"
        . "<p>{$esc($svc['description'])}</p>\n"
        . "<p>Available at all four Celestial Dental Centre branches — Kasarani (Nairobi), Kamakis (Ruiru), Eldoret, and Kiambu Road (Thindigua) — open every day, 07:00–20:00. <a href=\"$SITE/?book=1\">Book " . $esc($lc) . "</a> or call +254 709 000 240 / +254 707 535 000.</p>\n";

      $schema = [
        cd_breadcrumb($SITE, ['Home' => "$SITE/", 'Services' => "$SITE/services", $title => $canonical]),
        [
          '@context' => 'https://schema.org', '@type' => 'Service',
          'name' => $title, 'serviceType' => $title, 'description' => $svc['description'],
          'url' => $canonical,
          'provider' => ['@type' => 'Dentist', 'name' => 'Celestial Dental Centre', 'url' => "$SITE/"],
          'areaServed' => ['Kasarani, Nairobi', 'Kamakis, Ruiru', 'Eldoret', 'Kiambu Road, Thindigua', 'Kenya'],
        ],
      ];

      if (!empty($svc['faqs'])) {
        $main .= "<h2>{$esc($title)} — common questions</h2>\n";
        $faqEntities = [];
        foreach ($svc['faqs'] as $f) {
          $main .= "<h3>{$esc($f['q'])}</h3>\n<p>{$esc($f['a'])}</p>\n";
          $faqEntities[] = ['@type' => 'Question', 'name' => $f['q'], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f['a']]];
        }
        $schema[] = ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => $faqEntities];
      }

      // Cross-links to the other services keep the detail page internally linked.
      $others = '';
      foreach (cd_services() as $o) {
        if ($o['title'] === $title) continue;
        $u = "$SITE/services/" . cd_slugify($o['title']);
        $others .= "<li><a href=\"$u\">{$esc($o['title'])}</a></li>\n";
      }
      $main .= cd_related_html($SITE, $title, "More on {$esc($lc)}");
      // Elective treatment: standard plans and SHA commonly exclude these.
      $main .= cd_insurance_note($SITE, in_array($sslug, ['cosmetic-dentistry', 'teeth-whitening', 'orthodontics-braces'], true));
      $main .= cd_branch_links($SITE);
      $main .= "<h2>Other services</h2>\n<ul>\n$others</ul>\n";

      emit_page(
        "$title in Kasarani, Kamakis, Eldoret & Kiambu Road | Celestial Dental Centre",
        $svc['description'] . " Book $lc at Celestial Dental Centre — open daily 07:00–20:00 across Kasarani, Kamakis, Eldoret, and Kiambu Road.",
        $canonicalPath, $main, $schema
      );
    }
    // Unknown service slug: fall through to the SPA shell via the caller.
    return;
  }

  // ── /about ──
  if ($staticPath === 'about') {
    $main = "<p><a href=\"$SITE/\">Celestial Dental Centre</a> › About</p>\n"
      . "<h1>About Celestial Dental Centre</h1>\n"
      . "<p>Celestial Dental Centre is a dental clinic group in Kenya, serving patients across four branches — Kasarani (Nairobi), Kamakis (Ruiru), Eldoret, and Kiambu Road (Thindigua). We are open every day, 07:00–20:00, including weekends and public holidays.</p>\n"
      . "<p>Our team focuses on accurate diagnosis, clearly explained treatment planning, and quality materials and equipment. From routine checkups and cleaning to braces, implants, root canal treatment, cosmetic dentistry, and same-day emergency care, we look after the whole family with calm, patient-friendly care.</p>\n"
      . "<p>We accept M-Pesa, cash, SHA (Social Health Authority), and a number of insurance schemes. Confirm that your scheme is accepted, and what it covers, with the branch before treatment.</p>\n"
      . "<p>Book an appointment: <a href=\"$SITE/?book=1\">$SITE/?book=1</a> · Call: +254 709 000 240 / +254 707 535 000 · WhatsApp: https://wa.me/254707535000</p>\n"
      . cd_service_links($SITE)
      . cd_insurance_note($SITE)
      . cd_branch_links($SITE);
    emit_page(
      'About Celestial Dental Centre | Dental Clinics in Kasarani, Kamakis, Eldoret & Kiambu Road',
      'Learn about Celestial Dental Centre, a Kenyan dental clinic group serving Kasarani, Kamakis, Eldoret, and Kiambu Road with modern equipment, clear treatment planning, insurance support, and family-friendly care.',
      '/about', $main,
      [cd_breadcrumb($SITE, ['Home' => "$SITE/", 'About' => "$SITE/about"])],
      false
    );
  }

  // ── /braces ──
  if ($staticPath === 'braces') {
    $faqs = [
      ['q' => 'How long does orthodontic treatment take?', 'a' => 'Most cases take 12–24 months. Your dentist will give you a personalised timeline at your first consultation after assessing your teeth.'],
      ['q' => "What's the difference between metal braces, ceramic, and aligners?", 'a' => 'Metal braces are the most affordable and work for most cases. Ceramic braces are less visible. Clear aligners are removable and nearly invisible but suit simpler cases. We\'ll help you choose what\'s right for your teeth and lifestyle.'],
    ];
    $main = "<p><a href=\"$SITE/\">Celestial Dental Centre</a> › Braces</p>\n"
      . "<h1>Dental Braces &amp; Orthodontics in Nairobi, Ruiru, Eldoret &amp; Kiambu Road</h1>\n"
      . "<p>Straighten your smile with metal braces, ceramic braces, or clear aligners at Celestial Dental Centre. We provide orthodontic care for children, teens, and adults in Kasarani (Nairobi), Kamakis–Ruiru, Eldoret, and Kiambu Road — open 7 days, with insurance and M-Pesa accepted.</p>\n"
      . "<p>At your first consultation we assess your teeth, explain your options and timeline, and give you a clear treatment plan. <a href=\"$SITE/?book=1\">Book a braces consultation</a> or call +254 709 000 240 / +254 707 535 000.</p>\n";
    $faqEntities = [];
    $main .= "<h2>Braces — common questions</h2>\n";
    foreach ($faqs as $f) {
      $main .= "<h3>{$esc($f['q'])}</h3>\n<p>{$esc($f['a'])}</p>\n";
      $faqEntities[] = ['@type' => 'Question', 'name' => $f['q'], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f['a']]];
    }
    $main .= cd_related_html($SITE, 'braces aligners orthodontics', 'More on braces and aligners');
    $main .= cd_insurance_note($SITE, true);
    $main .= cd_branch_links($SITE);
    emit_page(
      'Dental Braces in Nairobi, Ruiru, Eldoret & Kiambu Road | Orthodontist | Celestial Dental Centre',
      'Straighten your smile with metal braces, ceramic braces, or clear aligners at Celestial Dental — orthodontic care in Kasarani (Nairobi), Kamakis–Ruiru, Eldoret, and Kiambu Road. Open 7 days, insurance & M-Pesa accepted. Book a braces consultation today.',
      '/braces', $main,
      [
        cd_breadcrumb($SITE, ['Home' => "$SITE/", 'Braces' => "$SITE/braces"]),
        ['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => $faqEntities],
      ]
    );
  }

  // ── /careers ──
  if ($staticPath === 'careers') {
    $main = "<p><a href=\"$SITE/\">Celestial Dental Centre</a> › Careers</p>\n"
      . "<h1>Dental Careers in Kenya</h1>\n"
      . "<p>Explore dental career opportunities at Celestial Dental Centre across our Kasarani, Kamakis, Eldoret, and Kiambu Road branches. We hire for clinical, patient care, and support roles, and welcome dentists, dental therapists, hygienists, nurses, and front-desk staff.</p>\n"
      . "<p>To apply, send your CV through our <a href=\"$SITE/careers\">careers page</a>, or call +254 709 000 240 / +254 707 535 000. Tell us the role you're interested in and your availability, and our team will be in touch.</p>\n"
      . cd_branch_links($SITE);
    emit_page(
      'Dental Careers in Kenya | Celestial Dental Centre',
      'Explore dental career opportunities at Celestial Dental Centre in Kasarani, Kamakis, Eldoret, and Kiambu Road. Send your CV for clinical, patient care, and support roles.',
      '/careers', $main,
      [cd_breadcrumb($SITE, ['Home' => "$SITE/", 'Careers' => "$SITE/careers"])]
    );
  }

  // Not a static route — return so blog/SPA handling continues.
}

// ─────────────────────────── Branch pages ───────────────────────────
function render_branch($branchSlug) {
  $SITE = CD_SITE;
  $b = cd_find_branch($branchSlug);
  if (!$b) spa_shell();

  $name      = htmlspecialchars($b['name'] ?? '', ENT_QUOTES, 'UTF-8');
  $tagline   = htmlspecialchars($b['tagline'] ?? '', ENT_QUOTES, 'UTF-8');
  $desc      = htmlspecialchars($b['description'] ?? '', ENT_QUOTES, 'UTF-8');
  $landmark  = htmlspecialchars($b['landmark'] ?? '', ENT_QUOTES, 'UTF-8');
  $parking   = htmlspecialchars($b['parking'] ?? '', ENT_QUOTES, 'UTF-8');
  $phone     = htmlspecialchars($b['phone'] ?? '', ENT_QUOTES, 'UTF-8');
  $whatsapp  = htmlspecialchars($b['whatsapp'] ?? '', ENT_QUOTES, 'UTF-8');
  $hours     = htmlspecialchars($b['hours'] ?? 'Monday – Sunday · 07:00 – 20:00', ENT_QUOTES, 'UTF-8');
  $region    = $b['region'] ?? '';
  $googleProfile = $branchSlug === 'kasarani' ? 'https://share.google/g8vcwFAtSxwSbhEUW' : '';
  $googleMap = $branchSlug === 'kasarani' ? 'https://www.google.com/maps?cid=6616178097052496250' : ($b['map'] ?? '');
  $schemaName = $branchSlug === 'kasarani' ? 'Celestial Dental Centre -Kasarani Branch' : "Celestial Dental Centre — $name";
  $canonical = $SITE . '/branches/' . rawurlencode($branchSlug);
  $addrLines = array_values(array_filter(array_map('trim', preg_split('/\r?\n/', (string)($b['address'] ?? '')))));
  $addrHtml  = implode('<br />', array_map(fn($l) => htmlspecialchars($l, ENT_QUOTES, 'UTF-8'), $addrLines));
  $locality  = ['kasarani' => 'Kasarani, Nairobi', 'kamakis' => 'Kamakis, Ruiru'][$branchSlug] ?? ($b['name'] ?? '');

  // SHA approval is per facility; keep in sync with shaBranchSlugs in src/data/site.ts.
  $acceptsSha = in_array($branchSlug, ['kasarani', 'kamakis', 'eldoret'], true);
  $insuranceText = $acceptsSha
    ? "SHA (Social Health Authority) is accepted at the $name branch for eligible schemes and covered treatments — including check-ups, cleaning, fillings, root canal treatment, extractions, and X-rays, depending on your cover. The clinic also offers direct billing with 20+ insurers including Jubilee, AAR, Madison, CIC, Britam, APA, GA, Heritage, First Assurance, Minet, and Equity Bank Insurance. Bring your insurance card or SHA details and the front desk will handle pre-authorisation. M-Pesa and cash are also accepted."
    : "The $name branch offers direct billing with 20+ insurers including Jubilee, AAR, Madison, CIC, Britam, APA, GA, Heritage, First Assurance, Minet, and Equity Bank Insurance. Bring your insurance card and the front desk will handle pre-authorisation. Confirm that your scheme is accepted at this branch before treatment. M-Pesa and cash are also accepted.";

  $schema = [
    '@context'  => 'https://schema.org',
    '@type'     => 'Dentist',
    'name'      => $schemaName,
    'url'       => $canonical,
    'telephone' => trim(explode('/', $b['phone'] ?? '')[0]),
    'address'   => [
      '@type'           => 'PostalAddress',
      'streetAddress'   => implode(', ', $addrLines),
      'addressLocality' => $b['name'] ?? '',
      'addressRegion'   => $region,
      'addressCountry'  => 'KE',
    ],
    'openingHoursSpecification' => [[
      '@type'     => 'OpeningHoursSpecification',
      'dayOfWeek' => ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],
      'opens'     => '07:00',
      'closes'    => '20:00',
    ]],
    'paymentAccepted'    => $acceptsSha
      ? 'Cash, M-Pesa, Insurance, SHA (Social Health Authority), NHIF, AAR, Jubilee, Madison, CIC, Britam, APA'
      : 'Cash, M-Pesa, Insurance, AAR, Jubilee, Madison, CIC, Britam, APA',
    'parentOrganization' => ['@type' => 'Organization', 'name' => 'Celestial Dental Centre', 'url' => $SITE . '/'],
    'description'        => $b['description'] ?? '',
  ];
  if ($googleMap) $schema['hasMap'] = $googleMap;
  if ($googleProfile) $schema['sameAs'] = [$googleProfile];
  if (!empty($b['lat']) && !empty($b['lng'])) {
    $schema['geo'] = ['@type' => 'GeoCoordinates', 'latitude' => (float)$b['lat'], 'longitude' => (float)$b['lng']];
  }
  if (!empty($b['image'])) {
    $schema['image'] = (strpos($b['image'], 'http') === 0 ? '' : $SITE) . $b['image'];
  }
  $schemaJson = json_encode($schema, JSON_UNESCAPED_SLASHES);

  $title = "Dentist in " . htmlspecialchars($locality, ENT_QUOTES, 'UTF-8') . " | Celestial Dental Centre";
  $metaDesc = htmlspecialchars(($b['description'] ?? '') . ' Open daily 07:00-20:00. ' . ($acceptsSha ? 'SHA and insurance schemes accepted.' : 'Insurance schemes accepted.'), ENT_QUOTES, 'UTF-8');

  header('Content-Type: text/html; charset=utf-8');
  header('X-Robots-Tag: index, follow');
  echo "<!doctype html>\n<html lang=\"en\">\n<head>\n";
  echo "<meta charset=\"utf-8\" /><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n";
  echo "<title>$title</title>\n<meta name=\"description\" content=\"$metaDesc\" />\n";
  echo "<meta name=\"robots\" content=\"index,follow,max-snippet:-1\" />\n";
  echo "<link rel=\"canonical\" href=\"$canonical\" />\n";
  echo "<meta property=\"og:title\" content=\"$title\" /><meta property=\"og:url\" content=\"$canonical\" /><meta property=\"og:type\" content=\"website\" />\n";
  echo "<script type=\"application/ld+json\">$schemaJson</script>\n</head>\n<body>\n<main>\n";
  echo "<p><a href=\"$SITE/\">Celestial Dental Centre</a> › Branches › $name</p>\n";
  echo "<h1>Celestial Dental Centre — $name Branch</h1>\n";
  if ($tagline) echo "<p><em>$tagline</em></p>\n";
  echo "<p>$desc</p>\n";
  echo "<h2>Visit us</h2>\n<p>$addrHtml</p>\n";
  if ($landmark) echo "<p>Landmark: $landmark</p>\n";
  if ($parking) echo "<p>Parking: $parking</p>\n";
  $phoneLinks = implode(' / ', array_map(function ($p) {
    $p = trim($p);
    return "<a href=\"tel:" . preg_replace('/[^+\d]/', '', $p) . "\">$p</a>";
  }, explode('/', $phone)));
  echo "<p>Phone: $phoneLinks" . ($whatsapp ? " · WhatsApp: <a href=\"$whatsapp\">$whatsapp</a>" : '') . "</p>\n";
  echo "<p>Opening hours: $hours (open every day)</p>\n";
  if ($googleProfile) {
    echo "<p>Official Google Business Profile: <a href=\"$googleProfile\">Celestial Dental Centre -Kasarani Branch</a>. Use the live profile for current reviews, rating, and directions.</p>\n";
  }
  echo "<h2>" . ($acceptsSha ? 'Insurance and SHA' : 'Insurance') . " at $name</h2>\n<p>" . htmlspecialchars($insuranceText, ENT_QUOTES, 'UTF-8') . "</p>\n";
  echo "<h2>Services at this branch</h2>\n<ul>\n";
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
  foreach ($services as $sSlug => $sName) {
    echo "<li><a href=\"$SITE/services/$sSlug\">$sName</a></li>\n";
  }
  echo "</ul>\n";
  echo "<p>Book an appointment: <a href=\"$SITE/?book=1\">$SITE/?book=1</a></p>\n";
  echo about_section($SITE);
  echo "</main>\n</body>\n</html>\n";
  exit;
}

// ─────────────────────────── Blog index (/blog) ───────────────────────────
if ($slug === 'blog') {
  $posts = cd_posts();
  $itemsHtml = '';
  $itemsSchema = [];
  foreach ($posts as $p) {
    $t   = htmlspecialchars($p['title'] ?? '', ENT_QUOTES, 'UTF-8');
    $e   = htmlspecialchars($p['excerpt'] ?? '', ENT_QUOTES, 'UTF-8');
    $u   = cd_canonical($p);
    $d   = cd_iso_published($p);
    $tag = htmlspecialchars($p['tag'] ?? '', ENT_QUOTES, 'UTF-8');
    $itemsHtml .= "<article><h2><a href=\"$u\">$t</a></h2>"
      . "<p><time datetime=\"$d\">$d</time>" . ($tag ? " · $tag" : '') . "</p>"
      . ($e ? "<p>$e</p>" : '')
      . "<p><a href=\"$u\">Read the article</a> · <a href=\"$u.md\">Markdown version</a></p></article>";
    $itemsSchema[] = [
      '@type'         => 'BlogPosting',
      'headline'      => $p['title'] ?? '',
      'url'           => $u,
      'datePublished' => $d,
      'dateModified'  => cd_iso_modified($p),
      'description'   => $p['excerpt'] ?? '',
    ];
  }
  $schema = json_encode([
    '@context'    => 'https://schema.org',
    '@type'       => 'Blog',
    'name'        => 'Celestial Dental Centre Blog',
    'url'         => $SITE . '/blog',
    'description' => 'Patient education articles on dental health, braces, implants, and oral care from Celestial Dental Centre, Kenya.',
    'inLanguage'  => 'en',
    'publisher'   => [
      '@type' => 'Organization',
      'name'  => 'Celestial Dental Centre',
      'url'   => $SITE . '/',
      'logo'  => ['@type' => 'ImageObject', 'url' => $SITE . '/brand/celestial-logo.png'],
    ],
    'blogPost'    => $itemsSchema,
  ], JSON_UNESCAPED_SLASHES);

  header('Content-Type: text/html; charset=utf-8');
  header('X-Robots-Tag: index, follow');
  ?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dental Health Blog | Celestial Dental Centre</title>
  <meta name="description" content="Patient education articles on dental health, braces, implants, and oral care from Celestial Dental Centre — dental clinics in Kasarani, Kamakis, Eldoret, and Kiambu Road, Kenya." />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />
  <link rel="canonical" href="<?= $SITE ?>/blog" />
  <link rel="alternate" type="text/markdown" href="<?= $SITE ?>/blog.md" title="Markdown version" />
  <meta property="og:title" content="Dental Health Blog | Celestial Dental Centre" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="<?= $SITE ?>/blog" />
  <script type="application/ld+json"><?= $schema ?></script>
</head>
<body>
  <main>
    <p><a href="<?= $SITE ?>/">Celestial Dental Centre</a> › Blog</p>
    <h1>Dental Health Blog</h1>
    <p>Patient education articles written and reviewed by the Celestial Dental Centre clinical team. A machine-readable index of all articles is at <a href="<?= $SITE ?>/blog.md"><?= $SITE ?>/blog.md</a> and in <a href="<?= $SITE ?>/llms.txt"><?= $SITE ?>/llms.txt</a>.</p>
    <?= $itemsHtml ?>
    <?= about_section($SITE) ?>
  </main>
</body>
</html>
  <?php
  exit;
}

// ─────────────────────────── Single article ───────────────────────────
$post = cd_find_post($slug);
if (!$post) spa_shell();

$title     = htmlspecialchars($post['title'] ?? '', ENT_QUOTES, 'UTF-8');
$excerpt   = htmlspecialchars($post['excerpt'] ?? '', ENT_QUOTES, 'UTF-8');
$tag       = htmlspecialchars($post['tag'] ?? '', ENT_QUOTES, 'UTF-8');
$imageUrl  = htmlspecialchars($post['image'] ?? '', ENT_QUOTES, 'UTF-8');
$canonical = cd_canonical($post);
$published = cd_iso_published($post);
$modified  = cd_iso_modified($post);
$bodyText  = ($post['body'] ?? '') !== '' ? $post['body'] : ($post['excerpt'] ?? '');
$bodyHtml  = render_body($bodyText);
$plain     = cd_plain_text($bodyText);
$wordCount = str_word_count($plain);

$publisher = [
  '@type' => 'Organization',
  'name'  => 'Celestial Dental Centre',
  'url'   => $SITE . '/',
  'logo'  => ['@type' => 'ImageObject', 'url' => $SITE . '/brand/celestial-logo.png'],
];

// Named clinical reviewer, shared with the React page via one JSON file so the
// byline cannot drift between what visitors read and what crawlers are told.
// Blank name = attribute the clinical team, exactly as before.
$reviewerRaw  = @file_get_contents(__DIR__ . '/medical-reviewer.json');
$reviewerData = $reviewerRaw ? json_decode($reviewerRaw, true) : null;
$reviewerName = is_array($reviewerData) ? trim($reviewerData['name'] ?? '') : '';
$reviewerCred = is_array($reviewerData) ? trim($reviewerData['credentials'] ?? '') : '';
$reviewerReg  = is_array($reviewerData) ? trim($reviewerData['registration'] ?? '') : '';
$reviewerLine = '';
$reviewerPerson = null;
if ($reviewerName !== '') {
  $reviewerLine = trim($reviewerName . ($reviewerCred !== '' ? ', ' . $reviewerCred : ''))
    . ($reviewerReg !== '' ? ' · Reg. ' . $reviewerReg : '');
  $reviewerPerson = ['@type' => 'Person', 'name' => $reviewerName];
  $jobTitle = trim($reviewerData['jobTitle'] ?? '');
  $profile  = trim($reviewerData['url'] ?? '');
  if ($jobTitle !== '') $reviewerPerson['jobTitle'] = $jobTitle;
  if ($profile !== '')  $reviewerPerson['url'] = $profile;
  if ($reviewerCred !== '') {
    $reviewerPerson['hasCredential'] = ['@type' => 'EducationalOccupationalCredential', 'credentialCategory' => $reviewerCred];
  }
  if ($reviewerReg !== '') {
    $reviewerPerson['identifier'] = ['@type' => 'PropertyValue', 'name' => 'Practitioner registration', 'value' => $reviewerReg];
  }
  $reviewerPerson['worksFor'] = ['@type' => 'Organization', 'name' => 'Celestial Dental Centre'];
}

$schema = json_encode([
  '@context'            => 'https://schema.org',
  '@type'               => 'BlogPosting',
  'headline'            => $post['title'] ?? '',
  'description'         => $post['excerpt'] ?? '',
  'image'               => $post['image'] ?? '',
  'url'                 => $canonical,
  'datePublished'       => $published,
  'dateModified'        => $modified,
  'wordCount'           => $wordCount,
  'inLanguage'          => 'en',
  'isAccessibleForFree' => true,
  'keywords'            => $post['tag'] ?? '',
  'articleBody'         => $plain,
  'mainEntityOfPage'    => ['@type' => 'WebPage', '@id' => $canonical],
  'author'              => $reviewerPerson ?: $publisher,
  'publisher'           => $publisher,
  // Provenance an assistant can attribute: who stands behind the advice, when
  // it was last checked, and what it is about.
  'reviewedBy'          => $reviewerPerson ?: $publisher,
  'lastReviewed'        => $modified ?: $published,
  'about'               => array_values(array_filter([
    $post['tag'] ?? '',
    'Dentistry',
    'Oral health',
  ])),
  'isPartOf'            => [
    '@type' => 'Blog',
    'name'  => 'Celestial Dental Centre Blog',
    'url'   => $SITE . '/blog',
  ],
  'encoding'            => [
    '@type'             => 'MediaObject',
    'encodingFormat'    => 'text/markdown',
    'contentUrl'        => $canonical . '.md',
  ],
  'license'             => $SITE . '/blog',
  'copyrightHolder'     => $publisher,
], JSON_UNESCAPED_SLASHES);

// Each question in the article, exposed as its own answerable unit.
$articleFaqs = cd_extract_faqs($bodyText);
$faqSchema = '';
if (count($articleFaqs) >= 2) {
  $faqEntities = [];
  foreach ($articleFaqs as $f) {
    $faqEntities[] = [
      '@type'          => 'Question',
      'name'           => $f['q'],
      'acceptedAnswer' => ['@type' => 'Answer', 'text' => $f['a']],
    ];
  }
  $faqSchema = json_encode([
    '@context'   => 'https://schema.org',
    '@type'      => 'FAQPage',
    'url'        => $canonical,
    'inLanguage' => 'en',
    'mainEntity' => $faqEntities,
  ], JSON_UNESCAPED_SLASHES);
}

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: index, follow');
?>
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?= $title ?> | Celestial Dental Centre</title>
  <meta name="description" content="<?= $excerpt ?>" />
  <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1" />
  <link rel="canonical" href="<?= $canonical ?>" />
  <link rel="alternate" type="text/markdown" href="<?= $canonical ?>.md" title="Markdown version" />
  <meta property="og:title" content="<?= $title ?>" />
  <meta property="og:description" content="<?= $excerpt ?>" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="<?= $canonical ?>" />
  <meta property="og:site_name" content="Celestial Dental Centre" />
  <meta property="article:published_time" content="<?= $published ?>" />
  <meta property="article:modified_time" content="<?= $modified ?>" />
  <?php if ($tag): ?><meta property="article:tag" content="<?= $tag ?>" /><?php endif; ?>
  <?php if ($imageUrl): ?><meta property="og:image" content="<?= $imageUrl ?>" /><?php endif; ?>
  <script type="application/ld+json"><?= $schema ?></script>
  <?php if ($faqSchema): ?><script type="application/ld+json"><?= $faqSchema ?></script>
  <?php endif; ?>
</head>
<body>
  <main>
    <article>
      <p><a href="<?= $SITE ?>/">Celestial Dental Centre</a> › <a href="<?= $SITE ?>/blog">Blog</a><?= $tag ? " › $tag" : '' ?></p>
      <h1><?= $title ?></h1>
      <p><?= $reviewerLine ? 'Medically reviewed by ' . htmlspecialchars($reviewerLine, ENT_QUOTES, 'UTF-8') : 'By the Celestial Dental Centre clinical team' ?> · Published <time datetime="<?= $published ?>"><?= $published ?></time><?= $modified && $modified !== $published ? " · Updated <time datetime=\"$modified\">$modified</time>" : '' ?></p>
      <?php if ($imageUrl): ?><figure><img src="<?= $imageUrl ?>" alt="<?= $title ?>" /></figure><?php endif; ?>
      <?= $bodyHtml ?>
    </article>
    <hr />
    <section>
      <h2>Cite this article</h2>
      <p>Celestial Dental Centre. “<?= $title . (preg_match('/[.!?]$/u', $post['title'] ?? '') ? '' : '.') ?>” Celestial Dental Centre Blog, <?= $published ?>. <?= $canonical ?></p>
      <p>Canonical URL: <a href="<?= $canonical ?>"><?= $canonical ?></a> · Markdown version: <a href="<?= $canonical ?>.md"><?= $canonical ?>.md</a></p>
    </section>
    <?= about_section($SITE) ?>
  </main>
</body>
</html>
