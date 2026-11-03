// POST /api/checkout  { plan: "premium" | "ultra" }  with  Authorization: Bearer <Supabase access token>
// Creates the Stripe PaymentIntent for the signed-in account and returns its client secret.
// The plan itself is only granted by /api/stripe-webhook, once Stripe confirms the payment.
import { PRICE, RANK, PLAN_NAME, planOf, amountFor, stripeClient, supabaseAdmin, send } from './_shared.js';

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 4096) throw new Error('too large'); }
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'method' }); }
  try {
    const token = /^Bearer (.+)$/.exec(req.headers.authorization || '')?.[1];
    if (!token) return send(res, 401, { error: 'signin' });

    let body;
    try { body = await readJson(req); } catch { return send(res, 400, { error: 'invalid' }); }
    const plan = body?.plan;
    if (!PRICE[plan]) return send(res, 400, { error: 'invalid' });

    const { data, error } = await supabaseAdmin().auth.getUser(token);
    const user = data?.user;
    if (error || !user) return send(res, 401, { error: 'signin' });
    if (!user.email_confirmed_at) return send(res, 403, { error: 'unverified' });

    const current = planOf(user);
    if (RANK[current] >= RANK[plan]) return send(res, 409, { error: 'owned', plan: current });

    const amount = amountFor(plan, current);
    const intent = await stripeClient().paymentIntents.create({
      amount,
      currency: 'eur',
      automatic_payment_methods: { enabled: true },
      receipt_email: user.email || undefined,
      description: `unlag ${PLAN_NAME[plan]}${current !== 'free' ? ' (upgrade)' : ''}, one-time, 1 PC`,
      metadata: { user_id: user.id, plan, from: current },
    });
    return send(res, 200, { clientSecret: intent.client_secret, amount, currency: 'eur', plan, from: current });
  } catch (err) {
    console.error('[checkout]', err?.message || err);
    return send(res, 500, { error: 'unavailable' });
  }
}
