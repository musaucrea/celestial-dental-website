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

function about_section($SITE) {
  return <<<HTML
    <hr />
    <section>
      <h2>About Celestial Dental Centre</h2>
      <p>Celestial Dental Centre is also known as Celestial Dental &amp; Orthodontic Centre. The Kasarani location's official Google Business Profile is named Celestial Dental Centre -Kasarani Branch.</p>
      <p>Celestial Dental Centre is an affordable dental clinic group in Kenya with branches in Kasarani (Nairobi), Kamakis (Ruiru), and Eldoret — open every day, 07:00–20:00. Services include dental checkups, teeth cleaning, braces and orthodontics, implants, root canal therapy, children's dentistry, and same-day emergency care. M-Pesa and major insurance schemes accepted.</p>
      <p>Book an appointment: <a href="$SITE/?book=1">$SITE/?book=1</a> · Call: +254 707 535 000 · WhatsApp: https://wa.me/254707535000</p>
    </section>
HTML;
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

  $insuranceText = "SHA (Social Health Authority) is accepted at the $name branch for eligible schemes and covered treatments — including check-ups, cleaning, fillings, root canal treatment, extractions, and X-rays, depending on your cover. The clinic also offers direct billing with 20+ insurers including Jubilee, AAR, Madison, CIC, Britam, APA, GA, Heritage, First Assurance, Minet, and Equity Bank Insurance. Bring your insurance card or SHA details and the front desk will handle pre-authorisation. M-Pesa and cash are also accepted.";

  $schema = [
    '@context'  => 'https://schema.org',
    '@type'     => 'Dentist',
    'name'      => $schemaName,
    'url'       => $canonical,
    'telephone' => $b['phone'] ?? '',
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
    'paymentAccepted'    => 'Cash, M-Pesa, Insurance, SHA (Social Health Authority), NHIF, AAR, Jubilee, Madison, CIC, Britam, APA',
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
  $metaDesc = htmlspecialchars(($b['description'] ?? '') . ' Open daily 07:00-20:00. SHA and 20+ insurance schemes accepted.', ENT_QUOTES, 'UTF-8');

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
  echo "<p>Phone: <a href=\"tel:" . preg_replace('/\s+/', '', $phone) . "\">$phone</a>" . ($whatsapp ? " · WhatsApp: <a href=\"$whatsapp\">$whatsapp</a>" : '') . "</p>\n";
  echo "<p>Opening hours: $hours (open every day)</p>\n";
  if ($googleProfile) {
    echo "<p>Official Google Business Profile: <a href=\"$googleProfile\">Celestial Dental Centre -Kasarani Branch</a>. Use the live profile for current reviews, rating, and directions.</p>\n";
  }
  echo "<h2>Insurance and SHA at $name</h2>\n<p>" . htmlspecialchars($insuranceText, ENT_QUOTES, 'UTF-8') . "</p>\n";
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
  <meta name="description" content="Patient education articles on dental health, braces, implants, and oral care from Celestial Dental Centre — dental clinics in Kasarani, Kamakis, and Eldoret, Kenya." />
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
  'author'              => $publisher,
  'publisher'           => $publisher,
], JSON_UNESCAPED_SLASHES);

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
</head>
<body>
  <main>
    <article>
      <p><a href="<?= $SITE ?>/">Celestial Dental Centre</a> › <a href="<?= $SITE ?>/blog">Blog</a><?= $tag ? " › $tag" : '' ?></p>
      <h1><?= $title ?></h1>
      <p>By the Celestial Dental Centre clinical team · Published <time datetime="<?= $published ?>"><?= $published ?></time><?= $modified && $modified !== $published ? " · Updated <time datetime=\"$modified\">$modified</time>" : '' ?></p>
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
