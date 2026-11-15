// Monthly report as pure functions: per person and month, what was expected, received and is pending.
import type { Acc, Chg, Per } from './model.ts';

export interface ReportLine {
  chargeId: string;
  concept: string;
  amount: number;
  paid: boolean;
  via: 'CODI' | 'CASH' | null;
  account: string;
  paidAt: string | null;
}

export interface ReportRow {
  personId: string;
  name: string;
  lines: ReportLine[];
  expected: number;
  received: number;
  pending: number;
}

export interface Report {
  month: string;
  rows: ReportRow[];
  expected: number;
  received: number;
  pending: number;
  codi: number; // received through CoDi
  cash: number; // received in cash (kept by the collector)
  withoutCharge: number; // people who can be charged but have no charge this month
}

const round = (n: number) => Math.round(n * 100) / 100;

export function buildReport(
  month: string,
  people: Per[],
  charges: Chg[],
  accounts: Acc[],
  canCharge: (p: Per) => boolean = () => true,
): Report {
  const alias = (id: string) => accounts.find((a) => a.id === id)?.alias ?? '';
  const rows: ReportRow[] = [];
  let withoutCharge = 0;

  for (const p of people) {
    const mine = charges.filter((c) => c.personId === p.id && c.month === month);
    if (!mine.length) {
      if (canCharge(p)) withoutCharge += 1;
      continue;
    }
    const lines: ReportLine[] = mine.map((c) => ({
      chargeId: c.id,
      concept: c.concept,
      amount: c.amount,
      paid: c.status === 'PAID',
      via: c.status === 'PAID' ? (c.via ?? null) : null,
      account: alias(c.accountId),
      paidAt: c.paidAt ?? null,
    }));
    const expected = round(lines.reduce((t, l) => t + l.amount, 0));
    const received = round(lines.filter((l) => l.paid).reduce((t, l) => t + l.amount, 0));
    rows.push({ personId: p.id, name: p.name, lines, expected, received, pending: round(expected - received) });
  }

  rows.sort((a, b) => (b.pending > 0 ? 1 : 0) - (a.pending > 0 ? 1 : 0) || a.name.localeCompare(b.name, 'es-MX'));

  const all = rows.flatMap((r) => r.lines);
  const sum = (f: (l: ReportLine) => boolean) => round(all.filter(f).reduce((t, l) => t + l.amount, 0));
  return {
    month,
    rows,
    expected: sum(() => true),
    received: sum((l) => l.paid),
    pending: sum((l) => !l.paid),
    codi: sum((l) => l.paid && l.via === 'CODI'),
    cash: sum((l) => l.paid && l.via === 'CASH'),
    withoutCharge,
  };
}

const q = (s: string | number) => '"' + String(s).replace(/"/g, '""') + '"';

/** CSV that Excel opens with accents (BOM added by the caller). One line per charge. */
export function reportCsv(r: Report): string {
  const head = ['Mes', 'Persona', 'Concepto', 'Esperado', 'Recibido', 'Pendiente', 'Cómo pagó', 'Cuenta que recibe', 'Fecha de pago'];
  const out = [head.map(q).join(',')];
  for (const row of r.rows) {
    for (const l of row.lines) {
      out.push(
        [
          r.month,
          row.name,
          l.concept,
          l.amount.toFixed(2),
          l.paid ? l.amount.toFixed(2) : '0.00',
          l.paid ? '0.00' : l.amount.toFixed(2),
          l.paid ? (l.via === 'CASH' ? 'Efectivo' : 'CoDi') : '',
          l.account,
          l.paidAt ? l.paidAt.slice(0, 10) : '',
        ]
          .map(q)
          .join(','),
      );
    }
  }
  return out.join('\r\n');
}
