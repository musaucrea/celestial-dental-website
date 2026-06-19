import type { VercelRequest } from '@vercel/node';
import { google } from 'googleapis';

export type Role = 'super_admin' | 'admin' | 'content_creator';

export const USERS_SHEET = 'Users';
export const USERS_HEADER = ['id', 'name', 'email', 'password', 'role', 'status', 'createdAt'];

// ── Google Sheets client ────────────────────────────────────────
export function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientEmail || !privateKey || !spreadsheetId) throw new Error('Missing Google Sheets env vars');
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return { sheets: google.sheets({ version: 'v4', auth }), spreadsheetId };
}

// ── Users sheet helpers ─────────────────────────────────────────
export async function ensureUsersSheet() {
  const { sheets, spreadsheetId } = getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === USERS_SHEET);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: USERS_SHEET } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${USERS_SHEET}!A1:G1`,
      valueInputOption: 'RAW',
      requestBody: { values: [USERS_HEADER] },
    });
  }
  return { sheets, spreadsheetId };
}

/**
 * Look up a user by email + password. Returns user info (without password) or null.
 * Also returns status so callers can show pending/disabled messages.
 */
export async function lookupUser(
  email: string,
  password: string,
): Promise<{ id: string; name: string; role: Role; status: string } | null> {
  try {
    const { sheets, spreadsheetId } = await ensureUsersSheet();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${USERS_SHEET}!A:G`,
    });
    const rows = (result.data.values || []) as string[][];
    const row = rows
      .slice(1)
      .find(r => r[2]?.toLowerCase() === email.toLowerCase() && r[3] === password);
    if (!row) return null;
    return { id: row[0], name: row[1], role: row[4] as Role, status: row[5] };
  } catch {
    return null;
  }
}

// ── Auth helpers ────────────────────────────────────────────────

/**
 * Returns the role for the current request.
 * Checks env-var passwords first (super admin always), then the Users sheet.
 * Requires x-admin-email + x-admin-password headers.
 */
export async function getRole(req: VercelRequest): Promise<Role | null> {
  const pw = (req.headers['x-admin-password'] as string) || '';
  const email = (req.headers['x-admin-email'] as string) || '';
  if (!pw) return null;

  // Super admin — env var (email optional if SUPER_ADMIN_EMAIL not set)
  const superEmail = process.env.SUPER_ADMIN_EMAIL;
  if (process.env.SUPER_ADMIN_PASSWORD && pw === process.env.SUPER_ADMIN_PASSWORD) {
    if (!superEmail || !email || email.toLowerCase() === superEmail.toLowerCase()) {
      return 'super_admin';
    }
  }

  // Legacy env-var passwords (kept for backward compatibility)
  if (process.env.ADMIN_PASSWORD && pw === process.env.ADMIN_PASSWORD) return 'admin';
  if (process.env.CONTENT_CREATOR_PASSWORD && pw === process.env.CONTENT_CREATOR_PASSWORD) return 'content_creator';

  // Per-user lookup in the Users sheet
  if (email) {
    const user = await lookupUser(email, pw);
    if (user && user.status === 'active') return user.role;
  }

  return null;
}

/** Super admin or admin only */
export async function isAdminOrAbove(req: VercelRequest): Promise<boolean> {
  const role = await getRole(req);
  return role === 'super_admin' || role === 'admin';
}

/** Any authenticated role */
export async function isAuthenticated(req: VercelRequest): Promise<boolean> {
  return (await getRole(req)) !== null;
}
