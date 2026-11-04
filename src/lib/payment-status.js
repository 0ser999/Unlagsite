// Only use a status returned by Stripe/the authenticated API, never URL flags.
export const paymentState = (status) => ['succeeded', 'processing'].includes(status) ? status : null;
