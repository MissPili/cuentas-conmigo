// Demo harness: the real screens with INVENTED data and no server. Used for screenshots and design work.
// Run `npm run dev` and open /demo/index.html?v=home. Views: home, more, who, person, charge, cash, wait, qr, send-qr, paid,
// receipt, people, add-person, new-charge, accounts, account, add-account, report, places, seats, review, seat,
// seat-late, reg-qr, places-settings, problem, and the public signup page: signup1 ... signup4, signup-done, signup-full.
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../src/index.css';
import { Stage } from '../src/screens';
import { Shell } from '../src/ui';
import Inscripcion from '../src/Inscripcion';
import { thisMonth, type Acc, type Chg, type Per, type Proj, type View } from '../src/model';

const accounts: Acc[] = [
  { id: 'a1', alias: 'Taller', legalName: 'Titular de ejemplo', clabe: '012180015826225713', entity: 'PERSON', peyId: 'p1', codiStatus: 'ACTIVE' },
  { id: 'a2', alias: 'DIF', legalName: 'Institución de ejemplo', clabe: '000000000000000000', entity: 'BUSINESS', peyId: 'p2', codiStatus: 'PROCESSING' },
];
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const people: Per[] = [
  { id: 'p1', name: 'Rosa Martínez', tel: '5500000001', emblem: 'gato', status: 'ENROLLED', via: 'MANUAL', heldOn: daysAgo(40),  },
  { id: 'p2', name: 'Juan López', tel: '5500000002', emblem: 'perro', status: 'ENROLLED', via: 'MANUAL', heldOn: daysAgo(40),  },
  { id: 'p3', name: 'Elena Ruiz', tel: '5500000003', emblem: 'pez', status: 'ENROLLED', via: 'MANUAL', heldOn: daysAgo(40),  },
  { id: 'p4', name: 'Pedro Sánchez', tel: '5500000004', emblem: 'nopal', status: 'ENROLLED', via: 'MANUAL', heldOn: daysAgo(40),  },
  { id: 'p5', name: 'Lucía Torres', tel: '5500000005', emblem: 'luna', status: 'ENROLLED', via: 'QR', heldOn: daysAgo(8), helpers: ['5500000015'], regAt: daysAgo(9) },
  { id: 'p6', name: 'Marta Díaz', tel: '5500000006', emblem: 'abeja', status: 'PENDING', via: 'QR', helpers: ['5500000016', '5500000026'], regAt: daysAgo(0) },
  { id: 'p7', name: 'Hugo Ramírez', tel: '5500000007', emblem: 'uvas', status: 'WAITLIST', via: 'QR', helpers: ['5500000017'], regAt: daysAgo(1) },
];
const project: Proj = { id: 'j1', name: 'Taller', open: true, token: 'demo-token-demo-token-demo', capacity: 6, holdDays: 5, monthlyConcept: 'Mensualidad', monthlyAmount: 130, accountId: 'a1' };
const m = thisMonth();
const base = { month: m, accountId: 'a1', concept: 'Mensualidad', amount: 130, confirmsPlace: true };
const now = new Date().toISOString();
const charges: Chg[] = [
  { ...base, id: 'c1', personId: 'p1', personName: 'Rosa Martínez', tel: '5500000001', status: 'PAID', via: 'CODI', paidAt: now, transactionId: 't1' },
  { ...base, id: 'c2', personId: 'p2', personName: 'Juan López', tel: '5500000002', status: 'PENDING', transactionId: 't2' },
  { ...base, id: 'c3', personId: 'p3', personName: 'Elena Ruiz', tel: '5500000003', status: 'PENDING' },
  { ...base, id: 'c4', personId: 'p4', personName: 'Pedro Sánchez', tel: '5500000004', status: 'PAID', via: 'CASH', paidAt: now },
  { ...base, id: 'c5', personId: 'p1', personName: 'Rosa Martínez', tel: '5500000001', accountId: 'a2', concept: 'Anual DIF', amount: 40, confirmsPlace: false, status: 'PAID', via: 'CODI', paidAt: now },
];

// A stand-in picture for the QR (a real one comes from Pey).
function fakeQr(): string {
  const c = document.createElement('canvas');
  c.width = 290;
  c.height = 290;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 290, 290);
  g.fillStyle = '#000';
  let seed = 7;
  for (let y = 0; y < 29; y++) {
    for (let x = 0; x < 29; x++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      if (seed % 3 === 0) g.fillRect(x * 10, y * 10, 10, 10);
    }
  }
  for (const [x, y] of [[0, 0], [220, 0], [0, 220]]) {
    g.fillStyle = '#000';
    g.fillRect(x, y, 70, 70);
    g.fillStyle = '#fff';
    g.fillRect(x + 10, y + 10, 50, 50);
    g.fillStyle = '#000';
    g.fillRect(x + 20, y + 20, 30, 30);
  }
  return c.toDataURL('image/png').split(',')[1];
}

