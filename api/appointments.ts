import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'node:crypto';
import { google } from 'googleapis';
import { isAdminOrAbove, canManageAppointments, getRole } from './_utils.js';

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

// Once the booking is in the sheet it is saved, full stop. The notifiers that
// run afterwards (Resend, CRM, WhatsApp) talk to third parties that can be slow
// — CallMeBot in particular — and every one of them used to be awaited before
// the response. A single stalled gateway therefore ran the function past its
// time limit and the patient was told "Something went wrong" for a booking that
// had actually been saved. Every outbound call is now bounded, so the worst
// case is a missing notification, never a failed-looking booking.
const NOTIFY_TIMEOUT_MS = 4000;
const NOTIFY_BUDGET_MS = 6000;

function notifyTimeout() {
  return AbortSignal.timeout(NOTIFY_TIMEOUT_MS);
}

function withBudget<T>(label: string, task: Promise<T>) {
  return Promise.race([
    task,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} notifier timed out`)), NOTIFY_BUDGET_MS)),
  ]);
}

function getPrivateKey() {
  return process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
}

function isCrmSyncAuthorized(req: VercelRequest) {
  const secret = process.env.CRM_LEAD_WEBHOOK_SECRET;
  const supplied = String(req.headers['x-website-lead-secret'] || '');
  if (!secret || !supplied) return false;
  const expected = Buffer.from(secret);
  const received = Buffer.from(supplied);
  return expected.length === received.length && timingSafeEqual(expected, received);
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
        signal: notifyTimeout(),
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

// Who gets the booking on WhatsApp: the preferred branch's line, plus the
// owner's own phone when WHATSAPP_TO_OWNER is set (digits, international, no
// '+'). Set WHATSAPP_BRANCH_NOTIFY=off to make the owner the *only* recipient —
// useful while the branch lines are still being trained on the new flow.
function whatsAppRecipients(branch: string): string[] {
  const owner = process.env.WHATSAPP_TO_OWNER?.replace(/\D/g, '');
  const branchOff = (process.env.WHATSAPP_BRANCH_NOTIFY || '').trim().toLowerCase() === 'off';
  const recipients: string[] = [];
  // Never silence the branch unless an owner number is actually configured,
  // otherwise a stray env var would drop bookings on the floor.
  if (!(branchOff && owner)) recipients.push(branchWhatsAppNumber(branch));
  if (owner) recipients.push(owner);
  return [...new Set(recipients.filter(Boolean))];
}

// Delivers one booking to one WhatsApp number through whichever gateway is
// configured. Providers are tried in order of setup cost and the first one with
// credentials wins:
//   Green API (free Developer tier) — set GREEN_API_ID_INSTANCE +
//     GREEN_API_TOKEN_INSTANCE (optional GREEN_API_URL to override the host).
//     Needs a dedicated sender line linked by QR; can message any number.
//   UltraMsg / compatible — set WHATSAPP_API_TOKEN + WHATSAPP_INSTANCE_ID
//     (or WHATSAPP_API_URL for the full {token,to,body} endpoint).
//   CallMeBot (free, no sender line) — set CALLMEBOT_APIKEY_<digits> per
//     recipient, e.g. CALLMEBOT_APIKEY_254712345678. Each recipient grants
//     permission once from their own phone and gets their own key, so a number
//     without a key is skipped rather than treated as a failure.
// If nothing is configured the function skips silently.
async function sendWhatsAppTo(to: string, text: string) {
  // Green API: POST /waInstance{id}/sendMessage/{token} with {chatId, message}.
  const greenId = process.env.GREEN_API_ID_INSTANCE;
  const greenToken = process.env.GREEN_API_TOKEN_INSTANCE;
  if (greenId && greenToken) {
    const base = (process.env.GREEN_API_URL || 'https://api.green-api.com').replace(/\/$/, '');
    const response = await fetch(`${base}/waInstance${greenId}/sendMessage/${greenToken}`, {
      method: 'POST',
      signal: notifyTimeout(),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: `${to}@c.us`, message: text }),
    });
    if (!response.ok) {
      console.error('WhatsApp (Green API) notification failed', to, response.status, await response.text());
    }
    return;
  }

  // UltraMsg (or any gateway sharing its {token, to, body} shape).
  const token = process.env.WHATSAPP_API_TOKEN;
  const instanceId = process.env.WHATSAPP_INSTANCE_ID;
  const url = process.env.WHATSAPP_API_URL
    || (instanceId ? `https://api.ultramsg.com/${instanceId}/messages/chat` : '');
  if (token && url) {
    const response = await fetch(url, {
      method: 'POST',
      signal: notifyTimeout(),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, to, body: text }),
    });
    if (!response.ok) {
      console.error('WhatsApp (UltraMsg) notification failed', to, response.status, await response.text());
    }
    return;
  }

  // CallMeBot: GET whatsapp.php?phone=&text=&apikey=, one key per recipient.
  const callMeBotKey = process.env[`CALLMEBOT_APIKEY_${to}`];
  if (!callMeBotKey) return; // not configured for this number → skip silently
  const endpoint = `https://api.callmebot.com/whatsapp.php?phone=${to}`
    + `&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(callMeBotKey)}`;
  const response = await fetch(endpoint, { signal: notifyTimeout() });
  if (!response.ok) {
    console.error('WhatsApp (CallMeBot) notification failed', to, response.status, await response.text());
  }
}

