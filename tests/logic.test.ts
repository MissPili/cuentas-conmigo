// Run with: npm test  (Node 24 runs TypeScript directly; no extra dependency).
import test from 'node:test';
import assert from 'node:assert/strict';
import type { Acc, Chg, Per, Proj } from '../src/model.ts';
import {
  canCharge, confirmedCount, freeSpots, hasConfirmed, holdExpired, isFull, occupied, overflowIds, placeState, placesOn, toApprove, waitlisted,
} from '../src/places.ts';
import { buildReport, reportCsv } from '../src/report.ts';
import { parseAmount, shiftMonth } from '../src/model.ts';
import { explainProblem } from '../src/problems.ts';
import { chooseSendTo, cleanHelpers, helperGaps, helpersOf, payProblem } from '../src/payers.ts';
import { destinations } from '../src/comprobante.ts';
import { isProbe, parseShareRequest, shareLink, shortLinksWork, signupMessage, whatsappShareUrl } from '../src/links.ts';
import {
  activeForKeyring, codeFromAddress, dedupeNames, isKeyCode, keyState, keyringFileName, keyringUrl, newKeyCode, resolveTap,
} from '../src/keyring.ts';

const proj: Proj = { id: 'j', open: true, token: 't', capacity: 3, holdDays: 5 };
const now = new Date('2026-11-20T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
const per = (id: string, o: Partial<Per> = {}): Per => ({ id, name: 'Persona ' + id, tel: '5500000000', ...o });
const chg = (id: string, personId: string, o: Partial<Chg> = {}): Chg => ({
  id, personId, personName: 'x', tel: '5500000000', accountId: 'a1', concept: 'Mensualidad', amount: 130, month: '2026-11', status: 'PENDING', ...o,
});

test('places are off without a project or with capacity 0', () => {
  assert.equal(placesOn(null), false);
  assert.equal(placesOn({ ...proj, capacity: 0 }), false);
  assert.equal(placesOn(proj), true);
});

test('added by hand (no status) holds a place and never expires', () => {
  const p = per('1', { heldOn: daysAgo(90) });
  assert.equal(placeState(p, proj, [], now), 'held');
  assert.equal(holdExpired(p, proj, [], now), false);
});

test('QR signup, approved, never paid: expires only after holdDays', () => {
  const fresh = per('1', { via: 'QR', status: 'ENROLLED', heldOn: daysAgo(4) });
  const old = per('2', { via: 'QR', status: 'ENROLLED', heldOn: daysAgo(6) });
  assert.equal(placeState(fresh, proj, [], now), 'held');
  assert.equal(placeState(old, proj, [], now), 'overdue');
});

test('anyone who paid once never expires by time', () => {
  const p = per('1', { via: 'QR', status: 'ENROLLED', heldOn: daysAgo(30) });
  assert.equal(holdExpired(p, proj, [chg('c', '1', { status: 'PAID', confirmsPlace: false })], now), false);
});

test('only the monthly fee confirms the place', () => {
  const p = per('1', { via: 'QR', status: 'ENROLLED', heldOn: daysAgo(1) });
  const annual = chg('c1', '1', { status: 'PAID', concept: 'Anual DIF', confirmsPlace: false });
  const monthly = chg('c2', '1', { status: 'PAID', confirmsPlace: true });
  assert.equal(hasConfirmed(p, [annual]), false);
  assert.equal(placeState(p, proj, [annual], now), 'held');
  assert.equal(placeState(p, proj, [annual, monthly], now), 'confirmed');
  assert.equal(confirmedCount([p], proj, [monthly], now), 1);
});

test('pending, held and overdue count as taken; waitlist and released do not', () => {
  const people = [
    per('1', { status: 'PENDING', via: 'QR' }),
    per('2'),
    per('3', { via: 'QR', status: 'ENROLLED', heldOn: daysAgo(9) }),
    per('4', { status: 'WAITLIST', via: 'QR' }),
    per('5', { status: 'RELEASED' }),
  ];
  assert.equal(occupied(people, proj, [], now), 3);
  assert.equal(isFull(people, proj, [], now), true);
  assert.equal(freeSpots(people, proj, [], now), 0);
});

test('nobody pending, waiting or released can be charged', () => {
  assert.equal(canCharge(per('1')), true);
  assert.equal(canCharge(per('2', { status: 'ENROLLED' })), true);
  for (const s of ['PENDING', 'WAITLIST', 'RELEASED'] as const) assert.equal(canCharge(per('3', { status: s })), false);
});

test('lists to approve and waitlist are first come, first served', () => {
  const people = [
    per('b', { status: 'PENDING', regAt: '2026-11-02T10:00:00Z' }),
    per('a', { status: 'PENDING', regAt: '2026-11-01T10:00:00Z' }),
    per('w2', { status: 'WAITLIST', regAt: '2026-11-04T10:00:00Z' }),
    per('w1', { status: 'WAITLIST', regAt: '2026-11-03T10:00:00Z' }),
  ];
  assert.deepEqual(toApprove(people).map((p) => p.id), ['a', 'b']);
  assert.deepEqual(waitlisted(people).map((p) => p.id), ['w1', 'w2']);
});

test('two signups at the same time for the last place: exactly one keeps it', () => {
  const taking = [
    { id: 'x', regAt: '2026-11-01T10:00:00.100Z' },
    { id: 'y', regAt: '2026-11-01T10:00:00.100Z' },
    { id: 'z', regAt: '2026-11-01T09:00:00Z' },
  ];
  assert.deepEqual(overflowIds(taking, 2), ['y']); // z first, then x (tie by id), y waits
  assert.deepEqual(overflowIds(taking, 3), []);
});

const accounts: Acc[] = [{ id: 'a1', alias: 'Taller', legalName: 'T', clabe: '0', entity: 'PERSON' }];

test('report: expected, received, pending, CoDi vs cash', () => {
  const people = [per('1'), per('2'), per('3')];
  const charges = [
    chg('c1', '1', { status: 'PAID', via: 'CODI', paidAt: '2026-11-05T10:00:00Z' }),
    chg('c2', '2', { status: 'PAID', via: 'CASH' }),
    chg('c3', '2', { concept: 'Anual DIF', amount: 40 }),
    chg('c4', '1', { month: '2026-10' }),
  ];
  const r = buildReport('2026-11', people, charges, accounts);
  assert.equal(r.expected, 300);
  assert.equal(r.received, 260);
  assert.equal(r.pending, 40);
  assert.equal(r.codi, 130);
  assert.equal(r.cash, 130);
  assert.equal(r.withoutCharge, 1);
  assert.equal(r.rows[0].personId, '2'); // who still owes comes first
});

test('report skips people who cannot be charged yet when counting missing charges', () => {
  const people = [per('1'), per('2', { status: 'PENDING' })];
  const r = buildReport('2026-11', people, [], accounts, canCharge);
  assert.equal(r.withoutCharge, 1);
});

test('csv quotes commas and quotes and has one line per charge', () => {
  const people = [per('1', { name: 'Ruiz, "Lupita"' })];
  const csv = reportCsv(buildReport('2026-11', people, [chg('c1', '1', { status: 'PAID', via: 'CASH' })], accounts));
  const lines = csv.split('\r\n');
  assert.equal(lines.length, 2);
  assert.ok(lines[1].includes('"Ruiz, ""Lupita"""'));
  assert.ok(lines[1].includes('"Efectivo"'));
});

test('months shift across the year and amounts accept comma or point', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(parseAmount('1,250'), 1250);
  assert.equal(parseAmount('12,5'), 12.5);
});

