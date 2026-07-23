import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { isAdminOrAbove, canManageAppointments } from './_utils.js';

type AppointmentPayload = {
  name?: string;
  phone?: string;
  email?: string;
  branch?: string;
  service?: string;
  date?: string;
  time?: string;
  message?: string;
  referral?: string;
};

const requiredFields: Array<keyof AppointmentPayload> = ['name', 'phone', 'service', 'date', 'time'];

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getPrivateKey() {
  return process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
}

// Branch lives in column K (appended after the original A:J layout) so existing
// rows stay aligned. Derive the tab name from the configured range but always
// read/write the full width.
function tabName() {
  return (process.env.GOOGLE_SHEET_RANGE || 'Appointments!A:J').split('!')[0];
}

function sheetRange(cols: string) {
  return `${tabName()}!${cols}`;
}

const APPT_HEADER = ['Timestamp', 'Name', 'Phone', 'Email', 'Service', 'Date', 'Time', 'Message', 'Referral', 'Source', 'Branch', 'Status'];

// Create the appointments tab (with a header row) if it doesn't exist yet, so
// the very first booking on a fresh spreadsheet doesn't fail.
async function ensureTab(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string) {
  const tab = tabName();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === tab);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1:L1`,
      valueInputOption: 'RAW',
      requestBody: { values: [APPT_HEADER] },
    });
  }
}

async function appendToSheet(payload: AppointmentPayload) {
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

  const sheets = google.sheets({ version: 'v4', auth });
  await ensureTab(sheets, spreadsheetId);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: sheetRange('A:L'),
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [
        [
          new Date().toISOString(),
          clean(payload.name),
          clean(payload.phone),
          clean(payload.email),
          clean(payload.service),
          clean(payload.date),
          clean(payload.time),
          clean(payload.message),
          clean(payload.referral),
          'Website',
          clean(payload.branch),
          'pending',
        ],
      ],
    },
  });
}

// Set the status (column L) of the appointment whose timestamp (column A) matches.
async function updateStatus(timestamp: string, status: string) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getPrivateKey();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientEmail || !privateKey || !spreadsheetId) throw new Error('Missing env vars');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetRange('A:A') });
  const rows = (result.data.values || []) as string[][];
  const idx = rows.findIndex((r, i) => i > 0 && r[0] === timestamp);
  if (idx < 0) throw new Error('NOT_FOUND');
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: sheetRange(`L${idx + 1}`),
    valueInputOption: 'RAW',
    requestBody: { values: [[status]] },
  });
}

// Remove the appointment row whose timestamp (column A) matches.
async function deleteAppointment(timestamp: string) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getPrivateKey();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientEmail || !privateKey || !spreadsheetId) throw new Error('Missing env vars');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetId = spreadsheet.data.sheets?.find(s => s.properties?.title === tabName())?.properties?.sheetId;
  if (sheetId == null) throw new Error('NOT_FOUND');

  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetRange('A:A') });
  const rows = (result.data.values || []) as string[][];
  const idx = rows.findIndex((r, i) => i > 0 && r[0] === timestamp);
  if (idx < 0) throw new Error('NOT_FOUND');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: idx, endIndex: idx + 1 } } }],
    },
  });
}

async function sendEmailNotification(payload: AppointmentPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = Array.from(
    new Set([
      'info@celestialdental.org',
      ...(process.env.APPOINTMENT_NOTIFICATION_EMAIL || '').split(','),
    ]
      .map((recipient) => recipient.trim().toLowerCase())
      .filter(Boolean)),
  );

  if (!apiKey || recipients.length === 0) {
    return;
  }

  const body = [
    'New appointment request',
    '',
    `Name: ${clean(payload.name)}`,
    `Phone: ${clean(payload.phone)}`,
    `Email: ${clean(payload.email) || 'Not provided'}`,
    `Branch: ${clean(payload.branch) || 'Not specified'}`,
    `Service: ${clean(payload.service)}`,
    `Preferred date: ${clean(payload.date)}`,
    `Preferred time: ${clean(payload.time)}`,
    `Referral source: ${clean(payload.referral) || 'Not provided'}`,
    `Message: ${clean(payload.message) || 'No message provided'}`,
  ].join('\n');

  await Promise.all(
    recipients.map(async (to) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.OTP_FROM_EMAIL || 'Celestial Dental <onboarding@resend.dev>',
          to,
          subject: `New appointment request: ${clean(payload.name)}`,
          text: body,
        }),
      });

      if (!response.ok) {
        console.error('Resend notification failed', await response.text());
      }
    }),
  );
}

// Explicit branch → WhatsApp number map. Mirrors BookingModal's rationale: an
// explicit map keeps a booking from going to a stale admin-managed number, and
// a per-branch env override (WHATSAPP_TO_<SLUG>, digits only) still wins so new
// branches can be wired without a code change. Numbers are international, no '+'.
const BRANCH_WHATSAPP: Record<string, string> = {
  kasarani: '254707535000',
  kamakis: '254754400500',
  eldoret: '254794585217',
};

function branchWhatsAppNumber(branch: string): string {
  const b = branch.toLowerCase();
  for (const slug of Object.keys(BRANCH_WHATSAPP)) {
    if (b.includes(slug)) {
      return process.env[`WHATSAPP_TO_${slug.toUpperCase()}`]?.replace(/\D/g, '')
        || BRANCH_WHATSAPP[slug];
    }
  }
  // Unknown/unspecified branch → flagship, so the request is never lost.
  return process.env.WHATSAPP_TO_KASARANI?.replace(/\D/g, '') || BRANCH_WHATSAPP.kasarani;
}

// Best-effort push of the booking straight into the preferred branch's WhatsApp
// via a bot gateway. Like the email and CRM notifiers, a failure here must never
// fail the booking response.
//
// Two providers are supported (Green API is checked first):
//   Green API (free Developer tier) — set GREEN_API_ID_INSTANCE +
//     GREEN_API_TOKEN_INSTANCE (optional GREEN_API_URL to override the host).
//   UltraMsg / compatible — set WHATSAPP_API_TOKEN + WHATSAPP_INSTANCE_ID
//     (or WHATSAPP_API_URL for the full {token,to,body} endpoint).
// If neither is configured the function skips silently.
async function sendWhatsAppNotification(payload: AppointmentPayload) {
  const to = branchWhatsAppNumber(clean(payload.branch)); // digits, e.g. 254754400500
  const text = [
    'New appointment request',
    `Patient: ${clean(payload.name)}`,
    `Phone: ${clean(payload.phone)}`,
    clean(payload.email) ? `Email: ${clean(payload.email)}` : '',
    `Branch: ${clean(payload.branch) || 'Not specified'}`,
    `Service: ${clean(payload.service) || 'General'}`,
    `Preferred date: ${clean(payload.date)}`,
    `Preferred time: ${clean(payload.time)}`,
    clean(payload.message) ? `Notes: ${clean(payload.message)}` : '',
    clean(payload.referral) ? `Heard via: ${clean(payload.referral)}` : '',
  ].filter(Boolean).join('\n');

  // Green API: POST /waInstance{id}/sendMessage/{token} with {chatId, message}.
  const greenId = process.env.GREEN_API_ID_INSTANCE;
  const greenToken = process.env.GREEN_API_TOKEN_INSTANCE;
  if (greenId && greenToken) {
    const base = (process.env.GREEN_API_URL || 'https://api.green-api.com').replace(/\/$/, '');
    const response = await fetch(`${base}/waInstance${greenId}/sendMessage/${greenToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: `${to}@c.us`, message: text }),
    });
    if (!response.ok) {
      console.error('WhatsApp (Green API) notification failed', response.status, await response.text());
    }
    return;
  }

  // UltraMsg (or any gateway sharing its {token, to, body} shape).
  const token = process.env.WHATSAPP_API_TOKEN;
  const instanceId = process.env.WHATSAPP_INSTANCE_ID;
  const url = process.env.WHATSAPP_API_URL
    || (instanceId ? `https://api.ultramsg.com/${instanceId}/messages/chat` : '');
  if (!token || !url) return; // not configured → skip silently

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, to, body: text }),
  });
  if (!response.ok) {
    console.error('WhatsApp (UltraMsg) notification failed', response.status, await response.text());
  }
}

