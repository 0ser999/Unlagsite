import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { paymentFor } from '../api/_payments.js';
import { paymentState } from '../src/lib/payment-status.js';

function checkoutFixture({ old = false, stored = false, failSave = false } = {}) {
  const order = { id: 'order-1', user_id: 'user-1', plan: 'premium', from_plan: 'free', amount: 1499,
    email: 'buyer@example.test', created_at: new Date(Date.now() - (old ? 48 * 3600000 : 0)).toISOString(),
    stripe_intent_id: stored ? 'pi_existing' : null };
  const intents = new Map();
  let calls = 0;
  const db = {
    rpc: async () => ({ data: { ...order } }),
    from: () => ({ update: (values) => ({ eq: async () => {
      if (failSave) { failSave = false; return { error: new Error('storage unavailable') }; }
      Object.assign(order, values); return {};
    } }) }),
  };
  const stripe = { paymentIntents: {
    create: async (params, options) => {
      calls++;
      assert.equal(params.amount, 1499);
      assert.equal(params.metadata.order_id, order.id);
      if (!intents.has(options.idempotencyKey)) intents.set(options.idempotencyKey, { id: 'pi_new', status: 'requires_payment_method' });
      return intents.get(options.idempotencyKey);
    },
    retrieve: async (id) => ({ id, status: 'succeeded' }),
  } };
  return { db, stripe, intents, get calls() { return calls; } };
}

test('two concurrent tabs share one Stripe payment', async () => {
  const f = checkoutFixture();
  const results = await Promise.all([paymentFor(f.db, f.stripe, 'user-1', 'premium'), paymentFor(f.db, f.stripe, 'user-1', 'premium')]);
  assert.equal(results[0].intent.id, results[1].intent.id);
  assert.equal(f.intents.size, 1);
});

test('a saved payment is reused even after Stripe idempotency expires', async () => {
  const f = checkoutFixture({ old: true, stored: true });
  assert.equal((await paymentFor(f.db, f.stripe, 'user-1', 'premium')).intent.id, 'pi_existing');
  assert.equal(f.calls, 0);
});

test('a failed database save retries with the original Stripe idempotency key', async () => {
  const f = checkoutFixture({ failSave: true });
  await assert.rejects(paymentFor(f.db, f.stripe, 'user-1', 'premium'), /storage unavailable/);
  await paymentFor(f.db, f.stripe, 'user-1', 'premium');
  assert.equal(f.intents.size, 1);
});

test('an old ambiguous order never creates a second payment', async () => {
  const f = checkoutFixture({ old: true });
  await assert.rejects(paymentFor(f.db, f.stripe, 'user-1', 'premium'), /reconciliation/);
  assert.equal(f.calls, 0);
});

test('only confirmed Stripe statuses select payment completion views', () => {
  for (const status of ['1', 'done', 'failed', 'requires_payment_method', 'requires_action', 'canceled', undefined]) {
    assert.equal(paymentState(status), null);
  }
  assert.equal(paymentState('processing'), 'processing');
  assert.equal(paymentState('succeeded'), 'succeeded');
});

test('Postgres migration: unique orders, monotonic grants, metadata preservation and permissions', async () => {
  const db = new PGlite();
  const uid = '00000000-0000-4000-8000-000000000001';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth;
      create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz,
        raw_app_meta_data jsonb, updated_at timestamptz);
      insert into auth.users values ('${uid}', 'buyer@example.test', now(), '{"hwid":"keep-me","email_2fa":true}', now());`);
    const migration = await readFile(new URL('../supabase/migrations/202611040001_payments.sql', import.meta.url), 'utf8');
    await db.exec(migration);
    // Reapplying the deployment script must be harmless.
    await db.exec(migration);
    const reserve = async (plan) => (await db.query('select public.site_reserve_payment($1, $2) as value', [uid, plan])).rows[0].value;
    const first = await reserve('premium');
    assert.equal((await reserve('premium')).id, first.id);
    assert.equal(first.amount, 1499);
    await db.query('select public.site_grant_paid_plan($1, $2, $3)', [uid, 'premium', 'pi_premium']);
    assert.equal((await reserve('premium')).error, 'owned');
    assert.equal((await reserve('ultra')).amount, 1500);
    await db.query('select public.site_grant_paid_plan($1, $2, $3)', [uid, 'ultra', 'pi_ultra']);
    // Late/repeated Premium webhooks cannot undo Ultimate or its receipt.
    await db.query('select public.site_grant_paid_plan($1, $2, $3)', [uid, 'premium', 'pi_premium']);
    const metadata = (await db.query('select raw_app_meta_data from auth.users')).rows[0].raw_app_meta_data;
    assert.equal(metadata.plan, 'ultra');
    assert.equal(metadata.payment_id, 'pi_ultra');
    assert.equal(metadata.hwid, 'keep-me');
    assert.equal(metadata.email_2fa, true);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(reserve('ultra'), /permission denied/);
      await assert.rejects(db.query('select public.site_grant_paid_plan($1, $2, $3)', [uid, 'ultra', 'pi_fake']), /permission denied/);
      await assert.rejects(db.query('select * from public.site_payment_orders'), /permission denied/);
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    assert.equal((await reserve('ultra')).error, 'owned');
  } finally { await db.close(); }
});