test('picture bank: ids are unique and a pick never repeats a taken one', async () => {
  const { EMBLEMS, pickEmblems, freeEmblems } = await import('../src/emblems.ts');
  assert.equal(new Set(EMBLEMS.map((e) => e.id)).size, EMBLEMS.length);
  assert.equal(new Set(EMBLEMS.map((e) => e.glyph)).size, EMBLEMS.length);
  const taken = EMBLEMS.slice(0, 20).map((e) => e.id);
  const got = pickEmblems(taken, 3);
  assert.equal(got.length, 3);
  assert.ok(got.every((e) => !taken.includes(e.id)));
  assert.equal(freeEmblems(EMBLEMS.map((e) => e.id)).length, 0);
  assert.deepEqual(pickEmblems(EMBLEMS.map((e) => e.id), 3), []);
});

test('destinations: the number the person chose comes first and helpers carry their names', async () => {
  const { destinations, payText } = await import('../src/comprobante.ts');
  const helpers = [
    { tel: '5500000001', name: 'Ana Pérez', rel: 'mi hija' },
    { tel: '5500000002', name: 'Luis Gómez', rel: 'mi vecino' },
  ];
  const d = destinations('5500000009', helpers, '5500000002');
  assert.equal(d[0].tel, '5500000002');
  assert.equal(d[0].label, 'Luis Gómez (mi vecino)');
  assert.equal(d[0].name, 'Luis');
  assert.ok(d[0].chosen);
  assert.equal(d.length, 3);
  const msg = payText({ projectName: 'Taller', payerName: 'Rosa', concept: 'Mensualidad', amount: 130, qrPng: '' }, 'Luis');
  assert.ok(msg.startsWith('Hola Luis.'));
  assert.ok(msg.includes('Rosa') && msg.includes('Taller') && msg.includes('antes de aprobar'));
});

