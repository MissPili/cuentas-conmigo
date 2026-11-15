import { defineAuth } from '@aws-amplify/backend';

// Email + password sign-in for the collector (the person who charges).
export const auth = defineAuth({
  loginWith: { email: true },
});
