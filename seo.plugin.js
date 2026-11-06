// Build-time SEO: the site is a React SPA, so without this every URL ships an empty <div id="root">.
// Search engines that skip JavaScript and AI crawlers (GPTBot, ClaudeBot, PerplexityBot...) never run
// JS, so they saw a blank page. After the build this plugin writes, for each public route:
//   dist/<route>.html  with its own title, description, canonical, JSON-LD and the page text in #root
// (React's createRoot replaces that markup on load, so visitors see exactly the same app as before),
// plus robots.txt, sitemap.xml and llms.txt. vercel.json `cleanUrls` serves /features from features.html.
import fs from 'node:fs';
import path from 'node:path';
import en from './src/i18n/en.js';
import { VERSION, PRICES, CATEGORIES, TOTAL_TWEAKS, PLAN_TWEAKS, DOWNLOAD_URL, BLOATWARE } from './src/data.js';

const SITE = 'https://www.unlag.pro';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fill = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const list = (items) => `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

const NAV = `<nav aria-label="Main"><a href="/">Unlag</a> · <a href="/features">${en.nav.features}</a> · <a href="/how-it-works">${en.nav.how}</a> · <a href="/pricing">${en.nav.pricing}</a> · <a href="/faq">${en.nav.faq}</a> · <a href="/download">${en.nav.download}</a></nav>`;
const FOOT = `<footer><p>${esc(en.footer.tagline)}</p><p><a href="/terms">${en.footer.terms}</a> · <a href="/privacy">${en.footer.privacy}</a> · <a href="/legal">${en.footer.legalNotice}</a> · <a href="/discord">Discord</a></p></footer>`;

const modules = () => CATEGORIES.map((c) => {
  const k = en.cat[c.id];
  return `<section><h2>${esc(k.name)} (${c.count} tweaks, ${c.plan === 'Free' ? 'free' : 'Premium and Ultimate'})</h2><p>${esc(k.line)}</p>${list(k.outcomes)}<p>Areas: ${esc(k.areas.join(', '))}. ${c.recommended} recommended, ${c.reboot} need a restart.</p></section>`;
}).join('');
const tools = () => list(Object.values(en.tools).map((x) => `${x.name}: ${fill(x.line, { n: BLOATWARE.length })}`));
const plans = () => ['free', 'premium', 'ultra'].map((id) => {
  const p = en.plans[id];
  return `<section><h3>${en.plans.names[id]} · ${PRICES[id]}${id === 'free' ? '' : ' one-time, 1 PC'}</h3><p>${esc(p.line)}</p>${list([...p.pages, ...p.perks])}</section>`;
}).join('');
const faqItems = () => en.faq.groups.flatMap((g) => g.items).map((i) => `<h3>${esc(i.q)}?</h3><p>${esc(i.a)}</p>`).join('');
const steps = () => `<ol><li><strong>${en.steps.read}</strong>: ${esc(en.steps.readText)}</li><li><strong>${en.steps.save}</strong>: ${esc(en.steps.saveText)} %ProgramData%\\unlag\\tweaks.json</li><li><strong>${en.steps.revert}</strong>: ${esc(en.steps.revertText)}</li></ol>`;
const faqHtml = () => en.faq.groups.map((g) => `<section><h2>${esc(g.group)}</h2>${g.items.map((i) => `<h3>${esc(i.q)}?</h3><p>${esc(i.a)}</p>`).join('')}</section>`).join('');

const APP_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Unlag',
  alternateName: ['Unlag PC Optimizer', 'Unlag Optimizer'],
  keywords: 'pc optimizer, gaming optimizer, windows optimizer, input lag, fps, ping, windows tweaks, debloat',
  url: SITE,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Windows 10, Windows 11 (64-bit)',
  softwareVersion: VERSION,
  downloadUrl: DOWNLOAD_URL,
  image: `${SITE}/og.jpg`,
  description: en.hero.sub,
  offers: ['free', 'premium', 'ultra'].map((id) => ({
    '@type': 'Offer', name: en.plans.names[id], priceCurrency: 'EUR',
    price: PRICES[id].replace(/[^\d,]/g, '').replace(',', '.') || '0',
  })),
};
const SITE_LD = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Unlag', alternateName: 'Unlag PC Optimizer', url: `${SITE}/` };
const ORG_LD = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Unlag', url: SITE, logo: `${SITE}/logo.png`, sameAs: ['https://discord.gg/8eMpzNCErW', 'https://github.com/0ser999/unlag'] };
const FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: en.faq.groups.flatMap((g) => g.items.map((i) => ({
    '@type': 'Question', name: `${i.q}?`, acceptedAnswer: { '@type': 'Answer', text: i.a },
  }))),
};

// Public routes. Account, checkout and sign-in pages stay out of the index.
const ROUTES = [
  {
    path: '/', title: en.meta.home, priority: '1.0', ld: [APP_LD, FAQ_LD, SITE_LD, ORG_LD],
    description: 'Unlag is a PC optimizer for gaming on Windows 10 and 11. Lower input lag and ping, smoother games, and every original setting saved so you can undo it.',
    body: () => `<p>${esc(en.hero.kicker)}</p><h1>${esc(en.hero.title)}</h1><p>${esc(en.hero.sub)}</p><p>Version ${VERSION} · Windows 10 and 11 x64 · free to start. <a href="/download">${en.common.downloadWindows}</a></p>
