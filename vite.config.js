/**
 * Copyright © 2025-2026 Cameron Fox. All rights reserved.
 * Licensed under the Apache License, Version 2.0
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react()
    // VitePWA disabled due to workbox generation error
    // Re-enable once workbox-build is fixed
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ai-vendor': ['@anthropic-ai/sdk', 'openai'],
          'ui-vendor': ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react']
  },
  // Ensure emoji & Unicode pass through correctly
  esbuild: {
    charset: 'utf8',
  },
  define: {
    // Prevent process.env leaking — env vars accessed via import.meta.env only
    'process.env.VITE_STRIPE_PRO_PRICE_ID': JSON.stringify(''),
    'process.env.VITE_STRIPE_ENT_PRICE_ID': JSON.stringify(''),
  }
});
