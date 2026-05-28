import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

type AppointmentPayload = {
  name?: string;
  phone?: string;
  email?: string;
  service?: string;
  date?: string;
  time?: string;
  message?: string;
};

const requiredFields: Array<keyof AppointmentPayload> = ['name', 'phone', 'service', 'date', 'time'];

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getPrivateKey() {
  return process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
}

async function appendToSheet(payload: AppointmentPayload) {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = getPrivateKey();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const range = process.env.GOOGLE_SHEET_RANGE || 'Appointments!A:I';

  if (!clientEmail || !privateKey || !spreadsheetId) {
    throw new Error('Missing Google Sheets environment variables');
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
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
          'Website',
        ],
      ],
    },
  });
}

async function sendEmailNotification(payload: AppointmentPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipients = (process.env.APPOINTMENT_NOTIFICATION_EMAIL || '')
    .split(',')
    .map((recipient) => recipient.trim())
    .filter(Boolean);

  if (!apiKey || recipients.length === 0) {
    return;
  }

  const body = [
    'New appointment request',
    '',
    `Name: ${clean(payload.name)}`,
    `Phone: ${clean(payload.phone)}`,
    `Email: ${clean(payload.email) || 'Not provided'}`,
    `Service: ${clean(payload.service)}`,
    `Preferred date: ${clean(payload.date)}`,
    `Preferred time: ${clean(payload.time)}`,
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
          from: 'Celestial Dental <onboarding@resend.dev>',
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = (req.body || {}) as AppointmentPayload;
  const missing = requiredFields.filter((field) => !clean(payload[field]));

  if (missing.length > 0) {
    return res.status(400).json({ error: 'Missing required appointment details' });
  }

  try {
    await appendToSheet(payload);
    await sendEmailNotification(payload);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Appointment request failed', error);
    return res.status(500).json({ error: 'Could not save appointment request' });
  }
}