test('plans: a one-time enrolment and a monthly fee for the 10 months of the school cycle', async () => {
  const { cycleStart, cycleMonth, cycleEnd, duePlans, parsePlans, serializePlans, legacyPlan } = await import('../src/plans.ts');
  assert.equal(cycleStart(new Date(2026, 10, 15)), '2026-08'); // November: this year's cycle
  assert.equal(cycleStart(new Date(2027, 2, 1)), '2026-08'); // March: still last August's cycle
  assert.equal(cycleStart(new Date(2026, 7, 1)), '2026-08'); // August starts it
  const plans = [
    { id: 'a', kind: 'ONCE' as const, concept: 'Inscripción', amount: 40, accountId: 'x' },
    { id: 'b', kind: 'MONTHLY' as const, concept: 'Mensualidad', amount: 130, accountId: 'x', start: '2026-08', months: 10 },
  ];
  assert.equal(cycleMonth(plans[1], '2026-08'), 1);
  assert.equal(cycleMonth(plans[1], '2027-05'), 10);
  assert.equal(cycleMonth(plans[1], '2027-06'), 0); // the cycle is over
  assert.equal(cycleMonth(plans[1], '2026-07'), 0); // not started
  assert.equal(cycleEnd(plans[1]), '2027-05');
  const none: Chg[] = [];
  assert.deepEqual(duePlans(plans, 'p', none, '2026-11').map((d) => d.plan.id), ['a', 'b']);
  const paid = (concept: string, month: string): Chg => ({ id: concept + month, personId: 'p', personName: 'P', tel: '5500000001', accountId: 'x', concept, amount: 1, month, status: 'PAID' });
  // The enrolment is never due twice; the monthly one is due again next month.
  assert.deepEqual(duePlans(plans, 'p', [paid('Inscripción', '2026-08'), paid('Mensualidad', '2026-11')], '2026-11').map((d) => d.plan.id), []);
  assert.deepEqual(duePlans(plans, 'p', [paid('Inscripción', '2026-08'), paid('Mensualidad', '2026-11')], '2026-12').map((d) => d.plan.id), ['b']);
  assert.deepEqual(duePlans(plans, 'p', [paid('Inscripción', '2026-08')], '2027-06').map((d) => d.plan.id), []);
  assert.deepEqual(parsePlans(serializePlans(plans)), plans);
  assert.deepEqual(parsePlans('basura'), []);
  assert.equal(legacyPlan(130, null, 'x', new Date(2026, 10, 1))[0].months, 10);
  assert.deepEqual(legacyPlan(0, null, 'x', new Date()), []);
});

test('plans: only the first (initial) charge confirms the place', async () => {
  const { duePlans } = await import('../src/plans.ts');
  const plans = [
    { id: 'a', kind: 'ONCE' as const, concept: 'Inscripción', amount: 40, accountId: 'x' },
    { id: 'b', kind: 'MONTHLY' as const, concept: 'Mensualidad', amount: 130, accountId: 'x', start: '2026-08', months: 10 },
  ];
  const due = duePlans(plans, 'p', [], '2026-11');
  assert.deepEqual(due.map((d) => [d.plan.id, d.confirms]), [['a', true], ['b', false]]);
});

