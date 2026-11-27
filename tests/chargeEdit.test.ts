// When a charge can be corrected: free until it is sent to pay, locked while its code is valid, free again after it expires.
import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARGE_HOURS, canEditCharge, chargeLock, conceptLocked, paidWithOldCode, untilWords } from '../src/chargeEdit.ts';

const T0 = new Date('2026-11-18T10:00:00Z');
const hours = (h: number) => new Date(T0.getTime() + h * 3600 * 1000);
const sent = { status: 'PENDING', transactionId: 'abc', sentAt: T0.toISOString() };

test('un cobro que nunca se mandó a pagar se puede corregir', () => {
  const l = chargeLock({ status: 'PENDING' }, T0);
  assert.equal(l.kind, 'free');
  assert.equal(canEditCharge(l), true);
});

test('un cobro pagado no se corrige nunca', () => {
  assert.equal(chargeLock({ ...sent, status: 'PAID' }, hours(100)).kind, 'paid');
  assert.equal(canEditCharge(chargeLock({ status: 'PAID' }, T0)), false);
});

test('ya mandado: bloqueado mientras el código sirve, libre cuando caduca', () => {
  const during = chargeLock(sent, hours(CHARGE_HOURS - 0.01));
  assert.equal(during.kind, 'sent');
  assert.equal(canEditCharge(during), false);
  if (during.kind === 'sent') assert.equal(during.until.getTime(), hours(CHARGE_HOURS).getTime());
  const after = chargeLock(sent, hours(CHARGE_HOURS));
  assert.equal(after.kind, 'expired');
  assert.equal(canEditCharge(after), true);
});

test('un cobro mandado antes de existir sentAt usa su última actualización', () => {
  const old = { status: 'PENDING', transactionId: 'abc', updatedAt: T0.toISOString() };
  assert.equal(chargeLock(old, hours(1)).kind, 'sent');
  assert.equal(chargeLock(old, hours(25)).kind, 'expired');
});

test('si no se sabe cuándo se mandó, se queda bloqueado (nunca se adivina a favor de editar)', () => {
  assert.equal(chargeLock({ status: 'PENDING', transactionId: 'abc' }, T0).kind, 'sent');
});

test('el concepto de un cobro del plan no se cambia; el de uno extraordinario sí', () => {
  assert.equal(conceptLocked({ concept: 'Mensualidad', confirmsPlace: true }, []), true);
  assert.equal(conceptLocked({ concept: 'Inscripción' }, ['Inscripción', 'Mensualidad']), true);
  assert.equal(conceptLocked({ concept: 'Cooperación', confirmsPlace: false }, ['Mensualidad']), false);
});

test('un pago de un código anterior se muestra con lo pagado y lo corregido', () => {
  assert.deepEqual(paidWithOldCode({ amount: 130, correctedAmount: 100 }), { paid: 130, shouldBe: 100 });
  assert.equal(paidWithOldCode({ amount: 130, correctedAmount: 130 }), null);
  assert.equal(paidWithOldCode({ amount: 130 }), null);
});

test('la hora límite se dice con palabras', () => {
  assert.match(untilWords(hours(2), T0), /^(hoy|mañana) a las /);
});