<h2>${esc(en.home.familiesTitle)}</h2><p>${esc(en.home.familiesText)}</p>${modules()}
<h2>${esc(en.home.toolsHead)}</h2>${tools()}
<h2>${esc(en.home.revTitle)}</h2><p>${esc(en.home.revLead)}</p>${steps()}
<h2>${esc(en.home.freeTitle)}</h2><p>${esc(en.home.freeText)}</p>${plans()}
<h2>${esc(en.faq.title)}</h2><p>${esc(en.faq.lead)}</p>${faqItems()}`,
  },
  {
    path: '/features', title: en.meta.features, priority: '0.9',
    description: `Unlag PC optimizer: ${TOTAL_TWEAKS} Windows tweaks in four modules: General, Performance, Network and Privacy, plus Cleaner, Debloat, Backups, BIOS and an assistant. Each tweak shows its impact and risk.`,
    body: () => `<h1>${esc(en.features.title)}</h1><p>${esc(en.features.lead)}</p>${modules()}<p>${esc(en.features.note)}</p><h2>${esc(en.features.toolsTitle)}</h2><p>${esc(en.features.toolsText)}</p>${tools()}`,
  },
  {
    path: '/how-it-works', title: en.meta.how, priority: '0.8',
    description: 'How Unlag keeps every Windows tweak reversible: it reads the current value, saves it, and writes it back exactly when you turn the tweak off.',
    body: () => `<h1>${esc(en.how.title)}</h1><p>${esc(en.how.lead)}</p><h2>${esc(en.how.stepsTitle)}</h2><p>${esc(en.how.stepsLead)}</p><ol><li><strong>${en.steps.read}</strong>: ${esc(en.steps.readText)}</li><li><strong>${en.steps.save}</strong>: ${esc(en.steps.saveText)} %ProgramData%\\unlag\\tweaks.json</li><li><strong>${en.steps.revert}</strong>: ${esc(en.steps.revertText)}</li></ol>
