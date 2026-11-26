import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      // Copies src/assets & face-api models into dist/, and emits SSR template metadata
      // into server/generated/ so Vercel serverless SSR matches the exact Vite hashed assets.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(__dirname, 'dist');
          const srcAssets = path.resolve(__dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
          const faceModelsSrc = path.resolve(__dirname, 'node_modules/@vladmandic/face-api/model');
          const faceModelsDist = path.resolve(distDir, 'models');
          if (fs.existsSync(distDir) && fs.existsSync(faceModelsSrc)) {
            fs.cpSync(faceModelsSrc, faceModelsDist, {recursive: true, force: true});
          }

          const distIndex = path.resolve(distDir, 'index.html');
          if (fs.existsSync(distIndex)) {
            const generatedDir = path.resolve(__dirname, 'server/generated');
            fs.mkdirSync(generatedDir, {recursive: true});
            const templateHtml = fs.readFileSync(distIndex, 'utf-8');
            fs.writeFileSync(path.resolve(generatedDir, 'index.html'), templateHtml, 'utf-8');

            let heroPreloadUrl = '/src/assets/images/hero_wedding_couple_1795725465123.jpg';
            const assetsDir = path.resolve(distDir, 'assets');
            if (fs.existsSync(assetsDir)) {
              const heroAsset = fs
                .readdirSync(assetsDir)
                .find((f) => f.startsWith('hero_wedding_couple_1795725465123-') && /\.(jpg|jpeg|webp)$/i.test(f));
              if (heroAsset) {
                heroPreloadUrl = `/assets/${heroAsset}`;
              }
            }
            fs.writeFileSync(
              path.resolve(generatedDir, 'ssr-manifest.json'),
              JSON.stringify({heroPreloadUrl}, null, 2),
              'utf-8',
            );

            // On Vercel builds, remove dist/index.html so CDN serves "/" via /api/ssr rewrite
            if (process.env.VERCEL === '1') {
              fs.rmSync(distIndex, {force: true});
            }
          }
        },
      },
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/react-router/')
            ) {
              return 'react-vendor';
            }
            if (id.includes('node_modules/firebase/') || id.includes('node_modules/@firebase/')) {
              return 'firebase-vendor';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
