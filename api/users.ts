import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRole, ensureUsersSheet, hashPassword, USERS_SHEET, parseBranches } from './_utils.js';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const INVITE_TTL_MS = 48 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const inviteHash = (token: string) => createHash('sha256').update(token).digest('hex');

function clean(v: unknown) {
  return typeof v === 'string' ? v.trim() : '';
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[char] || char);
}

async function sendInviteEmail(
  name: string,
  email: string,
  kind: 'created' | 'approved',
  inviteUrl?: string,
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const adminUrl = process.env.ADMIN_URL || 'https://celestialdental.org/admin/';
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const destination = inviteUrl || adminUrl;
  const safeAdminUrl = escapeHtml(destination);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.OTP_FROM_EMAIL || 'Celestial Dental <onboarding@resend.dev>',
      to: email,
      subject: kind === 'approved'
        ? 'Your Celestial Dental admin access is approved'
        : 'You have been invited to the Celestial Dental admin portal',
      text: [
        `Hello ${name},`,
        '',
        kind === 'approved'
          ? 'Your access request has been approved.'
          : 'A Super Admin has created an account for you.',
        '',
        inviteUrl ? `Accept your invitation: ${inviteUrl}` : `Sign in at: ${adminUrl}`,
        `Account email: ${email}`,
        '',
        inviteUrl ? 'This private link expires in 48 hours. Open it to create your password and activate your account.' : 'Use the password provided to you securely by the Super Admin. A one-time verification code will then be sent to this email address.',
        '',
        'For your security, passwords are never included in invitation emails.',
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#102627;line-height:1.6">
          <h2 style="color:#087f78">Celestial Dental Admin Portal</h2>
          <p>Hello ${safeName},</p>
          <p>${kind === 'approved'
            ? 'Your admin access has been approved.'
            : 'A Super Admin has created an admin account for you.'}</p>
          <p><a href="${safeAdminUrl}" style="display:inline-block;background:#087f78;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700">${inviteUrl ? 'Accept Invitation' : 'Sign in to the Admin Portal'}</a></p>
          <p>Account email: <strong>${safeEmail}</strong></p>
          <p>${inviteUrl ? 'This private link expires in 48 hours. Open it to create your password and activate your account.' : 'Use the password provided to you securely by the Super Admin. A one-time verification code will then be sent to this email address.'}</p>
          <p style="font-size:13px;color:#5d7071">For your security, passwords are never included in invitation emails.</p>
        </div>`,
    }),
  });
  if (!response.ok) {
    console.error('User invitation email failed', await response.text());
    return false;
  }
  return true;
}

async function sendPasswordResetEmail(name: string, email: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(resetUrl);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.OTP_FROM_EMAIL || 'Celestial Dental <onboarding@resend.dev>',
      to: email,
      subject: 'Reset your Celestial Dental admin password',
      text: [
        `Hello ${name},`, '',
        'A password reset was requested for your Celestial Dental admin account.',
        `Reset your password: ${resetUrl}`, '',
        'This private link expires in 60 minutes and can only be used once.',
        'If you did not request this change, you can safely ignore this email.',
      ].join('\n'),
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#102627;line-height:1.6">
        <h2 style="color:#087f78">Reset your admin password</h2>
        <p>Hello ${safeName},</p>
        <p>A password reset was requested for your Celestial Dental admin account.</p>
        <p><a href="${safeUrl}" style="display:inline-block;background:#087f78;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700">Create New Password</a></p>
        <p>This private link expires in 60 minutes and can only be used once.</p>
        <p style="font-size:13px;color:#5d7071">If you did not request this change, you can safely ignore this email.</p>
      </div>`,
    }),
  });
  if (!response.ok) {
    console.error('Password reset email failed', await response.text());
    return false;
  }
  return true;
}

