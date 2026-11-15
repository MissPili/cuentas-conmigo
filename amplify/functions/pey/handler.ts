import type { Schema } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/pey';

const PEY = 'https://api.pey.mx';

type Handler = Schema['peyAction']['functionHandler'];

// A pasted key often carries a trailing space/newline or a "Bearer " prefix; clean it.
const apiKey = () => (env.PEY_API_KEY ?? "").trim().replace(/^Bearer\s+/i, "");

async function peyCall(path: string, method: 'GET' | 'POST', body?: unknown) {
  console.log("pey call", method, path, "keyLength", apiKey().length); // never log the key itself
  const res = await fetch(PEY + path, {
    method,
    headers: { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`Pey ${res.status}: ${json.message ?? json.error ?? text}`);
  return json;
}

// Same rule as the interface: first 7 digits of the time, digits only (Pey numRef is 1-7 digits).
const newNumRef = () => String(Date.now()).slice(-7);

export const handler: Handler = async (event) => {
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
  Amplify.configure(resourceConfig, libraryOptions);
  const client = generateClient<Schema>({ authMode: 'iam' });

  const { action, id } = event.arguments;
  const sub = (event.identity as { sub?: string } | null)?.sub;
  if (!sub) throw new Error('Not signed in');
  const mine = (owner?: string | null) => !!owner && owner.startsWith(sub);

  if (action === 'registerAccount') {
    const { data: acc } = await client.models.Account.get({ id });
    if (!acc || !mine(acc.owner)) throw new Error('Account not found');
    const r = await peyCall('/bank-account', 'POST', {
      alias: acc.alias, name: acc.legalName, clabe: acc.clabe, entity: acc.entity ?? 'PERSON',
    });
    await client.models.Account.update({ id, peyId: r.id, codiStatus: r.codiStatus ?? 'PENDING' });
    return r.codiStatus ?? 'PENDING';
  }

  if (action === 'refreshAccount') {
    const { data: acc } = await client.models.Account.get({ id });
    if (!acc || !mine(acc.owner) || !acc.peyId) throw new Error('Account not found');
    const r = await peyCall(`/bank-account/${acc.peyId}`, 'GET');
    await client.models.Account.update({ id, codiStatus: r.codiStatus, errorMessage: r.errorMessage ?? null });
    return r.codiStatus;
  }

  if (action === 'requestCodi') {
    const { data: ch } = await client.models.Charge.get({ id });
    if (!ch || !mine(ch.owner)) throw new Error('Charge not found');
    if (ch.status === 'PAID') throw new Error('Already paid');
    const { data: acc } = await client.models.Account.get({ id: ch.accountId });
    // Never send a CoDi request to an account Pey has not activated yet.
    if (!acc?.peyId || acc.codiStatus !== 'ACTIVE') throw new Error('Account not active yet');
    const numRef = newNumRef();
    const r = await peyCall('/codi/pn', 'POST', {
      amount: ch.amount,
      phoneNumber: ch.tel,
      concept: ch.concept.slice(0, 40),
      numRef,
      bankAccountId: acc.peyId, // always explicit: the webhook only echoes it if sent here
      metadata: { chargeId: ch.id },
    });
    await client.models.Charge.update({ id, via: 'CODI', transactionId: r.transactionId, numRef });
    return r.transactionId;
  }

  throw new Error('Unknown action');
};
