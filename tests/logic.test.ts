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
