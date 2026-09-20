import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createRequire } from 'module';
import {defineConfig, Plugin} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const require = createRequire(import.meta.url);
const pkg = require('./package.json');

function preloadEpilogueFont(): Plugin {
  return {
    name: 'preload-epilogue-font',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return;
        const fontFile = Object.keys(ctx.bundle).find(
          (file) => file.includes('epilogue-latin-wght-normal') && file.endsWith('.woff2')
        );
        if (!fontFile) return;
        return [
          {
            tag: 'link',
            attrs: {
              rel: 'preload',
              href: `/${fontFile}`,
              as: 'font',
              type: 'font/woff2',
              crossorigin: '',
            },
            injectTo: 'head-prepend',
          },
        ];
      },
    },
  };
}

export default defineConfig(() => {
  return {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [
      react(), 
      tailwindcss(),
      preloadEpilogueFont(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          globIgnores: ['**/vendor-pdf*.js', '**/vendor-charts*.js', '**/html2canvas*.js'],
          runtimeCaching: [
            {
              urlPattern: ({ url }) => /vendor-(pdf|charts)|html2canvas/.test(url.pathname),
              handler: 'CacheFirst',
              options: {
                cacheName: 'heavy-chunks-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
          ],
        },
        manifest: {
          name: 'Work Tracker Pro',
          short_name: 'Work Pro',
          theme_color: '#1a1a1a',
          background_color: '#f4f1ea',
          display: 'standalone',
          orientation: 'portrait',
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
          ]
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-motion': ['motion'],
            'vendor-charts': ['recharts'],
            'vendor-pdf': ['jspdf', 'jspdf-autotable']
          }
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      fs: {
        allow: [path.resolve(__dirname, '..')],
      },
    },
  };
});