<h2>${esc(en.how.riskTitle)}</h2><p>${esc(en.how.riskLead)}</p>${list([`${en.risk.safe}: ${en.risk.safeText}`, `${en.risk.moderate}: ${en.risk.moderateText}`, `${en.risk.advanced}: ${en.risk.advancedText}`])}
<h2>${esc(en.how.engineTitle)}</h2>${en.how.engine.map(([h, p]) => `<h3>${esc(h)}</h3><p>${esc(p)}</p>`).join('')}`,
  },
  {
    path: '/pricing', title: en.meta.pricing, priority: '0.9', ld: [APP_LD],
    description: `Unlag PC optimizer is free to start. Premium ${PRICES.premium} and Ultimate ${PRICES.ultra}, one-time payment per PC, add latency, network and BIOS tweaks.`,
    body: () => `<h1>${esc(en.pricing.title)}</h1><p>${esc(en.pricing.lead)}</p>${plans()}<p>Free: ${PLAN_TWEAKS.free} tweaks · Premium: ${PLAN_TWEAKS.premium} · Ultimate: ${PLAN_TWEAKS.ultra}.</p><p>${esc(en.pricing.note)}</p>`,
  },
  {
    path: '/faq', title: en.meta.faq, priority: '0.8', ld: [FAQ_LD],
    description: 'Answers about Unlag: undoing tweaks, administrator rights, risk levels, the BIOS module, Windows 10 support, accounts and plans.',
    body: () => `<h1>${esc(en.faq.title)}</h1><p>${esc(en.faq.lead)}</p>${faqHtml()}`,
  },
  {
    path: '/download', title: en.meta.download, priority: '0.9', ld: [APP_LD],
    description: `Download Unlag ${VERSION}, the free PC optimizer for gaming on Windows 10 and 11 (64-bit). Lower input lag, upgrade from inside the app.`,
    body: () => `<h1>${esc(en.download.title)}</h1><p>${esc(en.download.lead)}</p><p><a href="${DOWNLOAD_URL}">${en.download.button}</a> (v${VERSION}, x64 installer)</p><h2>Requirements</h2>${list(en.download.reqs.map(([k, v]) => `${k}: ${v}`))}<h2>${esc(en.download.installTitle)}</h2><ol>${en.download.install.map(([h, p]) => `<li><strong>${esc(h)}</strong>: ${esc(p)}</li>`).join('')}</ol>`,
  },
  { path: '/terms', title: en.meta.terms, priority: '0.3', description: 'Terms of service for the Unlag Windows optimization app and website.', body: () => `<h1>${en.footer.terms}</h1>` },
  { path: '/privacy', title: en.meta.privacy, priority: '0.3', description: 'How Unlag handles your data: account, payments and what stays on your PC.', body: () => `<h1>${en.footer.privacy}</h1>` },
  { path: '/legal', title: en.meta.legal, priority: '0.2', description: 'Legal notice for unlag.pro.', body: () => `<h1>${en.footer.legalNotice}</h1>` },
];

function page(template, r) {
  const url = `${SITE}${r.path === '/' ? '/' : r.path}`;
  const ld = (r.ld || []).map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`).join('\n    ');
  return template
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(r.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(r.description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(r.title)}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*"\s*\/?>/, `<meta name="twitter:title" content="${esc(r.title)}" />`)
    .replace(/<meta property="og:url" content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`)
    .replace('</head>', `  <style>.seo-fallback{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0}</style><noscript><style>.seo-fallback{position:static;width:auto;height:auto;overflow:visible;opacity:1;padding:24px}</style></noscript>
    <link rel="canonical" href="${url}" />\n    <meta name="robots" content="index, follow, max-image-preview:large" />\n    ${ld}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root"><div class="seo-fallback">${NAV}<main>${r.body()}</main>${FOOT}</div></div>`);
}

const ROBOTS = `# Unlag - every crawler is welcome, search engines and AI assistants alike.
User-agent: *
Allow: /
Disallow: /api/
Disallow: /account
Disallow: /checkout
Disallow: /sign-in
Disallow: /sign-up
Disallow: /reset-password

# AI crawlers, allowed explicitly
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-User
User-agent: Claude-SearchBot
User-agent: anthropic-ai
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: Bingbot
User-agent: CCBot
User-agent: meta-externalagent
User-agent: DuckAssistBot
User-agent: MistralAI-User
Allow: /
Disallow: /api/
Disallow: /account
Disallow: /checkout

Sitemap: ${SITE}/sitemap.xml
`;

const llms = () => `# Unlag (PC optimizer for Windows gaming)

> ${en.hero.sub}

Unlag is a PC optimizer for gaming, a Windows 10 and 11 (64-bit) app with ${TOTAL_TWEAKS} tweaks in four modules. Version ${VERSION}. Free plan, Premium ${PRICES.premium} and Ultimate ${PRICES.ultra} (one-time payment, one PC).

## Pages

- [Home](${SITE}/): what Unlag does
- [Features](${SITE}/features): the four tweak modules and the tools
- [How it works](${SITE}/how-it-works): how every change stays reversible
- [Pricing](${SITE}/pricing): Free, Premium and Ultimate
- [FAQ](${SITE}/faq): safety, compatibility, accounts
- [Download](${SITE}/download): installer and requirements

## Modules

${CATEGORIES.map((c) => `- ${en.cat[c.id].name} (${c.count} tweaks): ${en.cat[c.id].line}`).join('\n')}

## FAQ

${en.faq.groups.flatMap((g) => g.items.map((i) => `- ${i.q}? ${i.a}`)).join('\n')}
`;

export default function seo() {
  let outDir = 'dist';
  return {
    name: 'seo-prerender',
    apply: 'build',
    configResolved(c) { outDir = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      const template = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
      const today = new Date().toISOString().slice(0, 10);
      for (const r of ROUTES) {
        const file = r.path === '/' ? 'index.html' : `${r.path.slice(1)}.html`;
        fs.writeFileSync(path.join(outDir, file), page(template, r));
      }
      fs.writeFileSync(path.join(outDir, 'robots.txt'), ROBOTS);
      fs.writeFileSync(path.join(outDir, 'llms.txt'), llms());
      fs.writeFileSync(path.join(outDir, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map((r) => `  <url><loc>${SITE}${r.path}</loc><lastmod>${today}</lastmod><priority>${r.priority}</priority></url>`).join('\n')}
</urlset>
`);
      console.log(`[seo] ${ROUTES.length} pages prerendered + robots.txt, sitemap.xml, llms.txt`);
    },
  };
}
