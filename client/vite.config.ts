import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const SERVER_URL = process.env.VITE_SERVER_URL ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': SERVER_URL,
      '/socket.io': {
        target: SERVER_URL,
        ws: true,
      },
    },
  },
});
