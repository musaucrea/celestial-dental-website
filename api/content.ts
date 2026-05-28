import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

type ContentItem = {
  id: string;
  status: string;
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  updatedAt: string;
};

const sheetTitle = 'WebsiteContent';
const header = ['id', 'status', 'title', 'body', 'imageUrl', 'ctaLabel', 'ctaUrl', 'updatedAt'];

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isAuthed(req: VercelRequest) {
  const password = process.env.ADMIN_PASSWORD;
  return Boolean(password && req.headers['x-admin-password'] === password);
}

function getPrivateKey() {
  return process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
}

async function getSheets() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getPrivateKey();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error('Missing Google Sheets environment variables');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return {
    spreadsheetId,
    sheets: google.sheets({ version: 'v4', auth }),
  };
}

async function ensureContentSheet() {
  const { sheets, spreadsheetId } = await getSheets();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === sheetTitle);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetTitle } } }],
      },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A1:H1`,
      valueInputOption: 'RAW',
      requestBody: { values: [header] },
    });
  }

  return { sheets, spreadsheetId };
}

function rowsToItems(rows: string[][] = []) {
  return rows
    .slice(1)
    .filter((row) => row.some(Boolean))
    .map((row) =>
      Object.fromEntries(header.map((key, index) => [key, row[index] || ''])) as ContentItem,
    )
    .filter((item) => item.status !== 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function readItems() {
  const { sheets, spreadsheetId } = await ensureContentSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!A:H`,
  });
  return rowsToItems((result.data.values || []) as string[][]);
}

async function saveItem(input: Partial<ContentItem>) {
  const { sheets, spreadsheetId } = await ensureContentSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetTitle}!A:H`,
  });
  const rows = ((result.data.values || []) as string[][]).length
    ? ((result.data.values || []) as string[][])
    : [header];

  const id = clean(input.id) || `content-${Date.now()}`;
  const updatedAt = new Date().toISOString();
  const existingIndex = rows.findIndex((row, index) => index > 0 && row[0] === id);
  const existing = existingIndex > 0 ? rows[existingIndex] : [];
  const row = [
    id,
    clean(input.status) || existing[1] || 'published',
    clean(input.title) || existing[2] || '',
    clean(input.body) || existing[3] || '',
    clean(input.imageUrl) || existing[4] || '',
    clean(input.ctaLabel) || existing[5] || '',
    clean(input.ctaUrl) || existing[6] || '',
    updatedAt,
  ];

  if (existingIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetTitle}!A${existingIndex + 1}:H${existingIndex + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetTitle}!A:H`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });
  }

  return row;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      const items = await readItems();
      return res.status(200).json({
        items: isAuthed(req) ? items : items.filter((item) => item.status === 'published'),
      });
    }

    if (req.method === 'POST') {
      if (!isAuthed(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const payload = req.body || {};
      if (!clean(payload.title) && clean(payload.status) !== 'archived') {
        return res.status(400).json({ error: 'Title is required' });
      }

      await saveItem(payload);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Content API failed', error);
    return res.status(500).json({ error: 'Could not load website content' });
  }
}
