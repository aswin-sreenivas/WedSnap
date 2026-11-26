import crypto from 'crypto';
import {
  handleCacheDrivePhoto,
  handleDriveFileProxy,
  handleListDriveFolderPhotos,
  handleListDriveFolders,
} from '../server/lib/driveHandlers';
import { authenticateRequest } from '../server/lib/firebaseServer';
import {
  applyCorsAndApiHeaders,
  checkRateLimit,
  getCanonicalOrigin,
  getQueryStringParam,
  readJsonBody,
} from '../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../server/lib/vercelTypes';

function resolveDriveAction(req: ApiRequest): string {
  const explicit = getQueryStringParam(req, 'action').trim();
  if (explicit) return explicit;
  const reqPath = (req.url || '').split('?')[0];
  if (reqPath === '/api/drive/oauth/url') return 'oauth-url';
  if (reqPath === '/api/drive/oauth/callback') return 'oauth-callback';
  if (reqPath === '/api/drive/folders') return 'folders';
  if (/^\/api\/drive\/folders\/[^/]+\/photos$/.test(reqPath)) return 'folder-photos';
  if (reqPath === '/api/drive/cache-photo') return 'cache-photo';
  if (/^\/api\/drive\/files\/[^/]+$/.test(reqPath)) return 'file';
  return '';
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const action = resolveDriveAction(req);
  const reqPath = (req.url || '').split('?')[0];

  if (action === 'oauth-url') {
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
    return;
  }

  if (action === 'oauth-callback') {
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

      sendJson(res, 200, {
        accessToken: tokenData.access_token,
        expiresIn: tokenData.expires_in || 3600,
        scope: tokenData.scope || 'https://www.googleapis.com/auth/drive.readonly',
      });
      return;
    } catch (err) {
      console.error('Google OAuth code exchange error:', err);
      sendJson(res, 502, { error: 'Failed to exchange Google OAuth code.' });
      return;
    }
  }

  if (action === 'folders') {
    if (!applyCorsAndApiHeaders(req, res, 'GET, OPTIONS')) return;
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }
    if (!checkRateLimit(req, res, 'drive-folders', 120, 60 * 1000)) return;
    const caller = await authenticateRequest(req, res);
    if (!caller) return;

    await handleListDriveFolders(req, res);
    return;
  }

  if (action === 'folder-photos') {
    if (!applyCorsAndApiHeaders(req, res, 'GET, OPTIONS')) return;
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }
    if (!checkRateLimit(req, res, 'drive-folder-photos', 120, 60 * 1000)) return;
    const caller = await authenticateRequest(req, res);
    if (!caller) return;

    const folderMatch = reqPath.match(/^\/api\/drive\/folders\/([^/]+)\/photos$/);
    const folderId =
      req.params?.folderId ||
      getQueryStringParam(req, 'folderId') ||
      (folderMatch ? decodeURIComponent(folderMatch[1]) : '');
    await handleListDriveFolderPhotos(req, res, folderId);
    return;
  }

  if (action === 'cache-photo') {
    if (!applyCorsAndApiHeaders(req, res, 'POST, OPTIONS')) return;
    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }
    if (!checkRateLimit(req, res, 'drive-cache', 120, 60 * 1000)) return;
    const caller = await authenticateRequest(req, res);
    if (!caller) return;

    await handleCacheDrivePhoto(req, res, {
      idToken: caller.idToken,
      uid: caller.decoded.uid,
      email: caller.decoded.email,
    });
    return;
  }

  if (action === 'file') {
    if (!applyCorsAndApiHeaders(req, res, 'GET, OPTIONS')) return;
    if (req.method !== 'GET') {
      sendJson(res, 405, { error: 'Method not allowed.' });
      return;
    }
    if (!checkRateLimit(req, res, 'drive-file-proxy', 120, 60 * 1000)) return;
    const caller = await authenticateRequest(req, res);
    if (!caller) return;

    const fileMatch = reqPath.match(/^\/api\/drive\/files\/([^/]+)$/);
    const fileId =
      req.params?.fileId ||
      getQueryStringParam(req, 'fileId') ||
      (fileMatch ? decodeURIComponent(fileMatch[1]) : '');
    await handleDriveFileProxy(req, res, fileId);
    return;
  }

  sendJson(res, 404, { error: 'Google Drive endpoint not found.' });
}
