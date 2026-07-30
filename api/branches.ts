import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getRole, isAuthenticated , applySheetsRetries, getCachedPublic, setCachedPublic, clearCachedPublic} from './_utils.js';

type Branch = {
  id: string;
  status: string;
  slug: string;
  name: string;
  badge: string;
  tagline: string;
  description: string;
  address: string;      // one line per row, joined by newlines
  landmark: string;
  parking: string;
  phone: string;
  phoneHref: string;
  whatsapp: string;
  map: string;
  hours: string;
  image: string;
  region: string;       // used for schema addressRegion
  lat: string;          // used for schema geo
  lng: string;
  photos: string;       // branch gallery — one image URL per line (up to 5)
  updatedAt: string;
};

const sheetTitle = 'Branches';
// NOTE: 'photos' is appended AFTER 'updatedAt' so rows written before the column
// existed still line up (the production sheet already has data in A:T).
const header = [
  'id', 'status', 'slug', 'name', 'badge', 'tagline', 'description', 'address',
  'landmark', 'parking', 'phone', 'phoneHref', 'whatsapp', 'map', 'hours', 'image',
  'region', 'lat', 'lng', 'updatedAt', 'photos',
];
const lastCol = 'U'; // 21 columns → A:U

// Default branches — seeds the sheet on first run so the site never renders empty.
const seed: Array<Partial<Branch>> = [
  {
    slug: 'kasarani', name: 'Kasarani', status: 'published', badge: 'Kasarani Branch',
    tagline: 'Your smile, close to home in Kasarani',
    description: "Our Kasarani branch is conveniently located on the Kasarani–Mwiki Road, just minutes from Thika Road Mall. We offer the full range of Celestial Dental services in a calm, modern setting — from children's dentistry and routine check-ups to orthodontics, implants, and emergency care.",
    address: 'Total Petrol Station Building, 2nd Floor\nAlong Kasarani – Mwiki Road\nKasarani, Nairobi',
    landmark: '5 minutes from Thika Road Mall', parking: 'Parking available at the Total Petrol Station',
    phone: '+254 707 535 000', phoneHref: 'tel:+254707535000', whatsapp: 'https://wa.me/254707535000',
    map: 'https://maps.google.com/?q=Celestial+Dental+Centre+Kasarani',
    hours: 'Monday – Sunday · 07:00 – 20:00', image: '/facility/reception-lounge.jpg',
    region: 'Nairobi', lat: '-1.2197', lng: '36.8979',
  },
  {
    slug: 'kamakis', name: 'Kamakis', status: 'published', badge: 'Kamakis Branch',
    tagline: 'Quality dental care along the Eastern Bypass',
    description: 'The Kamakis branch serves Ruiru and surrounding areas with the same high standard of care as our flagship clinic. Easily accessible off the Eastern Bypass, the branch offers ample parking and the full range of dental services for the whole family.',
    address: 'Along Eastern Bypass\nKamakis, Ruiru\nKiambu County',
    landmark: 'Easy access from the Eastern Bypass', parking: 'Ample parking available on-site',
    phone: '+254 724 202 252', phoneHref: 'tel:+254724202252', whatsapp: 'https://wa.me/254754400500',
    map: 'https://maps.google.com/?q=Celestial+Dental+Centre+Kamakis',
    hours: 'Monday – Sunday · 07:00 – 20:00', image: '/facility/waiting-area.jpg',
    region: 'Kiambu', lat: '-1.1853', lng: '36.9761',
  },
  {
    slug: 'eldoret', name: 'Eldoret', status: 'published', badge: 'Eldoret Branch',
    tagline: 'Trusted dental care in the heart of Eldoret',
    description: 'Celestial Dental Eldoret brings the same warm, professional care to the Rift Valley region. Located centrally along Banaptai Street, our Eldoret branch is easily accessible and offers all services — from preventive care and braces to implants and emergency treatment.',
    address: 'Along Banaptai Street\nEldoret Town\nUasin Gishu County',
    landmark: 'Central Eldoret — easily accessible from all directions', parking: 'Street parking available nearby',
    phone: '+254 794 585 217', phoneHref: 'tel:+254794585217', whatsapp: 'https://wa.me/254794585217',
    map: 'https://maps.google.com/?q=Celestial+Dental+Centre+Eldoret',
    hours: 'Monday – Sunday · 07:00 – 20:00', image: '/facility/childrens-treatment-room.jpg',
    region: 'Uasin Gishu', lat: '0.5143', lng: '35.2698',
  },
];

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function digitsOnly(value: string) {
  return value.replace(/[^0-9]/g, '');
}

function cleanPhotos(value: unknown) {
  return clean(value)
    .split('\n')
    .map(photo => photo.trim())
    .filter(Boolean)
    .filter((photo, index, photos) => photos.indexOf(photo) === index)
    .slice(0, 5)
    .join('\n');
}

async function isAuthed(req: VercelRequest) {
  return isAuthenticated(req);
}