// Best-effort push of the booking straight into WhatsApp — the preferred
// branch's line and, when configured, the owner's own phone. Like the email and
// CRM notifiers, a failure here must never fail the booking response, and one
// unreachable recipient must not stop the rest.
async function sendWhatsAppNotification(payload: AppointmentPayload) {
  const recipients = whatsAppRecipients(clean(payload.branch)); // digits, e.g. 254754400500
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

  await Promise.all(
    recipients.map(async (to) => {
      try {
        await sendWhatsAppTo(to, text);
      } catch (error) {
        console.error('WhatsApp notification failed', to, error);
      }
    }),
  );
}

// Best-effort push into the CRM, which records the booking as a lead *and* a
// linked appointment so it appears on the CRM's Appointments page. Mirrors
// sendEmailNotification's contract: a failure here must never fail the booking.
//
// Service/branch mapping, date parsing and de-duplication all live CRM-side in
// /api/website-bookings, so this just forwards the booking verbatim. Exported so
// the sheet backfill below reuses exactly this path.
export async function sendToCrm(payload: AppointmentPayload, status = 'pending') {
  const url = process.env.CRM_LEAD_WEBHOOK_URL;
  const secret = process.env.CRM_LEAD_WEBHOOK_SECRET;
  if (!url || !secret) return;

  const response = await fetch(url, {
    method: 'POST',
    signal: notifyTimeout(),
    headers: {
      'Content-Type': 'application/json',
      'x-website-lead-secret': secret,
    },
    body: JSON.stringify({
      name: clean(payload.name),
      phone: clean(payload.phone),
      email: clean(payload.email),
      branch: clean(payload.branch),
      service: clean(payload.service),
      date: clean(payload.date),
      time: clean(payload.time),
      message: clean(payload.message),
      referral: clean(payload.referral),
      status,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('CRM booking push failed', response.status, detail);
    throw new Error(`CRM booking push failed (${response.status})`);
  }
}

// A bare "Unauthorized" sends desk staff off resetting a password that was
// never the problem. Say which of the two it is: signed out, or signed in
// without the role. The status stays 401 either way so the admin portal's
// existing sign-in handling is unaffected.
async function denyReason(req: VercelRequest, action: string) {
  const role = await getRole(req);
  return role
    ? `Your ${role.replace(/_/g, ' ')} account is not allowed to ${action}. Ask a super admin for access.`
    : `You are signed out. Sign in again to ${action}.`;
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
    if (!await isDeskAuthed(req)) {
      return res.status(401).json({ error: await denyReason(req, 'view appointments') });
    }
    try {
      const appointments = await readAppointments();
      return res.status(200).json({ appointments });
    } catch (error) {
      console.error('Could not read appointments', error);
      return res.status(500).json({
        error: error instanceof Error && error.message.includes('env vars')
          ? "Appointments can't be read — the appointments store isn't configured."
          : "Appointments can't be read — the appointments store didn't respond.",
      });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: `${req.method} is not supported here — appointments accept GET and POST.` });
  }

  const body = (req.body || {}) as Record<string, string>;

  // Production backfill: replay the website appointment sheet through the
  // normal CRM sender. Keeping this operation inside the existing appointments
  // function avoids an extra serverless function on Vercel Hobby.
  if (body.action === 'syncToCrm') {
    // Machine caller: name the cause without naming the header it got wrong.
    if (!isCrmSyncAuthorized(req)) {
      return res.status(401).json({ error: 'The CRM sync secret is missing or does not match.' });
    }
    if (!process.env.CRM_LEAD_WEBHOOK_URL) {
      return res.status(503).json({ error: 'CRM_LEAD_WEBHOOK_URL is not configured' });
    }

    let appointments: Array<Record<string, string>>;
    try {
      appointments = await readAppointments();
    } catch (error) {
      console.error('CRM backfill could not read appointments', error);
      return res.status(500).json({
        error: 'The backfill could not read the appointments sheet, so nothing was pushed.',
      });
    }

    const limit = Number(body.limit);
    if (Number.isFinite(limit) && limit > 0) {
      appointments = appointments.slice(0, Math.floor(limit));
    }

    let pushed = 0;
    const failures: Array<{ row: number; reason: string }> = [];
    for (const [index, appointment] of appointments.entries()) {
      if (!clean(appointment.name)) continue;
      try {
        await sendToCrm(
          {
            name: appointment.name,
            phone: appointment.phone,
            email: appointment.email,
            branch: appointment.branch,
            service: appointment.service,
            date: appointment.date,
            time: appointment.time,
            message: appointment.message,
            referral: appointment.referral,
          },
          appointment.status || 'pending',
        );
        pushed++;
      } catch (error) {
        failures.push({
          row: index + 1,
          reason: error instanceof Error ? error.message : 'unknown error',
        });
      }
    }

    return res.status(200).json({
      sheetRows: appointments.length,
      pushed,
      failed: failures.length,
      failures: failures.slice(0, 20),
      note: 'Safe to rerun; CRM imports are de-duplicated by lead and scheduled time.',
    });
  }

  // Admin: mark an appointment confirmed (or another status)
  if (body.action === 'updateStatus') {
    if (!await isDeskAuthed(req)) {
      return res.status(401).json({ error: await denyReason(req, 'confirm appointments') });
    }
    const timestamp = clean(body.timestamp);
    const status = ['confirmed', 'pending', 'cancelled'].includes(body.status) ? body.status : 'confirmed';
    if (!timestamp) {
      return res.status(400).json({ error: 'This appointment has no timestamp, so it cannot be identified in the sheet.' });
    }
    try {
      await updateStatus(timestamp, status);
      return res.status(200).json({ ok: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: `No appointment matches ${timestamp} — it may already have been deleted.` });
      }
      console.error('Status update failed', error);
      return res.status(500).json({ error: `The appointment could not be marked ${status} — the appointments store rejected the update.` });
    }
  }

  // Admin: permanently remove an appointment (e.g. test bookings)
  if (body.action === 'delete') {
    if (!await isAuthed(req)) {
      return res.status(401).json({ error: await denyReason(req, 'delete appointments') });
    }
    const timestamp = clean(body.timestamp);
    if (!timestamp) {
      return res.status(400).json({ error: 'This appointment has no timestamp, so it cannot be identified in the sheet.' });
    }
    try {
      await deleteAppointment(timestamp);
      return res.status(200).json({ ok: true });
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FOUND') {
        return res.status(404).json({ error: `No appointment matches ${timestamp} — it may already have been deleted.` });
      }
      console.error('Appointment delete failed', error);
      return res.status(500).json({ error: 'The appointment could not be deleted — the appointments store rejected the change.' });
    }
  }

  const payload = body as AppointmentPayload;
  const missing = requiredFields.filter((field) => !clean(payload[field]));

  // Name the missing fields: "Missing required appointment details" leaves the
  // patient guessing which box they skipped.
  if (missing.length > 0) {
    const labels: Record<string, string> = {
      name: 'your name', phone: 'a phone number', service: 'a service',
      date: 'a preferred date', time: 'a preferred time',
    };
    const listed = missing.map(field => labels[field] || field);
    const readable = listed.length > 1
      ? `${listed.slice(0, -1).join(', ')} and ${listed[listed.length - 1]}`
      : listed[0];
    return res.status(400).json({
      error: `Your booking is missing ${readable}.`,
      fields: missing,
    });
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
    // Say which half broke — a misconfigured deployment and a rejected write
    // need completely different responses from whoever reads this. Details stay
    // in the log; the patient gets the cause in plain words (the site adds the
    // "call us instead" line to any 5xx).
    const misconfigured = error instanceof Error && error.message.includes('environment variables');
    return res.status(500).json({
      error: misconfigured
        ? "We couldn't save your booking — our appointments system isn't configured right now."
        : "We couldn't save your booking — our appointments system rejected it.",
      reason: misconfigured ? 'sheets_not_configured' : 'sheets_write_failed',
    });
  }

  // The booking is saved from here on. Email, CRM and WhatsApp are best-effort:
  // they run together rather than one after another, each on its own budget, so
  // no combination of slow gateways can push the function past its time limit
  // and turn a saved booking into an error on the patient's screen.
  const notifications = await Promise.allSettled([
    withBudget('email', sendEmailNotification(payload)),
    withBudget('CRM', sendToCrm(payload)),
    withBudget('WhatsApp', sendWhatsAppNotification(payload)),
  ]);
  for (const result of notifications) {
    if (result.status === 'rejected') {
      console.error('Appointment saved but a notification failed', result.reason);
    }
  }

  return res.status(200).json({ ok: true });
}
