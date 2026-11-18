// Writing, erasing and checking NFC chips from the app (Web NFC). It only exists in Chrome on Android, over https:
// iPhone (Safari and every browser there) cannot write chips from a web page, so the app says so and keeps the manual guide.
// The pure parts (which records to write, what a chip holds, how a failure is named) have no browser globals, so tests run them.
import { codeFromAddress, hasKeyringRight } from './keyring.ts';
import type { Per } from './model.ts';

/** What Chrome's Web NFC needs; not part of TypeScript's DOM types. */
type NdefRecordInit = { recordType: string; data?: string };
type NdefRecord = { recordType: string; data?: DataView };
interface NdefReadingEvent extends Event { message: { records: NdefRecord[] } }
interface NdefReader extends EventTarget {
  scan(o?: { signal?: AbortSignal }): Promise<void>;
  write(m: { records: NdefRecord[] | NdefRecordInit[] }, o?: { overwrite?: boolean; signal?: AbortSignal }): Promise<void>;
}
type NdefReaderCtor = new () => NdefReader;

export const nfcSupported = (): boolean => typeof window !== 'undefined' && 'NDEFReader' in window && window.isSecureContext;

/** The one record a keychain carries: a web address. */
export const urlRecords = (url: string): NdefRecordInit[] => [{ recordType: 'url', data: url }];
/** Erasing = writing an empty record. */
export const emptyRecords = (): NdefRecordInit[] => [{ recordType: 'empty' }];

/** The smallest common chip (NTAG213) holds 144 bytes; the address plus the record's own bytes must fit. */
export const fitsSmallChip = (url: string): boolean => new TextEncoder().encode(url).length + 8 <= 137;

/** The addresses found in what a chip holds (text records and anything else are ignored). */
export function urlsOf(records: { recordType: string; data?: DataView }[]): string[] {
  const out: string[] = [];
  for (const r of records) {
    if ((r.recordType === 'url' || r.recordType === 'absolute-url') && r.data) out.push(new TextDecoder().decode(r.data));
  }
  return out;
}

export type TagContent<P> =
  | { kind: 'empty' } // nothing written
  | { kind: 'same'; person: P } // already this person's address
  | { kind: 'other'; person: P } // another person's keychain of this app
  | { kind: 'unknown' } // looks like a keychain of this app but nobody here has that code (another taller, a replaced one)
  | { kind: 'foreign' }; // something else (another app, a plain link)

/** What a chip holds, in the app's own words. Only 'empty' and 'same' are safe to overwrite without asking. */
export function classifyTag<P extends Pick<Per, 'id' | 'keyCode' | 'status'>>(urls: string[], people: P[], personId: string): TagContent<P> {
  if (!urls.length) return { kind: 'empty' };
  let sawCode = false;
  for (const u of urls) {
    let code: string | null = null;
    try {
      const x = new URL(u);
      code = codeFromAddress(x.pathname, x.search);
    } catch {
      code = null;
    }
    if (!code) continue;
    sawCode = true;
    const owner = people.find((p) => p.keyCode === code && hasKeyringRight(p));
    if (owner) return owner.id === personId ? { kind: 'same', person: owner } : { kind: 'other', person: owner };
  }
  return sawCode ? { kind: 'unknown' } : { kind: 'foreign' };
}

export type NfcProblem = 'unsupported' | 'denied' | 'unreadable' | 'write' | 'cancelled';

/** Names a failure from the browser. NetworkError is what a write gives when the chip moved away, is locked or is too small. */
export function nfcProblem(err: unknown): NfcProblem {
  const name = (err as { name?: string } | null)?.name ?? '';
  if (name === 'AbortError') return 'cancelled';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotSupportedError' || name === 'ReferenceError') return 'unsupported';
  if (name === 'NotReadableError') return 'unreadable';
  return 'write';
}

export const PROBLEM_TEXT: Record<NfcProblem, string> = {
  unsupported: 'Este celular no puede escribir chips desde la app. Usa Chrome en un Android, o sigue la guía con otra aplicación.',
  denied: 'No hay permiso para usar el NFC. Enciende el NFC del celular y permite el acceso cuando Chrome lo pida.',
  unreadable: 'No se pudo leer el chip. Acércalo a la parte de atrás del celular, sin moverlo, y vuelve a probar.',
  write: 'No se pudo grabar. Deja el chip quieto sobre el celular hasta que termine. Si ya estaba bloqueado, no se puede cambiar.',
  cancelled: '',
};

function reader(): NdefReader {
  return new (window as unknown as { NDEFReader: NdefReaderCtor }).NDEFReader();
}

/** Waits for one chip and gives the addresses it holds. Resolves with [] for an empty chip. */
export function readTag(signal: AbortSignal): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const r = reader();
    const onAbort = () => reject(Object.assign(new Error('abort'), { name: 'AbortError' }));
    signal.addEventListener('abort', onAbort, { once: true });
    r.addEventListener('reading', (e) => {
      signal.removeEventListener('abort', onAbort);
      resolve(urlsOf((e as NdefReadingEvent).message.records));
    }, { once: true });
    r.addEventListener('readingerror', () => {
      signal.removeEventListener('abort', onAbort);
      reject(Object.assign(new Error('unreadable'), { name: 'NotReadableError' }));
    }, { once: true });
    r.scan({ signal }).catch((e) => { signal.removeEventListener('abort', onAbort); reject(e); });
  });
}

/** Writes the address on the chip that is (or gets) close to the phone, replacing what it had. */
export function writeTag(url: string, signal: AbortSignal): Promise<void> {
  return reader().write({ records: urlRecords(url) }, { overwrite: true, signal });
}

/** Leaves the chip empty. */
export function eraseTag(signal: AbortSignal): Promise<void> {
  return reader().write({ records: emptyRecords() }, { overwrite: true, signal });
}
