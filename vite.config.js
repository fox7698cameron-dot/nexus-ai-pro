// vite.config.js — 2026-06-12 | Nexus AI Pro
// Copyright © 2025-2026 Cameron Fox. All rights reserved.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true, secure: false },
      '/socket.io': { target: 'http://localhost:3001', ws: true, changeOrigin: true }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser',
    terserOptions: { compress: { drop_console: true, drop_debugger: true } },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ai-vendor': ['@anthropic-ai/sdk', 'openai'],
          'charts': ['recharts'],
          'ui-vendor': ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1200
  },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.js', 'server.js'],
      exclude: ['src/**/*.test.js', 'node_modules']
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'recharts']
  }
});
