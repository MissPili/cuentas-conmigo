// When a charge can be corrected. Rule: while it has not been sent to pay (no QR shown, no CoDi request) it can be
// edited freely. Once it was sent, the payment code lives for CHARGE_HOURS (the QR's own expiry in Pey); during that
// time it is locked, so the amount the person pays can never differ from the amount on the charge. After that
// time the old code is dead and the charge can be corrected again (and a new code must be sent).
// Pure functions (no React, no browser globals) so the tests can run them.

export const CHARGE_HOURS = 24;
const WINDOW_MS = CHARGE_HOURS * 3600 * 1000;

export type ChargeLock =
  | { kind: 'paid' } // already paid: never edited
  | { kind: 'free' } // never sent to pay
  | { kind: 'sent'; until: Date } // sent, the code is still valid until then
  | { kind: 'expired' }; // sent, but the code has expired

type LockInput = { status?: string | null; transactionId?: string | null; sentAt?: string | null; updatedAt?: string | null };

export function chargeLock(c: LockInput, now: Date = new Date()): ChargeLock {
  if (c.status === 'PAID') return { kind: 'paid' };
  if (!c.sentAt && !c.transactionId) return { kind: 'free' };
  // Charges sent before sentAt existed: their last update is the closest thing to when they were sent.
  const t = Date.parse((c.sentAt ?? c.updatedAt) ?? '');
  if (!Number.isFinite(t)) return { kind: 'sent', until: new Date(now.getTime() + WINDOW_MS) }; // unknown time: stay locked
  const until = new Date(t + WINDOW_MS);
  return now.getTime() < until.getTime() ? { kind: 'sent', until } : { kind: 'expired' };
}

export const canEditCharge = (l: ChargeLock): boolean => l.kind === 'free' || l.kind === 'expired';

/** The concept of a charge that comes from the project's plan is how the app knows it was already charged: it must not change. */
export const conceptLocked = (c: { concept: string; confirmsPlace?: boolean | null }, planConcepts: string[]): boolean =>
  !!c.confirmsPlace || planConcepts.includes(c.concept);

/** What to clear when an expired charge is edited: the old code must not be linked to the corrected charge. */
export const RESET_SENT = { via: null, transactionId: null, numRef: null, pushTel: null, sentAt: null } as const;

/** "hoy a las 3:45 p. m." / "mañana a las 9:05 a. m." for a time in the next 24 hours. */
export function untilWords(until: Date, now: Date = new Date()): string {
  const sameDay = until.toDateString() === now.toDateString();
  const time = until.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
  return `${sameDay ? 'hoy' : 'mañana'} a las ${time}`;
}
