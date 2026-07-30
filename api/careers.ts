import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getRole, isAuthenticated } from './_utils.js';
import careerApplicationsHandler from './_career-applications.js';
import careerResumeHandler from './_career-resume.js';

type Opening = {
  id: string;
  status: string;
  title: string;
  type: string;
  location: string;
  description: string;
  updatedAt: string;
  image: string;
};

const sheetTitle = 'Careers';
// 'image' is appended after 'updatedAt' so rows written before the column existed still map correctly
const header = ['id', 'status', 'title', 'type', 'location', 'description', 'updatedAt', 'image'];

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
      spreadsheetId, range: `${sheetTitle}!A1:H1`,
      valueInputOption: 'RAW', requestBody: { values: [header] },
    });
  }
  return { sheets, spreadsheetId };
}

function rowsToOpenings(rows: string[][] = []): Opening[] {
  return rows
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row => Object.fromEntries(header.map((key, i) => [key, row[i] || ''])) as Opening)
    .filter(o => o.status !== 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function readOpenings() {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:H`,
  });
  return rowsToOpenings((result.data.values || []) as string[][]);
}

async function readArchivedOpenings(): Promise<Opening[]> {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetTitle}!A:H` });
  return ((result.data.values || []) as string[][])
    .slice(1).filter(row => row.some(Boolean))
    .map(row => Object.fromEntries(header.map((key, i) => [key, row[i] || ''])) as Opening)
    .filter(item => item.status === 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function saveOpening(input: Partial<Opening>) {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:H`,
  });
  const rows = (result.data.values || []) as string[][];
  const id = clean(input.id) || `job-${Date.now()}`;
  const updatedAt = new Date().toISOString();
  const existingIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  const existing = existingIndex > 0 ? rows[existingIndex] : [];

  const row = [
    id,
    clean(input.status) || existing[1] || 'published',
    clean(input.title) || existing[2] || '',
    clean(input.type) || existing[3] || '',
    clean(input.location) || existing[4] || '',
    clean(input.description) || existing[5] || '',
    updatedAt,
    clean(input.image) || existing[7] || '',
  ];

  if (existingIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheetTitle}!A${existingIndex + 1}:H${existingIndex + 1}`,
      valueInputOption: 'RAW', requestBody: { values: [row] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${sheetTitle}!A:H`,
      valueInputOption: 'RAW', requestBody: { values: [row] },
    });
  }
  return row;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query.section === 'applications') {
    return careerApplicationsHandler(req, res);
  }
  if (req.query.section === 'resume') {
    return careerResumeHandler(req, res);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password, x-admin-email');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      if (req.query.trash === '1') {
        const role = await getRole(req);
        if (role !== 'super_admin' && role !== 'admin') return res.status(403).json({ error: 'Super admin access required' });
        return res.status(200).json({ openings: await readArchivedOpenings() });
      }
      const openings = await readOpenings();
      return res.status(200).json({
        openings: await isAuthed(req) ? openings : openings.filter(o => o.status === 'published'),
      });
    }
    if (req.method === 'POST') {
      if (!await isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
      const payload = req.body || {};
      if (!clean(payload.title) && clean(payload.status) !== 'archived') {
        return res.status(400).json({ error: 'Title is required' });
      }
      // Careers are managed by the Super Admin only
      const role = await getRole(req);
      if (role !== 'super_admin' && role !== 'admin') {
        return res.status(403).json({ error: 'Super admin access required' });
      }
      await saveOpening(payload);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Careers API error', error);
    return res.status(500).json({ error: 'Careers API failed' });
  }
}
