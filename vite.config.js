import { defineConfig } from 'vite';

// base './' keeps every asset URL relative, so the build works from any
// sub-path (Netlify, S3, Webflow-hosted iframe) without reconfiguration.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
        },
      },
    },
  },
  server: { host: true },
});
