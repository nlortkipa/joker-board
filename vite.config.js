import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createApi } from './server/api.mjs';

// In development the JSON API runs inside the Vite dev server,
// so `npm run dev` is all you need.
const devApi = () => ({
  name: 'joker-dev-api',
  configureServer(server) {
    const api = createApi({ dataDir: process.env.DATA_DIR || 'data' });
    server.middlewares.use(api);
  },
});

export default defineConfig({
  plugins: [react(), devApi()],
  server: { host: true },
  preview: { host: true },
});
