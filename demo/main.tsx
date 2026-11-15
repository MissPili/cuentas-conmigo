// Demo harness: the real screens with INVENTED data and no server. Used for screenshots and design work.
// Run `npm run dev` and open /demo/?v=home (other views: who, person, charge, cash, wait, qr, paid, receipt,
// people, add-person, new-charge, accounts, account, add-account, problem).
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import '../src/index.css';
import { Stage } from '../src/screens';
import { Shell } from '../src/ui';
import { thisMonth, type Acc, type Chg, type Per, type View } from '../src/model';

const accounts: Acc[] = [
  { id: 'a1', alias: 'Taller', legalName: 'Titular de ejemplo', clabe: '012180015826225713', entity: 'PERSON', peyId: 'p1', codiStatus: 'ACTIVE' },
  { id: 'a2', alias: 'DIF', legalName: 'Institución de ejemplo', clabe: '000000000000000000', entity: 'BUSINESS', peyId: 'p2', codiStatus: 'PROCESSING' },
];
const people: Per[] = [
  { id: 'p1', name: 'Rosa Martínez', tel: '5500000001' },
  { id: 'p2', name: 'Juan López', tel: '5500000002' },
  { id: 'p3', name: 'Elena Ruiz', tel: '5500000003' },
  { id: 'p4', name: 'Pedro Sánchez', tel: '5500000004' },
  { id: 'p5', name: 'Lucía Torres', tel: '5500000005' },
];
const m = thisMonth();
const base = { month: m, accountId: 'a1', concept: 'Mensualidad', amount: 130 };
const now = new Date().toISOString();
const charges: Chg[] = [
  { ...base, id: 'c1', personId: 'p1', personName: 'Rosa Martínez', tel: '5500000001', status: 'PAID', via: 'CODI', paidAt: now, transactionId: 't1' },
  { ...base, id: 'c2', personId: 'p2', personName: 'Juan López', tel: '5500000002', status: 'PENDING', transactionId: 't2' },
  { ...base, id: 'c3', personId: 'p3', personName: 'Elena Ruiz', tel: '5500000003', status: 'PENDING' },
  { ...base, id: 'c4', personId: 'p4', personName: 'Pedro Sánchez', tel: '5500000004', status: 'PAID', via: 'CASH', paidAt: now },
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
    case 'who': return { id: 'who', page: 0 };
    case 'person': return { id: 'person', personId: 'p3', page: 0 };
    case 'charge': return { id: 'charge', chargeId: 'c3' };
    case 'cash': return { id: 'cash', chargeId: 'c3' };
    case 'wait': return { id: 'wait', chargeId: 'c2' };
    case 'qr': return { id: 'qr', chargeId: 'c3', img: fakeQr() };
    case 'paid': return { id: 'paid', chargeId: 'c1' };
    case 'receipt': return { id: 'receipt', chargeId: 'c1' };
    case 'people': return { id: 'people' };
    case 'add-person': return { id: 'add-person' };
    case 'new-charge': return { id: 'new-charge', personId: 'p5' };
    case 'accounts': return { id: 'accounts', page: 0 };
    case 'account': return { id: 'account', accountId: 'a2' };
    case 'add-account': return { id: 'add-account' };
    default: return { id: 'home' };
  }
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
        signOut={noop}
        onView={setView}
        onReset={setView}
        onOpenPerson={(personId) => setView({ id: 'person', personId, page: 0 })}
        onAddPerson={noop}
        onAddAccount={noop}
        onCreateCharge={noop}
        onRequest={() => setView({ id: 'wait', chargeId: 'c3' })}
        onShowQr={() => setView({ id: 'qr', chargeId: 'c3', img: fakeQr() })}
        onCash={() => setView({ id: 'paid', chargeId: 'c3' })}
        onRegister={noop}
        onRefresh={noop}
        onRetry={noop}
        problem={first === 'problem' ? { title: 'No se pudo', detail: 'Pey no respondió. Intenta de nuevo.' } : null}
      />
    </Shell>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Demo />
  </React.StrictMode>,
);
