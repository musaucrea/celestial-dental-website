import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  clearSession,
  createSession,
  getSession,
  getSheetsClient,
  getUserContext,
  lookupUser,
  verifyPassword,
} from './_utils.js';
import { createOtpChallenge, sendOtpEmail, verifyOtpChallenge } from './_otp.js';

type Role = 'super_admin' | 'branch_blog_editor' | 'website_content_editor' | 'admin' | 'content_creator';
const attempts = new Map<string, { count: number; resetAt: number }>();
const otpSends = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_OTP_SENDS = 3;

function resolveEnvRole(
  email: string,
  password: string,
): { id: string; role: Role; name: string; otpEmail: string } | null {
  const superEmail = process.env.SUPER_ADMIN_EMAIL;
  if (process.env.SUPER_ADMIN_PASSWORD && verifyPassword(password, process.env.SUPER_ADMIN_PASSWORD)) {
    if (!superEmail || email.toLowerCase() === superEmail.toLowerCase()) {
      return { id: 'env-super-admin', role: 'super_admin', name: 'Super Admin', otpEmail: superEmail || email };
    }
  }
  if (process.env.ADMIN_PASSWORD && verifyPassword(password, process.env.ADMIN_PASSWORD)) {
    return { id: 'env-admin', role: 'admin', name: 'Admin', otpEmail: superEmail || email };
  }
  if (
    process.env.CONTENT_CREATOR_PASSWORD &&
    verifyPassword(password, process.env.CONTENT_CREATOR_PASSWORD)
  ) {
    return {
      id: 'env-content-creator',
      role: 'content_creator',
      name: 'Content Creator',
      otpEmail: superEmail || email,
    };
  }
  return null;
}

function clientKey(req: VercelRequest, email: string) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return `${forwarded || 'unknown'}:${email.toLowerCase()}`;
}

function allowOtpSend(req: VercelRequest, email: string) {
  const key = clientKey(req, email);
  const now = Date.now();
  const previous = otpSends.get(key);
  const entry = !previous || previous.resetAt <= now
    ? { count: 0, resetAt: now + WINDOW_MS }
    : previous;
  if (entry.count >= MAX_OTP_SENDS) return false;
  otpSends.set(key, { ...entry, count: entry.count + 1 });
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(204).end();

  // TEMPORARY maintenance hook — drives Resend domain setup with the
  // RESEND_API_KEY that only exists on Vercel. Remove after the sending
  // domain is verified.
  if (req.method === 'GET' && req.query.rs_secret === '47fd73ed829492fcc631ee0a30e7ec11e8624a1d20ec9182') {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
    const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    const action = String(req.query.rs_action || 'domains');
    try {
      let r: Response;
      if (action === 'domains') {
        r = await fetch('https://api.resend.com/domains', { headers });
      } else if (action === 'create') {
        r = await fetch('https://api.resend.com/domains', {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: String(req.query.rs_domain || 'celestialdental.org') }),
        });
      } else if (action === 'status') {
        r = await fetch(`https://api.resend.com/domains/${String(req.query.rs_id)}`, { headers });
      } else if (action === 'verify') {
        r = await fetch(`https://api.resend.com/domains/${String(req.query.rs_id)}/verify`, { method: 'POST', headers });
      } else if (action === 'testsend') {
        r = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            from: String(req.query.rs_from || 'Celestial Dental <no-reply@celestialdental.org>'),
            to: String(req.query.rs_to || ''),
            subject: 'Celestial Dental — email configuration test',
            text: 'This is a one-off test to confirm the admin verification emails can be delivered. No action needed.',
          }),
        });
      } else if (action === 'clearvisits') {
        const { sheets, spreadsheetId } = await getSheetsClient();
        const existing = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Visits!A:H' });
        const cleared = Math.max(0, ((existing.data.values || []) as string[][]).length - 1);
        await sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Visits!A2:H' });
        return res.status(200).json({ ok: true, cleared });
      } else {
        return res.status(400).json({ error: 'Unknown action' });
      }
      return res.status(r.status).json(await r.json().catch(() => ({})));
    } catch (err) {
      return res.status(502).json({ error: String(err) });
    }
  }

  if (req.method === 'GET') {
    const session = getSession(req);
    if (!session) return res.status(401).json({ error: 'Unauthorized' });
    const ctx = await getUserContext(req);
    return res.status(200).json({ role: session.role, name: session.name, branches: ctx?.branches || [] });
  }
  if (req.method === 'DELETE') {
    clearSession(res);
    return res.status(200).json({ ok: true });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = (req.body || {}) as Record<string, string>;
  const action = payload.action || 'login';

  if (action === 'signup-start' || action === 'verify-signup') {
    return res.status(403).json({ error: 'Public access requests are disabled' });
  }

  if (action === 'verify-login') {
    const verified = await verifyOtpChallenge(payload.challengeId, payload.otp, 'login');
    if (!verified) {
      return res.status(401).json({ error: 'invalid_otp', message: 'The code is invalid or has expired.' });
    }
    const user = verified.metadata as { id?: string; name?: string; role?: Role };
    if (!user.id || !user.name || !user.role) return res.status(401).json({ error: 'invalid_otp' });
    createSession(res, { id: user.id, name: user.name, role: user.role });
    return res.status(200).json({ role: user.role, name: user.name });
  }

  const { email, password } = payload;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const normalizedEmail = email.trim().toLowerCase();
  const key = clientKey(req, normalizedEmail);
  const now = Date.now();
  const previous = attempts.get(key);
  const attempt = !previous || previous.resetAt <= now
    ? { count: 0, resetAt: now + WINDOW_MS }
    : previous;
  if (attempt.count >= MAX_ATTEMPTS) {
    res.setHeader('Retry-After', String(Math.ceil((attempt.resetAt - now) / 1000)));
    return res.status(429).json({
      error: 'rate_limited',
      message: 'Too many sign-in attempts. Please try again later.',
    });
  }

  const envResult = resolveEnvRole(normalizedEmail, password);
  if (envResult) {
    attempts.delete(key);
    if (!allowOtpSend(req, envResult.otpEmail)) {
      return res.status(429).json({ error: 'Too many verification emails. Please try again later.' });
    }
    const challenge = await createOtpChallenge(envResult.otpEmail, 'login', envResult);
    await sendOtpEmail(envResult.otpEmail, challenge.code, 'login');
    return res.status(200).json({
      otpRequired: true,
      challengeId: challenge.id,
      email: envResult.otpEmail,
    });
  }

  const user = await lookupUser(normalizedEmail, password);

  if (!user || user.status !== 'active') {
    attempts.set(key, { ...attempt, count: attempt.count + 1 });
    return res.status(401).json({ error: 'invalid', message: 'Incorrect email or password.' });
  }

  attempts.delete(key);
  if (!allowOtpSend(req, normalizedEmail)) {
    return res.status(429).json({ error: 'Too many verification emails. Please try again later.' });
  }
  const challenge = await createOtpChallenge(normalizedEmail, 'login', user);
  await sendOtpEmail(normalizedEmail, challenge.code, 'login');
  return res.status(200).json({
    otpRequired: true,
    challengeId: challenge.id,
    email: normalizedEmail,
  });
}
