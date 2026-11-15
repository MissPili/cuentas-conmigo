import type { LambdaFunctionURLHandler } from 'aws-lambda';
import { createHash } from 'node:crypto';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/register';
import type { Schema } from '../../data/resource';
import { TEL10, overflowIds, takesPlaceByStatus } from '../../../src/places';
import { isEmblemId } from '../../../src/emblems';

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

/** A GraphQL call that fails returns errors instead of throwing; turn that into a real error with its message. */
function must<T>(res: { data: T | null; errors?: readonly { message: string }[] }, what: string): T {
  if (res.errors?.length || res.data == null) throw new Error(`${what}: ${res.errors?.[0]?.message ?? 'sin datos'}`);
  return res.data;
}

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
    out.push(...must(page, 'leer personas'));
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
    let body: { name?: unknown; tel?: unknown; helpers?: unknown; consent?: unknown; emblem?: unknown; photo?: unknown; photoConsent?: unknown; sendTo?: unknown } = {};
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

    // Rows saved before projects existed belong to the collector's oldest project.
    const mineProjects = (await client.models.Project.list({ limit: 200 })).data.filter((x) => x.owner === project.owner);
    const oldest = [...mineProjects].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))[0];
    const inProject = (p: Schema['Person']['type']) => p.owner === project.owner && (p.projectId ? p.projectId === project.id : oldest?.id === project.id);
    const people = (await everyPerson(client)).filter(inProject);
    const taking = people.filter((p) => takesPlaceByStatus(p.status));
    const full = project.capacity > 0 && taking.length >= project.capacity;

    // Pictures already held, so the page only offers free ones. Nothing about who holds them.
    const taken = people.filter((p) => p.status !== 'RELEASED' && p.emblem).map((p) => p.emblem as string);
    if (method === 'GET') return json(200, { status: project.open ? 'open' : 'closed', name: project.name ?? '', full, taken });
    if (!project.open) return json(200, { status: 'closed' });

    if (!(await allow(client, `tok:${token.slice(0, 16)}:${hour}`, PER_TOKEN_PER_HOUR))) return json(200, { status: 'limit' });

    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    const tel = typeof body.tel === 'string' ? body.tel.replace(/\D/g, '') : '';
    // Each helper: name, how they are related, and a 10-digit WhatsApp. Duplicated numbers are dropped.
    const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
    const helperList = (Array.isArray(body.helpers) ? body.helpers : [])
      .map((h: { name?: unknown; rel?: unknown; tel?: unknown }) => ({ name: clean(h?.name, 40), rel: clean(h?.rel, 30), tel: typeof h?.tel === 'string' ? h.tel.replace(/\D/g, '') : '' }))
      .filter((h, i, all) => all.findIndex((x) => x.tel === h.tel) === i);
    const helpers = helperList.map((h) => h.tel);
    const sendTo = typeof body.sendTo === 'string' ? body.sendTo.replace(/\D/g, '') : '';
    if (
      name.length < 2 || name.length > 60 || !TEL10.test(tel) || helperList.length < 1 || helperList.length > 3 ||
      !helperList.every((h) => TEL10.test(h.tel) && h.name.length >= 2 && h.rel.length >= 2) ||
      (sendTo !== '' && sendTo !== tel && !helpers.includes(sendTo)) || body.consent !== true
    ) {
      return json(200, { status: 'invalid' });
    }

    // Identifier: a picture from the bank (unique) or their own photo (only with consent, small JPEG).
    const photo = typeof body.photo === 'string' && body.photo.startsWith('data:image/jpeg;base64,') && /^[A-Za-z0-9+/=]+$/.test(body.photo.slice(23)) && body.photo.length <= 120_000 ? body.photo : '';
    const emblem = isEmblemId(body.emblem) ? body.emblem : '';
    if (photo ? body.photoConsent !== true : !emblem) return json(200, { status: 'invalid' });

    if (people.some((p) => p.tel === tel && p.status !== 'RELEASED')) return json(200, { status: 'already' });
    if (!photo && taken.includes(emblem)) return json(200, { status: 'taken' });

    const now = new Date().toISOString();
    const created = await client.models.Person.create({
      name,
      tel,
      helpers,
      helperNames: helperList.map((h) => h.name),
      helperRels: helperList.map((h) => h.rel),
      sendTo: sendTo || helpers[0],
      projectId: project.id,
      consentShared: true,
      ...(photo ? { photo, photoConsent: true } : { emblem }),
      via: 'QR',
      regAt: now,
      status: full ? 'WAITLIST' : 'PENDING',
      owner: project.owner, // the row belongs to the collector, who is not the one calling
    });
    const me = must(created, 'guardar inscripción');

    // Two signups can pick the same picture at once: the earlier one keeps it, the later one is removed and asked again.
    if (!photo) {
      const same = (await everyPerson(client))
        .filter((p) => inProject(p) && p.status !== 'RELEASED' && p.emblem === emblem)
        .sort((a, b) => (a.regAt ?? '').localeCompare(b.regAt ?? '') || a.id.localeCompare(b.id));
      if (same[0] && same[0].id !== me.id) {
        must(await client.models.Person.delete({ id: me.id }), 'quitar imagen repetida');
        return json(200, { status: 'taken' });
      }
    }

    // Two signups can both see the last free place. Settle it by arrival order: those beyond capacity wait.
    let status = me.status;
    if (project.capacity > 0 && status === 'PENDING') {
      const after = (await everyPerson(client)).filter((p) => inProject(p) && takesPlaceByStatus(p.status));
      if (overflowIds(after.map((p) => ({ id: p.id, regAt: p.regAt })), project.capacity).includes(me.id)) {
        must(await client.models.Person.update({ id: me.id, status: 'WAITLIST' }), 'poner en espera');
        status = 'WAITLIST';
      }
    }
    return json(200, { status: status === 'WAITLIST' ? 'waitlist' : 'registered' });
  } catch (e) {
    // The message names the failing step and never contains names or phone numbers; the page shows it for now.
    const detail = (e as Error).message.slice(0, 200);
    console.error('register failed', detail);
    return json(200, { status: 'error', detail });
  }
};