test('a push CoDi refused by Pey says so, in plain words, and keeps the real reason', () => {
  const p = explainProblem('Pey 500: INTERNAL_SERVER_ERROR: Error creating CoDi push notification');
  assert.equal(p.title, 'Pey no pudo pedir el pago');
  assert.match(p.detail, /código para pagar/);
  assert.match(p.tech ?? '', /Error creating CoDi push notification/);
});

test('an account that is not active yet is explained without technical text', () => {
  const p = explainProblem('Account not active yet');
  assert.equal(p.title, 'La cuenta todavía no está lista');
  assert.equal(p.tech, undefined);
});

test('Pey saying the bank account is unknown is not confused with our own "not found"', () => {
  // Happens when the Pey key is changed: the account was registered with the old key.
  const p = explainProblem('Pey 404: NOT_FOUND: Bank account not found');
  assert.equal(p.title, 'Pey no encuentra la cuenta que recibe');
  assert.match(p.detail, /llave de Pey/);
  assert.match(p.tech ?? '', /Bank account not found/);
  assert.equal(explainProblem('Pey 400: INVALID_PARAMETER: bankAccountId does not exist', 'charge').title, 'Pey no encuentra la cuenta que recibe');
  // ... while a plain 404 about something else keeps the generic Pey wording.
  assert.equal(explainProblem('Pey 404: NOT_FOUND: route').title, 'Pey no pudo pedir el pago');
});

test('our own "not found" and data read errors keep the technical line for whoever helps', () => {
  const nf = explainProblem('Charge not found');
  assert.equal(nf.title, 'No encontramos ese registro');
  assert.match(nf.tech ?? '', /Charge not found/);
  const de = explainProblem('Data error: Unauthorized');
  assert.equal(de.title, 'No se pudieron leer los datos');
  assert.match(de.tech ?? '', /Unauthorized/);
});

test('only real connection failures talk about the connection', () => {
  assert.match(explainProblem('Network error').detail, /conexión/);
  assert.match(explainProblem('Load failed').detail, /conexión/);
  assert.doesNotMatch(explainProblem('seat').detail, /conexión/);
  assert.doesNotMatch(explainProblem('Pey 400: INVALID_PARAMETER: bad phone').detail, /conexión/);
});

test('the advice changes with the topic: accounts do not suggest the payment code', () => {
  assert.doesNotMatch(explainProblem('Pey 400: INVALID_PARAMETER: bad clabe', 'account').detail, /código/);
  assert.match(explainProblem('Pey 503: SERVICE_UNAVAILABLE: maintenance').title, /no está disponible/);
});

const TOKEN22 = 'AbCdEfGhIjKlMnOpQr-_12';

test('share requests: short path, kept prefix, image and the first long link all find the token', () => {
  assert.deepEqual(parseShareRequest('/' + TOKEN22), { token: TOKEN22, image: false });
  assert.deepEqual(parseShareRequest('/' + TOKEN22 + '.png'), { token: TOKEN22, image: true });
  assert.deepEqual(parseShareRequest('/p/' + TOKEN22), { token: TOKEN22, image: false });
  assert.deepEqual(parseShareRequest('/', { t: TOKEN22 }), { token: TOKEN22, image: false });
  assert.deepEqual(parseShareRequest('/', { t: TOKEN22, img: '1' }), { token: TOKEN22, image: true });
});

test('share requests: short, odd or empty tokens are refused', () => {
  assert.equal(parseShareRequest('/'), null);
  assert.equal(parseShareRequest('/abc'), null);
  assert.equal(parseShareRequest('/' + TOKEN22 + '/otra'), null);
  assert.equal(parseShareRequest('/<script>' + TOKEN22), null);
  assert.equal(parseShareRequest('/', { t: 'x'.repeat(101) }), null);
});

test('the probe path is not a token', () => {
  assert.equal(isProbe('/probe'), true);
  assert.equal(isProbe('/p/probe/'), true);
  assert.equal(isProbe('/' + TOKEN22), false);
  assert.equal(parseShareRequest('/probe'), null);
});

test('the link sent is short when the rewrite works and the long one otherwise', () => {
  const o = { origin: 'https://app.example.mx', shareUrl: 'https://abc.lambda-url.us-east-2.on.aws/', token: TOKEN22 };
  assert.equal(shareLink({ ...o, short: true }), 'https://app.example.mx/p/' + TOKEN22);
  assert.equal(shareLink({ ...o, short: false }), 'https://abc.lambda-url.us-east-2.on.aws/?t=' + TOKEN22);
});

