import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getRole, isAuthenticated , applySheetsRetries, getCachedPublic, setCachedPublic, clearCachedPublic, isSheetEnsured, markSheetEnsured} from './_utils.js';

type Faq = {
  id: string;
  status: string;
  question: string;
  answer: string;
  updatedAt: string;
};

const sheetTitle = 'Faqs';
const header = ['id', 'status', 'question', 'answer', 'updatedAt'];

// Seeds the sheet on first run so the site keeps its existing FAQs, now editable.
const seed: Array<{ question: string; answer: string }> = [
  { question: 'What are your opening hours?', answer: 'We are open Monday to Sunday, 07:00 to 20:00, across all branches in Kasarani, Kamakis, Eldoret, and Kiambu Road. Walk-ins are welcome, but booking ahead helps us reserve time for you.' },
  { question: 'Do you accept insurance and medical schemes?', answer: 'Yes. We work with a wide range of insurers and medical schemes including Jubilee, AAR, Madison, CIC, Britam, APA, SHA, NHIF and many more. Bring your insurance card and our team will handle pre-authorisation and billing.' },
  { question: 'Do you accept M-Pesa?', answer: 'Yes, we accept M-Pesa, cash, and direct insurance billing. For M-Pesa payments, our team at each branch will provide the till number at reception.' },
  { question: 'Is there a dentist open on Sunday in Nairobi?', answer: 'Yes — Celestial Dental is open every day of the week, including Sundays and public holidays, from 07:00 to 20:00 across all four branches (Kasarani, Kamakis, Eldoret, and Kiambu Road).' },
  { question: 'Do you handle dental emergencies?', answer: 'Yes. Call or WhatsApp the nearest branch and we\'ll aim to see you the same day. We\'re open 7 days a week, 07:00–20:00. For severe pain or swelling, come in directly and our team will prioritise you.' },
  { question: 'Do you treat children?', answer: 'Absolutely. We offer gentle children\'s dentistry in a calm, child-friendly setting. We recommend bringing children for their first visit as soon as the first tooth appears, or by age one. Early visits build good habits and prevent anxiety.' },
  { question: 'How do I book an appointment?', answer: 'Use the "Appointments" button on this page, message us on WhatsApp, or call the branch nearest to you during opening hours.' },
  { question: 'What should I expect on my first visit?', answer: 'A warm welcome, a thorough examination, X-rays if needed, and a clear explanation of any treatment required — with a plan tailored to your priorities and budget. No pressure, no surprises.' },
];

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
  applySheetsRetries(google);
  return { spreadsheetId, sheets: google.sheets({ version: 'v4', auth }) };
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
    const base = Date.now();
    const seedRows = seed.map((f, i) => [
      `faq-seed-${i + 1}`, 'published', f.question, f.answer,
      new Date(base + i).toISOString(), // ascending so display order matches the original list
    ]);
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheetTitle}!A1:E${1 + seedRows.length}`,
      valueInputOption: 'RAW', requestBody: { values: [header, ...seedRows] },
    });
  }
  markSheetEnsured(sheetTitle);
  return { sheets, spreadsheetId };
}

function rowsToFaqs(rows: string[][] = []): Faq[] {
  return rows
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row => Object.fromEntries(header.map((key, i) => [key, row[i] || ''])) as Faq)
    .filter(f => f.status !== 'archived')
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt)); // oldest first → stable order
}

async function readFaqs() {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:E`,
  });
  return rowsToFaqs((result.data.values || []) as string[][]);
}

async function readArchivedFaqs(): Promise<Faq[]> {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${sheetTitle}!A:E` });
  return ((result.data.values || []) as string[][])
    .slice(1).filter(row => row.some(Boolean))
    .map(row => Object.fromEntries(header.map((key, i) => [key, row[i] || ''])) as Faq)
    .filter(item => item.status === 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function saveFaq(input: Partial<Faq>) {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:E`,
  });
  const rows = (result.data.values || []) as string[][];
  const id = clean(input.id) || `faq-${Date.now()}`;
  const existingIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  const existing = existingIndex > 0 ? rows[existingIndex] : [];

  const row = [
    id,
    clean(input.status) || existing[1] || 'published',
    clean(input.question) || existing[2] || '',
    clean(input.answer) || existing[3] || '',
    // Preserve original ordering timestamp on edit; only new rows get "now".
    existingIndex > 0 ? (existing[4] || new Date().toISOString()) : new Date().toISOString(),
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
  return row;
}

function isPricingFaq(faq: Faq) {
  return /\b(how much|price|pricing|cost|fee|ksh|kes)\b/i.test(`${faq.question} ${faq.answer}`);
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
        return res.status(200).json({ faqs: await readArchivedFaqs() });
      }
      if (await isAuthed(req)) {
        const faqs = await readFaqs();
        return res.status(200).json({ faqs });
      }
      const hit = getCachedPublic<object>('faqs');
      if (hit) return res.status(200).json(hit);
      const faqs = await readFaqs();
      const body = { faqs: faqs.filter(f => f.status === 'published' && !isPricingFaq(f)) };
      setCachedPublic('faqs', body);
      return res.status(200).json(body);
    }
    if (req.method === 'POST') {
      const role = await getRole(req);
      if (role !== 'admin' && role !== 'super_admin' && role !== 'website_content_editor') {
        return res.status(401).json({ error: 'Admin access required' });
      }
      const payload = req.body || {};
      if (!clean(payload.question) && clean(payload.status) !== 'archived') {
        return res.status(400).json({ error: 'Question is required' });
      }
      await saveFaq(payload);
      clearCachedPublic('faqs');
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('FAQs API error', error);
    return res.status(500).json({ error: 'FAQs API failed' });
  }
}
