export type Acc = {
  id: string;
  alias: string;
  legalName: string;
  clabe: string;
  entity: 'PERSON' | 'BUSINESS';
  peyId?: string | null;
  codiStatus?: 'PENDING' | 'PROCESSING' | 'ACTIVE' | 'ERROR' | null;
  errorMessage?: string | null;
};

export type PersonStatus = 'PENDING' | 'ENROLLED' | 'WAITLIST' | 'RELEASED';

export type Per = {
  id: string;
  name: string;
  tel: string;
  /** Places: null means added by hand (counts as enrolled and never expires). */
  status?: PersonStatus | null;
  heldOn?: string | null; // ISO date the place was held or last extended
  via?: 'QR' | 'MANUAL' | null;
  helpers?: string[]; // 10-digit WhatsApp numbers of the people who help pay (1 to 3)
  regAt?: string | null; // when they signed up through the QR
};

/** One row per collector: settings for places and the signup QR. */
export type Proj = { id: string; name?: string | null; open: boolean; token: string; capacity: number; holdDays: number };

export type Chg = {
  id: string;
  personId: string;
  personName: string;
  tel: string;
  accountId: string;
  concept: string;
  amount: number;
  month: string;
  via?: 'CODI' | 'CASH' | null;
  status?: 'PENDING' | 'PAID' | null;
  transactionId?: string | null;
  paidAt?: string | null;
  /** True for the monthly fee: only that payment confirms a place. */
  confirmsPlace?: boolean | null;
};

export type View =
  | { id: 'home' }
  | { id: 'who'; page: number }
  | { id: 'person'; personId: string; page: number }
  | { id: 'charge'; chargeId: string }
  | { id: 'cash'; chargeId: string }
  | { id: 'wait'; chargeId: string }
  | { id: 'qr'; chargeId: string; img: string }
  | { id: 'paid'; chargeId: string }
  | { id: 'receipt'; chargeId: string }
  | { id: 'people' }
  | { id: 'add-person' }
  | { id: 'new-charge'; personId: string }
  | { id: 'accounts'; page: number }
  | { id: 'account'; accountId: string }
  | { id: 'add-account' }
  | { id: 'more' }
  | { id: 'places' }
  | { id: 'seats'; page: number; only?: 'review' }
  | { id: 'seat'; personId: string }
  | { id: 'reg-qr' }
  | { id: 'places-settings' }
  | { id: 'report'; month: string }
  | { id: 'access' }
  | { id: 'loading' };

export type Kind = 'paid' | 'wait' | 'due' | 'bad';

/** Local month (Mexico), not UTC: with UTC the month flips at 6 pm on the last day. */
export const thisMonth = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};

export function shiftMonth(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1 + delta, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

export function monthName(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  const name = new Date(y, (m || 1) - 1, 1).toLocaleDateString('es-MX', { month: 'long' });
  return name.charAt(0).toLocaleUpperCase('es-MX') + name.slice(1);
}

export function money(n: number): string {
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

/** A comma followed by exactly 3 digits is a thousands mark. Any other comma is a decimal. */
export function parseAmount(raw: string): number {
  let s = raw.trim().replace(/[^0-9.,]/g, '');
  if (!s) return Number.NaN;
  const comma = s.lastIndexOf(',');
  const dot = s.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    s = comma > dot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (comma >= 0) {
    const parts = s.split(',');
    s = parts.length === 2 && parts[1].length === 3 ? s.replace(',', '') : s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function ready(a: Acc | undefined): boolean {
  return !!a && !!a.peyId && a.codiStatus === 'ACTIVE';
}

export function chargeKind(c: Chg): Kind {
  if (c.status === 'PAID') return 'paid';
  if (c.transactionId) return 'wait';
  return 'due';
}

export function chargeWords(c: Chg): string {
  const k = chargeKind(c);
  if (k === 'paid') return c.via === 'CASH' ? 'Ya pagó, en efectivo' : 'Ya pagó, por celular';
  if (k === 'wait') return 'Esperando el pago';
  return 'Falta pagar';
}

export function accountWords(a: Acc): { kind: Kind; text: string } {
  if (a.codiStatus === 'ACTIVE') return { kind: 'paid', text: 'Lista para cobrar' };
  if (a.codiStatus === 'ERROR') return { kind: 'bad', text: 'Con error' };
  if (a.codiStatus === 'PROCESSING' || a.peyId) return { kind: 'wait', text: 'En espera, hasta 5 días hábiles' };
  return { kind: 'due', text: 'Por confirmar' };
}

export function personWords(mine: Chg[]): { kind: Kind; text: string } {
  if (!mine.length) return { kind: 'due', text: 'Sin cobro este mes' };
  if (mine.every((c) => chargeKind(c) === 'paid')) return { kind: 'paid', text: 'Ya pagó' };
  if (mine.some((c) => chargeKind(c) === 'wait')) return { kind: 'wait', text: 'Esperando el pago' };
  return { kind: 'due', text: 'Falta pagar' };
}

export function pageOf<T>(items: T[], page: number): { rows: T[]; more: { page: number; label: string; hint: string } | null } {
  if (items.length <= 4) return { rows: items, more: null };
  const size = 3;
  const pages = Math.ceil(items.length / size);
  const p = ((page % pages) + pages) % pages;
  const last = p === pages - 1;
  return {
    rows: items.slice(p * size, p * size + size),
    more: {
      page: (p + 1) % pages,
      label: last ? 'Volver a las primeras' : 'Ver más',
      hint: `Hoja ${p + 1} de ${pages}`,
    },
  };
}
