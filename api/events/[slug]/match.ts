import { matchEventFacesServerSide } from '../../../server/lib/firebaseServer';
import {
  applyCorsAndApiHeaders,
  checkRateLimit,
  getQueryStringParam,
  readJsonBody,
} from '../../../server/lib/security';
import { ApiRequest, ApiResponse, sendJson } from '../../../server/lib/vercelTypes';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (!applyCorsAndApiHeaders(req, res, 'POST, OPTIONS')) return;
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed.' });
    return;
  }
  if (!checkRateLimit(req, res, 'guest-face-match', 60, 60 * 1000)) return;

  const slug = (req.params?.slug || getQueryStringParam(req, 'slug')).trim().toLowerCase();
  if (!slug || !/^[a-z0-9-]{3,80}$/.test(slug)) {
    sendJson(res, 400, { error: 'Invalid event gallery identifier.' });
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req, 32 * 1024);
  } catch {
    sendJson(res, 400, { error: 'Invalid face match payload.' });
    return;
  }

  const rawEmbedding = body.embedding;
  if (
    !Array.isArray(rawEmbedding) ||
    rawEmbedding.length !== 128 ||
    !rawEmbedding.every((n) => typeof n === 'number' && Number.isFinite(n))
  ) {
    sendJson(res, 400, { error: 'Expected a valid 128-dimensional face embedding vector.' });
    return;
  }

  try {
    // Compare in ephemeral memory without storing the guest embedding or returning stored event embeddings
    const result = await matchEventFacesServerSide(slug, rawEmbedding as number[]);
    rawEmbedding.fill(0);

    if (!result) {
      sendJson(res, 404, { error: 'Published wedding gallery not found.' });
      return;
    }

    res.setHeader('Cache-Control', 'no-store');
    sendJson(res, 200, result);
  } catch (err) {
    console.error('Server-side face match error:', err);
    sendJson(res, 500, { error: 'Unable to match faces right now.' });
  }
}
