import type { VercelRequest, VercelResponse } from '@vercel/node';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';

// Routed through /api/careers to stay within Vercel Hobby's function limit.

const MAX_RESUME_BYTES = 4 * 1024 * 1024;
const TOKEN_WINDOW_MS = 60 * 60 * 1000;
const MAX_TOKENS_PER_WINDOW = 10;
const tokenRequests = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: VercelRequest) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown')
    .split(',')[0]
    .trim();
}

function allowToken(req: VercelRequest) {
  const key = clientIp(req);
  const now = Date.now();
  const previous = tokenRequests.get(key);
  const current = !previous || previous.resetAt <= now
    ? { count: 0, resetAt: now + TOKEN_WINDOW_MS }
    : previous;
  if (current.count >= MAX_TOKENS_PER_WINDOW) return false;
  tokenRequests.set(key, { ...current, count: current.count + 1 });
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Resume storage is not configured' });
  }

  try {
    const body = req.body as HandleUploadBody;
    if (body?.type === 'blob.generate-client-token' && !allowToken(req)) {
      return res.status(429).json({ error: 'Too many upload attempts. Please try again later.' });
    }

    const result = await handleUpload({
      request: req,
      body,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async pathname => {
        if (!/^career-resumes\/[a-zA-Z0-9._-]+\.pdf$/i.test(pathname)) {
          throw new Error('Only PDF resumes are allowed');
        }
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: MAX_RESUME_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + 10 * 60 * 1000,
          cacheControlMaxAge: 60,
        };
      },
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Career resume upload failed', error);
    const message = error instanceof Error ? error.message : 'Resume upload failed';
    return res.status(400).json({ error: message });
  }
}
