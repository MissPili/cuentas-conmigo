import { defineBackend } from '@aws-amplify/backend';
import { FunctionUrlAuthType, HttpMethod } from 'aws-cdk-lib/aws-lambda';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { pey } from './functions/pey/resource';
import { peyWebhook } from './functions/pey-webhook/resource';
import { register } from './functions/register/resource';
import { share } from './functions/share/resource';

const backend = defineBackend({ auth, data, pey, peyWebhook, register, share });

// Pey needs a public URL to call. Security comes from the webhook signature check in the handler.
const url = backend.peyWebhook.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
});
// Public signup page calls this from the browser, so CORS is explicit.
// Each Amplify branch (main = production, qa, dev) gets its own backend, so the allowed origins depend on the branch.
// Production keeps exactly the list it always had; any other branch allows its own amplifyapp.com address
// (plus CORS_EXTRA_ORIGINS, comma separated, if that branch has a custom domain).
const branch = process.env.AWS_BRANCH;
const appId = process.env.AWS_APP_ID;
const isProd = !branch || branch === 'main';
const origins = ['http://localhost:5173'];
if (isProd) {
  origins.push('https://cuentasconmigo.misspili.com.mx', 'https://main.dj3nitc67fx2s.amplifyapp.com');
} else if (appId) {
  // Amplify turns every character that is not a letter, digit or hyphen in the branch name into a hyphen.
  origins.push(`https://${branch.replace(/[^a-zA-Z0-9-]/g, '-')}.${appId}.amplifyapp.com`);
}
for (const o of (process.env.CORS_EXTRA_ORIGINS ?? '').split(',')) if (o.trim()) origins.push(o.trim());
const registerUrl = backend.register.resources.lambda.addFunctionUrl({
  authType: FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: origins,
    allowedMethods: [HttpMethod.GET, HttpMethod.POST],
    allowedHeaders: ['content-type'],
    maxAge: undefined,
  },
});
// The page behind a WhatsApp link (code to pay or receipt). Opened by whoever receives the link, so no CORS needed.
const shareUrl = backend.share.resources.lambda.addFunctionUrl({ authType: FunctionUrlAuthType.NONE });
backend.addOutput({ custom: { peyWebhookUrl: url.url, registerUrl: registerUrl.url, shareUrl: shareUrl.url } });
