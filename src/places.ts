// Places (cupos) rules as pure functions, so the screens, the signup function and the tests share one truth.
import type { Chg, Per, Proj } from './model.ts';

export type PlaceState =
  | 'confirmed' // paid the monthly fee: the place is theirs
  | 'held' // approved (or added by hand) and holding a place, no monthly payment yet
  | 'overdue' // held by QR signup, approved, never paid, and the hold days ran out
  | 'pending' // signed up by QR, waiting for the collector to approve
  | 'waitlist'
  | 'released';

const DAY = 24 * 60 * 60 * 1000;

export const placesOn = (proj: Proj | null | undefined): proj is Proj => !!proj && proj.capacity > 0;

export const everPaid = (p: Per, charges: Chg[]) => charges.some((c) => c.personId === p.id && c.status === 'PAID');

export const hasConfirmed = (p: Per, charges: Chg[]) =>
  charges.some((c) => c.personId === p.id && c.status === 'PAID' && !!c.confirmsPlace);

/** Only people signed up through the QR, already approved and never paid can lose the hold by time. */
export function holdExpired(p: Per, proj: Proj, charges: Chg[], now: Date): boolean {
  if (p.via !== 'QR' || p.status !== 'ENROLLED' || everPaid(p, charges) || !p.heldOn) return false;
  const held = new Date(p.heldOn).getTime();
  if (Number.isNaN(held)) return false;
  return now.getTime() - held > proj.holdDays * DAY;
}

export function placeState(p: Per, proj: Proj, charges: Chg[], now: Date): PlaceState {
  if (p.status === 'RELEASED') return 'released';
  if (p.status === 'WAITLIST') return 'waitlist';
  if (p.status === 'PENDING') return 'pending';
  if (hasConfirmed(p, charges)) return 'confirmed';
  if (holdExpired(p, proj, charges, now)) return 'overdue';
  return 'held';
}

/** A held, pending or overdue place still counts as taken until the collector decides. */
export const takesPlace = (s: PlaceState) => s !== 'released' && s !== 'waitlist';

export function occupied(people: Per[], proj: Proj, charges: Chg[], now: Date): number {
  return people.filter((p) => takesPlace(placeState(p, proj, charges, now))).length;
}

export const freeSpots = (people: Per[], proj: Proj, charges: Chg[], now: Date) =>
  Math.max(0, proj.capacity - occupied(people, proj, charges, now));

export const isFull = (people: Per[], proj: Proj, charges: Chg[], now: Date) =>
  occupied(people, proj, charges, now) >= proj.capacity;

export const confirmedCount = (people: Per[], proj: Proj, charges: Chg[], now: Date) =>
  people.filter((p) => placeState(p, proj, charges, now) === 'confirmed').length;

/** Nobody is charged, and nobody gets messages, until approved. Added by hand counts as approved. */
export const canCharge = (p: Per) => p.status == null || p.status === 'ENROLLED';

export function waitlisted(people: Per[]): Per[] {
  return people.filter((p) => p.status === 'WAITLIST').sort((a, b) => (a.regAt ?? '').localeCompare(b.regAt ?? ''));
}

export function toApprove(people: Per[]): Per[] {
  return people.filter((p) => p.status === 'PENDING').sort((a, b) => (a.regAt ?? '').localeCompare(b.regAt ?? ''));
}

/**
 * Two signups at the same time can both see one free place. The signup function creates the person first and
 * then settles it with this order: first come, first served, ties by id. Everyone beyond the capacity waits.
 */
export function overflowIds(taking: { id: string; regAt?: string | null }[], capacity: number): string[] {
  const sorted = [...taking].sort((a, b) => (a.regAt ?? '').localeCompare(b.regAt ?? '') || a.id.localeCompare(b.id));
  return sorted.slice(capacity).map((x) => x.id);
}

/** Status alone is enough to know if someone takes a place (used by the signup function, which has no payments). */
export const takesPlaceByStatus = (status: string | null | undefined) => status !== 'RELEASED' && status !== 'WAITLIST';

export const TEL10 = /^[0-9]{10}$/;
