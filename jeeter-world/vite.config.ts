import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset and content URLs relative so the build runs from any
// sub-path on static hosting.
export default defineConfig({
  base: './',
  plugins: [react()],
  // stats-gl (via drei) pins its own three; one copy only.
  resolve: { dedupe: ['three'] },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2500,
  },
  server: { host: true },
});
