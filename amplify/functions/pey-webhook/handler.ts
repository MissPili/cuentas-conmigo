import type { LambdaFunctionURLHandler } from 'aws-lambda';
import { Webhook } from 'standardwebhooks';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/pey-webhook';
import type { Schema } from '../../data/resource';

const reply = (statusCode: number, body: string) => ({ statusCode, body });

export const handler: LambdaFunctionURLHandler = async (event) => {
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body ?? '', 'base64').toString('utf8')
    : (event.body ?? '');

  // Only a correctly signed request counts. Anything else is rejected before touching data.
  let payload: any;
  try {
    const headers = {
      'webhook-id': event.headers['webhook-id'] ?? '',
      'webhook-timestamp': event.headers['webhook-timestamp'] ?? '',
      'webhook-signature': event.headers['webhook-signature'] ?? '',
    };
    payload = new Webhook(env.PEY_WEBHOOK_SECRET).verify(raw, headers);
  } catch {
    return reply(401, 'invalid signature');
  }

  const evt = payload?.data ?? payload; // tolerate both wrapped and flat shapes
  const type: string = payload?.type ?? evt?.type ?? '';
  if (!/payment_received$/.test(type)) return reply(200, 'ignored');

  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
  Amplify.configure(resourceConfig, libraryOptions);
  const client = generateClient<Schema>({ authMode: 'iam' });

  const transactionId: string | undefined = evt.transactionId;
  const chargeId: string | undefined = evt.metadata?.chargeId;
  let charge = chargeId ? (await client.models.Charge.get({ id: chargeId })).data : null;
  if (!charge && transactionId) {
    charge = (await client.models.Charge.listChargeByTransactionId({ transactionId })).data[0] ?? null;
  }
  if (!charge) return reply(200, 'no matching charge'); // ack so Pey does not retry forever
  if (charge.status === 'PAID') return reply(200, 'already recorded'); // idempotent

  const paidAt = evt.datePaid ? new Date(Number(evt.datePaid) * 1000).toISOString() : new Date().toISOString();
  await client.models.Charge.update({ id: charge.id, status: 'PAID', via: 'CODI', transactionId, paidAt });
  return reply(200, 'ok');
};
