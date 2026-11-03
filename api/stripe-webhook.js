// POST /api/stripe-webhook  (Stripe > Developers > Webhooks, event payment_intent.succeeded)
// Verifies Stripe's signature, then writes the plan into the account's app_metadata, which only the
// service role can change. Repeated deliveries are harmless: a plan is only ever raised.
import { RANK, PRICE, amountFor, planOf, stripeClient, supabaseAdmin, send } from './_shared.js';

export const config = { api: { bodyParser: false } };

async function rawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'method' }); }
  let event;
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    event = stripeClient().webhooks.constructEvent(await rawBody(req), req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] rejected:', err?.message || err);
    return send(res, 400, { error: 'signature' });
  }

  if (event.type !== 'payment_intent.succeeded') return send(res, 200, { received: true });

  const intent = event.data.object;
  const { user_id: uid, plan, from = 'free' } = intent.metadata || {};
  if (!uid || !PRICE[plan] || intent.currency !== 'eur' || intent.amount_received < amountFor(plan, from)) {
    console.error('[webhook] payment does not match a plan:', intent.id);
    return send(res, 200, { received: true, ignored: true });
  }

  try {
    const db = supabaseAdmin();
    const { data, error } = await db.auth.admin.getUserById(uid);
    if (error || !data?.user) throw error || new Error('user not found');
    const user = data.user;
    if (RANK[planOf(user)] >= RANK[plan]) return send(res, 200, { received: true, already: true });
    const { error: updateError } = await db.auth.admin.updateUserById(uid, {
      app_metadata: { ...user.app_metadata, plan, paid_at: new Date().toISOString(), payment_id: intent.id },
    });
    if (updateError) throw updateError;
    console.log(`[webhook] ${uid} is now ${plan} (${intent.id})`);
    return send(res, 200, { received: true });
  } catch (err) {
    // 500 makes Stripe retry the delivery later.
    console.error('[webhook] could not grant the plan:', err?.message || err);
    return send(res, 500, { error: 'retry' });
  }
}
