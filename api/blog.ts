import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { getUserContext, canManageBlog } from './_utils.js';

type BlogPost = {
  id: string;
  status: string;
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  body: string;
  image: string;
  date: string;
  readTime: string;
  updatedAt: string;
  video: string;
  gallery: string;
  branch: string;
};

// Public site (cPanel), where the IndexNow key file lives and where blog URLs
// resolve. The API itself runs on Vercel, but IndexNow only checks that the key
// file is hosted on the submitted host — so we submit celestialdental.org URLs.
const SITE = 'https://celestialdental.org';
const INDEXNOW_KEY = '713683c9614cf75e3d51adad493caaed';

// Fire-and-forget IndexNow submission so every published post is picked up by
// Bing, Yandex, Naver, Seznam, and Yep automatically — no manual ping. Google
// discovers new posts from the always-fresh /sitemap.xml on its own crawl.
// Never let a failed ping break publishing: swallow all errors, short timeout.
async function pingIndexNow(urls: string[]) {
  const urlList = urls.filter(Boolean);
  if (!urlList.length) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'celestialdental.org',
        key: INDEXNOW_KEY,
        keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
      signal: controller.signal,
    });
    console.log('IndexNow ping', res.status, urlList.join(', '));
  } catch (error) {
    console.warn('IndexNow ping failed (non-fatal)', error);
  } finally {
    clearTimeout(timeout);
  }
}

const sheetTitle = 'Blog';
// `video` (col L), `gallery` (col M — up to 5 photo URLs joined by ' | ') and
// `branch` (col N — which branch a Branch Blog Editor published it for) are
// appended after updatedAt so existing rows stay aligned.
const header = ['id', 'status', 'slug', 'tag', 'title', 'excerpt', 'body', 'image', 'date', 'readTime', 'updatedAt', 'video', 'gallery', 'branch'];
const COLS = 'A:N';

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

// URL slug from a title: "Can You Get Braces After a Root Canal?" →
// "can-you-get-braces-after-a-root-canal"
export function slugifyTitle(text: string) {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '');
}

// Posts created before slugs existed stored the row id (post-<timestamp>) as
// their slug — swap those for a readable, keyword-rich slug from the title.
export function prettySlug(slug: string, title: string, id: string) {
  if (slug && !/^post-\d+$/.test(slug)) return slug;
  return slugifyTitle(title) || id;
}

async function getSheets() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!clientEmail || !privateKey || !spreadsheetId) throw new Error('Missing env vars');
  const auth = new google.auth.JWT({
    email: clientEmail, key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return { spreadsheetId, sheets: google.sheets({ version: 'v4', auth }) };
}

async function ensureSheet() {
  const { sheets, spreadsheetId } = await getSheets();
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = spreadsheet.data.sheets?.some(s => s.properties?.title === sheetTitle);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetTitle } } }] },
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheetTitle}!A1:N1`,
      valueInputOption: 'RAW', requestBody: { values: [header] },
    });
  }
  return { sheets, spreadsheetId };
}

function rowsToPosts(rows: string[][] = []): BlogPost[] {
  const posts = rows
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row => Object.fromEntries(header.map((key, i) => [key, row[i] || ''])) as BlogPost)
    .filter(p => p.status !== 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // Readable slugs, kept unique across the list
  const seen = new Set<string>();
  for (const p of posts) {
    let slug = prettySlug(p.slug, p.title, p.id);
    if (seen.has(slug)) slug = `${slug}-${p.id.replace(/^post-/, '').slice(-4)}`;
    seen.add(slug);
    p.slug = slug;
  }
  return posts;
}

async function readPosts() {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!${COLS}`,
  });
  return rowsToPosts((result.data.values || []) as string[][]);
}

