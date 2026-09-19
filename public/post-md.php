<?php
// Markdown versions of blog articles for AI assistants and answer engines:
//   /{slug}.md and /blog/{slug}.md  → one article as plain markdown
//   /blog.md                        → markdown index of all published articles
// Routed via .htaccess for every visitor (the .md files don't exist on disk).

require __DIR__ . '/blog-feed.php';

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$slug = trim($path ?: '/', '/');
if (strpos($slug, 'blog/') === 0) $slug = substr($slug, 5);
$slug = preg_replace('/\.md$/i', '', rawurldecode($slug));

header('Content-Type: text/markdown; charset=utf-8');
header('X-Robots-Tag: index, follow');

// ── Markdown blog index ──
if ($slug === 'blog' || $slug === '') {
  echo "# Celestial Dental Centre — Blog\n\n";
  echo "> Patient education articles on dental health, braces, implants, and oral care from Celestial Dental Centre, a dental clinic group in Kenya (Kasarani, Kamakis, Eldoret). HTML index: " . CD_SITE . "/blog\n\n";
  foreach (cd_posts() as $p) {
    $u = cd_canonical($p);
    $d = cd_iso_published($p);
    $excerpt = trim((string)($p['excerpt'] ?? ''));
    echo "- [" . str_replace(['[', ']'], '', (string)($p['title'] ?? '')) . "]($u.md)"
      . ($d ? " — published $d" : '')
      . ($excerpt !== '' ? ". $excerpt" : '') . "\n";
  }
  echo "\nSite summary for AI assistants: " . CD_SITE . "/llms.txt\n";
  exit;
}

// ── Single article ──
$post = cd_find_post($slug);
if (!$post) {
  http_response_code(404);
  echo "# Not found\n\nNo article with this address. Article index: " . CD_SITE . "/blog.md\n";
  exit;
}

$canonical = cd_canonical($post);
$published = cd_iso_published($post);
$modified  = cd_iso_modified($post);
$title     = (string)($post['title'] ?? '');
$tag       = trim((string)($post['tag'] ?? ''));
$body      = ($post['body'] ?? '') !== '' ? (string)$post['body'] : (string)($post['excerpt'] ?? '');

header('Link: <' . $canonical . '>; rel="canonical"');

echo "---\n";
echo "title: \"" . str_replace('"', '\'', $title) . "\"\n";
echo "source: $canonical\n";
echo "publisher: Celestial Dental Centre (https://celestialdental.org)\n";
echo "author: Celestial Dental Centre clinical team\n";
if ($published) echo "date_published: $published\n";
if ($modified)  echo "date_modified: $modified\n";
if ($tag)       echo "topic: $tag\n";
echo "language: en\n";
echo "---\n\n";

echo "# $title\n\n";
echo trim($body) . "\n\n";

echo "---\n\n";
$dot = preg_match('/[.!?]$/u', $title) ? '' : '.';
echo "**How to cite:** Celestial Dental Centre. \"$title$dot\" Celestial Dental Centre Blog" . ($published ? ", $published" : '') . ". $canonical\n\n";
echo "**About the publisher:** Celestial Dental Centre is a dental clinic group in Kenya with branches in Kasarani (Nairobi), Kamakis (Ruiru), and Eldoret, open daily 07:00–20:00. Bookings: " . CD_SITE . "/?book=1 · Phone/WhatsApp: +254 707 535 000. All articles: " . CD_SITE . "/blog.md\n";
