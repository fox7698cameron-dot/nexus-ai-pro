/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Nexus AI Pro v3.0.0 — Vite configuration
 * Supports: Node.js (:3001), Python FastAPI (:8000), Bun (:3002) backends
 * Select backend: VITE_API_PORT=8000 npm run dev:python
 */

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = parseInt(env.VITE_API_PORT || '3001', 10);
  const apiTarget = `http://localhost:${apiPort}`;
  const isProd = mode === 'production';

  return {
    plugins: [react()],

    resolve: {
      alias: { '@': path.resolve('.', 'src') },
      // Vite natively handles .ts/.tsx via esbuild — no extra plugin needed
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },

    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true, secure: false },
        '/socket.io': { target: apiTarget, changeOrigin: true, ws: true },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: !isProd,
      minify: isProd ? 'terser' : false,
      target: ['es2022', 'chrome100', 'firefox100', 'safari15'],
      terserOptions: isProd ? {
        compress: { drop_console: true, drop_debugger: true, passes: 2 },
      } : undefined,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ai-vendor':    ['@anthropic-ai/sdk', 'openai'],
            'ui-vendor':    ['lucide-react'],
          },
        },
      },
      chunkSizeWarningLimit: 1500,
    },

    optimizeDeps: {
      include: ['react', 'react-dom', 'lucide-react'],
    },

    define: {
      __APP_VERSION__: JSON.stringify('3.0.0'),
      __API_PORT__:    JSON.stringify(apiPort),
      __BUILD_TIME__:  JSON.stringify(new Date().toISOString()),
    },

    esbuild: {
      target: 'es2022',
      jsx: 'automatic',
      jsxImportSource: 'react',
    },

    preview: {
      port: 4173,
      host: true,
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
  };
});
