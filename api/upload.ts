import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { isAuthenticated } from './_utils.js';

// Receive the raw file bytes ourselves (no body parsing) so we can stream them
// straight into Blob storage.
export const config = {
  api: { bodyParser: false },
};

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'];
// Vercel rejects request bodies over ~4.5 MB before the function even runs,
// so advertising more than that would be a lie.
const MAX_BYTES = 4.4 * 1024 * 1024;

function safeName(name: string) {
  const cleaned = (name || 'upload').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(-80);
  return cleaned || 'upload';
}

async function readBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    const total = chunks.reduce((n, c) => n + c.length, 0);
    if (total > MAX_BYTES) throw new Error('TOO_LARGE');
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password, x-admin-email, x-filename');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!await isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'Image storage is not configured' });
  }

  const contentType = (req.headers['content-type'] || 'application/octet-stream').split(';')[0].trim();
  if (!ALLOWED.includes(contentType)) {
    return res.status(400).json({ error: 'Only image files are allowed (jpg, png, webp, gif, svg, avif)' });
  }

  try {
    const buffer = await readBody(req);
    if (!buffer.length) return res.status(400).json({ error: 'Empty file' });

    const filename = safeName((req.headers['x-filename'] as string) || 'image');
    const blob = await put(`uploads/${filename}`, buffer, {
      access: 'public',
      addRandomSuffix: true,
      contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return res.status(200).json({ url: blob.url });
  } catch (error) {
    if (error instanceof Error && error.message === 'TOO_LARGE') {
      return res.status(413).json({ error: 'Image is too large (max 4 MB)' });
    }
    console.error('Upload failed', error);
    return res.status(500).json({ error: 'Upload failed' });
  }
}
