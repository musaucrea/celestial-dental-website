import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getRole, isAuthenticated , applySheetsRetries, getCachedPublic, setCachedPublic, clearCachedPublic, isSheetEnsured, markSheetEnsured} from './_utils.js';
// Current website content doubles as the seed so admins immediately see (and can
// edit) exactly what is live today.
import { services, testimonials, gallery, whyChooseUs, insurers, stats, team } from '../src/data/site.js';

type Item = {
  id: string;
  section: string;
  status: string;
  data: Record<string, unknown>;
  updatedAt: string;
};

const sheetTitle = 'SiteData';
const header = ['id', 'section', 'status', 'data', 'updatedAt'];

export const SECTIONS = ['services', 'testimonials', 'gallery', 'whyChooseUs', 'insurers', 'hero', 'stats', 'about', 'team', 'footer'] as const;

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
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

function seedRows(): string[][] {
  const now = new Date().toISOString();
  const rows: string[][] = [];
  const push = (section: string, i: number, data: Record<string, unknown>) =>
    rows.push([`${section}-seed-${i + 1}`, section, 'published', JSON.stringify(data), now]);

  services.forEach((s, i) => push('services', i, { title: s.title, description: s.description, image: s.image }));
  testimonials.forEach((t, i) => push('testimonials', i, { quote: t.quote, author: t.author, branch: (t as { branch?: string }).branch || '', stars: (t as { stars?: number }).stars ?? 5 }));
  gallery.forEach((g, i) => push('gallery', i, { src: g.src, caption: g.caption }));
  whyChooseUs.forEach((w, i) => push('whyChooseUs', i, { tag: w.tag, title: w.title, description: w.description }));
  insurers.forEach((n, i) => push('insurers', i, { name: n.name, logo: n.logo }));
  stats.forEach((s, i) => push('stats', i, { value: s.value, label: s.label }));
  team.forEach((member, i) => push('team', i, { name: member.name, role: (member as { role?: string }).role || '', image: member.image }));
  push('hero', 0, {
    eyebrow: 'Kasarani · Kamakis · Eldoret · Kiambu Road',
    title: 'Trusted dental care,',
    highlight: 'close to you.',
    subtitle: 'Calm, modern dental care for every smile — children, adults, and families — in a welcoming clinic built around comfort and clarity.',
    pills: 'Checkups, Braces, Implants, Emergency care',
  });
  push('about', 0, {
    title: 'Caring for Kenyan smiles, one visit at a time',
    intro: 'Celestial Dental Centre is a family of modern dental clinics in Kasarani, Kamakis, Eldoret, and Kiambu Road — built on calm, personalised care for children and adults alike.',
    story: 'For over fifteen years, Celestial Dental Centre has earned the trust of Kenyan families through personalised dental care, honest guidance, and a genuine commitment to patient well-being.\nWhat began as a single clinic has grown into four accessible branches — Kasarani, Kamakis, Eldoret, and Kiambu Road — each offering the full range of dental services, from children\'s first check-ups to orthodontics, implants, and emergency care.\nWe are open every day of the week, work with more than twenty insurance and medical schemes, and treat every patient the way we would want our own family treated: with patience, clarity, and zero pressure.',
    mission: 'To provide calm, modern, and affordable dental care that puts every patient — child or adult — completely at ease.',
    vision: "To be Kenya's most trusted dental care family, with a healthy smile within reach of every community we serve.",
    image: '/team/clinical-team.jpg',
  });
  return rows;
}

async function ensureSheet() {
  const { sheets, spreadsheetId } = await getSheets();
  if (isSheetEnsured(sheetTitle)) return { sheets, spreadsheetId };
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === sheetTitle);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetTitle } } }] },
    });
    const rows = seedRows();
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheetTitle}!A1:E${1 + rows.length}`,
      valueInputOption: 'RAW', requestBody: { values: [header, ...rows] },
    });
  } else {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId, range: `${sheetTitle}!A:E`,
    });
    const rows = (result.data.values || []) as string[][];
    const hasTeamRows = rows.slice(1).some(row => row[1] === 'team');
    if (!hasTeamRows) {
      const now = new Date().toISOString();
      const teamRows = team.map((member, i) => [
        `team-seed-${i + 1}`,
        'team',
        'published',
        JSON.stringify({ name: member.name, image: member.image }),
        now,
      ]);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetTitle}!A:E`,
        valueInputOption: 'RAW',
        requestBody: { values: teamRows },
      });
    }
  }
  markSheetEnsured(sheetTitle);
  return { sheets, spreadsheetId };
}

function rowsToItems(rows: string[][] = []): Item[] {
  return rows
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row => {
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(row[3] || '{}'); } catch { /* leave empty */ }
      return { id: row[0] || '', section: row[1] || '', status: row[2] || '', data, updatedAt: row[4] || '' };
    })
    .filter(item => item.status !== 'archived');
}

