import crypto from 'crypto';
import { authenticateRequest } from '../../../server/lib/firebaseServer';
import { applyCorsAndApiHeaders, checkRateLimit, getCanonicalOrigin } from '../../../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../../../server/lib/vercelTypes';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!applyCorsAndApiHeaders(req, res, 'GET, OPTIONS')) return;
  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }
  if (!checkRateLimit(req, res, 'drive-oauth-url', 30, 60 * 1000)) return;

  const caller = await authenticateRequest(req, res);
  if (!caller) return;

  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const redirectUri =
    (process.env.GOOGLE_REDIRECT_URI || '').trim() ||
    `${getCanonicalOrigin(req)}/admin/oauth/callback`;

  if (!clientId) {
    sendJson(res, 501, {
      configured: false,
      error:
        'Server-side Google OAuth is not configured (GOOGLE_CLIENT_ID missing). Standard Firebase Google Drive sign-in remains active.',
    });
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent select_account',
    state,
  });

  sendJson(res, 200, {
    configured: true,
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    state,
  });
}
