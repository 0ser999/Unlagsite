// Starts an isolated Vite preview with a mock Stripe publishable key.
// All authentication and payment responses below are local mocks.
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const origin = 'http://127.0.0.1:5173';
const env = await readFile(new URL('../.env', import.meta.url), 'utf8');
const url = env.match(/^VITE_SUPABASE_URL=(.+)$/m)?.[1].trim().replace(/^['"]|['"]$/g, '');
const ref = new URL(url).hostname.split('.')[0];
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--strictPort'], {
  windowsHide: true, stdio: 'ignore', env: { ...process.env, VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_local_smoke' },
});
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    try { ready = (await fetch(origin)).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, 'local preview must start');
  browser = await chromium.launch({ headless: true, channel: 'msedge' });
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, locale: 'fr-FR' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    for (const path of ['/', '/features', '/how-it-works', '/pricing', '/faq', '/download', '/sign-in', '/sign-up', '/reset-password', '/terms', '/privacy', '/legal']) {
      await page.goto(origin + path);
      await page.locator('h1').waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${path}: overflow at ${width}`);
    }
    assert.deepEqual(errors, []);
    await page.close();
  }

  const now = Math.floor(Date.now() / 1000);
  const user = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', role: 'authenticated',
    email: 'buyer@example.test', email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'], plan: 'free' }, user_metadata: {}, identities: [], factors: [] };
  const payload = { sub: user.id, exp: now + 3600, iat: now, aal: 'aal1', amr: [{ method: 'password', timestamp: now }], role: 'authenticated' };
  const token = [Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url'), Buffer.from(JSON.stringify(payload)).toString('base64url'), 'mock'].join('.');
  for (const status of ['requires_payment_method', 'processing', 'succeeded']) {
    const page = await browser.newPage({ locale: 'fr-FR' });
    await page.addInitScript(({ ref, session }) => localStorage.setItem(`sb-${ref}-auth-token`, JSON.stringify(session)), {
      ref, session: { access_token: token, refresh_token: 'mock', expires_at: now + 3600, expires_in: 3600, token_type: 'bearer', user },
    });
    await page.route('https://**.supabase.co/**', route => route.fulfill({ json: user }));
    await page.route('https://js.stripe.com/**', route => route.abort());
    let requests = 0;
    await page.route('**/api/checkout', route => { requests++; return route.fulfill({ json: {
      status, amount: 1499, currency: 'eur', plan: 'premium', from: 'free', clientSecret: 'pi_mock_secret_mock',
    } }); });
    await page.goto(origin + '/checkout?plan=premium&done=1&redirect_status=succeeded');
    await page.waitForFunction(() => document.querySelector('.co-pay, .co-done'));
    await page.waitForTimeout(500);
    assert.ok(requests > 0, 'forged URL flags must not bypass the API');
    if (status === 'requires_payment_method') assert.equal(await page.locator('.co-done').count(), 0);
    else {
      await page.locator('.co-done').waitFor();
      const text = await page.locator('.co-done').innerText();
      if (status === 'processing') assert.match(text, /Votre banque traite encore/);
      else assert.doesNotMatch(text, /Votre banque traite encore/);
    }
    await page.close();
  }
  console.log('PASS: 12 public routes at desktop/mobile widths; forged return flags; pending and confirmed payment states.');
} finally { await browser?.close(); server.kill(); }