// Maps the website's free-text service titles (src/data/site.ts) to the CRM's
// DentalService enum. Unmatched/renamed titles fall back to OTHER — the raw
// title is always preserved in the CRM lead's notes, so nothing is lost.
function mapServiceTitleToEnum(service: string): string {
  const s = service.toLowerCase();
  if (s.includes('brace') || s.includes('orthodont')) return 'BRACES';
  if (s.includes('whiten')) return 'WHITENING';
  if (s.includes('implant')) return 'IMPLANTS';
  if (s.includes('root canal')) return 'ROOT_CANAL';
  if (s.includes('filling')) return 'FILLING';
  if (s.includes('extraction')) return 'EXTRACTION';
  if (s.includes('clean') || s.includes('checkup')) return 'CLEANING';
  return 'OTHER';
}

// Matches against the CRM's known branches by loose name; returns null (not
// mapped) for branches the CRM doesn't have yet (e.g. Eldoret). The raw
// branch name is always preserved in notes regardless.
function mapBranchNameToId(branch: string): string | null {
  const b = branch.toLowerCase();
  if (b.includes('kasarani')) return 'branch-kasarani';
  if (b.includes('kamakis')) return 'branch-kamakis';
  return null;
}

// Best-effort push into the CRM as a real lead. Mirrors sendEmailNotification's
// contract: a failure here must never fail the booking response.
async function sendToCrm(payload: AppointmentPayload) {
  const url = process.env.CRM_LEAD_WEBHOOK_URL;
  const secret = process.env.CRM_LEAD_WEBHOOK_SECRET;
  if (!url || !secret) return;

  const branch = clean(payload.branch);
  const service = clean(payload.service);
  const notesParts = [
    'Booking request via website.',
    branch ? `Branch: ${branch}.` : '',
    `Requested: ${clean(payload.date)} ${clean(payload.time)}.`,
    clean(payload.message) ? `Message: ${clean(payload.message)}` : '',
  ].filter(Boolean);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-website-lead-secret': secret,
    },
    body: JSON.stringify({
      name: clean(payload.name),
      phone: clean(payload.phone),
      email: clean(payload.email) || undefined,
      source: 'WEBSITE',
      services: service ? [mapServiceTitleToEnum(service)] : [],
      branchId: branch ? mapBranchNameToId(branch) : null,
      notes: notesParts.join(' '),
    }),
  });

  if (!response.ok) {
    console.error('CRM lead push failed', response.status, await response.text());
  }
}

