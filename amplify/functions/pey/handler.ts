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
  if (!res.ok) {
    console.error('pey error', res.status, path, text.slice(0, 500)); // the body holds a message and a request id, never the key
    throw new Error(`Pey ${res.status}: ${peyMessage(json, text)}`);
  }
  return json;
}

// Pey answers errors as {"error":{"message","type","requestId"}}; older shapes put the text at the top level.
function peyMessage(json: any, text: string): string {
  const e = json?.error;
  const message = typeof e === 'string' ? e : e?.message ?? json?.message;
  const type = typeof e === 'object' ? e?.type : undefined;
  const body = typeof message === 'string' ? message : text;
  return `${type ? `${type}: ` : ''}${body}`.slice(0, 300);
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

  // "Not found" only when the row is really not there or belongs to someone else. A read that FAILS says so,
  // and every case leaves a line in the logs (ids only, never names or phones).
  const loadCharge = async (chargeId: string) => {
    const { data, errors } = await client.models.Charge.get({ id: chargeId });
    if (errors?.length) { console.error('charge read failed', chargeId, errors[0]?.message); throw new Error(`Data error: ${errors[0]?.message ?? 'unknown'}`.slice(0, 200)); }
    if (!data) { console.error('charge is not in the table', chargeId); throw new Error('Charge not found'); }
    if (!mine(data.owner)) { console.error('charge belongs to another user', chargeId); throw new Error('Charge not found'); }
    return data;
  };
  const loadAccount = async (accountId: string) => {
    const { data, errors } = await client.models.Account.get({ id: accountId });
    if (errors?.length) { console.error('account read failed', accountId, errors[0]?.message); throw new Error(`Data error: ${errors[0]?.message ?? 'unknown'}`.slice(0, 200)); }
    if (!data) { console.error('account is not in the table', accountId); throw new Error('Account not found'); }
    if (!mine(data.owner)) { console.error('account belongs to another user', accountId); throw new Error('Account not found'); }
    return data;
  };

  if (action === 'registerAccount') {
    const acc = await loadAccount(id);
    const r = await peyCall('/bank-account', 'POST', {
      alias: acc.alias, name: acc.legalName, clabe: acc.clabe, entity: acc.entity ?? 'PERSON',
    });
    await client.models.Account.update({ id, peyId: r.id, codiStatus: r.codiStatus ?? 'PENDING' });
    return r.codiStatus ?? 'PENDING';
  }

  if (action === 'refreshAccount') {
    const acc = await loadAccount(id);
    if (!acc.peyId) throw new Error('Account not found');
    const r = await peyCall(`/bank-account/${acc.peyId}`, 'GET');
    await client.models.Account.update({ id, codiStatus: r.codiStatus, errorMessage: r.errorMessage ?? null });
    return r.codiStatus;
  }

  if (action === 'requestCodi') {
    const ch = await loadCharge(id);
    if (ch.status === 'PAID') throw new Error('Already paid');
    const acc = await loadAccount(ch.accountId);
    // Never send a CoDi request to an account Pey has not activated yet.
    if (!acc.peyId || acc.codiStatus !== 'ACTIVE') throw new Error('Account not active yet');

    // Who gets the request: the person's own number, or ONE of the numbers registered for them (a helper). Anything
    // else is refused here, so a changed request can never send a collection to a stranger's phone.
    let to = ch.tel;
    const wanted = (event.arguments.phone ?? '').replace(/\D/g, '');
    if (wanted && wanted !== ch.tel) {
      const { data: person, errors } = await client.models.Person.get({ id: ch.personId });
      if (errors?.length) { console.error('person read failed', ch.personId, errors[0]?.message); throw new Error(`Data error: ${errors[0]?.message ?? 'unknown'}`.slice(0, 200)); }
      const known = person && mine(person.owner) ? [person.tel, ...(person.helpers ?? [])] : [];
      if (!/^[0-9]{10}$/.test(wanted) || !known.includes(wanted)) { console.error('phone not registered for', ch.personId); throw new Error('Phone not registered'); }
      to = wanted;
    }

    const numRef = newNumRef();
    const r = await peyCall('/codi/pn', 'POST', {
      amount: ch.amount,
      phoneNumber: to,
      concept: ch.concept.slice(0, 40),
      numRef,
      bankAccountId: acc.peyId, // always explicit: the webhook only echoes it if sent here
      metadata: { chargeId: ch.id },
    });
    await client.models.Charge.update({ id, via: 'CODI', transactionId: r.transactionId, numRef, pushTel: to, sentAt: new Date().toISOString(), sentAmount: ch.amount });
    return r.transactionId;
  }

  if (action === 'requestQr') {
    const ch = await loadCharge(id);
    if (ch.status === 'PAID') throw new Error('Already paid');
    const acc = await loadAccount(ch.accountId);
    if (!acc.peyId || acc.codiStatus !== 'ACTIVE') throw new Error('Account not active yet');
    const numRef = newNumRef();
    const r = await peyCall('/codi/qr', 'POST', {
      amount: ch.amount,
      concept: ch.concept.slice(0, 40),
      expiration: 86400, // one day; the QR also stops working once paid
      numRef,
      generateImage: true,
      bankAccountId: acc.peyId, // always explicit, same as push requests
      metadata: { chargeId: ch.id },
    });
    // Keep the QR id so the webhook can still find the charge if metadata is missing.
    await client.models.Charge.update({ id, via: 'CODI', transactionId: r.id, numRef, sentAt: new Date().toISOString(), sentAmount: ch.amount });
    return JSON.stringify({ qrImage: r.qrImage ?? null, qrString: r.qrString ?? null });
  }

  // Asks Pey whether a charge was paid. Recovers a payment when the webhook did not arrive (or is not set up yet).
  if (action === 'checkCharge') {
    const ch = await loadCharge(id);
    if (ch.status === 'PAID') return 'PAID';
    if (!ch.transactionId) return 'PENDING';
    // A CoDi request has a 26-character ULID transaction id; a CoDi QR keeps the short QR id (IDC).
    let paid: { datePaid?: number } | undefined;
    if (ch.transactionId.length === 26) {
      const t = await peyCall(`/transaction/${ch.transactionId}`, 'GET');
      if (t.status === 'PAID') paid = t;
    } else {
      const t = await peyCall(`/transaction/codi/qr/${ch.transactionId}`, 'GET');
      paid = (t.items ?? []).find((x: { status?: string }) => x.status === 'PAID');
    }
    if (!paid) return 'PENDING';
    const paidAt = paid.datePaid ? new Date(paid.datePaid * 1000).toISOString() : new Date().toISOString();
    // Same as the webhook: a code sent before a correction was paid, so what was paid is the code's amount.
    const old = ch.sentAmount != null && Math.abs(ch.sentAmount - ch.amount) > 0.005;
    await client.models.Charge.update({ id, status: 'PAID', via: 'CODI', paidAt, ...(old ? { amount: ch.sentAmount!, correctedAmount: ch.amount } : {}) });
    return 'PAID';
  }

  throw new Error('Unknown action');
};