// ── Read all users (no passwords) ──────────────────────────────
async function getAllUsers() {
  const { sheets, spreadsheetId } = await ensureUsersSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${USERS_SHEET}!A:H`,
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
      branches: parseBranches(r[7]),
    }));
}

async function getUser(id: string) {
  const users = await getAllUsers();
  return users.find(user => user.id === id);
}

// ── Create a user ───────────────────────────────────────────────
async function createUser(
  name: string,
  email: string,
  password: string,
  role: string,
  status: string,
  branches: string[],
): Promise<string> {
  const { sheets, spreadsheetId } = await ensureUsersSheet();

  // Check for existing active/pending account with same email
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${USERS_SHEET}!A:H`,
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
    range: `${USERS_SHEET}!A:H`,
    valueInputOption: 'RAW',
    requestBody: { values: [[id, name, email, hashPassword(password), role, status, createdAt, branches.join(',')]] },
  });
  return id;
}

async function createInvitedUser(name: string, email: string, role: string, branches: string[]) {
  const { sheets, spreadsheetId } = await ensureUsersSheet();
  const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${USERS_SHEET}!A:K` });
  const rows = (existing.data.values || []) as string[][];
  if (rows.slice(1).some(r => r[2]?.toLowerCase() === email.toLowerCase() && r[5] !== 'disabled')) throw new Error('EMAIL_EXISTS');
  const token = randomBytes(32).toString('base64url');
  const id = `user-${Date.now()}`;
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${USERS_SHEET}!A:K`, valueInputOption: 'RAW',
    requestBody: { values: [[id, name, email, '', role, 'invited', new Date().toISOString(), branches.join(','), inviteHash(token), new Date(Date.now() + INVITE_TTL_MS).toISOString(), '']] },
  });
  return { id, token };
}

async function acceptInvite(token: string, password: string) {
  const { sheets, spreadsheetId } = await ensureUsersSheet();
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${USERS_SHEET}!A:K` });
  const rows = (result.data.values || []) as string[][];
  const supplied = Buffer.from(inviteHash(token));
  const idx = rows.findIndex((r, i) => i > 0 && r[8] && Buffer.byteLength(r[8]) === supplied.length && timingSafeEqual(Buffer.from(r[8]), supplied));
  if (idx < 0) throw new Error('INVALID_INVITE');
  const row = [...rows[idx]]; while (row.length < 11) row.push('');
  if (row[5] !== 'invited' || !row[9] || Date.parse(row[9]) < Date.now()) throw new Error('INVALID_INVITE');
  row[3] = hashPassword(password); row[5] = 'active'; row[8] = ''; row[9] = ''; row[10] = new Date().toISOString();
  await sheets.spreadsheets.values.update({ spreadsheetId, range: `${USERS_SHEET}!A${idx + 1}:K${idx + 1}`, valueInputOption: 'RAW', requestBody: { values: [row] } });
  return { name: row[1], email: row[2] };
}

async function requestPasswordReset(email: string) {
  const { sheets, spreadsheetId } = await ensureUsersSheet();
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${USERS_SHEET}!A:K` });
  const rows = (result.data.values || []) as string[][];
  const idx = rows.findIndex((row, i) => i > 0 && row[2]?.toLowerCase() === email.toLowerCase() && row[5] === 'active');
  // Always return the same public response so this endpoint cannot be used to
  // discover which email addresses have admin accounts.
  if (idx < 0) return;
  const row = [...rows[idx]]; while (row.length < 11) row.push('');
  const token = randomBytes(32).toString('base64url');
  row[8] = inviteHash(token);
  row[9] = new Date(Date.now() + RESET_TTL_MS).toISOString();
  row[10] = '';
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${USERS_SHEET}!A${idx + 1}:K${idx + 1}`,
    valueInputOption: 'RAW', requestBody: { values: [row] },
  });
  const resetUrl = `${process.env.ADMIN_URL || 'https://celestialdental.org/admin/'}?reset=${encodeURIComponent(token)}`;
  await sendPasswordResetEmail(row[1] || 'Admin', row[2], resetUrl);
}

async function resetPassword(token: string, password: string) {
  const { sheets, spreadsheetId } = await ensureUsersSheet();
  const result = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${USERS_SHEET}!A:K` });
  const rows = (result.data.values || []) as string[][];
  const supplied = Buffer.from(inviteHash(token));
  const idx = rows.findIndex((row, i) => i > 0 && row[5] === 'active' && row[8] && Buffer.byteLength(row[8]) === supplied.length && timingSafeEqual(Buffer.from(row[8]), supplied));
  if (idx < 0) throw new Error('INVALID_RESET');
  const row = [...rows[idx]]; while (row.length < 11) row.push('');
  if (!row[9] || Date.parse(row[9]) < Date.now()) throw new Error('INVALID_RESET');
  row[3] = hashPassword(password);
  row[8] = '';
  row[9] = '';
  row[10] = new Date().toISOString();
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${USERS_SHEET}!A${idx + 1}:K${idx + 1}`,
    valueInputOption: 'RAW', requestBody: { values: [row] },
  });
  return { email: row[2] };
}

// ── Update a user row ───────────────────────────────────────────
async function updateUser(
  id: string,
  updates: { name?: string; role?: string; status?: string; password?: string; branches?: string[] },
) {
  const { sheets, spreadsheetId } = await ensureUsersSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${USERS_SHEET}!A:H`,
  });
  const rows = (result.data.values || []) as string[][];
  const idx = rows.findIndex((r, i) => i > 0 && r[0] === id);
  if (idx < 0) throw new Error('NOT_FOUND');
  const row = [...rows[idx]];
  while (row.length < 8) row.push(''); // pad legacy 7-column rows
  if (updates.name !== undefined) row[1] = updates.name;
  if (updates.password !== undefined) row[3] = hashPassword(updates.password);
  if (updates.role !== undefined) row[4] = updates.role;
  if (updates.status !== undefined) row[5] = updates.status;
  if (updates.branches !== undefined) row[7] = updates.branches.join(',');
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${USERS_SHEET}!A${idx + 1}:H${idx + 1}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
  return { name: row[1] || '', email: row[2] || '' };
}

