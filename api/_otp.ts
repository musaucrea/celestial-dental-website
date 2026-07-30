import { randomInt, randomUUID } from 'node:crypto';
import { getSheetsClient } from './_utils.js';
import { emailShell, escapeHtml } from './_email.js';

const SHEET = 'OtpChallenges';
const HEADER = [
  'id',
  'email',
  'purpose',
  'codeHash',
  'expiresAt',
  'attempts',
  'usedAt',
  'metadata',
  'createdAt',
];

async function ensureOtpSheet() {
  const { sheets, spreadsheetId } = await getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === SHEET);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: SHEET } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET}!A1:I1`,
      valueInputOption: 'RAW',
      requestBody: { values: [HEADER] },
    });
  }
  return { sheets, spreadsheetId };
}

async function digest(value: string) {
  const { createHmac } = await import('node:crypto');
  const secret =
    process.env.SESSION_SECRET ||
    process.env.SUPER_ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    process.env.GOOGLE_PRIVATE_KEY;
  if (!secret) throw new Error('OTP secret is not configured');
  return createHmac('sha256', secret).update(value).digest('base64url');
}

export async function createOtpChallenge(
  email: string,
  purpose: 'login' | 'signup',
  metadata: Record<string, unknown>,
) {
  const { sheets, spreadsheetId } = await ensureOtpSheet();
  const id = randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  const codeHash = await digest(`${id}:${code}`);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET}!A:I`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[
        id,
        email,
        purpose,
        codeHash,
        expiresAt,
        '0',
        '',
        JSON.stringify(metadata),
        now.toISOString(),
      ]],
    },
  });
  return { id, code, expiresAt };
}

export async function verifyOtpChallenge(
  id: string,
  code: string,
  purpose: 'login' | 'signup',
) {
  const { sheets, spreadsheetId } = await ensureOtpSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET}!A:I`,
  });
  const rows = (result.data.values || []) as string[][];
  const index = rows.findIndex((row, i) => i > 0 && row[0] === id);
  if (index < 0) return null;
  const row = [...rows[index]];
  const attempts = Number(row[5] || 0);
  if (
    row[2] !== purpose ||
    row[6] ||
    attempts >= 5 ||
    !row[4] ||
    new Date(row[4]).getTime() <= Date.now()
  ) return null;

  const valid = row[3] === await digest(`${id}:${code}`);
  row[5] = String(attempts + 1);
  if (valid) row[6] = new Date().toISOString();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET}!A${index + 1}:I${index + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
  if (!valid) return null;

  let metadata: Record<string, unknown> = {};
  try { metadata = JSON.parse(row[7] || '{}'); } catch { /* invalid metadata */ }
  return { email: row[1], metadata };
}

export async function sendOtpEmail(email: string, code: string, purpose: 'login' | 'signup') {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('Email delivery is not configured');
  const action = purpose === 'login' ? 'sign in' : 'verify your access request';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.OTP_FROM_EMAIL || 'Celestial Dental <onboarding@resend.dev>',
      to: email,
      subject: `${code} is your Celestial Dental admin code`,
      text: [
        `Your verification code is: ${code}`,
        '',
        `Use this code to ${action}. It expires in 10 minutes and can only be used once.`,
        '',
        'If you did not request this code, you can ignore this email.',
      ].join('\n'),
      html: emailShell(
        'Your verification code',
        `<p>Use this code to ${escapeHtml(action)}:</p>
         <p style="margin:22px 0"><span style="display:inline-block;background:#f2faf8;border:1px solid #d4e9e6;border-radius:12px;padding:14px 26px;font-family:monospace;font-size:30px;font-weight:700;letter-spacing:.24em;color:#0d1f1e">${escapeHtml(code)}</span></p>
         <p>It expires in 10 minutes and can only be used once.</p>
         <p style="font-size:13px;color:#5d7071">If you did not request this code, you can ignore this email.</p>`,
      ),
    }),
  });
  if (!response.ok) {
    console.error('OTP email failed', await response.text());
    throw new Error('Could not send verification email');
  }
}
