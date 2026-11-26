import crypto from 'crypto';
import type { ApiRequest, ApiResponse } from './vercelTypes';
import { sendJson } from './vercelTypes';

export const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const EXT_TO_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export function isSafeId(val: unknown): val is string {
  return typeof val === 'string' && SAFE_ID_REGEX.test(val);
}

export function getHeaderValue(req: ApiRequest, name: string): string {
  if (typeof req.get === 'function') {
    return req.get(name) || '';
  }
  const raw = req.headers[name.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] || '';
  return raw || '';
}

export function getCanonicalOrigin(req: ApiRequest): string {
  const envUrl = (process.env.APP_URL || '').trim();
  if (envUrl && envUrl !== 'MY_APP_URL' && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/+$/, '');
  }
  const vercelProd = (process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim();
  if (vercelProd && process.env.VERCEL_ENV === 'production') {
    return `https://${vercelProd}`.replace(/\/+$/, '');
  }
  const vercelUrl = (process.env.VERCEL_URL || '').trim();
  if (vercelUrl && process.env.VERCEL === '1') {
    return `https://${vercelUrl}`.replace(/\/+$/, '');
  }
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto =
    typeof protoHeader === 'string' && protoHeader.split(',')[0].trim()
      ? protoHeader.split(',')[0].trim()
      : req.protocol || 'http';
  const port = Number(process.env.PORT) || 3000;
  const host = getHeaderValue(req, 'host') || `localhost:${port}`;
  return `${proto}://${host}`.replace(/\/+$/, '');
}

export function applyCorsAndApiHeaders(
  req: ApiRequest,
  res: ApiResponse,
  methods = 'GET, POST, DELETE, OPTIONS'
): boolean {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const reqOrigin = req.headers.origin;
  if (reqOrigin) {
    const port = Number(process.env.PORT) || 3000;
    const host = getHeaderValue(req, 'host');
    const envUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
    const vercelProd = (process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim();
    const vercelUrl = (process.env.VERCEL_URL || '').trim();

    const allowed = new Set<string>([
      `http://localhost:${port}`,
      `http://127.0.0.1:${port}`,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
    if (host) {
      allowed.add(`https://${host}`);
      allowed.add(`http://${host}`);
    }
    if (envUrl && envUrl !== 'MY_APP_URL') {
      allowed.add(envUrl);
    }
    if (vercelProd) allowed.add(`https://${vercelProd}`);
    if (vercelUrl) allowed.add(`https://${vercelUrl}`);

    if (!allowed.has(reqOrigin)) {
      sendJson(res, 403, { error: 'Origin not allowed.' });
      return false;
    }

    res.setHeader('Access-Control-Allow-Origin', reqOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Drive-Access-Token, X-Worker-Secret');
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return false;
  }

  return true;
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  req: ApiRequest,
  res: ApiResponse,
  bucketPrefix: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const fwd = req.headers['x-forwarded-for'];
  const ip =
    (typeof fwd === 'string' ? fwd.split(',')[0].trim() : Array.isArray(fwd) ? fwd[0] : req.ip) ||
    req.socket?.remoteAddress ||
    'unknown';
  const key = `${bucketPrefix}:${ip}`;
  const now = Date.now();
  const existing = rateBuckets.get(key);
  if (!existing || now > existing.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= maxRequests) {
    sendJson(res, 429, { error: 'Too many requests. Please try again shortly.' });
    return false;
  }
  existing.count += 1;
  return true;
}

export async function readJsonBody<T = Record<string, unknown>>(
  req: ApiRequest,
  maxBytes = 20 * 1024 * 1024
): Promise<T> {
  if (req.body && typeof req.body === 'object') {
    return req.body as T;
  }
  if (typeof req.body === 'string') {
    return JSON.parse(req.body || '{}') as T;
  }

  return new Promise<T>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({} as T);
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')) as T);
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

// Media HMAC signing secret (persistent across serverless cold starts when MEDIA_SIGNING_SECRET is set)
const FALLBACK_KEY = crypto.createHash('sha256').update(process.env.APP_URL || 'wedsnap-dev-ephemeral').digest();

function getSigningKey(): Buffer {
  const secret = (process.env.MEDIA_SIGNING_SECRET || '').trim();
  if (secret) {
    return Buffer.from(secret, 'utf-8');
  }
  return FALLBACK_KEY;
}

export function signEventMediaToken(eventId: string, ttlSeconds = 7200): { exp: number; sig: string } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = crypto
    .createHmac('sha256', getSigningKey())
    .update(`${eventId}:${exp}`)
    .digest('hex');
  return { exp, sig };
}

export function verifyEventMediaToken(eventId: string, expRaw: unknown, sigRaw: unknown): boolean {
  if (typeof expRaw !== 'string' || typeof sigRaw !== 'string') return false;
  const exp = Number.parseInt(expRaw, 10);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;

  const expected = crypto
    .createHmac('sha256', getSigningKey())
    .update(`${eventId}:${exp}`)
    .digest('hex');

  if (sigRaw.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(sigRaw, 'utf-8'), Buffer.from(expected, 'utf-8'));
  } catch {
    return false;
  }
}

export function getQueryStringParam(req: ApiRequest, key: string): string {
  const raw = req.query?.[key];
  if (Array.isArray(raw)) return raw[0] || '';
  if (typeof raw === 'string') return raw;
  return '';
}