// Deleting stays restricted to admins.
async function isAuthed(req: VercelRequest) {
  return isAdminOrAbove(req);
}

// Reading the list and confirming bookings is also open to the
// appointments_manager role.
async function isDeskAuthed(req: VercelRequest) {
  return canManageAppointments(req);
}

async function readAppointments() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getPrivateKey();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  if (!clientEmail || !privateKey || !spreadsheetId) throw new Error('Missing env vars');

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: sheetRange('A:L') });
  const rows = (result.data.values || []) as string[][];
  const header = ['timestamp', 'name', 'phone', 'email', 'service', 'date', 'time', 'message', 'referral', 'source', 'branch', 'status'];
  return rows
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row => Object.fromEntries(header.map((key, i) => [key, row[i] || ''])))
    .reverse(); // newest first
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password, x-admin-email');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    if (!await isDeskAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const appointments = await readAppointments();
      return res.status(200).json({ appointments });
    } catch (error) {
      return res.status(500).json({ error: 'Could not read appointments' });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body || {}) as Record<string, string>;

  // Admin: mark an appointment confirmed (or another status)
  if (body.action === 'updateStatus') {
    if (!await isDeskAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
    const timestamp = clean(body.timestamp);
    const status = ['confirmed', 'pending', 'cancelled'].includes(body.status) ? body.status : 'confirmed';
    if (!timestamp) return res.status(400).json({ error: 'Appointment timestamp required' });
    try {
      await updateStatus(timestamp, status);
      return res.status(200).json({ ok: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      console.error('Status update failed', error);
      return res.status(500).json({ error: 'Could not update appointment' });
    }
  }

  // Admin: permanently remove an appointment (e.g. test bookings)
  if (body.action === 'delete') {
    if (!await isAuthed(req)) return res.status(401).json({ error: 'Unauthorized' });
    const timestamp = clean(body.timestamp);
    if (!timestamp) return res.status(400).json({ error: 'Appointment timestamp required' });
    try {
      await deleteAppointment(timestamp);
      return res.status(200).json({ ok: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Appointment not found' });
      }
      console.error('Appointment delete failed', error);
      return res.status(500).json({ error: 'Could not delete appointment' });
    }
  }

  const payload = body as AppointmentPayload;
  const missing = requiredFields.filter((field) => !clean(payload[field]));

  if (missing.length > 0) {
    return res.status(400).json({ error: 'Missing required appointment details' });
  }

  // Preview deployments intentionally do not inherit the production Google
  // Sheets credentials. Let the frontend complete its WhatsApp-routing test
  // without writing test patient data into the live appointments sheet.
  const sheetsConfigured = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    && getPrivateKey()
    && process.env.GOOGLE_SHEET_ID,
  );
  if (process.env.VERCEL_ENV === 'preview' && !sheetsConfigured) {
    console.warn('Preview appointment validated without persistence');
    return res.status(200).json({ ok: true, preview: true, saved: false });
  }

  try {
    await appendToSheet(payload);
  } catch (error) {
    console.error('Appointment request failed', error);
    return res.status(500).json({ error: 'Could not save appointment request' });
  }

  // Email and CRM push are best-effort — neither failure may fail the booking.
  try {
    await sendEmailNotification(payload);
  } catch (error) {
    console.error('Appointment saved but email notification failed', error);
  }

  try {
    await sendToCrm(payload);
  } catch (error) {
    console.error('Appointment saved but CRM lead push failed', error);
  }

  try {
    await sendWhatsAppNotification(payload);
  } catch (error) {
    console.error('Appointment saved but WhatsApp notification failed', error);
  }

  return res.status(200).json({ ok: true });
}
