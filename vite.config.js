import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Use the repository's absolute Pages path so invitations can never resolve
  // assets against waizyk.github.io root or another Pages project.
  base: '/Raees-weds-Alisha/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Stable names prevent a cached page from requesting deleted hashed
        // assets for a few minutes immediately after a new deployment.
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: assetInfo => {
          const name = assetInfo.names?.[0] || assetInfo.name || 'asset';
          return name.endsWith('.css') ? 'assets/style.css' : 'assets/[name][extname]';
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
