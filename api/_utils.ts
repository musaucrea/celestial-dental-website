import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

export type Role = 'super_admin' | 'branch_blog_editor' | 'website_content_editor' | 'admin' | 'content_creator' | 'appointments_manager';
export const VALID_ROLES: Role[] = ['super_admin', 'branch_blog_editor', 'website_content_editor', 'admin', 'content_creator', 'appointments_manager'];

export const USERS_SHEET = 'Users';
// `branches` (col H) holds the comma-separated branch slugs a Branch Blog Editor
// may publish to. Appended after createdAt so existing rows stay aligned.
export const USERS_HEADER = ['id', 'name', 'email', 'password', 'role', 'status', 'createdAt', 'branches', 'inviteTokenHash', 'inviteExpiresAt', 'inviteAcceptedAt'];

// Branch slugs a Branch Blog Editor can be assigned to.
export const BRANCH_SLUGS = ['kasarani', 'kamakis', 'eldoret'] as const;

export function parseBranches(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(s => (BRANCH_SLUGS as readonly string[]).includes(s));
}

// ── Capability model (see the admin role matrix) ────────────────
function norm(role: Role | null): Role | null {
  if (role === 'admin') return 'super_admin';           // legacy admin → full access
  if (role === 'content_creator') return 'branch_blog_editor'; // legacy creator → blog
  return role;
}
export const canManageUsers    = (r: Role | null) => norm(r) === 'super_admin';
export const canManageBranches = (r: Role | null) => norm(r) === 'super_admin';
export const canManageStaff    = (r: Role | null) => norm(r) === 'super_admin';
export const canManageBlog     = (r: Role | null) => norm(r) === 'super_admin' || norm(r) === 'branch_blog_editor';
export const canEditContent    = (r: Role | null) => norm(r) === 'super_admin' || norm(r) === 'website_content_editor';
// Appointments desk access: read the list and confirm bookings. Deleting stays
// admin-only (see isAdminOrAbove).
export const canViewAppointments = (r: Role | null) => norm(r) === 'super_admin' || norm(r) === 'appointments_manager';
const SESSION_COOKIE = '__Host-cda_session';
const SESSION_TTL_SECONDS = 2 * 60 * 60;

// ── Google Sheets client ────────────────────────────────────────
export async function getSheetsClient() {
  const { google } = await import('googleapis');
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
  const { sheets, spreadsheetId } = await getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === USERS_SHEET);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: USERS_SHEET } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${USERS_SHEET}!A1:K1`,
      valueInputOption: 'RAW',
      requestBody: { values: [USERS_HEADER] },
    });
  }
  // Keep older Users sheets compatible with the invite-link columns.
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${USERS_SHEET}!A1:K1`,
    valueInputOption: 'RAW',
    requestBody: { values: [USERS_HEADER] },
  });
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
      range: `${USERS_SHEET}!A:H`,
    });
    const rows = (result.data.values || []) as string[][];
    const rowIndex = rows.findIndex(
      (r, i) => i > 0 && r[2]?.toLowerCase() === email.toLowerCase(),
    );
    if (rowIndex < 0) return null;
    const row = rows[rowIndex];
    if (!verifyPassword(password, row[3] || '')) return null;

    // Transparently replace legacy plaintext passwords after a successful login.
    if (!row[3]?.startsWith('scrypt$')) {
      row[3] = hashPassword(password);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${USERS_SHEET}!A${rowIndex + 1}:H${rowIndex + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values: [row] },
      });
    }
    return { id: row[0], name: row[1], role: row[4] as Role, status: row[5] };
  } catch {
    return null;
  }
}

// ── Auth helpers ────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith('scrypt$')) {
    const supplied = Buffer.from(password);
    const expected = Buffer.from(stored);
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  }
  const [, saltValue, hashValue] = stored.split('$');
  if (!saltValue || !hashValue) return false;
  const expected = Buffer.from(hashValue, 'base64url');
  const supplied = scryptSync(password, Buffer.from(saltValue, 'base64url'), expected.length);
  return timingSafeEqual(supplied, expected);
}

