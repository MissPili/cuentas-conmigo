import { defineFunction } from '@aws-amplify/backend';

// Public page behind the link that is sent by WhatsApp (payment code or receipt as a picture).
export const share = defineFunction({
  name: 'share',
  entry: './handler.ts',
  timeoutSeconds: 10,
});
