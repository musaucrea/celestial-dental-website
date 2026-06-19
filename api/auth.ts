import type { VercelRequest, VercelResponse } from '@vercel/node';
import { lookupUser } from './_utils';

type Role = 'super_admin' | 'admin' | 'content_creator';

function resolveEnvRole(email: string, password: string): { role: Role; name: string } | null {
  const superEmail = process.env.SUPER_ADMIN_EMAIL;
  if (process.env.SUPER_ADMIN_PASSWORD && password === process.env.SUPER_ADMIN_PASSWORD) {
    if (!superEmail || email.toLowerCase() === superEmail.toLowerCase()) {
      return { role: 'super_admin', name: 'Super Admin' };
    }
  }
  if (process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
    return { role: 'admin', name: 'Admin' };
  }
  if (process.env.CONTENT_CREATOR_PASSWORD && password === process.env.CONTENT_CREATOR_PASSWORD) {
    return { role: 'content_creator', name: 'Content Creator' };
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, password } = (req.body || {}) as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  // Check env-var passwords first (super admin always works)
  const envResult = resolveEnvRole(email.trim(), password);
  if (envResult) return res.status(200).json(envResult);

  // Look up in the Users sheet
  const user = await lookupUser(email.trim(), password);

  if (!user) {
    return res.status(401).json({ error: 'invalid', message: 'Incorrect email or password.' });
  }
  if (user.status === 'pending') {
    return res.status(403).json({
      error: 'pending',
      message: 'Your access request is awaiting approval from a Super Admin.',
    });
  }
  if (user.status === 'disabled') {
    return res.status(403).json({
      error: 'disabled',
      message: 'Your account has been disabled. Contact your Super Admin.',
    });
  }
  if (user.status !== 'active') {
    return res.status(401).json({ error: 'invalid', message: 'Incorrect email or password.' });
  }

  return res.status(200).json({ role: user.role, name: user.name });
}
