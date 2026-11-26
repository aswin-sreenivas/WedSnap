import express, { Request, Response } from 'express';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import healthHandler from './api/health';
import contactHandler from './api/contact';
import eventsHandler from './api/events';
import driveHandler from './api/drive';
import mediaHandler from './api/media';
import seoHandler from './api/seo';
import { getCanonicalOrigin } from './server/lib/security';
import { buildRouteHtml, loadProductionSsrTemplate } from './server/lib/ssrHtml';
import type { ApiRequest, ApiResponse } from './server/lib/vercelTypes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODELS_DIR = path.resolve(__dirname, 'node_modules', '@vladmandic', 'face-api', 'model');
const DIST_DIR = path.resolve(__dirname, 'dist');
const PUBLIC_DIR = path.resolve(__dirname, 'public');
const PORT = Number(process.env.PORT) || 3000;

function adapt(
  fn: (req: ApiRequest, res: ApiResponse) => void | Promise<void>
) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req as unknown as ApiRequest, res as unknown as ApiResponse);
    } catch (err) {
      console.error('Unhandled route error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error.' });
      }
    }
  };
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.use(compression());
  app.use(express.json({ limit: '20mb' }));

  // Security headers across all routes (mirrored in vercel.json)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=()');
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://apis.google.com https://accounts.google.com https://www.gstatic.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https:",
        "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://firebasestorage.googleapis.com https://*.firebasestorage.app https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.google-analytics.com https://analytics.google.com wss:",
        "frame-src 'self' https://accounts.google.com https://*.firebaseapp.com",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    );
    next();
  });

  // 301 trailing-slash canonicalization for non-root page URLs (prevents duplicate URLs)
  app.use((req, res, next) => {
    if (
      req.method === 'GET' &&
      req.path.length > 1 &&
      req.path.endsWith('/') &&
      !req.path.startsWith('/api/')
    ) {
      const normalized = req.path.replace(/\/+$/, '');
      const qs = req.originalUrl.includes('?')
        ? req.originalUrl.slice(req.originalUrl.indexOf('?'))
        : '';
      res.redirect(301, `${normalized}${qs}`);
      return;
    }
    next();
  });

  // Serverless-parity API routes (identical handlers deployed on Vercel under /api/*.ts)
  app.all('/api/health', adapt(healthHandler));
  app.all('/api/contact', adapt(contactHandler));
  app.all('/api/public/events', adapt(eventsHandler));
  app.all('/api/public/events/revalidate', adapt(eventsHandler));

  app.all('/api/drive/folders', adapt(driveHandler));
  app.all('/api/drive/folders/:folderId/photos', adapt(driveHandler));
  app.all('/api/drive/cache-photo', adapt(driveHandler));
  app.all('/api/drive/files/:fileId', adapt(driveHandler));
  app.all('/api/drive/oauth/url', adapt(driveHandler));
  app.all('/api/drive/oauth/callback', adapt(driveHandler));

  app.all('/api/media/upload-photo', adapt(mediaHandler));
  app.all('/api/media/events/:eventId/session-token', adapt(mediaHandler));
  app.all('/api/media/events/:eventId', adapt(mediaHandler));
  app.all('/api/media/events/:eventId/photos/:photoId', adapt(mediaHandler));

  app.all('/api/events/:slug/match', adapt(eventsHandler));
  app.all('/api/jobs/process-pending', adapt(eventsHandler));

  // Explicit 404 for unknown /api/* endpoints (never return SPA HTML 200)
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  app.get('/robots.txt', adapt(seoHandler));
  app.get('/sitemap.xml', adapt(seoHandler));

  if (fs.existsSync(MODELS_DIR)) {
    app.use('/models', express.static(MODELS_DIR, { maxAge: '7d', immutable: true }));
  }

  if (fs.existsSync(PUBLIC_DIR)) {
    app.use(express.static(PUBLIC_DIR, { maxAge: '1d' }));
  }

  // SSR-aware HTML handler + Vite dev middleware or static dist serving
  const isProduction = process.env.NODE_ENV === 'production' && fs.existsSync(DIST_DIR);
  let vite: ViteDevServer | null = null;

  if (isProduction) {
    app.use(express.static(DIST_DIR, { index: false, maxAge: '7d' }));
    const { templateHtml, heroPreloadUrl } = loadProductionSsrTemplate();
    app.get('*', async (req, res) => {
      try {
        const origin = getCanonicalOrigin(req as unknown as ApiRequest);
        const { html, statusCode } = await buildRouteHtml(templateHtml, req.path, origin, {
          heroPreloadUrl,
        });
        res.status(statusCode).setHeader('Content-Type', 'text/html; charset=utf-8').send(html);
      } catch (err) {
        console.error('SSR HTML build error (prod):', err);
        res.status(500).sendFile(path.resolve(DIST_DIR, 'index.html'));
      }
    });
  } else {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      try {
        const origin = getCanonicalOrigin(req as unknown as ApiRequest);
        const rawTemplate = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        const { html: routeHtml, statusCode } = await buildRouteHtml(rawTemplate, req.path, origin);
        const transformed = await vite!.transformIndexHtml(req.originalUrl, routeHtml);
        res.status(statusCode).setHeader('Content-Type', 'text/html; charset=utf-8').send(transformed);
      } catch (err) {
        vite?.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`WedSnap server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start WedSnap server:', err);
  process.exit(1);
});
