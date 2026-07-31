import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getRole, isAuthenticated , applySheetsRetries, getCachedPublic, setCachedPublic, clearCachedPublic, isSheetEnsured, markSheetEnsured} from './_utils.js';
import { testimonials } from '../src/data/site.js';

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

async function isAuthed(req: VercelRequest) {
  return isAuthenticated(req);
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

  applySheetsRetries(google);
  return {
    spreadsheetId,
    sheets: google.sheets({ version: 'v4', auth }),
  };
}

async function ensureContentSheet() {
  const { sheets, spreadsheetId } = await getSheets();
  if (isSheetEnsured(sheetTitle)) return { sheets, spreadsheetId };
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

  markSheetEnsured(sheetTitle);
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

async function readArchivedItems(): Promise<ContentItem[]> {
  const { sheets, spreadsheetId } = await ensureContentSheet();
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetTitle}!A:H` });
  return ((result.data.values || []) as string[][])
    .slice(1).filter(row => row.some(Boolean))
    .map(row => Object.fromEntries(header.map((key, index) => [key, row[index] || ''])) as ContentItem)
    .filter(item => item.status === 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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

function fallbackGoogleReviews() {
  return testimonials
    .map((review, index) => ({
      id: `fallback-${index}`, author: review.author, text: review.quote, rating: review.stars,
      branch: review.branch, relativeTime: '', authorPhoto: '', reviewUrl: '', placeUrl: '',
    }));
}

async function readGoogleReviews() {
  const fallback = fallbackGoogleReviews();
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return { reviews: fallback, live: false };

  const branches = [
    ['Kasarani', 'Celestial Dental Centre -Kasarani Branch, Kasarani Mwiki Road, Nairobi'],
    ['Kamakis', 'Celestial Dental Centre Kamakis Ruiru Kenya'],
    ['Eldoret', 'Celestial Dental Centre Eldoret Kenya'],
  ];
  const groups = await Promise.all(branches.map(async ([branch, textQuery]) => {
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.googleMapsUri,places.reviews',
      },
      body: JSON.stringify({ textQuery, pageSize: 1 }),
    });
    if (!response.ok) throw new Error(`Google Places request failed: ${response.status}`);
    const data = await response.json() as { places?: Array<Record<string, any>> };
    const place = data.places?.[0];
    if (!place) return [];
    return (place.reviews || [])
      .filter((review: Record<string, any>) => Number(review.rating) >= 1 && review.text?.text?.trim())
      .map((review: Record<string, any>, index: number) => ({
        id: `${place.id || branch}-${review.publishTime || index}`,
        author: review.authorAttribution?.displayName || 'Google user',
        text: review.text.text,
        rating: Number(review.rating),
        branch,
        relativeTime: review.relativePublishTimeDescription || '',
        authorPhoto: review.authorAttribution?.photoUri || '',
        reviewUrl: review.googleMapsUri || review.authorAttribution?.uri || place.googleMapsUri || '',
        placeUrl: place.googleMapsUri || '',
      }));
  }));
  const reviews = groups.flat()
    .sort((a, b) => String(b.id).localeCompare(String(a.id)))
    .slice(0, 9);
  return { reviews: reviews.length ? reviews : fallback, live: reviews.length > 0 };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password, x-admin-email');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    if (req.method === 'GET') {
      if (req.query.trash === '1') {
        const role = await getRole(req);
        if (role !== 'super_admin' && role !== 'admin') return res.status(403).json({ error: 'Super admin access required' });
        return res.status(200).json({ items: await readArchivedItems() });
      }
      if (req.query.resource === 'google-reviews') {
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        try {
          return res.status(200).json(await readGoogleReviews());
        } catch (error) {
          console.error('Google reviews failed', error);
          return res.status(200).json({ reviews: fallbackGoogleReviews(), live: false });
        }
      }
      if (await isAuthed(req)) {
        return res.status(200).json({ items: await readItems() });
      }
      const hit = getCachedPublic<object>('content');
      if (hit) return res.status(200).json(hit);
      const items = await readItems();
      const body = { items: items.filter((item) => item.status === 'published') };
      setCachedPublic('content', body);
      return res.status(200).json(body);
    }

    if (req.method === 'POST') {
      if (!await isAuthed(req)) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const payload = req.body || {};
      if (!clean(payload.title) && clean(payload.status) !== 'archived') {
        return res.status(400).json({ error: 'Title is required' });
      }

      // News & updates are managed by the Super Admin only
      const role = await getRole(req);
      if (role !== 'super_admin' && role !== 'admin') {
        return res.status(403).json({ error: 'Super admin access required' });
      }

      await saveItem(payload);
      clearCachedPublic('content');
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Content API failed', error);
    return res.status(500).json({ error: 'Could not load website content' });
  }
}
