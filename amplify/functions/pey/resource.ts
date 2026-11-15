import { defineFunction, secret } from '@aws-amplify/backend';

// Calls the Pey API. The API key lives only in Amplify secrets (never in the repo).
export const pey = defineFunction({
  name: 'pey',
  entry: './handler.ts',
  timeoutSeconds: 30,
  environment: { PEY_API_KEY: secret('PEY_API_KEY') },
});
