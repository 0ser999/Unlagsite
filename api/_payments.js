import { PLAN_NAME } from './_shared.js';

// A durable order survives tabs, server restarts and Stripe's 24h idempotency window.
export async function paymentFor(db, stripe, userId, plan, now = Date.now()) {
  const { data: order, error } = await db.rpc('site_reserve_payment', { p_user_id: userId, p_plan: plan });
  if (error) throw error;
  if (order.error) return order;
  if (order.stripe_intent_id) return { order, intent: await stripe.paymentIntents.retrieve(order.stripe_intent_id) };

  // If creation succeeded but saving its ID failed, only retry inside Stripe's retention window.
  // Older ambiguous orders require reconciliation, never a second chargeable intent.
  if (!Number.isFinite(Date.parse(order.created_at)) || now - Date.parse(order.created_at) >= 23 * 60 * 60 * 1000) {
    throw new Error('Payment order requires reconciliation');
  }
  const intent = await stripe.paymentIntents.create({
    amount: order.amount,
    currency: 'eur',
    automatic_payment_methods: { enabled: true },
    receipt_email: order.email || undefined,
    description: `unlag ${PLAN_NAME[plan]}${order.from_plan !== 'free' ? ' (upgrade)' : ''}, one-time, 1 PC`,
    metadata: { user_id: userId, plan, from: order.from_plan, order_id: order.id },
  }, { idempotencyKey: `site-order-${order.id}` });
  const saved = await db.from('site_payment_orders').update({ stripe_intent_id: intent.id }).eq('id', order.id);
  if (saved.error) throw saved.error;
  return { order, intent };
}