async function readItems() {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:E`,
  });
  return rowsToItems((result.data.values || []) as string[][]);
}

// Archived (deleted) website items — for the "Recently deleted" restore view.
async function readArchivedItems(): Promise<Item[]> {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:E`,
  });
  return ((result.data.values || []) as string[][])
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row => {
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(row[3] || '{}'); } catch { /* leave empty */ }
      return { id: row[0] || '', section: row[1] || '', status: row[2] || '', data, updatedAt: row[4] || '' };
    })
    .filter(item => item.status === 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function saveItem(input: { id?: string; section?: string; status?: string; data?: Record<string, unknown> }) {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:E`,
  });
  const rows = (result.data.values || []) as string[][];
  const id = clean(input.id) || `${input.section}-${Date.now()}`;
  const updatedAt = new Date().toISOString();
  const existingIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  const existing = existingIndex > 0 ? rows[existingIndex] : [];

  let existingData: Record<string, unknown> = {};
  try { existingData = JSON.parse(existing[3] || '{}'); } catch { /* ignore */ }

  const row = [
    id,
    clean(input.section) || existing[1] || '',
    clean(input.status) || existing[2] || 'published',
    JSON.stringify({ ...existingData, ...(input.data || {}) }),
    updatedAt,
  ];

  if (existingIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheetTitle}!A${existingIndex + 1}:E${existingIndex + 1}`,
      valueInputOption: 'RAW', requestBody: { values: [row] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${sheetTitle}!A:E`,
      valueInputOption: 'RAW', requestBody: { values: [row] },
    });
  }
}

async function deleteItem(id: string) {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:E`,
  });
  const rows = (result.data.values || []) as string[][];
  const existingIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  if (existingIndex < 1) return false;

  const row = [...rows[existingIndex]];
  while (row.length < header.length) row.push('');
  row[2] = 'archived';
  row[4] = new Date().toISOString();
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${sheetTitle}!A${existingIndex + 1}:E${existingIndex + 1}`,
    valueInputOption: 'RAW', requestBody: { values: [row] },
  });
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password, x-admin-email');
  // Website content is admin-editable; never let a shared cache serve it stale.
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      // Recently-deleted view for restoring accidental deletions (admins only)
      if (req.query.trash === '1') {
        const role = await getRole(req);
        if (role !== 'super_admin' && role !== 'admin') {
          return res.status(403).json({ error: 'Super admin access required' });
        }
        return res.status(200).json({ items: await readArchivedItems() });
      }
      if (await isAuthenticated(req)) {
        return res.status(200).json({ items: await readItems() });
      }
      const hit = getCachedPublic<object>('site-data');
      if (hit) return res.status(200).json(hit);
      const items = await readItems();
      const body = { items: items.filter(i => i.status === 'published') };
      setCachedPublic('site-data', body);
      return res.status(200).json(body);
    }
    if (req.method === 'POST') {
      const role = await getRole(req);
      const payload = (req.body || {}) as { id?: string; section?: string; status?: string; data?: Record<string, unknown> };
      if (role !== 'admin' && role !== 'super_admin' && role !== 'website_content_editor') {
        return res.status(403).json({ error: 'Website content access required' });
      }
      const existingItems = clean(payload.id) ? await readItems() : [];
      const existingSection = existingItems.find(item => item.id === clean(payload.id))?.section;
      const targetSection = existingSection || clean(payload.section) || '';
      if (targetSection === 'team' && role !== 'super_admin') {
        return res.status(403).json({ error: 'Only the Super Admin can manage staff' });
      }
      if (!clean(payload.id) && !SECTIONS.includes(clean(payload.section) as typeof SECTIONS[number])) {
        return res.status(400).json({ error: 'Valid section required' });
      }
      await saveItem(payload);
      clearCachedPublic('site-data');
      return res.status(200).json({ ok: true });
    }
    if (req.method === 'DELETE') {
      const role = await getRole(req);
      if (role !== 'admin' && role !== 'super_admin' && role !== 'website_content_editor') {
        return res.status(403).json({ error: 'Website content access required' });
      }
      const id = clean(req.query.id);
      if (!id) return res.status(400).json({ error: 'Item id required' });
      const item = (await readItems()).find(candidate => candidate.id === id);
      if (item?.section === 'team' && role !== 'super_admin') {
        return res.status(403).json({ error: 'Only the Super Admin can manage staff' });
      }
      const deleted = await deleteItem(id);
      if (!deleted) return res.status(404).json({ error: 'Item not found' });
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('SiteData API error', error);
    return res.status(500).json({ error: 'Site data API failed' });
  }
}
