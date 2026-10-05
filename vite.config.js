import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Crucial for GitHub Pages subpath hosting
  server: {
    host: true,
    strictPort: false,
    cors: true,
    allowedHosts: true
  },
  preview: {
    host: true,
    strictPort: false,
    cors: true,
    allowedHosts: true
  }
});
