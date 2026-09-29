<?php
// Generates sitemap.xml (routed via .htaccess) — static pages plus one entry
// per published blog post, so search engines and AI crawlers discover new
// articles without a redeploy.

require __DIR__ . '/blog-feed.php';

$static = [
  // [path, lastmod, changefreq, priority]
  ['/',                                     '2026-07-08', 'weekly',  '1.0'],
  ['/braces',                               '2026-07-14', 'weekly',  '0.9'],
  ['/about',                                '2026-07-08', 'monthly', '0.8'],
  ['/careers',                              '2026-07-08', 'weekly',  '0.6'],
  ['/services',                             '2026-07-09', 'weekly',  '0.9'],
  ['/branches/kasarani',                    '2026-07-08', 'monthly', '0.9'],
  ['/branches/kamakis',                     '2026-07-08', 'monthly', '0.9'],
  ['/branches/eldoret',                     '2026-07-08', 'monthly', '0.9'],
  ['/branches/kiambu-road',                 '2026-09-29', 'monthly', '0.9'],
  ['/services/dental-checkup',              '2026-07-08', 'monthly', '0.9'],
  ['/services/general-dentistry',           '2026-07-08', 'monthly', '0.9'],
  ['/services/dental-x-rays',               '2026-07-08', 'monthly', '0.9'],
  ['/services/dental-emergencies',          '2026-07-08', 'monthly', '0.9'],
  ['/services/cosmetic-dentistry',          '2026-07-08', 'monthly', '0.9'],
  ['/services/teeth-whitening',             '2026-07-08', 'monthly', '0.9'],
  ['/services/dental-bridges-and-crowns',   '2026-07-08', 'monthly', '0.9'],
  ['/services/full-and-partial-dentures',   '2026-07-08', 'monthly', '0.9'],
  ['/services/dental-implants',             '2026-07-08', 'monthly', '0.9'],
  ['/services/orthodontics-braces',         '2026-07-08', 'monthly', '0.9'],
  ['/services/root-canal-therapy',          '2026-07-08', 'monthly', '0.9'],
  ['/services/childrens-dentistry',         '2026-07-08', 'monthly', '0.9'],
  ['/services/dental-fillings',             '2026-07-08', 'monthly', '0.9'],
  ['/services/gum-disease-treatment',       '2026-07-08', 'monthly', '0.9'],
  ['/services/teeth-extraction',            '2026-07-08', 'monthly', '0.9'],
  ['/services/teeth-cleaning',              '2026-07-08', 'monthly', '0.9'],
  // llms.txt, ai.txt and crawl.html are deliberately NOT listed. A sitemap is a
  // list of pages you want indexed; those three are machine-readable assets that
  // Google crawls and then declines to index, which parks them in the
  // "not indexed" report and makes real coverage problems harder to see. AI
  // crawlers still find them through robots.txt, which names all three.
];

$posts = cd_posts();

// Blog index freshness follows the newest post
$blogLastmod = '2026-07-13';
foreach ($posts as $p) {
  $m = cd_iso_modified($p);
  if ($m > $blogLastmod) $blogLastmod = $m;
}

header('Content-Type: application/xml; charset=utf-8');
echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
echo "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";

function url_entry($loc, $lastmod, $changefreq, $priority) {
  $loc = htmlspecialchars($loc, ENT_QUOTES, 'UTF-8');
  echo "  <url>\n    <loc>$loc</loc>\n    <lastmod>$lastmod</lastmod>\n    <changefreq>$changefreq</changefreq>\n    <priority>$priority</priority>\n  </url>\n";
}

foreach ($static as [$path, $lastmod, $freq, $prio]) {
  url_entry(CD_SITE . $path, $lastmod, $freq, $prio);
}
url_entry(CD_SITE . '/blog', $blogLastmod, 'weekly', '0.8');
foreach ($posts as $p) {
  url_entry(cd_canonical($p), cd_iso_modified($p), 'monthly', '0.7');
}

echo "</urlset>\n";
