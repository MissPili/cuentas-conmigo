import { defineFunction, secret } from '@aws-amplify/backend';

// Public endpoint (Lambda Function URL) that Pey calls when a CoDi payment arrives.
// Every request must carry a valid Standard Webhooks signature.
export const peyWebhook = defineFunction({
  name: 'pey-webhook',
  entry: './handler.ts',
  timeoutSeconds: 15,
  environment: { PEY_WEBHOOK_SECRET: secret('PEY_WEBHOOK_SECRET') },
});