test('short links are detected by the marker in the answer, never by the status', async () => {
  const answer = (body: string, status = 200) => (async () => new Response(body, { status })) as unknown as typeof fetch;
  assert.equal(await shortLinksWork('https://a.mx', answer('<html><head><meta name="cuentas-share" content="1"></head>ok'), true), true);
  assert.equal(await shortLinksWork('https://a.mx', answer('<!doctype html><title>Cuentas conmigo</title>'), true), false); // the app's own page
  assert.equal(await shortLinksWork('https://a.mx', answer('not found', 404), true), false);
  assert.equal(await shortLinksWork('https://a.mx', (async () => { throw new TypeError('Load failed'); }) as unknown as typeof fetch, true), false);
});

test('the check is made once per visit', async () => {
  let calls = 0;
  const counting = (async () => { calls += 1; return new Response('cuentas-share'); }) as unknown as typeof fetch;
  await shortLinksWork('https://a.mx', counting, true);
  await shortLinksWork('https://a.mx', counting);
  assert.equal(calls, 1);
});

test('signup message and WhatsApp link without a number', () => {
  assert.match(signupMessage('Taller de pintura'), /inscribirte a Taller de pintura/);
  assert.doesNotMatch(signupMessage(''), / a\./);
  const u = whatsappShareUrl('Hola\n\nhttps://app.example.mx/?i=abc');
  assert.ok(u.startsWith('https://wa.me/?text='));
  assert.ok(!/wa\.me\/\d/.test(u));
  assert.match(decodeURIComponent(u), /https:\/\/app\.example\.mx\/\?i=abc/);
});

const marta = { name: 'Marta Ruiz', rel: 'su hija', tel: '55 0000 0011' };
const blank = { name: '', rel: '', tel: '' };

test('paying with help: person 1 is required, persons 2 and 3 are optional', () => {
  // nobody chose yet
  assert.match(payProblem('', [blank], 'self'), /Elige cómo vas a pagar/);
  assert.match(payProblem('', [blank], 'other'), /Elige cómo va a pagar/);
  // paying alone needs no helper at all
  assert.equal(payProblem('self', [blank], 'self'), '');
  // with help, an empty person 1 is refused even if person 2 is filled
  assert.match(payProblem('helper', [blank], 'self'), /quién te ayuda/);
  assert.match(payProblem('helper', [blank, marta], 'other'), /quién le ayuda/);
  // person 1 filled, persons 2 and 3 left empty: fine
  assert.equal(payProblem('helper', [marta, blank, blank], 'self'), '');
});

test('paying with help: an optional person filled halfway asks to be completed or removed', () => {
  assert.match(payProblem('helper', [marta, { name: 'Luis', rel: '', tel: '' }], 'self'), /otra persona, o quítala/);
  assert.match(payProblem('helper', [marta, { name: 'Luis', rel: 'su hijo', tel: '123' }], 'other'), /otra persona, o quítala/);
  assert.equal(payProblem('helper', [marta, { name: 'Luis', rel: 'su hijo', tel: '5500000012' }], 'other'), '');
});

test('paying with help: person 1 needs name, relation and ten digits', () => {
  assert.match(payProblem('helper', [{ ...marta, name: '' }], 'self'), /nombre/);
  assert.match(payProblem('helper', [{ ...marta, rel: '' }], 'self'), /qué es tuyo/);
  assert.match(payProblem('helper', [{ ...marta, rel: '' }], 'other'), /qué es de la persona/);
  assert.match(payProblem('helper', [{ ...marta, tel: '123' }], 'self'), /10 números/);
});

test('the helpers saved: none when paying alone, empty optional blocks dropped, repeated numbers merged', () => {
  const luis = { name: 'Luis', rel: 'su hijo', tel: '5500000012' };
  assert.deepEqual(cleanHelpers('self', [marta]), []);
  assert.deepEqual(cleanHelpers('', [marta]), []);
  assert.deepEqual(cleanHelpers('helper', [marta, blank, blank]).map((h) => h.tel), ['5500000011']);
  assert.deepEqual(cleanHelpers('helper', [marta, luis, { ...luis, name: 'Luis otra vez' }]).map((h) => h.name), ['Marta Ruiz', 'Luis']);
});

