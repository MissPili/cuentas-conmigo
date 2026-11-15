import { defineBackend } from '@aws-amplify/backend';
import { FunctionUrlAuthType } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { pey } from './functions/pey/resource';
import { peyWebhook } from './functions/pey-webhook/resource';

const backend = defineBackend({ auth, data, pey, peyWebhook });

// Pey needs a public URL to call. Security comes from the webhook signature check in the handler.
const url = backend.peyWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});
backend.addOutput({ custom: { peyWebhookUrl: url.url } });