// Archived (deleted) posts, newest first — for the "Recently deleted" restore view.
async function readArchivedPosts(): Promise<BlogPost[]> {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!${COLS}`,
  });
  return ((result.data.values || []) as string[][])
    .slice(1)
    .filter(row => row.some(Boolean))
    .map(row => Object.fromEntries(header.map((key, i) => [key, row[i] || ''])) as BlogPost)
    .filter(p => p.status === 'archived')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function savePost(input: Partial<BlogPost>) {
  const { sheets, spreadsheetId } = await ensureSheet();
  const result = await sheets.spreadsheets.values.get({
    spreadsheetId, range: `${sheetTitle}!${COLS}`,
  });
  const rows = (result.data.values || []) as string[][];
  const id = clean(input.id) || `post-${Date.now()}`;
  const existingRow = rows.find((row, i) => i > 0 && row[0] === id);
  const title = clean(input.title) || existingRow?.[4] || '';
  // Custom slug (sanitised) wins; otherwise keep/upgrade to a title-based slug
  const slug = clean(input.slug)
    ? slugifyTitle(clean(input.slug)) || id
    : prettySlug(existingRow?.[2] || '', title, id);
  const updatedAt = new Date().toISOString();
  const existingIndex = rows.findIndex((row, i) => i > 0 && row[0] === id);
  const existing = existingIndex > 0 ? rows[existingIndex] : [];

  const row = [
    id,
    clean(input.status) || existing[1] || 'published',
    slug,
    clean(input.tag) || existing[3] || '',
    clean(input.title) || existing[4] || '',
    clean(input.excerpt) || existing[5] || '',
    clean(input.body) || existing[6] || '',
    clean(input.image) || existing[7] || '',
    clean(input.date) || existing[8] || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    clean(input.readTime) || existing[9] || '3 min read',
    updatedAt,
    clean(input.video) || existing[11] || '',
    input.gallery !== undefined ? clean(input.gallery) : (existing[12] || ''),
    clean(input.branch).toLowerCase() || existing[13] || '',
  ];

  if (existingIndex > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId, range: `${sheetTitle}!A${existingIndex + 1}:N${existingIndex + 1}`,
      valueInputOption: 'RAW', requestBody: { values: [row] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId, range: `${sheetTitle}!${COLS}`,
      valueInputOption: 'RAW', requestBody: { values: [row] },
    });
  }

  // Auto-submit newly published/updated posts to IndexNow so they get indexed
  // without a manual ping. Submit the article, its markdown twin, and the blog
  // index (its listing changed). Drafts/archived posts are skipped.
  if (row[1] === 'published') {
    const url = `${SITE}/${encodeURIComponent(slug)}`;
    await pingIndexNow([url, `${url}.md`, `${SITE}/blog`]);
  }

  return row;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password, x-admin-email');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      // Recently-deleted view for restoring accidental deletions (admins only)
      if (req.query.trash === '1') {
        const ctx = await getUserContext(req);
        if (!ctx || (ctx.role !== 'super_admin' && ctx.role !== 'admin')) {
          return res.status(403).json({ error: 'Super admin access required' });
        }
        return res.status(200).json({ posts: await readArchivedPosts() });
      }
      const posts = await readPosts();
      const ctx = await getUserContext(req);
      if (!ctx) return res.status(200).json({ posts: posts.filter(p => p.status === 'published') });
      // Branch Blog Editors only see posts for the branch(es) they're assigned
      if (ctx.role === 'branch_blog_editor' && !ctx.branches.includes('all')) {
        return res.status(200).json({
          posts: posts.filter(p => !p.branch || ctx.branches.includes(p.branch.toLowerCase())),
        });
      }
      return res.status(200).json({ posts });
    }
    if (req.method === 'POST') {
      const ctx = await getUserContext(req);
      if (!ctx || !canManageBlog(ctx.role)) return res.status(403).json({ error: 'Blog access required' });
      const payload = req.body || {};
      if (!clean(payload.title) && clean(payload.status) !== 'archived') {
        return res.status(400).json({ error: 'Title is required' });
      }

      // Branch Blog Editors are scoped to their assigned branch(es)
      if (ctx.role === 'branch_blog_editor' && !ctx.branches.includes('all')) {
        // The post must be tagged with one of their branches
        const postBranch = clean(payload.branch).toLowerCase();
        if (clean(payload.status) !== 'archived' && (!postBranch || !ctx.branches.includes(postBranch))) {
          return res.status(403).json({ error: 'Please choose one of your assigned branches for this post.' });
        }
        // They can't edit or delete a post that belongs to another branch
        if (clean(payload.id)) {
          const existing = (await readPosts()).find(p => p.id === clean(payload.id));
          if (existing && existing.branch && !ctx.branches.includes(existing.branch.toLowerCase())) {
            return res.status(403).json({ error: 'This post belongs to another branch.' });
          }
        }
      }

      await savePost(payload);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Blog API error', error);
    return res.status(500).json({ error: 'Blog API failed' });
  }
}