test('where codes and receipts go: the chosen number if still valid, else the first helper, else the person', () => {
  const clean = cleanHelpers('helper', [marta]);
  assert.equal(chooseSendTo(clean, '', '5500000010'), '5500000011');
  assert.equal(chooseSendTo(clean, '5500000010', '5500000010'), '5500000010');
  assert.equal(chooseSendTo(clean, '5599999999', '5500000010'), '5500000011');
  assert.equal(chooseSendTo([], '', '5500000010'), '5500000010');
});

// ---- NFC keychain ----

test('a keychain code is long, random, url-safe and different every time', () => {
  const codes = new Set(Array.from({ length: 200 }, () => newKeyCode()));
  assert.equal(codes.size, 200);
  for (const c of codes) {
    assert.equal(c.length, 22); // 16 random bytes
    assert.ok(isKeyCode(c));
    assert.match(c, /^[A-Za-z0-9_-]+$/); // nothing that needs escaping inside a web address
  }
});

test('only well-formed codes are accepted', () => {
  assert.equal(isKeyCode('abc'), false); // too short to be one of ours
  assert.equal(isKeyCode('a'.repeat(22) + '!'), false);
  assert.equal(isKeyCode(''), false);
  assert.equal(isKeyCode(null), false);
  assert.equal(isKeyCode(undefined), false);
});

test('the chip address is the app address plus the code, and reads back to the same code', () => {
  const code = newKeyCode();
  const url = new URL(keyringUrl('https://cuentasconmigo.misspili.com.mx', code));
  assert.equal(url.origin, 'https://cuentasconmigo.misspili.com.mx');
  assert.equal(codeFromAddress(url.pathname, url.search), code);
});

test('the code is found in /?l=<code> and in /llavero/<code>, and nowhere else', () => {
  const code = newKeyCode();
  assert.equal(codeFromAddress('/', '?l=' + code), code);
  assert.equal(codeFromAddress('/llavero/' + code, ''), code);
  assert.equal(codeFromAddress('/llavero/' + code + '/', ''), code);
  assert.equal(codeFromAddress('/', ''), null);
  assert.equal(codeFromAddress('/', '?l=corto'), null);
  assert.equal(codeFromAddress('/', '?i=' + code), null); // the signup parameter is a different thing
  assert.equal(codeFromAddress('/otra/' + code, ''), null);
  assert.equal(codeFromAddress('/llavero/' + code + '/mas', ''), null);
});

test('who can have a keychain: approved people only, in alphabetical order', () => {
  const list = [
    per('1', { name: 'Zoila', status: 'ENROLLED' }),
    per('2', { name: 'Ana' }), // added by hand: no status
    per('3', { name: 'Beto', status: 'PENDING' }),
    per('4', { name: 'Carla', status: 'WAITLIST' }),
    per('5', { name: 'Dora (baja)', status: 'RELEASED' }),
    per('6', { name: 'Álvaro', status: 'ENROLLED' }),
  ];
  // The accent does not move Álvaro away from the A's: Álvaro, Ana, Zoila.
  assert.deepEqual(activeForKeyring(list).map((p) => p.id), ['6', '2', '1']);
});

test('keychain state: none, on, or off', () => {
  assert.equal(keyState({}), 'none');
  assert.equal(keyState({ keyCode: 'x', keyOn: true }), 'on');
  assert.equal(keyState({ keyCode: 'x' }), 'on'); // a code with no flag works
  assert.equal(keyState({ keyCode: 'x', keyOn: false }), 'off');
  assert.equal(keyState({ keyOn: true }), 'none'); // a flag with no code is nothing
});

test('a tap opens the charge screen only for an active keychain of an active person', () => {
  const a = newKeyCode();
  const b = newKeyCode();
  const c = newKeyCode();
  const people = [
    per('1', { keyCode: a, keyOn: true, status: 'ENROLLED' }),
    per('2', { keyCode: b, keyOn: false, status: 'ENROLLED' }), // lost
    per('3', { keyCode: c, keyOn: true, status: 'RELEASED' }), // dada de baja
    per('4'),
  ];
  const ok = resolveTap(people, a);
  assert.equal(ok.kind, 'ok');
  assert.equal(ok.kind === 'ok' && ok.person.id, '1');
  assert.equal(resolveTap(people, b).kind, 'off');
  assert.equal(resolveTap(people, c).kind, 'gone');
  assert.equal(resolveTap(people, newKeyCode()).kind, 'unknown');
});

