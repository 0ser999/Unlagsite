import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import seo from './seo.plugin.js';

// Absolute site address for the link preview tags in index.html. Set SITE_URL (for example
// https://unlag.app) or let Vercel / Netlify provide the production domain.
// Discord and WhatsApp ignore a relative og:image, so the preview image only shows with a full URL.
const siteUrl = (process.env.SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
  || process.env.URL // Netlify: the site's main address
  || ''
).replace(/\/$/, '');
if (!siteUrl) {
  console.warn('\n[site-url] SITE_URL is not set: og:image is relative, so Discord and WhatsApp show no image.\n');
}

export default defineConfig({
  plugins: [
    react(),
    seo(),
    { name: 'site-url', transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl) },
  ],
  base: '/',
});