const first = new URLSearchParams(location.search).get('v') ?? 'home';

function start(): View {
  switch (first) {
    case 'danger': return { id: 'danger' };
    case 'more': return { id: 'more' };
    case 'who': return { id: 'who', page: 0 };
    case 'person': return { id: 'person', personId: 'p3', page: 0 };
    case 'charge': return { id: 'charge', chargeId: 'c3' };
    case 'cash': return { id: 'cash', chargeId: 'c3' };
    case 'wait': return { id: 'wait', chargeId: 'c2' };
    case 'qr': return { id: 'qr', chargeId: 'c3', img: fakeQr() };
    case 'send-qr': return { id: 'send-qr', chargeId: 'c3', img: fakeQr() };
    case 'paid': return { id: 'paid', chargeId: 'c1' };
    case 'receipt': return { id: 'receipt', chargeId: 'c1' };
    case 'people': return { id: 'people' };
    case 'add-person': return { id: 'add-person' };
    case 'new-charge': return { id: 'new-charge', personId: 'p5' };
    case 'accounts': return { id: 'accounts', page: 0 };
    case 'account': return { id: 'account', accountId: 'a2' };
    case 'add-account': return { id: 'add-account' };
    case 'report': return { id: 'report', month: m };
    case 'places': return { id: 'places' };
    case 'seats': return { id: 'seats', page: 0 };
    case 'review': return { id: 'seats', page: 0, only: 'review' };
    case 'seat': return { id: 'seat', personId: 'p6' };
    case 'seat-leave': return { id: 'seat', personId: 'p3' };
    case 'seat-late': return { id: 'seat', personId: 'p5' };
    case 'reg-qr': return { id: 'reg-qr' };
    case 'places-settings': return { id: 'places-settings' };
    default: return { id: 'home' };
  }
}

const signupSteps: Record<string, { step: number; name?: string; tel?: string; helpers?: string[] }> = {
  signup1: { step: 1 },
  signup2: { step: 2, name: 'María Hernández' },
  'signup2-pick': { step: 2, name: 'María Hernández', pic: 'pick' },
  signup3: { step: 3, name: 'María Hernández', emblem: 'girasol', tel: '5500000009' },
  signup4: { step: 4, name: 'María Hernández', emblem: 'girasol', tel: '5500000009', helpers: ['5500000019', '5500000029'] },
  'signup-done': { step: 4, name: 'María Hernández', emblem: 'girasol', tel: '5500000009', helpers: ['5500000019'] },
  'signup-full': { step: 1 },
};

// The signup page talks to a server; here it gets invented answers.
if (first.startsWith('signup')) {
  window.fetch = (async (_url: unknown, init?: RequestInit) => {
    const body = init?.method === 'POST'
      ? { status: 'registered' }
      : { status: 'open', name: 'Taller de ejemplo', full: first === 'signup-full', taken: ['gato', 'perro', 'sol'] };
    return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
  }) as typeof window.fetch;
}

function Demo() {
  const [view, setView] = useState<View>(start());
  const noop = () => {};
  return (
    <Shell canBack={view.id !== 'home'} onBack={() => setView({ id: 'home' })}>
      <Stage
        view={view}
        busy={false}
        formError=""
        accounts={accounts}
        people={people}
        charges={charges}
        project={project}
        signOut={noop}
        onView={setView}
        onReset={setView}
        onOpenPerson={(personId) => setView({ id: 'person', personId, page: 0 })}
        onAddPerson={noop}
        onAddAccount={noop}
        onCreateCharge={noop}
        onSaveProject={noop}
        onToggleOpen={noop}
        onSendCode={async () => ''}
        onWipe={async () => ''}
        onRotateToken={noop}
        onSeat={noop}
        onRequest={() => setView({ id: 'wait', chargeId: 'c3' })}
        onShowQr={() => setView({ id: 'qr', chargeId: 'c3', img: fakeQr() })}
        onCash={() => setView({ id: 'paid', chargeId: 'c3' })}
        onCheck={noop}
        onRegister={noop}
        onRefresh={noop}
        onRetry={noop}
        problem={first === 'problem' ? { title: 'No se pudo', detail: 'Pey no respondió. Intenta de nuevo.' } : null}
      />
    </Shell>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
if (first.startsWith('signup')) {
  const initial = signupSteps[first] ?? { step: 1 };
  root.render(
    <React.StrictMode>
      <Inscripcion token="demo-token-demo-token-demo" registerUrl="https://demo.invalid/" initial={initial} />
    </React.StrictMode>,
  );
} else {
  root.render(
    <React.StrictMode>
      <Demo />
    </React.StrictMode>,
  );
}
