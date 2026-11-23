import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSheetsClient, isAuthenticated } from './_utils.js';
import { sendWeeklyReport } from './_weekly-report.js';
import { prettySlug } from './blog.js';

type Visit = {
  ts: string;
  path: string;
  referrer: string;
  country: string;
  city: string;
  device: string;
  sid: string;
  vid: string;
};

const sheetTitle = 'Visits';
// 'vid' (persistent retargeting cookie id) is appended after 'sid' so rows
// written before the column existed still map correctly.
const header = ['ts', 'path', 'referrer', 'country', 'city', 'device', 'sid', 'vid'];

const BOT_RE = /bot|crawl|spider|preview|lighthouse|pingdom|uptime|curl|wget|python|headless/i;

// Scrapers probe for image/asset URLs that don't exist here; the cPanel SPA
// fallback answers them with index.html, so the beacon fires and logs the
// bogus path as a pageview. No real route ends in a file extension.
const ASSET_RE = /\.(jpe?g|png|gif|webp|avif|bmp|svg|ico|css|js|mjs|map|woff2?|ttf|eot|mp4|webm|mp3|zip|env|asp|aspx|jsp|cgi)$/i;

async function ensureSheet() {
  const { sheets, spreadsheetId } = await getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === sheetTitle);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetTitle } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheetTitle}!A1:H1`,
      valueInputOption: 'RAW', requestBody: { values: [header] },
    });
  }
  return { sheets, spreadsheetId };
}

// Referrer hostnames that indicate the visitor arrived via an AI assistant /
// AI-powered search. When these tools pass a referrer, we can attribute the visit.
const AI_HOSTS = [
  'chatgpt.com', 'chat.openai.com', 'openai.com',
  'perplexity.ai', 'gemini.google.com', 'bard.google.com',
  'copilot.microsoft.com', 'bing.com', // Bing hosts the Copilot answer engine
  'claude.ai', 'you.com', 'poe.com', 'phind.com',
];
// AI tools usually strip the referrer and tag links with utm_source instead
// (e.g. ?utm_source=chatgpt.com or =perplexity), so bare names count too.
const AI_NAMES = ['chatgpt', 'openai', 'perplexity', 'gemini', 'bard', 'copilot', 'claude', 'poe', 'phind'];
function isAiReferrer(referrer: string): boolean {
  if (AI_HOSTS.some(h => referrer === h || referrer.endsWith('.' + h))) return true;
  return AI_NAMES.some(n => referrer === n || referrer.startsWith(n + '.'));
}

function normalizeCampaignSource(value: string): string {
  const raw = value.trim().toLowerCase().replace(/^www\./, '').slice(0, 120);
  if (!raw) return '';
  try {
    const parsed = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return raw.replace(/[^a-z0-9._-]/g, '');
  }
}

function referrerSource(ref: string, host: string): string {
  if (!ref) return 'direct';
  try {
    const u = new URL(ref);
    if (!u.hostname) return 'direct';
    // Same-site navigation (page reloads etc.) — not an external source
    if (u.hostname === host || u.hostname.endsWith('.vercel.app') && host.endsWith('.vercel.app')) return 'internal';
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'direct';
  }
}

// The public site is served from cPanel and /api is relayed through
// api-proxy.php, so Vercel's x-vercel-ip-* headers describe the relay server
// (Durban, ZA) — not the visitor. The proxy forwards the visitor's IP in
// X-Client-IP; geolocate that instead, falling back to the Vercel headers.
const geoCache = new Map<string, { country: string; city: string }>();

async function geoLookup(ip: string): Promise<{ country: string; city: string } | null> {
  if (!ip || /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|f[cd])/i.test(ip)) return null;
  const cached = geoCache.get(ip);
  if (cached) return cached;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code,city`, { signal: controller.signal });
    clearTimeout(timer);
    const data = await res.json() as { success?: boolean; country_code?: string; city?: string };
    if (!data?.success) return null;
    const geo = { country: String(data.country_code || ''), city: String(data.city || '') };
    geoCache.set(ip, geo);
    return geo;
  } catch {
    return null;
  }
}

