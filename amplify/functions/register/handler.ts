import type { LambdaFunctionURLHandler } from 'aws-lambda';
import { createHash } from 'node:crypto';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/register';
import type { Schema } from '../../data/resource';
import { TEL10, overflowIds, takesPlaceByStatus } from '../../../src/places';

// Public signup. It only REGISTERS a person. No charge, no CoDi request and no message leaves from here:
// the collector must approve first. Answers reveal nothing beyond what the person just typed.

const json = (statusCode: number, body: unknown) => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const PER_TOKEN_PER_HOUR = 40;
const PER_IP_PER_HOUR = 6;

type Client = ReturnType<typeof generateClient<Schema>>;

/** Counts one attempt in a stored counter (survives cold starts). Returns false when over the limit. */
async function allow(client: Client, key: string, max: number): Promise<boolean> {
  const { data } = await client.models.RegAttempt.get({ key });
  if (data && data.count >= max) return false;
  if (data) await client.models.RegAttempt.update({ key, count: data.count + 1 });
  else await client.models.RegAttempt.create({ key, count: 1 });
  return true;
}

async function everyPerson(client: Client) {
  const out: Schema['Person']['type'][] = [];
  let nextToken: string | null | undefined;
  do {
    const page = await client.models.Person.list({ nextToken, limit: 500 });
    out.push(...page.data);
    nextToken = page.nextToken;
  } while (nextToken);
  return out;
}

export const handler: LambdaFunctionURLHandler = async (event) => {
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
  Amplify.configure(resourceConfig, libraryOptions);
  const client = generateClient<Schema>({ authMode: 'iam' });

  const method = event.requestContext.http.method;
  const ip = event.requestContext.http.sourceIp ?? 'unknown';
  const ipKey = createHash('sha256').update(ip).digest('hex').slice(0, 16);
  const hour = new Date().toISOString().slice(0, 13);

  try {
    let token = '';
    let body: { name?: unknown; tel?: unknown; helpers?: unknown; consent?: unknown } = {};
    if (method === 'GET') {
      token = event.queryStringParameters?.token ?? '';
    } else if (method === 'POST') {
      const parsed = JSON.parse(event.body ?? '{}') as { token?: unknown } & typeof body;
      token = typeof parsed.token === 'string' ? parsed.token : '';
      body = parsed;
    } else {
      return json(405, { status: 'error' });
    }
    if (token.length < 20 || token.length > 100) return json(200, { status: 'closed' });

    // Limits first, so guessing tokens or flooding the form is slow and cheap for us.
    if (!(await allow(client, `ip:${ipKey}:${hour}`, method === 'GET' ? 30 : PER_IP_PER_HOUR))) return json(200, { status: 'limit' });

    const found = await client.models.Project.listProjectByToken({ token });
    const project = found.data[0];
    if (!project || !project.owner) return json(200, { status: 'closed' });

    const people = (await everyPerson(client)).filter((p) => p.owner === project.owner);
    const taking = people.filter((p) => takesPlaceByStatus(p.status));
    const full = project.capacity > 0 && taking.length >= project.capacity;

    if (method === 'GET') return json(200, { status: project.open ? 'open' : 'closed', name: project.name ?? '', full });
    if (!project.open) return json(200, { status: 'closed' });

    if (!(await allow(client, `tok:${token.slice(0, 16)}:${hour}`, PER_TOKEN_PER_HOUR))) return json(200, { status: 'limit' });

    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    const tel = typeof body.tel === 'string' ? body.tel.replace(/\D/g, '') : '';
    const helpers = Array.isArray(body.helpers)
      ? [...new Set(body.helpers.filter((h): h is string => typeof h === 'string').map((h) => h.replace(/\D/g, '')))]
      : [];
    if (name.length < 2 || name.length > 60 || !TEL10.test(tel) || helpers.length < 1 || helpers.length > 3 || !helpers.every((h) => TEL10.test(h)) || body.consent !== true) {
      return json(200, { status: 'invalid' });
    }

    if (people.some((p) => p.tel === tel && p.status !== 'RELEASED')) return json(200, { status: 'already' });

    const now = new Date().toISOString();
    const created = await client.models.Person.create({
      name,
      tel,
      helpers,
      consentShared: true,
      via: 'QR',
      regAt: now,
      status: full ? 'WAITLIST' : 'PENDING',
      owner: project.owner, // the row belongs to the collector, who is not the one calling
    });
    const me = created.data;
    if (!me) return json(200, { status: 'error' });

    // Two signups can both see the last free place. Settle it by arrival order: those beyond capacity wait.
    let status = me.status;
    if (project.capacity > 0 && status === 'PENDING') {
      const after = (await everyPerson(client)).filter((p) => p.owner === project.owner && takesPlaceByStatus(p.status));
      if (overflowIds(after.map((p) => ({ id: p.id, regAt: p.regAt })), project.capacity).includes(me.id)) {
        await client.models.Person.update({ id: me.id, status: 'WAITLIST' });
        status = 'WAITLIST';
      }
    }
    return json(200, { status: status === 'WAITLIST' ? 'waitlist' : 'registered' });
  } catch (e) {
    console.error('register failed', (e as Error).name); // never log names or phone numbers
    return json(200, { status: 'error' });
  }
};