function sessionSecret() {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.SUPER_ADMIN_PASSWORD ||
    process.env.ADMIN_PASSWORD ||
    process.env.GOOGLE_PRIVATE_KEY;
  if (!secret) throw new Error('SESSION_SECRET is not configured');
  return secret;
}

function sign(value: string) {
  return createHmac('sha256', sessionSecret()).update(value).digest('base64url');
}

function parseCookies(req: VercelRequest) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header.split(';').map(part => {
      const [key, ...rest] = part.trim().split('=');
      return [key, rest.join('=')];
    }).filter(([key]) => key),
  );
}

export function createSession(
  res: VercelResponse,
  user: { id: string; name: string; role: Role },
) {
  const payload = Buffer.from(JSON.stringify({
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`,
  );
}

export function clearSession(res: VercelResponse) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`,
  );
}

export function getSession(req: VercelRequest): {
  id: string;
  name: string;
  role: Role;
  exp: number;
} | null {
  try {
    const token = parseCookies(req)[SESSION_COOKIE];
    if (!token) return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;
    const expected = Buffer.from(sign(payload));
    const supplied = Buffer.from(signature);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (
      !session.id ||
      !session.name ||
      !VALID_ROLES.includes(session.role) ||
      !session.exp ||
      session.exp <= Math.floor(Date.now() / 1000)
    ) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getRole(req: VercelRequest): Promise<Role | null> {
  const session = getSession(req);
  if (!session) return null;
  if (session.id.startsWith('env-')) return session.role;

  try {
    const { sheets, spreadsheetId } = await ensureUsersSheet();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${USERS_SHEET}!A:H`,
    });
    const rows = (result.data.values || []) as string[][];
    const row = rows.slice(1).find(r => r[0] === session.id);
    if (!row || row[5] !== 'active') return null;
    return VALID_ROLES.includes(row[4] as Role)
      ? row[4] as Role
      : null;
  } catch {
    return null;
  }
}

/**
 * Role + the branches a Branch Blog Editor may publish to. Super admins and env
 * users get `['all']`. A branch editor with no assignment also gets `['all']`
 * (a safe default) so they are never locked out; the Super Admin narrows it.
 */
export async function getUserContext(
  req: VercelRequest,
): Promise<{ role: Role; branches: string[] } | null> {
  const session = getSession(req);
  if (!session) return null;
  if (session.id.startsWith('env-')) return { role: session.role, branches: ['all'] };

  try {
    const { sheets, spreadsheetId } = await ensureUsersSheet();
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${USERS_SHEET}!A:H`,
    });
    const rows = (result.data.values || []) as string[][];
    const row = rows.slice(1).find(r => r[0] === session.id);
    if (!row || row[5] !== 'active' || !VALID_ROLES.includes(row[4] as Role)) return null;
    const role = row[4] as Role;
    const assigned = parseBranches(row[7]);
    return { role, branches: assigned.length ? assigned : ['all'] };
  } catch {
    return null;
  }
}

/** Super admin or admin only */
export async function isAdminOrAbove(req: VercelRequest): Promise<boolean> {
  const role = await getRole(req);
  return role === 'super_admin' || role === 'admin';
}

/**
 * Appointments-desk access: read the list and confirm bookings. Covers super
 * admin, legacy admin, and the appointments_manager role. Deleting is NOT
 * included here — that stays with isAdminOrAbove.
 */
export async function canManageAppointments(req: VercelRequest): Promise<boolean> {
  const role = await getRole(req);
  return role === 'super_admin' || role === 'admin' || role === 'appointments_manager';
}

/** Any authenticated role */
export async function isAuthenticated(req: VercelRequest): Promise<boolean> {
  return (await getRole(req)) !== null;
}
