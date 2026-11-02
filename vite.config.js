import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Absolute site address for the link preview tags in index.html. Set SITE_URL (for example
// https://unlag.app) or let Vercel provide its production domain.
const siteUrl = (process.env.SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
).replace(/\/$/, '');

export default defineConfig({
  plugins: [
    react(),
    { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl) },
  ],
  base: '/',
});
