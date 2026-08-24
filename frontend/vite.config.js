import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Lets the dev server accept requests coming through a tunnel
    // (e.g. ngrok) instead of rejecting them as an "unknown host".
    // Has no effect on normal http://localhost:5173 usage.
    allowedHosts: true,
  },
});
