// NFC keychain: each person can carry a keychain with a chip that holds ONE thing, a web address with a long random code.
// Tapping it with the collector's phone opens the app (she is already signed in) straight on that person's charge screen.
// The chip has no name, amount or bank data, and by itself it cannot charge anything: a stranger who taps it only sees
// the sign-in page. Losing a keychain = switch it off; a replacement gets a NEW code, so the old chip never opens anything.
// Pure functions (no React, no browser globals at import time) so the tests can run them.
import type { Per } from './model.ts';

/** Query parameter of the chip's address: https://<app>/?l=<code>. The signup QR already works this way (?i=). */
export const KEY_PARAM = 'l';

const CODE = /^[A-Za-z0-9_-]{20,100}$/;
export const isKeyCode = (s: unknown): s is string => typeof s === 'string' && CODE.test(s);

/** 16 random bytes in base64url: 22 characters, 128 bits, no relation to the name, the phone or the order of signup. */
export function newKeyCode(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  let bin = '';
  for (const x of b) bin += String.fromCharCode(x);
  return btoa(bin).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

/** The address written in the chip. It must keep working for as long as the chip does, so it is never changed lightly. */
export const keyringUrl = (origin: string, code: string) => `${origin}/?${KEY_PARAM}=${code}`;

/**
 * Finds the code in the address the app was opened with. Reads the form that is written (/?l=<code>) and also
 * /llavero/<code> (with or without the closing slash), which is the form the first design note described.
 */
export function codeFromAddress(pathname: string, search: string): string | null {
  const fromQuery = new URLSearchParams(search).get(KEY_PARAM);
  if (isKeyCode(fromQuery)) return fromQuery;
  const m = /^\/llavero\/([^/]+)\/?$/.exec(pathname || '');
  return m && isKeyCode(m[1]) ? m[1] : null;
}

/** Who gets a keychain: people with an approved place. Waiting, on the list or dados de baja do not. */
export const hasKeyringRight = (p: Pick<Per, 'status'>) => p.status === 'ENROLLED' || !p.status;

/** The people the keychain images are made for, in the order of the list. */
export const activeForKeyring = <P extends Pick<Per, 'status' | 'name'>>(people: P[]): P[] =>
  people.filter(hasKeyringRight).sort((a, b) => a.name.localeCompare(b.name, 'es'));

export type KeyState = 'none' | 'on' | 'off';
export const keyState = (p: Pick<Per, 'keyCode' | 'keyOn'>): KeyState => (!p.keyCode ? 'none' : p.keyOn === false ? 'off' : 'on');

export type Tap<P> =
  | { kind: 'ok'; person: P } // works: go straight to charging this person
  | { kind: 'off'; person: P } // switched off (lost)
  | { kind: 'gone'; person: P } // the person was dada de baja
  | { kind: 'unknown' }; // nobody here has this code (another collector's chip, or a replaced one)

/** What a tap means, given the collector's own people. Only 'ok' may open the charge screen. */
export function resolveTap<P extends Pick<Per, 'keyCode' | 'keyOn' | 'status'>>(people: P[], code: string): Tap<P> {
  const person = people.find((p) => p.keyCode === code);
  if (!person) return { kind: 'unknown' };
  if (!hasKeyringRight(person)) return { kind: 'gone', person };
  if (keyState(person) === 'off') return { kind: 'off', person };
  return { kind: 'ok', person };
}

/** File name of the image to print: the drawing's name (they are unique), never the phone. Photos use the first name. */
export function keyringFileName(p: { name: string; emblemName?: string | null; hasPhoto: boolean }): string {
  const clean = (s: string) =>
    s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const base = p.hasPhoto || !p.emblemName ? clean(p.name.trim().split(/\s+/)[0] ?? '') : clean(p.emblemName);
  return `llavero-${base || 'persona'}.png`;
}

/** Makes file names unique inside one batch: llavero-ana.png, llavero-ana-2.png, ... */
export function dedupeNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const k = (seen.get(n) ?? 0) + 1;
    seen.set(n, k);
    return k === 1 ? n : n.replace(/\.png$/, `-${k}.png`);
  });
}
