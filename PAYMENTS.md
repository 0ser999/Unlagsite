# Payment deployment

1. Apply `supabase/migrations/202611040001_payments.sql` in the project's Supabase SQL editor **before deploying this code**. It adds a server-only order table and two service-role-only functions. It preserves existing account metadata.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` (or `VITE_SUPABASE_URL`) on the server. Set `VITE_STRIPE_PUBLISHABLE_KEY` for the frontend build. Never expose the service-role or secret Stripe keys through `VITE_` variables.
3. Deploy the frontend and `/api` functions together. Keep the signed `payment_intent.succeeded` webhook configured at `/api/stripe-webhook`.
4. In Stripe test mode, open the same offer in two tabs, pay once, and reload both. Check the same PaymentIntent is reused, the plan activates, and replaying an earlier Premium event never downgrades Ultimate. Test a failed authentication redirect and a processing payment too.

Run `npm test` for local payment regressions and the migration against an isolated embedded PostgreSQL instance. No real payments or accounts are used. Run `npm run build` for the production build.

Run `node tests/ui-smoke.mjs` for desktop/mobile route checks and mocked payment-return checks. It starts and stops Vite on port 5173 and uses the installed Microsoft Edge. It reads the public Supabase URL from `.env`; all auth/payment responses in the payment scenarios are intercepted locally.

Orders persist the PaymentIntent ID and use their UUID as the Stripe idempotency key. A creation whose ID could not be saved can be retried for 23 hours. After that, the API fails closed because Stripe may have expired its idempotency record. Reconcile the order's `order_id` metadata in Stripe and restore its `stripe_intent_id` in Supabase; do not delete ambiguous orders or create another charge. For an explicitly canceled intent, verify the cancellation in Stripe before removing its order row to permit a fresh attempt.

Prices are defined in both `api/_shared.js` and `site_reserve_payment`; update them together. Existing pre-migration payment redirects remain supported through an authenticated, owner-checked Stripe lookup.

References: [Stripe idempotency](https://docs.stripe.com/api/idempotent_requests), [reusing PaymentIntents](https://docs.stripe.com/payments/payment-intents), [Supabase function permissions](https://supabase.com/docs/guides/database/functions).
