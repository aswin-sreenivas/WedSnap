import { authenticateRequest } from '../../../server/lib/firebaseServer';
import {
  applyCorsAndApiHeaders,
  checkRateLimit,
  getCanonicalOrigin,
  readJsonBody,
} from '../../../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../../../server/lib/vercelTypes';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!applyCorsAndApiHeaders(req, res, 'POST, OPTIONS')) return;
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }
  if (!checkRateLimit(req, res, 'drive-oauth-cb', 20, 60 * 1000)) return;

  const caller = await authenticateRequest(req, res);
  if (!caller) return;

  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const redirectUri =
    (process.env.GOOGLE_REDIRECT_URI || '').trim() ||
    `${getCanonicalOrigin(req)}/admin/oauth/callback`;

  if (!clientId || !clientSecret) {
    sendJson(res, 501, { error: 'Server-side Google OAuth credentials are not configured.' });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req, 16 * 1024);
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON payload.' });
    return;
  }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!code) {
    sendJson(res, 400, { error: 'Authorization code is required.' });
    return;
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });
    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      expires_in?: number;
      scope?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenRes.ok || !tokenData.access_token) {
      sendJson(res, 400, {
        error: tokenData.error_description || tokenData.error || 'OAuth code exchange failed.',
      });
      return;
    }

    // Never return refresh_token to the browser; only return short-lived session access token
    sendJson(res, 200, {
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in || 3600,
      scope: tokenData.scope || 'https://www.googleapis.com/auth/drive.readonly',
    });
  } catch (err) {
    console.error('Google OAuth code exchange error:', err);
    sendJson(res, 502, { error: 'Failed to exchange Google OAuth code.' });
  }
}