async function recordVisit(req: VercelRequest) {
  const ua = String(req.headers['user-agent'] || '');
  if (BOT_RE.test(ua)) return;

  let body: Record<string, unknown> = {};
  if (req.body && typeof req.body === 'object') body = req.body as Record<string, unknown>;
  else if (typeof req.body === 'string') { try { body = JSON.parse(req.body); } catch { /* ignore */ } }

  const path = String(body.path || '/').slice(0, 200);
  if (path.startsWith('/admin')) return;
  if (ASSET_RE.test(path)) return;

  const host = String(req.headers['x-original-host'] || req.headers.host || '').split(':')[0].toLowerCase();

  let ref = referrerSource(String(body.ref || ''), host);
  // AI assistants and ad campaigns often strip the referrer but tag the
  // landing URL with utm_source — use it when no external referrer exists.
  const utm = normalizeCampaignSource(String(body.utm || body.source || ''));
  if ((ref === 'direct' || ref === 'internal') && utm) ref = utm;

  const clientIp = String(req.headers['x-client-ip'] || '').split(',')[0].trim();
  const geo = await geoLookup(clientIp);
  // The current cPanel proxy already sends X-Client-IP; newer copies also send
  // X-CD-Proxy. Either signal means Vercel's own geo belongs to the relay.
  const relayed = String(req.headers['x-cd-proxy'] || '') === 'cpanel' || Boolean(clientIp);
  // For relayed traffic, Vercel's geo headers locate the relay (previously
  // reported as Durban, ZA), not the visitor. Unknown is more truthful.
  const country = geo?.country || String(req.headers['x-client-country'] || '') ||
    (relayed ? '' : String(req.headers['x-vercel-ip-country'] || ''));
  const city = geo?.city ||
    (relayed ? '' : decodeURIComponent(String(req.headers['x-vercel-ip-city'] || '')));

  const row = [
    new Date().toISOString(),
    path,
    ref.slice(0, 120),
    country.slice(0, 8),
    city.slice(0, 60),
    /mobile|android|iphone|ipad/i.test(ua) ? 'mobile' : 'desktop',
    String(body.sid || '').slice(0, 48),
    String(body.vid || '').slice(0, 48),
  ];

  const { sheets, spreadsheetId } = await ensureSheet();
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${sheetTitle}!A:H`,
    valueInputOption: 'RAW', requestBody: { values: [row] },
  });
}

function top(counter: Map<string, number>, limit = 8) {
  return [...counter.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function bump(counter: Map<string, number>, key: string) {
  if (!key) return;
  counter.set(key, (counter.get(key) || 0) + 1);
}

// Blog posts live at root-level slugs (/my-article) as well as legacy /blog/
// paths — load the published slugs so views on either form count as blog views.
async function readBlogSlugs(sheets: Awaited<ReturnType<typeof getSheetsClient>>['sheets'], spreadsheetId: string): Promise<Set<string>> {
  try {
    const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Blog!A:E' });
    const rows = ((result.data.values || []) as string[][]).slice(1);
    return new Set(
      rows
        .filter(r => r[0] && r[1] !== 'archived')
        .map(r => prettySlug(r[2] || '', r[4] || '', r[0])),
    );
  } catch {
    return new Set();
  }
}

async function readStats() {
  const { sheets, spreadsheetId } = await ensureSheet();
  const blogSlugs = await readBlogSlugs(sheets, spreadsheetId);
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:H`,
  });
  const rows = ((result.data.values || []) as string[][]).slice(1).filter(r => r[0]);
  const visits: Visit[] = rows.map(r => ({
    ts: r[0] || '', path: r[1] || '', referrer: r[2] || '',
    country: r[3] || '', city: r[4] || '', device: r[5] || '', sid: r[6] || '', vid: r[7] || '',
  }));

  const now = Date.now();
  const DAY = 86400000;
  // Bucket days in clinic-local time — with UTC keys, a visit before 3am
  // Nairobi would land on the previous day's stats.
  const dayFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const dayKeyOf = (ms: number) => dayFmt.format(ms);
  const todayKey = dayKeyOf(now);

  const byDay = new Map<string, { views: number; sids: Set<string> }>();
  const referrers = new Map<string, number>();
  const countries = new Map<string, number>();
  const cities = new Map<string, number>();
  const pages = new Map<string, number>();
  const devices = new Map<string, number>();
  const todayCountries = new Map<string, number>();
  const todayCities = new Map<string, number>();
  const todayPages = new Map<string, number>();
  const todayDevices = new Map<string, number>();
  const todayReferrers = new Map<string, number>();
  const todaySids = new Set<string>();
  const aiSources = new Map<string, number>();       // AI-assistant referrers → visit count
  const blogViews = new Map<string, number>();        // /blog/<slug> → view count
  const sids7 = new Set<string>();
  const sids30 = new Set<string>();
  const vidDaysAll = new Map<string, Set<string>>(); // persistent-cookie id → distinct days seen (all time)
  const vids30 = new Set<string>();                  // persistent-cookie ids active in the last 30 days
  let today = 0, last7 = 0, last30 = 0, aiVisits = 0;

  type Session = {
    key: string; firstTs: string; lastTs: string;
    country: string; city: string; device: string; referrer: string;
    pages: { path: string; ts: string }[];
  };
  const sessions = new Map<string, Session>();

  visits.forEach((v, i) => {
    const t = Date.parse(v.ts);
    if (Number.isNaN(t)) return;
    const dayKey = dayKeyOf(t);
    const age = now - t;

    // Track distinct days per persistent visitor id, across all time, so we can
    // tell new visitors from returning ones.
    if (v.vid) {
      if (!vidDaysAll.has(v.vid)) vidDaysAll.set(v.vid, new Set());
      vidDaysAll.get(v.vid)!.add(dayKey);
    }

    if (dayKey === todayKey) {
      today++;
      if (v.sid) todaySids.add(v.sid);
      bump(todayCountries, v.country);
      bump(todayCities, v.city);
      bump(todayPages, v.path);
      bump(todayDevices, v.device);
      if (v.referrer && v.referrer !== 'internal') bump(todayReferrers, v.referrer);
    }
    if (age <= 7 * DAY) { last7++; if (v.sid) sids7.add(v.sid); }
    if (age <= 30 * DAY) {
      last30++;
      if (v.sid) sids30.add(v.sid);
      if (v.vid) vids30.add(v.vid);
      if (!byDay.has(dayKey)) byDay.set(dayKey, { views: 0, sids: new Set() });
      const d = byDay.get(dayKey)!;
      d.views++;
      if (v.sid) d.sids.add(v.sid);
      if (v.referrer && v.referrer !== 'internal') bump(referrers, v.referrer);
      bump(countries, v.country);
      bump(cities, v.city);
      bump(pages, v.path);
      bump(devices, v.device);
      if (isAiReferrer(v.referrer)) { aiVisits++; bump(aiSources, v.referrer); }
      if (v.path.startsWith('/blog/')) bump(blogViews, v.path.slice('/blog/'.length).split(/[?#]/)[0]);
      else {
        const rootSlug = v.path.replace(/^\//, '').split(/[?#/]/)[0];
        if (blogSlugs.has(rootSlug)) bump(blogViews, rootSlug);
      }

      // Group into visitor sessions (rows without a sid each stand alone)
      const key = v.sid || `anon-${i}`;
      let s = sessions.get(key);
      if (!s) {
        s = { key, firstTs: v.ts, lastTs: v.ts, country: v.country, city: v.city, device: v.device, referrer: v.referrer, pages: [] };
        sessions.set(key, s);
      }
      s.pages.push({ path: v.path, ts: v.ts });
      if (v.ts < s.firstTs) s.firstTs = v.ts;
      if (v.ts > s.lastTs) s.lastTs = v.ts;
      // Prefer the first non-internal referrer as the session's source
      if ((!s.referrer || s.referrer === 'internal') && v.referrer && v.referrer !== 'internal') s.referrer = v.referrer;
    }
  });

  // Most recent sessions first, pages within each ordered oldest→newest
  const sessionList = [...sessions.values()]
    .map(s => ({ ...s, pages: s.pages.sort((a, b) => a.ts.localeCompare(b.ts)) }))
    .sort((a, b) => b.lastTs.localeCompare(a.lastTs))
    .slice(0, 40);

  // New vs returning, based on the persistent cookie id (returning = seen on
  // more than one distinct day)
  let returningVisitors = 0;
  vids30.forEach(vid => { if ((vidDaysAll.get(vid)?.size || 0) > 1) returningVisitors++; });
  const newVisitors = vids30.size - returningVisitors;

  // Last 14 days as a series for the mini chart, oldest first
  const series: { date: string; views: number; visitors: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = dayKeyOf(now - i * DAY);
    const d = byDay.get(key);
    series.push({ date: key, views: d?.views || 0, visitors: d?.sids.size || 0 });
  }

  return {
    totals: {
      today,
      visitorsToday: todaySids.size,
      last7, visitors7: sids7.size,
      last30, visitors30: sids30.size,
      allTime: visits.length,
      newVisitors, returningVisitors,
      aiVisits,
    },
    series,
    referrers: top(referrers),
    todayReferrers: top(todayReferrers),
    aiSources: top(aiSources),
    countries: top(countries),
    cities: top(cities),
    pages: top(pages),
    todayCountries: top(todayCountries),
    todayCities: top(todayCities),
    todayPages: top(todayPages),
    todayDevices: top(todayDevices, 4),
    blogViews: top(blogViews, 50),
    devices: top(devices, 4),
    sessions: sessionList,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password, x-admin-email');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'POST') {
    // Never let analytics break the website — swallow all errors
    try { await recordVisit(req); } catch (error) { console.error('Track error', error); }
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    if (req.query.weekly === '1') {
      const secret = process.env.CRON_SECRET;
      if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });
      try {
        return res.status(200).json({ ok: true, ...(await sendWeeklyReport()) });
      } catch (error) {
        console.error('Weekly report failed', error);
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Weekly report failed' });
      }
    }
    if (!await isAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      return res.status(200).json(await readStats());
    } catch (error) {
      console.error('Stats error', error);
      return res.status(500).json({ error: 'Stats failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
