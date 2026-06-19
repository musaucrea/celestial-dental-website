import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getRole, isAuthenticated } from './_utils';

type BlogPost = {
  id: string;
  status: string;
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  body: string;
  image: string;
  date: string;
  readTime: string;
  updatedAt: string;
};

const sheetTitle = 'Blog';
const header = ['id', 'status', 'slug', 'tag', 'title', 'excerpt', 'body', 'image', 'date', 'readTime', 'updatedAt'];

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
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
  return { spreadsheetId, sheets: google.sheets({ version: 'v4', auth }) };
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
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheetTitle}!A1:K1`,
      valueInputOption: 'RAW', requestBody: { values: [header] },
    });
  }
  return { sheets, spreadsheetId };
}

function rowsToPosts(rows: string[][] = []): BlogPost[] {
  return rows
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row => Object.fromEntries(header.map((key, i) => [key, row[i] || ''])) as BlogPost)
    .filter(p => p.status !== 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function readPosts() {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:K`,
  });
  return rowsToPosts((result.data.values || []) as string[][]);
}

async function savePost(input: Partial<BlogPost>) {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:K`,
  });
  const rows = (result.data.values || []) as string[][];
  const id = clean(input.id) || `post-${Date.now()}`;
  const slug = clean(input.slug) || id;
  const updatedAt = new Date().toISOString();
  const existingIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  const existing = existingIndex > 0 ? rows[existingIndex] : [];

  const row = [
    id,
    clean(input.status) || existing[1] || 'published',
    slug,
    clean(input.tag) || existing[3] || '',
    clean(input.title) || existing[4] || '',
    clean(input.excerpt) || existing[5] || '',
    clean(input.body) || existing[6] || '',
    clean(input.image) || existing[7] || '',
    clean(input.date) || existing[8] || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    clean(input.readTime) || existing[9] || '3 min read',
    updatedAt,
  ];

  if (existingIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheetTitle}!A${existingIndex + 1}:K${existingIndex + 1}`,
      valueInputOption: 'RAW', requestBody: { values: [row] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${sheetTitle}!A:K`,
      valueInputOption: 'RAW', requestBody: { values: [row] },
    });
  }
  return row;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password, x-admin-email');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const posts = await readPosts();
      return res.status(200).json({
        posts: await isAuthed(req) ? posts : posts.filter(p => p.status === 'published'),
      });
    }
    if (req.method === 'POST') {
      if (!await isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
      const payload = req.body || {};
      if (!clean(payload.title) && clean(payload.status) !== 'archived') {
        return res.status(400).json({ error: 'Title is required' });
      }
      // Content creators can only save as draft
      const role = await getRole(req);
      if (role === 'content_creator') {
        payload.status = 'draft';
      }
      await savePost(payload);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Blog API error', error);
    return res.status(500).json({ error: 'Blog API failed' });
  }
}
