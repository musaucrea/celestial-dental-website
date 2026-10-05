<?php
// Shared helpers for the crawler/AI endpoints (prerender.php, sitemap.php,
// llms.php, post-md.php): fetch + cache the published blog feed and normalise
// post fields into citation metadata. Not a page — include only.

define('CD_API',  'https://celestial-dental-centre-ltd.vercel.app/api/blog');
define('CD_SITE', 'https://celestialdental.org');

// Published posts, newest first. Cached for 10 minutes so crawler bursts
// don't hammer the API; a stale cache beats an empty response if the API
// is briefly unreachable.
function cd_posts() {
  static $posts = null;
  if ($posts !== null) return $posts;

  $cacheFile = sys_get_temp_dir() . '/celestial-blog-cache.json';
  $json = null;
  if (is_readable($cacheFile) && time() - filemtime($cacheFile) < 600) {
    $json = file_get_contents($cacheFile);
  }
  if (!$json) {
    $ch = curl_init(CD_API);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_CONNECTTIMEOUT => 5,
      CURLOPT_TIMEOUT        => 10,
    ]);
    $json = curl_exec($ch);
    if ($json) @file_put_contents($cacheFile, $json);
    elseif (is_readable($cacheFile)) $json = file_get_contents($cacheFile);
  }

  $data  = $json ? json_decode($json, true) : null;
  $all   = is_array($data) && isset($data['posts']) ? $data['posts'] : [];
  $posts = array_values(array_filter($all, function ($p) {
    return (($p['status'] ?? 'published') === 'published') && (($p['slug'] ?? '') !== '' || ($p['id'] ?? '') !== '');
  }));
  return $posts;
}

function cd_find_post($slug) {
  foreach (cd_posts() as $p) {
    if (($p['slug'] ?? '') === $slug || ($p['id'] ?? '') === $slug) return $p;
  }
  return null;
}

// Root-level keyword slug is the canonical URL for a post
function cd_canonical($post) {
  return CD_SITE . '/' . rawurlencode($post['slug'] ?? $post['id'] ?? '');
}

// "14 Jul 2026" (display format stored in the sheet) → "2026-07-14"
function cd_iso_published($post) {
  $ts = strtotime($post['date'] ?? '');
  if (!$ts) $ts = strtotime($post['updatedAt'] ?? '');
  return $ts ? date('Y-m-d', $ts) : '';
}

function cd_iso_modified($post) {
  $ts = strtotime($post['updatedAt'] ?? '');
  return $ts ? date('Y-m-d', $ts) : cd_iso_published($post);
}

