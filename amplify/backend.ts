import { defineBackend } from '@aws-amplify/backend';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { pey } from './functions/pey/resource';
import { peyWebhook } from './functions/pey-webhook/resource';
import { register } from './functions/register/resource';

const backend = defineBackend({ auth, data, pey, peyWebhook, register });

// Pey needs a public URL to call. Security comes from the webhook signature check in the handler.
const url = backend.peyWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});
// Public signup page calls this from the browser, so CORS is explicit.
const registerUrl = backend.register.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: [
      'https://cuentasconmigo.misspili.com.mx',
      'https://main.dj3nitc67fx2s.amplifyapp.com',
      'http://localhost:5173',
    ],
    allowedMethods: [HttpMethod.GET, HttpMethod.POST],
    allowedHeaders: ['content-type'],
    maxAge: undefined,
  },
});
backend.addOutput({ custom: { peyWebhookUrl: url.url, registerUrl: registerUrl.url } });
