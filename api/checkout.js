// POST /api/checkout  { plan: "premium" | "ultra" }  with  Authorization: Bearer <Supabase access token>
// Creates the Stripe PaymentIntent for the signed-in account and returns its client secret.
// The plan itself is only granted by /api/stripe-webhook, once Stripe confirms the payment.
import { PRICE, stripeClient, supabaseAdmin, send } from './_shared.js';
import { paymentFor } from './_payments.js';

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
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
    if (!Object.hasOwn(PRICE, plan)) return send(res, 400, { error: 'invalid' });

    const { data, error } = await supabaseAdmin().auth.getUser(token);
    const user = data?.user;
    if (error || !user) return send(res, 401, { error: 'signin' });
    if (!user.email_confirmed_at) return send(res, 403, { error: 'unverified' });

    // Handles redirects, including payments started before the durable-order migration.
    // The URL may name an intent, but Stripe and its owner metadata decide its status.
    if (body.paymentIntent) {
      if (typeof body.paymentIntent !== 'string' || !/^pi_[a-zA-Z0-9]+$/.test(body.paymentIntent)) {
        return send(res, 400, { error: 'invalid' });
      }
      const intent = await stripeClient().paymentIntents.retrieve(body.paymentIntent);
      if (intent.metadata.user_id !== user.id || intent.metadata.plan !== plan) {
        return send(res, 400, { error: 'invalid' });
      }
      if (intent.status === 'canceled') return send(res, 409, { error: 'unavailable' });
      return send(res, 200, { clientSecret: intent.client_secret, amount: intent.amount,
        currency: intent.currency, plan, from: intent.metadata.from || 'free', status: intent.status });
    }

    const result = await paymentFor(supabaseAdmin(), stripeClient(), user.id, plan);
    if (result.error) return send(res, result.error === 'owned' ? 409 : 403, { error: result.error });
    const { order, intent } = result;
    if (intent.status === 'canceled') return send(res, 409, { error: 'unavailable' });
    return send(res, 200, { clientSecret: intent.client_secret, amount: order.amount, currency: 'eur', plan,
      from: order.from_plan, status: intent.status });
  } catch (err) {
    console.error('[checkout]', err?.message || err);
    return send(res, 500, { error: 'unavailable' });
  }
}