async function getSheets() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientEmail || !privateKey || !spreadsheetId) throw new Error('Missing env vars');
  const auth = new google.auth.JWT({
    email: clientEmail, key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  applySheetsRetries(google);
  return { spreadsheetId, sheets: google.sheets({ version: 'v4', auth }) };
}

function toRow(b: Partial<Branch>): string[] {
  return header.map(key => clean((b as Record<string, unknown>)[key]));
}

async function ensureSheet() {
  const { sheets, spreadsheetId } = await getSheets();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === sheetTitle);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetTitle } } }] },
    });
    const now = new Date().toISOString();
    const seedRows = seed.map((b, i) => toRow({
      ...b,
      id: `branch-seed-${i + 1}`,
      updatedAt: now,
    }));
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheetTitle}!A1:${lastCol}${1 + seedRows.length}`,
      valueInputOption: 'RAW', requestBody: { values: [header, ...seedRows] },
    });
  }
  return { sheets, spreadsheetId };
}

function rowsToBranches(rows: string[][] = []): Branch[] {
  return rows
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row => Object.fromEntries(header.map((key, i) => [key, row[i] || ''])) as Branch)
    .filter(b => b.status !== 'archived')
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)); // oldest first → stable branch order
}

async function readBranches() {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:${lastCol}`,
  });
  return rowsToBranches((result.data.values || []) as string[][]);
}

async function readArchivedBranches(): Promise<Branch[]> {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetTitle}!A:${lastCol}` });
  return ((result.data.values || []) as string[][])
    .slice(1).filter(row => row.some(Boolean))
    .map(row => Object.fromEntries(header.map((key, i) => [key, row[i] || ''])) as Branch)
    .filter(item => item.status === 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function saveBranch(input: Partial<Branch>) {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:${lastCol}`,
  });
  const rows = (result.data.values || []) as string[][];
  const id = clean(input.id) || `branch-${Date.now()}`;
  const updatedAt = new Date().toISOString();
  const existingIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  const existing = existingIndex > 0
    ? (Object.fromEntries(header.map((key, i) => [key, rows[existingIndex][i] || ''])) as Branch)
    : ({} as Partial<Branch>);

  const name = clean(input.name) || existing.name || '';
  const phone = clean(input.phone) || existing.phone || '';
  const slug = clean(input.slug) || existing.slug || slugify(name);
  const phoneHref = clean(input.phoneHref) || existing.phoneHref || (phone ? `tel:+${digitsOnly(phone)}` : '');
  const whatsapp = clean(input.whatsapp) || existing.whatsapp || (phone ? `https://wa.me/${digitsOnly(phone)}` : '');
  const map = clean(input.map) || existing.map || (name ? `https://maps.google.com/?q=Celestial+Dental+Centre+${encodeURIComponent(name)}` : '');

  const merged: Branch = {
    id,
    status: clean(input.status) || existing.status || 'published',
    slug,
    name,
    badge: clean(input.badge) || existing.badge || (name ? `${name} Branch` : ''),
    tagline: clean(input.tagline) || existing.tagline || '',
    description: clean(input.description) || existing.description || '',
    address: clean(input.address) || existing.address || '',
    landmark: clean(input.landmark) || existing.landmark || '',
    parking: clean(input.parking) || existing.parking || '',
    phone,
    phoneHref,
    whatsapp,
    map,
    hours: clean(input.hours) || existing.hours || 'Monday – Sunday · 07:00 – 20:00',
    image: clean(input.image) || existing.image || '/facility/reception-lounge.jpg',
    region: clean(input.region) || existing.region || '',
    lat: clean(input.lat) || existing.lat || '',
    lng: clean(input.lng) || existing.lng || '',
    // Unlike the fields above, photos may be intentionally cleared, so an
    // explicitly-sent empty value wins over the stored one.
    photos: input.photos !== undefined ? cleanPhotos(input.photos) : cleanPhotos(existing.photos || ''),
    updatedAt,
  };

  const row = toRow(merged);
  if (existingIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheetTitle}!A${existingIndex + 1}:${lastCol}${existingIndex + 1}`,
      valueInputOption: 'RAW', requestBody: { values: [row] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${sheetTitle}!A:${lastCol}`,
      valueInputOption: 'RAW', requestBody: { values: [row] },
    });
  }
  return merged;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password, x-admin-email');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      if (req.query.trash === '1') {
        const role = await getRole(req);
        if (role !== 'super_admin' && role !== 'admin') return res.status(403).json({ error: 'Super admin access required' });
        return res.status(200).json({ branches: await readArchivedBranches() });
      }
      if (await isAuthed(req)) {
        return res.status(200).json({ branches: await readBranches() });
      }
      const hit = getCachedPublic<object>('branches');
      if (hit) return res.status(200).json(hit);
      const branches = await readBranches();
      const body = { branches: branches.filter(b => b.status === 'published') };
      setCachedPublic('branches', body);
      return res.status(200).json(body);
    }
    if (req.method === 'POST') {
      // Only admins/super admins manage branches (they drive the public site & schema).
      const role = await getRole(req);
      if (role !== 'admin' && role !== 'super_admin') {
        return res.status(401).json({ error: 'Admin access required' });
      }
      const payload = req.body || {};
      if (!clean(payload.name) && clean(payload.status) !== 'archived') {
        return res.status(400).json({ error: 'Branch name is required' });
      }
      const branch = await saveBranch(payload);
      clearCachedPublic('branches');
      return res.status(200).json({ ok: true, branch });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Branches API error', error);
    return res.status(500).json({ error: 'Branches API failed' });
  }
}
