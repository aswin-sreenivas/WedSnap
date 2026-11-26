import crypto from 'crypto';
import { saveContactInquiryToFirestore } from '../server/lib/firebaseServer';
import { applyCorsAndApiHeaders, checkRateLimit, readJsonBody } from '../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../server/lib/vercelTypes';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!applyCorsAndApiHeaders(req, res, 'POST, OPTIONS')) return;
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }
  if (!checkRateLimit(req, res, 'contact', 10, 10 * 60 * 1000)) return;

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req, 64 * 1024);
  } catch {
    sendJson(res, 400, { error: 'Invalid request body.' });
    return;
  }

  const { name, email, role, message } = body;
  const cleanName = typeof name === 'string' ? name.trim().slice(0, 100) : '';
  const cleanEmail = typeof email === 'string' ? email.trim().slice(0, 254) : '';
  const cleanRole = typeof role === 'string' ? role.trim().slice(0, 80) : 'General Inquiry';
  const cleanMessage = typeof message === 'string' ? message.trim().slice(0, 2000) : '';

  if (
    cleanName.length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
    cleanMessage.length < 10
  ) {
    sendJson(res, 400, {
      error: 'Please enter your name, a valid email address, and a message of at least 10 characters.',
    });
    return;
  }

  const id = `inq_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
  try {
    await saveContactInquiryToFirestore({
      id,
      name: cleanName,
      email: cleanEmail,
      role: cleanRole,
      message: cleanMessage,
    });
    sendJson(res, 201, { submitted: true, id });
  } catch (err) {
    console.error('Contact inquiry Firestore save error:', err);
    sendJson(res, 500, { error: 'Unable to record your inquiry right now.' });
  }
}
