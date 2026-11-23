<?php
// Relays /api/* to the Vercel deployment where the serverless functions
// and their secrets live. Same-origin for the browser, so the
// __Host- session cookie works unchanged.
$backend = 'https://celestial-dental-centre-ltd.vercel.app/api/';

$path = $_GET['__apipath'] ?? '';
if (!preg_match('#^[A-Za-z0-9_\-/.]*$#', $path)) {
  http_response_code(400);
  exit;
}
parse_str($_SERVER['QUERY_STRING'] ?? '', $qs);
unset($qs['__apipath']);
$query = http_build_query($qs);
$url = $backend . $path . ($query !== '' ? ('?' . $query) : '');

$headers = [];
if (isset($_SERVER['CONTENT_TYPE']))         $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
if (isset($_SERVER['HTTP_AUTHORIZATION']))   $headers[] = 'Authorization: ' . $_SERVER['HTTP_AUTHORIZATION'];
if (isset($_SERVER['HTTP_ACCEPT']))          $headers[] = 'Accept: ' . $_SERVER['HTTP_ACCEPT'];
if (isset($_SERVER['HTTP_COOKIE']))          $headers[] = 'Cookie: ' . $_SERVER['HTTP_COOKIE'];
if (isset($_SERVER['HTTP_USER_AGENT']))      $headers[] = 'User-Agent: ' . $_SERVER['HTTP_USER_AGENT'];
$headers[] = 'X-CD-Proxy: cpanel';
$headers[] = 'X-Original-Host: ' . ($_SERVER['HTTP_HOST'] ?? 'celestialdental.org');

// REMOTE_ADDR may be a CDN/reverse-proxy address. Prefer headers populated by
// the trusted edge, then use the first address in X-Forwarded-For.
$ip = $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['HTTP_TRUE_CLIENT_IP'] ?? '';
if ($ip === '' && isset($_SERVER['HTTP_X_FORWARDED_FOR'])) {
  $ip = trim(explode(',', $_SERVER['HTTP_X_FORWARDED_FOR'])[0]);
}
if ($ip === '') $ip = $_SERVER['REMOTE_ADDR'] ?? '';
if (!filter_var($ip, FILTER_VALIDATE_IP)) $ip = '';
if ($ip !== '') {
  $headers[] = 'X-Forwarded-For: ' . $ip;
  // Vercel overwrites X-Forwarded-For with this server's IP, so the visitor's
  // real IP must travel in a custom header for geolocation to work.
  $headers[] = 'X-Client-IP: ' . $ip;
}
if (isset($_SERVER['HTTP_CF_IPCOUNTRY']) && preg_match('/^[A-Z]{2}$/', $_SERVER['HTTP_CF_IPCOUNTRY'])) {
  $headers[] = 'X-Client-Country: ' . $_SERVER['HTTP_CF_IPCOUNTRY'];
}

$method = $_SERVER['REQUEST_METHOD'];
$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_CUSTOMREQUEST  => $method,
  CURLOPT_HTTPHEADER     => $headers,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HEADER         => true,
  CURLOPT_FOLLOWLOCATION => false,
  CURLOPT_CONNECTTIMEOUT => 10,
  CURLOPT_TIMEOUT        => 60,
]);
if ($method !== 'GET' && $method !== 'HEAD') {
  curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
}

$resp = curl_exec($ch);
if ($resp === false) {
  http_response_code(502);
  header('Content-Type: application/json');
  echo json_encode(['error' => 'Upstream unreachable']);
  exit;
}
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$code       = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
$rawHeaders = substr($resp, 0, $headerSize);
$body       = substr($resp, $headerSize);
curl_close($ch);

http_response_code($code);
foreach (preg_split('/\r?\n/', $rawHeaders) as $line) {
  if (stripos($line, 'Set-Cookie:') === 0) {
    header($line, false);
  } elseif (preg_match('/^(Content-Type|Cache-Control|Location|Content-Disposition):/i', $line)) {
    header($line);
  }
}
echo $body;
