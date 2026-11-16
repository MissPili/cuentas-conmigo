// Who helps a person pay, shared by the public signup and the collector's "add person" flow.
// Rule: if a relative helps, PERSON 1 is required (name, relation, 10-digit WhatsApp); persons 2 and 3 are optional.
// An optional block left empty is ignored; one filled halfway asks to be completed or removed.
import type { Helper } from './model';

/** Who is typing: the person themselves ("tu") or the collector adding someone ("su"). */
export type Who = 'self' | 'other';
export type PayMode = '' | 'self' | 'helper';

export const MAX_HELPERS = 3;

export const digits = (s: string) => s.replace(/\D/g, '');
export const fmtTel = (t: string) => (t.length === 10 ? `${t.slice(0, 2)} ${t.slice(2, 6)} ${t.slice(6)}` : t);

export const emptyHelper = (): Helper => ({ name: '', rel: '', tel: '' });

const squash = (s: string) => s.trim().replace(/\s+/g, ' ');
export const normHelper = (h: Helper): Helper => ({ name: squash(h.name), rel: squash(h.rel), tel: digits(h.tel) });
const filled = (h: Helper) => !!(h.name || h.rel || h.tel);

/** The helpers that get saved: none unless a relative helps; empty optional blocks and repeated numbers are dropped. */
export function cleanHelpers(mode: PayMode, helpers: Helper[]): Helper[] {
  if (mode !== 'helper') return [];
  return helpers
    .map(normHelper)
    .filter(filled)
    .filter((h, i, all) => !h.tel || all.findIndex((x) => x.tel === h.tel) === i)
    .slice(0, MAX_HELPERS);
}

/** The helpers of a person as saved. Older rows only kept the number, so name and relation can be empty. */
export function helpersOf(p: { helperInfo?: Helper[] | null; helpers?: string[] | null }): Helper[] {
  return p.helperInfo?.length ? p.helperInfo : (p.helpers ?? []).map((tel) => ({ tel, name: '', rel: '' }));
}

/** What a saved helper still lacks, in words ("su nombre", "qué es de la persona"); empty when complete. */
export function helperGaps(h: Helper): string[] {
  return [h.name.trim().length < 2 ? 'su nombre' : '', h.rel.trim().length < 2 ? 'qué es de la persona' : '', h.tel.length !== 10 ? 'su WhatsApp' : ''].filter(Boolean);
}

/** Where codes and receipts go: the chosen number if it is still one of the known ones, else the first helper, else the person. */
export function chooseSendTo(clean: Helper[], sendTo: string, own: string): string {
  return clean.some((h) => h.tel === sendTo) || sendTo === own ? sendTo : (clean[0]?.tel ?? own);
}

const TEXT = {
  self: {
    mode: 'Elige cómo vas a pagar.',
    first: 'Escribe quién te ayuda a pagar.',
    name: 'Escribe el nombre de quien te ayuda.',
    rel: 'Escribe qué es tuyo, por ejemplo: mi hija.',
    tel: 'Cada WhatsApp debe tener 10 números.',
  },
  other: {
    mode: 'Elige cómo va a pagar.',
    first: 'Escribe quién le ayuda a pagar.',
    name: 'Escribe el nombre de quien le ayuda.',
    rel: 'Escribe qué es de la persona, por ejemplo: su hija.',
    tel: 'Cada WhatsApp debe tener 10 números.',
  },
} as const;

const OPTIONAL_HALF = 'Completa los datos de la otra persona, o quítala.';

/** Empty string when everything is fine; otherwise the sentence to show. */
export function payProblem(mode: PayMode, helpers: Helper[], who: Who): string {
  const t = TEXT[who];
  if (!mode) return t.mode;
  if (mode !== 'helper') return '';
  for (const [i, raw] of helpers.slice(0, MAX_HELPERS).entries()) {
    const h = normHelper(raw);
    if (!filled(h)) {
      if (i === 0) return t.first; // person 1 is required, the rest may stay empty
      continue;
    }
    if (h.name.length < 2) return i === 0 ? t.name : OPTIONAL_HALF;
    if (h.rel.length < 2) return i === 0 ? t.rel : OPTIONAL_HALF;
    if (h.tel.length !== 10) return i === 0 ? t.tel : OPTIONAL_HALF;
  }
  return '';
}