// ── Handler ─────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password, x-admin-email');

  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const payload = (req.body || {}) as Record<string, string>;

    if (req.method === 'POST' && payload.action === 'accept-invite') {
      const token = clean(payload.token), password = clean(payload.password);
      if (!token || password.length < 15) return res.status(400).json({ error: 'A valid invitation and a password of at least 15 characters are required' });
      try { return res.status(200).json({ ok: true, ...(await acceptInvite(token, password)) }); }
      catch { return res.status(400).json({ error: 'This invitation is invalid, expired, or has already been used' }); }
    }

    if (req.method === 'POST' && payload.action === 'forgot-password') {
      const email = clean(payload.email).toLowerCase();
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) await requestPasswordReset(email);
      return res.status(200).json({ ok: true, message: 'If an active account exists for that email, a reset link has been sent.' });
    }

    if (req.method === 'POST' && payload.action === 'reset-password') {
      const token = clean(payload.token), password = clean(payload.password);
      if (!token || password.length < 15) return res.status(400).json({ error: 'A valid reset link and a password of at least 15 characters are required' });
      try { return res.status(200).json({ ok: true, ...(await resetPassword(token, password)) }); }
      catch { return res.status(400).json({ error: 'This password reset link is invalid, expired, or has already been used' }); }
    }

    // Public account creation is intentionally disabled.
    if (req.method === 'POST' && payload.action === 'register') {
      return res.status(403).json({ error: 'Account creation is restricted to the Super Admin' });
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
      // Send or resend an invitation to an existing active user.
      if (payload.action === 'invite') {
        const id = clean(payload.id);
        if (!id) return res.status(400).json({ error: 'User ID required' });
        const user = await getUser(id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (!['active', 'invited'].includes(user.status)) return res.status(400).json({ error: 'This user cannot be invited' });
        const { sheets, spreadsheetId } = await ensureUsersSheet();
        const data = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${USERS_SHEET}!A:K` });
        const rows = (data.data.values || []) as string[][]; const idx = rows.findIndex((r, i) => i > 0 && r[0] === id);
        const row = [...rows[idx]]; while (row.length < 11) row.push('');
        const token = randomBytes(32).toString('base64url'); row[5] = 'invited'; row[8] = inviteHash(token); row[9] = new Date(Date.now() + INVITE_TTL_MS).toISOString(); row[10] = '';
        await sheets.spreadsheets.values.update({ spreadsheetId, range: `${USERS_SHEET}!A${idx + 1}:K${idx + 1}`, valueInputOption: 'RAW', requestBody: { values: [row] } });
        const inviteUrl = `${process.env.ADMIN_URL || 'https://celestialdental.org/admin/'}?invite=${encodeURIComponent(token)}`;
        const inviteSent = await sendInviteEmail(user.name, user.email, 'created', inviteUrl);
        return res.status(200).json({ ok: true, inviteSent, inviteUrl });
      }

      if (payload.action === 'create-invite') {
        const name = clean(payload.name), email = clean(payload.email);
        const userRole = ['super_admin', 'branch_blog_editor', 'website_content_editor', 'appointments_manager'].includes(payload.role) ? payload.role : 'branch_blog_editor';
        const branches = userRole === 'branch_blog_editor' ? parseBranches(Array.isArray((payload as Record<string, unknown>).branches) ? ((payload as Record<string, unknown>).branches as string[]).join(',') : payload.branches) : [];
        if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
        try {
          const { id, token } = await createInvitedUser(name, email, userRole, branches);
          const inviteUrl = `${process.env.ADMIN_URL || 'https://celestialdental.org/admin/'}?invite=${encodeURIComponent(token)}`;
          const inviteSent = await sendInviteEmail(name, email, 'created', inviteUrl);
          return res.status(200).json({ ok: true, id, inviteUrl, inviteSent });
        } catch (e) { if (e instanceof Error && e.message === 'EMAIL_EXISTS') return res.status(409).json({ error: 'An account with this email already exists' }); throw e; }
      }

      // Create user directly (active)
      if (payload.action === 'create') {
        const name = clean(payload.name);
        const email = clean(payload.email);
        const password = clean(payload.password);
        const userRole = ['super_admin', 'branch_blog_editor', 'website_content_editor', 'appointments_manager'].includes(payload.role)
          ? payload.role
          : 'branch_blog_editor';
        const branches = userRole === 'branch_blog_editor'
          ? parseBranches(Array.isArray((payload as Record<string, unknown>).branches)
              ? ((payload as Record<string, unknown>).branches as string[]).join(',')
              : payload.branches)
          : [];
        if (!name || !email || !password) {
          return res.status(400).json({ error: 'Name, email, and password are required' });
        }
        if (password.length < 15) {
          return res.status(400).json({ error: 'Password must be at least 15 characters' });
        }
        try {
          const id = await createUser(name, email, password, userRole, 'active', branches);
          const inviteSent = await sendInviteEmail(name, email, 'created');
          return res.status(200).json({ ok: true, id, inviteSent });
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
        const updates: { name?: string; role?: string; status?: string; password?: string; branches?: string[] } = {};
        if (payload.name) updates.name = clean(payload.name);
        if (payload.role && ['super_admin', 'branch_blog_editor', 'website_content_editor', 'appointments_manager'].includes(payload.role)) {
          updates.role = payload.role;
        }
        if (payload.status && ['active', 'pending', 'disabled'].includes(payload.status)) {
          updates.status = payload.status;
        }
        if ((payload as Record<string, unknown>).branches !== undefined) {
          const raw = (payload as Record<string, unknown>).branches;
          updates.branches = parseBranches(Array.isArray(raw) ? (raw as string[]).join(',') : (raw as string));
        }
        if (payload.password && clean(payload.password).length >= 15) {
          updates.password = clean(payload.password);
        }
        try {
          const user = await updateUser(id, updates);
          const inviteSent = payload.status === 'active'
            ? await sendInviteEmail(user.name, user.email, 'approved')
            : undefined;
          return res.status(200).json({ ok: true, inviteSent });
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
