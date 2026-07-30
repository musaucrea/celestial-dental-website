# celestialdental.org hosting (updated 2026-07-13)

The site is now **live on the cPanel/LiteSpeed server** (102.130.125.51,
account `czoankjm`, cPanel at `https://celestialdental.org:2083`). The
planned DNS cutover to Vercel was **not** done and is no longer needed —
DNS stays exactly as it is.

## Architecture

- **Static frontend** — the Vite build (`dist/`) lives in
  `/home/czoankjm/public_html`. `.htaccess` handles HTTPS + www→apex
  redirects, SPA fallback to `index.html`, and cache headers.
  `admin/.htaccess` adds the admin security headers.
- **API** — `/api/*` is relayed by `public_html/api-proxy.php` (source:
  `public/api-proxy.php` in this repo) to the Vercel deployment
  `https://celestial-dental-centre-ltd.vercel.app`, where the serverless
  functions and their Sensitive env vars (Google Sheets, admin passwords,
  Blob token) continue to run. The browser only ever sees
  `celestialdental.org`, so the `__Host-` session cookie works unchanged.
  LiteSpeed blocks `.htaccess` `[P]` proxying to external hosts — that is
  why the PHP relay exists; don't swap it for a RewriteRule proxy.
- **Email** — untouched; MX stays on the same server.

## Redeploying the frontend

1. `npm run build`
2. Re-add the two `.htaccess` files to `dist/` (they are kept in the repo
   history / recreate from this doc) — or keep `dist/` and only replace
   changed files.
3. Zip `dist/` contents (`cd dist && zip -r ../site.zip .` — include dotfiles)
4. cPanel File Manager → upload zip into `public_html` → Extract → delete zip.
   Keep `.well-known/` (AutoSSL) and `api-proxy.php`.

## Redeploying the API

Unchanged: `npx vercel --prod --yes` (Vercel project
`celestial-dental-centre-ltd`, owner musaucrea). The relay picks it up
automatically — it always targets the production alias.

## Backups on the server

- `/home/czoankjm/old-site-backup-2026-07-13.zip` — full old PHP site
- `/home/czoankjm/celestial.zip` — older 2024 backup (moved out of web root)

## Post-deploy checks

- `https://celestialdental.org` — 200, new site renders
- `https://www.celestialdental.org/x` — 301 → apex, path preserved
- `https://celestialdental.org/api/auth` — 401 JSON (relay + backend healthy)
- `https://celestialdental.org/api/site-data` — 200 JSON
- `/admin/` loads; sitemap.xml and robots.txt return 200
