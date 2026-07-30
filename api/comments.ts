import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRole, getSheetsClient } from './_utils.js';

async function canModerateBlog(req: VercelRequest) {
  const role = await getRole(req);
  return role === 'super_admin' || role === 'admin' || role === 'branch_blog_editor' || role === 'content_creator';
}

type Comment = {
  id: string;
  slug: string;
  name: string;
  message: string;
  status: string; // 'published' | 'archived'
  createdAt: string;
};

const sheetTitle = 'BlogComments';
const header = ['id', 'slug', 'name', 'message', 'status', 'createdAt'];

function clean(value: unknown, max = 2000) {
  return (typeof value === 'string' ? value : '').trim().slice(0, max);
}

async function ensureSheet() {
  const { sheets, spreadsheetId } = await getSheetsClient();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === sheetTitle);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetTitle } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheetTitle}!A1:F1`,
      valueInputOption: 'RAW', requestBody: { values: [header] },
    });
  }
  return { sheets, spreadsheetId };
}

async function readComments(): Promise<Comment[]> {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:F`,
  });
  return ((result.data.values || []) as string[][])
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row => Object.fromEntries(header.map((key, i) => [key, row[i] || ''])) as Comment);
}

async function addComment(slug: string, name: string, message: string) {
  const { sheets, spreadsheetId } = await ensureSheet();
  const row = [
    `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    slug, name, message, 'published', new Date().toISOString(),
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId, range: `${sheetTitle}!A:F`,
    valueInputOption: 'RAW', requestBody: { values: [row] },
  });
}

async function setStatus(id: string, status: string) {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!A:F`,
  });
  const rows = (result.data.values || []) as string[][];
  const idx = rows.findIndex((row, i) => i > 0 && row[0] === id);
  if (idx < 1) return false;
  await sheets.spreadsheets.values.update({
    spreadsheetId, range: `${sheetTitle}!E${idx + 1}`,
    valueInputOption: 'RAW', requestBody: { values: [[status]] },
  });
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password, x-admin-email');
  // Never let the browser (or the cPanel proxy) cache the comment list — a
  // stale cache made deleted comments keep showing on the public page.
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const all = await readComments();
      // Admins get every comment (for moderation); the public only sees
      // published ones, optionally filtered to a single post's slug.
      if (await canModerateBlog(req)) {
        return res.status(200).json({ comments: all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
      }
      const slug = clean(req.query.slug, 200);
      const published = all
        .filter(c => c.status === 'published' && (!slug || c.slug === slug))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(({ name, message, createdAt }) => ({ name, message, createdAt }));
      return res.status(200).json({ comments: published });
    }

    if (req.method === 'POST') {
      const payload = req.body || {};

      // Admin moderation actions
      if (payload.action) {
        if (!await canModerateBlog(req)) {
          return res.status(401).json({ error: 'You are not signed in with an account that can moderate comments.' });
        }
        const id = clean(payload.id, 80);
        // Report the real result: setStatus returns false when no row matches
        // the id, so the admin sees a genuine error instead of a false success.
        if (payload.action === 'delete') {
          const ok = await setStatus(id, 'archived');
          return res.status(ok ? 200 : 404).json(ok ? { ok: true } : { error: `No comment matches id ${id} — it may already have been removed.` });
        }
        if (payload.action === 'publish') {
          const ok = await setStatus(id, 'published');
          return res.status(ok ? 200 : 404).json(ok ? { ok: true } : { error: `No comment matches id ${id} — it may already have been removed.` });
        }
        return res.status(400).json({ error: `"${payload.action}" is not a comment action — use publish or delete.` });
      }

      // Public comment submission
      if (clean(payload.website)) return res.status(200).json({ ok: true }); // honeypot — silently drop bots
      const slug = clean(payload.slug, 200);
      const name = clean(payload.name, 80);
      const message = clean(payload.message, 2000);
      // Name the field that is actually wrong rather than restating the rule.
      if (!slug || !name || message.length < 2) {
        const reason = !slug ? 'we could not tell which post this comment belongs to'
          : !name ? 'your name is missing'
          : 'your comment is too short — please write at least two characters';
        return res.status(400).json({ error: `Your comment was not posted: ${reason}.` });
      }
      await addComment(slug, name, message);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: `${req.method} is not supported here — comments accept GET and POST.` });
  } catch (error) {
    console.error('Comments API error', error);
    return res.status(500).json({
      error: error instanceof Error && error.message.includes('env')
        ? 'Comments are unavailable — the comments store is not configured.'
        : 'Comments are unavailable — the comments store did not respond.',
    });
  }
}
