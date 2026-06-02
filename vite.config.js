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
    target: ['es2022', 'chrome100', 'firefox100', 'safari15'],
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
          'ui-vendor': ['lucide-react'],
          'i18n-vendor': ['i18next', 'react-i18next'],
        }
      }
    },
    chunkSizeWarningLimit: 1500
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react']
  }
});
