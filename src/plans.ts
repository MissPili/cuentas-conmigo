// Charge plans of a project: what is charged when someone joins. Each plan is paid ONCE (for example a $40
// enrolment) or is RECURRING every month for a number of months (for example $130 for 10 months of the school cycle).
// Pure functions, so they can be tested without a screen.
import type { Chg } from './model.ts';

export interface Plan {
  id: string;
  kind: 'ONCE' | 'MONTHLY';
  concept: string;
  amount: number;
  accountId: string;
  /** Recurring only: first month ("YYYY-MM") and how many months it lasts. */
  start?: string;
  months?: number;
}

export const MAX_PLANS = 2;

const ym = (n: number) => `${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}`;
const idx = (s: string) => Number(s.slice(0, 4)) * 12 + (Number(s.slice(5, 7)) - 1);

/** First month of the school cycle in progress: August (this year from August on, else last year's). */
export function cycleStart(today: Date): string {
  const y = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  return `${y}-08`;
}

export function parsePlans(json: string | null | undefined): Plan[] {
  if (!json) return [];
  try {
    const raw: unknown = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw
      .map((p): Plan | null => {
        const x = p as Partial<Plan>;
        if ((x.kind !== 'ONCE' && x.kind !== 'MONTHLY') || !x.concept || !(typeof x.amount === 'number' && x.amount > 0) || !x.accountId) return null;
        const plan: Plan = { id: String(x.id ?? x.concept), kind: x.kind, concept: String(x.concept), amount: x.amount, accountId: String(x.accountId) };
        if (x.kind === 'MONTHLY') {
          plan.start = /^\d{4}-\d{2}$/.test(String(x.start)) ? String(x.start) : undefined;
          plan.months = Number.isInteger(x.months) && (x.months as number) > 0 ? (x.months as number) : 10;
        }
        return plan;
      })
      .filter((p): p is Plan => !!p)
      .slice(0, MAX_PLANS);
  } catch {
    return [];
  }
}

export const serializePlans = (plans: Plan[]) => JSON.stringify(plans.slice(0, MAX_PLANS));

/** Plans saved before this existed: a single recurring monthly fee. */
export function legacyPlan(amount: number | null | undefined, concept: string | null | undefined, accountId: string | null | undefined, today: Date): Plan[] {
  if (!(typeof amount === 'number' && amount > 0) || !accountId) return [];
  return [{ id: 'mensualidad', kind: 'MONTHLY', concept: concept || 'Mensualidad', amount, accountId, start: cycleStart(today), months: 10 }];
}

export interface Due {
  plan: Plan;
  /** For recurring plans: which month of the cycle this is ("4 de 10"). */
  nth?: number;
  total?: number;
}

/** Month of the cycle (1-based) for a recurring plan, or 0 when `month` is before it starts / after it ends. */
export function cycleMonth(plan: Plan, month: string): number {
  if (plan.kind !== 'MONTHLY' || !plan.start || !plan.months) return 0;
  const n = idx(month) - idx(plan.start) + 1;
  return n >= 1 && n <= plan.months ? n : 0;
}

/** Last month of a recurring plan ("YYYY-MM"). */
export const cycleEnd = (plan: Plan): string => (plan.start && plan.months ? ym(idx(plan.start) + plan.months - 1) : '');

/** What can be charged to this person in `month`: one-time plans never charged before, and this month's recurring one. */
export function duePlans(plans: Plan[], personId: string, charges: Chg[], month: string): Due[] {
  const mine = charges.filter((c) => c.personId === personId);
  const out: Due[] = [];
  for (const plan of plans) {
    if (plan.kind === 'ONCE') {
      if (!mine.some((c) => c.concept === plan.concept)) out.push({ plan });
    } else {
      const nth = cycleMonth(plan, month);
      if (nth && !mine.some((c) => c.concept === plan.concept && c.month === month)) out.push({ plan, nth, total: plan.months });
    }
  }
  return out;
}