// Published branches (admin-managed via /api/branches), cached like the blog
// feed. Empty array if the API is unreachable and no cache exists.
function cd_branches() {
  static $branches = null;
  if ($branches !== null) return $branches;

  $api = 'https://celestial-dental-centre-ltd.vercel.app/api/branches';
  $cacheFile = sys_get_temp_dir() . '/celestial-branches-cache.json';
  $json = null;
  if (is_readable($cacheFile) && time() - filemtime($cacheFile) < 600) {
    $json = file_get_contents($cacheFile);
  }
  if (!$json) {
    $ch = curl_init($api);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_CONNECTTIMEOUT => 5,
      CURLOPT_TIMEOUT        => 10,
    ]);
    $json = curl_exec($ch);
    if ($json) @file_put_contents($cacheFile, $json);
    elseif (is_readable($cacheFile)) $json = file_get_contents($cacheFile);
  }

  $data = $json ? json_decode($json, true) : null;
  $all  = is_array($data) && isset($data['branches']) ? $data['branches'] : [];
  $branches = array_values(array_filter($all, function ($b) {
    return (($b['status'] ?? 'published') === 'published') && ($b['slug'] ?? '') !== '';
  }));
  if (!$branches) {
    $branches = [
      [
        'status' => 'published',
        'name' => 'Kasarani',
        'slug' => 'kasarani',
        'tagline' => 'Your smile, close to home in Kasarani',
        'description' => 'Celestial Dental Centre Kasarani is on Kasarani-Mwiki Road and provides dental checkups, teeth cleaning, braces, implants, root canal treatment, children\'s dentistry, and emergency dental care.',
        'address' => "Total Petrol Station Building, 2nd Floor\nAlong Kasarani-Mwiki Road\nKasarani, Nairobi",
        'landmark' => '5 minutes from Thika Road Mall',
        'parking' => 'Parking available at the Total Petrol Station',
        'phone' => '+254 709 000 241 / +254 707 535 000',
        'whatsapp' => 'https://wa.me/254707535000',
        'map' => 'https://www.google.com/maps?cid=6616178097052496250',
        'hours' => 'Monday-Sunday, 07:00-20:00',
        'region' => 'Nairobi',
        'image' => '/facility/reception-lounge.jpg',
      ],
      [
        'status' => 'published',
        'name' => 'Kamakis',
        'slug' => 'kamakis',
        'tagline' => 'Quality dental care along the Eastern Bypass',
        'description' => 'Celestial Dental Centre Kamakis serves Ruiru and the Eastern Bypass corridor with general, restorative, cosmetic, orthodontic, children\'s, and emergency dental care.',
        'address' => "Along Eastern Bypass\nKamakis, Ruiru\nKiambu County",
        'landmark' => 'Easy access from the Eastern Bypass',
        'parking' => 'Ample parking available on-site',
        'phone' => '+254 709 000 242 / +254 724 202 252',
        'whatsapp' => 'https://wa.me/254754400500',
        'map' => 'https://maps.google.com/?q=Celestial+Dental+Centre+Kamakis',
        'hours' => 'Monday-Sunday, 07:00-20:00',
        'region' => 'Kiambu',
        'image' => '/facility/waiting-area.jpg',
      ],
      [
        'status' => 'published',
        'name' => 'Eldoret',
        'slug' => 'eldoret',
        'tagline' => 'Trusted dental care in the heart of Eldoret',
        'description' => 'Celestial Dental Centre Eldoret provides preventive, restorative, cosmetic, orthodontic, children\'s, implant, and emergency dental care in central Eldoret.',
        'address' => "Along Banaptai Street\nEldoret Town\nUasin Gishu County",
        'landmark' => 'Central Eldoret',
        'parking' => 'Street parking available nearby',
        'phone' => '+254 709 000 244 / +254 794 585 217',
        'whatsapp' => 'https://wa.me/254794585217',
        'map' => 'https://maps.google.com/?q=Celestial+Dental+Centre+Eldoret',
        'hours' => 'Monday-Sunday, 07:00-20:00',
        'region' => 'Uasin Gishu',
        'image' => '/facility/childrens-treatment-room.jpg',
      ],
      [
        'status' => 'published',
        'name' => 'Kiambu Road',
        'slug' => 'kiambu-road',
        'tagline' => 'Dental care in Thindigua, along Kiambu Road',
        'description' => 'Celestial Dental Centre Kiambu Road is at Brick House in Thindigua and provides dental checkups, teeth cleaning, braces, implants, root canal treatment, children\'s dentistry, and emergency dental care.',
        'address' => "Brick House, 2nd Floor\nThindigua, along Kiambu Road\nKiambu County",
        'landmark' => 'Thindigua, along Kiambu Road',
        'parking' => 'Call ahead to ask about parking',
        'phone' => '+254 709 000 243 / +254 711 699 281',
        'whatsapp' => 'https://wa.me/254711699281',
        'map' => 'https://maps.google.com/?q=Brick+House+Thindigua+Kiambu+Road',
        'hours' => 'Monday-Sunday, 08:00-18:00',
        'region' => 'Kiambu',
        'image' => '/facility/reception-lounge.jpg',
      ],
    ];
  }
  return $branches;
}

/** Opening and closing time from a branch's free-text hours ("… 08:00 – 18:00"). */
function cd_open_close($hours) {
  if (preg_match('/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/u', (string)$hours, $m)) return [$m[1], $m[2]];
  return ['07:00', '20:00'];
}

function cd_find_branch($slug) {
  foreach (cd_branches() as $b) {
    if (($b['slug'] ?? '') === $slug) return $b;
  }
  return null;
}

// Plain text of the light-markdown body — for wordCount and articleBody
function cd_plain_text($body) {
  $text = preg_replace('/!\[[^\]]*\]\(\S+\)/', ' ', (string)$body);   // markdown images
  $text = preg_replace('#^https?://\S+$#m', ' ', $text);              // bare media URLs
  $text = preg_replace('/^#{1,4}\s+/m', '', $text);                   // heading markers
  $text = preg_replace('/^(?:[-*•]|\d+[.)])\s+/m', '', $text);        // list markers
  $text = str_replace(['**', '*'], '', $text);
  return trim(preg_replace('/\s+/', ' ', $text));
}
