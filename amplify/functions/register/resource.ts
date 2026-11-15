import { defineFunction } from '@aws-amplify/backend';

// Public signup endpoint (Lambda Function URL). It only REGISTERS people; it never charges or messages anyone.
export const register = defineFunction({
  name: 'register',
  entry: './handler.ts',
  timeoutSeconds: 15,
});