test('a replaced keychain: the old code no longer matches anyone', () => {
  const oldCode = newKeyCode();
  const fresh = newKeyCode();
  const before = [per('1', { keyCode: oldCode, keyOn: true })];
  assert.equal(resolveTap(before, oldCode).kind, 'ok');
  const after = [per('1', { keyCode: fresh, keyOn: true })];
  assert.equal(resolveTap(after, oldCode).kind, 'unknown');
  assert.equal(resolveTap(after, fresh).kind, 'ok');
});

test('a tap for a code nobody has never shows another person', () => {
  const people = [per('1', { keyCode: newKeyCode(), keyOn: true })];
  assert.equal(resolveTap(people, newKeyCode()).kind, 'unknown');
  assert.equal(resolveTap([], newKeyCode()).kind, 'unknown');
});

test('image file names: the drawing name, or the first name for a photo, never the phone', () => {
  assert.equal(keyringFileName({ name: 'Ana López', emblemName: 'Girasol', hasPhoto: false }), 'llavero-girasol.png');
  assert.equal(keyringFileName({ name: 'Ana López', emblemName: 'Mariposa azul', hasPhoto: false }), 'llavero-mariposa-azul.png');
  assert.equal(keyringFileName({ name: 'José Ángel Pérez', emblemName: null, hasPhoto: true }), 'llavero-jose.png');
  assert.equal(keyringFileName({ name: 'Ana López', emblemName: 'Girasol', hasPhoto: true }), 'llavero-ana.png');
  assert.equal(keyringFileName({ name: '   ', emblemName: null, hasPhoto: false }), 'llavero-persona.png');
});

test('repeated file names in one batch get a number', () => {
  assert.deepEqual(
    dedupeNames(['llavero-ana.png', 'llavero-luis.png', 'llavero-ana.png', 'llavero-ana.png']),
    ['llavero-ana.png', 'llavero-luis.png', 'llavero-ana-2.png', 'llavero-ana-3.png'],
  );
});

// ---- Who is registered and who gets the CoDi request ----

test('the helpers of a person: with names when saved, only numbers in older rows', () => {
  const info = [{ tel: '5500000011', name: 'Marta', rel: 'su hija' }];
  assert.deepEqual(helpersOf({ helperInfo: info, helpers: ['5500000011'] }), info);
  assert.deepEqual(helpersOf({ helpers: ['5500000011'] }), [{ tel: '5500000011', name: '', rel: '' }]);
  assert.deepEqual(helpersOf({}), []);
});

test('what a saved helper still lacks is said in words', () => {
  assert.deepEqual(helperGaps({ tel: '5500000011', name: 'Marta', rel: 'su hija' }), []);
  assert.deepEqual(helperGaps({ tel: '5500000011', name: '', rel: '' }), ['su nombre', 'qué es de la persona']);
  assert.deepEqual(helperGaps({ tel: '55000', name: 'Marta', rel: 'su hija' }), ['su WhatsApp']);
});

test('the CoDi request can go to the person or to any of up to 3 helpers, the preferred one first', () => {
  const hs = [
    { tel: '5500000011', name: 'Marta Ruiz', rel: 'su hija' },
    { tel: '5500000012', name: 'Luis Ruiz', rel: 'su hijo' },
    { tel: '5500000013', name: 'Rita Gómez', rel: 'su vecina' },
  ];
  const all = destinations('5500000010', hs, '5500000012', 4);
  assert.equal(all.length, 4); // the 3 helpers AND the person's own phone
  assert.equal(all[0].tel, '5500000012');
  assert.equal(all[0].chosen, true);
  assert.ok(all.some((d) => d.tel === '5500000010' && d.label === 'Su celular'));
  assert.equal(destinations('5500000010', hs, '5500000012').length, 3); // receipts keep the old limit
});

test('a person with no helpers has only their own phone as destination', () => {
  const d = destinations('5500000010', [], null, 4);
  assert.deepEqual(d.map((x) => x.tel), ['5500000010']);
});

test('a refused phone is explained without technical words', () => {
  assert.equal(explainProblem('Phone not registered').title, 'Ese número no está registrado');
});
