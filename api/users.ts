import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRole, ensureUsersSheet, USERS_SHEET } from './_utils';

function clean(v: unknown) {
  return typeof v === 'string' ? v.trim() : '';
}

// ── Read all users (no passwords) ──────────────────────────────
async function getAllUsers() {
  const { sheets, spreadsheetId } = await ensureUsersSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${USERS_SHEET}!A:G`,
  });
  const rows = (result.data.values || []) as string[][];
  return rows
    .slice(1)
    .filter(r => r.some(Boolean))
    .map(r => ({
      id: r[0] || '',
      name: r[1] || '',
      email: r[2] || '',
      // r[3] = password — never returned
      role: r[4] || '',
      status: r[5] || '',
      createdAt: r[6] || '',
    }));
}

// ── Create a user ───────────────────────────────────────────────
async function createUser(
  name: string,
  email: string,
  password: string,
  role: string,
  status: string,
): Promise<string> {
  const { sheets, spreadsheetId } = await ensureUsersSheet();

  // Check for existing active/pending account with same email
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${USERS_SHEET}!A:G`,
  });
  const rows = (existing.data.values || []) as string[][];
  const duplicate = rows
    .slice(1)
    .find(r => r[2]?.toLowerCase() === email.toLowerCase() && r[5] !== 'disabled');
  if (duplicate) throw new Error('EMAIL_EXISTS');

  const id = `user-${Date.now()}`;
  const createdAt = new Date().toISOString();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${USERS_SHEET}!A:G`,
    valueInputOption: 'RAW',
    requestBody: { values: [[id, name, email, password, role, status, createdAt]] },
  });
  return id;
}

// ── Update a user row ───────────────────────────────────────────
async function updateUser(
  id: string,
  updates: { name?: string; role?: string; status?: string; password?: string },
) {
  const { sheets, spreadsheetId } = await ensureUsersSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${USERS_SHEET}!A:G`,
  });
  const rows = (result.data.values || []) as string[][];
  const idx = rows.findIndex((r, i) => i > 0 && r[0] === id);
  if (idx < 0) throw new Error('NOT_FOUND');
  const row = [...rows[idx]];
  if (updates.name !== undefined) row[1] = updates.name;
  if (updates.password !== undefined) row[3] = updates.password;
  if (updates.role !== undefined) row[4] = updates.role;
  if (updates.status !== undefined) row[5] = updates.status;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${USERS_SHEET}!A${idx + 1}:G${idx + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

// ── Handler ─────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password, x-admin-email');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const payload = (req.body || {}) as Record<string, string>;

    // ── Public: self-registration (creates a pending user) ──────
    if (req.method === 'POST' && payload.action === 'register') {
      const name = clean(payload.name);
      const email = clean(payload.email);
      const password = clean(payload.password);
      const requestedRole = ['admin', 'content_creator'].includes(payload.requestedRole)
        ? payload.requestedRole
        : 'content_creator';

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      try {
        await createUser(name, email, password, requestedRole, 'pending');
        return res.status(200).json({ ok: true });
      } catch (e: unknown) {
        if (e instanceof Error && e.message === 'EMAIL_EXISTS') {
          return res.status(409).json({ error: 'An account with this email already exists' });
        }
        throw e;
      }
    }

    // ── All other operations require super admin ─────────────────
    const role = await getRole(req);
    if (role !== 'super_admin') {
      return res.status(401).json({ error: 'Super admin access required' });
    }

    // GET — list all users
    if (req.method === 'GET') {
      const users = await getAllUsers();
      return res.status(200).json({ users });
    }

    if (req.method === 'POST') {
      // Create user directly (active)
      if (payload.action === 'create') {
        const name = clean(payload.name);
        const email = clean(payload.email);
        const password = clean(payload.password);
        const userRole = ['admin', 'content_creator'].includes(payload.role)
          ? payload.role
          : 'content_creator';
        if (!name || !email || !password) {
          return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        if (password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        try {
          const id = await createUser(name, email, password, userRole, 'active');
          return res.status(200).json({ ok: true, id });
        } catch (e: unknown) {
          if (e instanceof Error && e.message === 'EMAIL_EXISTS') {
            return res.status(409).json({ error: 'An account with this email already exists' });
          }
          throw e;
        }
      }

      // Update user (role, status, name, password)
      if (payload.action === 'update') {
        const { id } = payload;
        if (!id) return res.status(400).json({ error: 'User ID required' });
        const updates: { name?: string; role?: string; status?: string; password?: string } = {};
        if (payload.name) updates.name = clean(payload.name);
        if (payload.role && ['admin', 'content_creator'].includes(payload.role)) {
          updates.role = payload.role;
        }
        if (payload.status && ['active', 'pending', 'disabled'].includes(payload.status)) {
          updates.status = payload.status;
        }
        if (payload.password && clean(payload.password).length >= 6) {
          updates.password = clean(payload.password);
        }
        try {
          await updateUser(id, updates);
          return res.status(200).json({ ok: true });
        } catch (e: unknown) {
          if (e instanceof Error && e.message === 'NOT_FOUND') {
            return res.status(404).json({ error: 'User not found' });
          }
          throw e;
        }
      }

      // Soft-delete (disable)
      if (payload.action === 'delete') {
        const { id } = payload;
        if (!id) return res.status(400).json({ error: 'User ID required' });
        try {
          await updateUser(id, { status: 'disabled' });
          return res.status(200).json({ ok: true });
        } catch (e: unknown) {
          if (e instanceof Error && e.message === 'NOT_FOUND') {
            return res.status(404).json({ error: 'User not found' });
          }
          throw e;
        }
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Users API error', error);
    return res.status(500).json({ error: 'Users operation failed' });
  }
}
