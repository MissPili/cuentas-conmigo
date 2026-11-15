import { useCallback, useEffect, useRef, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../amplify/data/resource';
import type { Acc, Chg, Per, View } from './model';
import { chargeKind, thisMonth } from './model';
import { Stage } from './screens';
import { Shell } from './ui';

const client = generateClient<Schema>();
type Account = Schema['Account']['type'];
type Person = Schema['Person']['type'];
type Charge = Schema['Charge']['type'];

function mapAccount(a: Account): Acc | null {
  if (!a.id || !a.alias || !a.legalName || !a.clabe) return null;
  return {
    id: a.id,
    alias: a.alias,
    legalName: a.legalName,
    clabe: a.clabe,
    entity: a.entity === 'BUSINESS' ? 'BUSINESS' : 'PERSON',
    peyId: a.peyId,
    codiStatus: a.codiStatus,
    errorMessage: a.errorMessage,
  };
}

function mapPerson(p: Person): Per | null {
  if (!p.id || !p.name || !p.tel) return null;
  return { id: p.id, name: p.name, tel: p.tel };
}

function mapCharge(c: Charge): Chg | null {
  if (!c.id || !c.personId || !c.personName || !c.tel || !c.accountId || !c.concept || c.amount == null || !c.month) return null;
  return {
    id: c.id,
    personId: c.personId,
    personName: c.personName,
    tel: c.tel,
    accountId: c.accountId,
    concept: c.concept,
    amount: c.amount,
    month: c.month,
    via: c.via,
    status: c.status,
    transactionId: c.transactionId,
  };
}

export default function App({ signOut }: { signOut?: () => void }) {
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [people, setPeople] = useState<Per[]>([]);
  const [charges, setCharges] = useState<Chg[]>([]);
  const [view, setView] = useState<View>({ id: 'loading' });
  const [hist, setHist] = useState<View[]>([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<{ title: string; detail: string } | null>(null);
  const retryRef = useRef<(() => void) | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;

  const load = useCallback(async () => {
    const [a, p, c] = await Promise.all([
      client.models.Account.list(),
      client.models.Person.list(),
      client.models.Charge.list(),
    ]);
    if (a.errors?.length || p.errors?.length || c.errors?.length) {
      throw new Error('list');
    }
    setAccounts(a.data.map(mapAccount).filter((x): x is Acc => !!x));
    setPeople(p.data.map(mapPerson).filter((x): x is Per => !!x));
    setCharges(c.data.map(mapCharge).filter((x): x is Chg => !!x));
  }, []);

  useEffect(() => {
    let alive = true;
    load()
      .then(() => { if (alive) setView((v) => (v.id === 'loading' ? { id: 'home' } : v)); })
      .catch(() => {
        if (!alive) return;
        retryRef.current = () => {
          setProblem(null);
          setView({ id: 'loading' });
          load().then(() => setView({ id: 'home' })).catch(() => {
            setView({ id: 'home' });
            setProblem({ title: 'No se pudieron leer tus datos', detail: 'Revisa tu conexión e inténtalo de nuevo.' });
          });
        };
        setView({ id: 'home' });
        setProblem({ title: 'No se pudieron leer tus datos', detail: 'Revisa tu conexión e inténtalo de nuevo.' });
      });
    const t = setInterval(() => { load().catch(() => { /* the next try will show it */ }); }, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [load]);

  useEffect(() => {
    if (view.id !== 'wait') return;
    const c = charges.find((x) => x.id === view.chargeId);
    if (c && chargeKind(c) === 'paid') setView({ id: 'paid', chargeId: c.id });
  }, [charges, view]);

  function go(next: View) {
    setProblem(null);
    setFormError('');
    setNote('');
    if (next.id === 'home') {
      setHist([]);
      setView({ id: 'home' });
      return;
    }
    setHist((h) => [...h, viewRef.current]);
    setView(next);
  }

  function back() {
    if (problem) { setProblem(null); return; }
    setFormError('');
    setNote('');
    setHist((h) => {
      const prev = h[h.length - 1];
      if (prev) setView(prev);
      return h.slice(0, -1);
    });
  }

  function land(next: View, message: string) {
    setProblem(null);
    setFormError('');
    setNote(message);
    setHist([{ id: 'home' }]);
    setView(next);
  }

  async function run(task: () => Promise<void>, done?: () => void) {
    if (busy) return;
    setBusy(true);
    setFormError('');
    try {
      await task();
      done?.();
    } catch {
      const again = () => { void run(task, done); };
      retryRef.current = again;
      setProblem({ title: 'No se pudo completar', detail: 'Revisa tu conexión e inténtalo de nuevo.' });
    } finally {
      setBusy(false);
    }
  }

  function openPerson(personId: string) {
    const month = thisMonth();
    const mine = charges.filter((c) => c.personId === personId && c.month === month);
    if (mine.length === 0) go({ id: 'new-charge', personId });
    else if (mine.length === 1) {
      const c = mine[0];
      if (chargeKind(c) === 'paid') go({ id: 'paid', chargeId: c.id });
      else if (chargeKind(c) === 'wait') go({ id: 'wait', chargeId: c.id });
      else go({ id: 'charge', chargeId: c.id });
    } else go({ id: 'person', personId, page: 0 });
  }

  return (
    <Shell canBack={hist.length > 0 && view.id !== 'loading'} onBack={back} note={note}>
      <Stage
        view={view}
        busy={busy}
        formError={formError}
        accounts={accounts}
        people={people}
        charges={charges}
        signOut={signOut}
        problem={problem}
        onView={go}
        onReset={(next) => {
          setProblem(null);
          setFormError('');
          setNote('');
          setHist(next.id === 'home' ? [] : [{ id: 'home' }]);
          setView(next);
        }}
        onOpenPerson={openPerson}
        onRetry={() => retryRef.current?.()}
        onAddPerson={(name, tel) => {
          const digits = tel.replace(/\D/g, '');
          if (digits.length !== 10) { setFormError('El teléfono debe tener 10 números.'); return; }
          void run(async () => {
            await client.models.Person.create({ name: name.trim(), tel: digits });
            await load();
          }, () => land({ id: 'people' }, 'Persona guardada.'));
        }}
        onAddAccount={(input) => {
          const clabe = input.clabe.replace(/\D/g, '');
          if (clabe.length !== 18) { setFormError('La CLABE debe tener 18 números.'); return; }
          if (!input.alias.trim() || !input.legalName.trim()) { setFormError('Escribe el nombre corto y el nombre de quien es la cuenta.'); return; }
          void run(async () => {
            await client.models.Account.create({
              alias: input.alias.trim(),
              legalName: input.legalName.trim(),
              clabe,
              entity: input.entity,
            });
            await load();
          }, () => land({ id: 'accounts', page: 0 }, 'Cuenta guardada.'));
        }}
        onCreateCharge={(personId, concept, amount, accountId) => {
          const person = people.find((x) => x.id === personId);
          if (!person) return;
          if (!(amount > 0)) { setFormError('Escribe el monto.'); return; }
          if (!accountId) { setFormError('Elige la cuenta.'); return; }
          void run(async () => {
            const created = await client.models.Charge.create({
              personId: person.id,
              personName: person.name,
              tel: person.tel,
              accountId,
              concept: concept.trim() || 'Cuota',
              amount,
              month: thisMonth(),
              status: 'PENDING',
            });
            if (created.errors?.length || !created.data?.id) throw new Error('create');
            await load();
            go({ id: 'charge', chargeId: created.data.id });
          });
        }}
        onRequest={(id) => {
          void run(async () => {
            const r = await client.mutations.peyAction({ action: 'requestCodi', id });
            if (r.errors?.length) throw new Error('pey');
            await load();
          }, () => setView({ id: 'wait', chargeId: id }));
        }}
        onCash={(id) => {
          void run(async () => {
            const r = await client.models.Charge.update({
              id,
              status: 'PAID',
              via: 'CASH',
              paidAt: new Date().toISOString(),
            });
            if (r.errors?.length) throw new Error('cash');
            await load();
          }, () => setView({ id: 'paid', chargeId: id }));
        }}
        onRegister={(id) => {
          void run(async () => {
            const r = await client.mutations.peyAction({ action: 'registerAccount', id });
            if (r.errors?.length) throw new Error('pey');
            await load();
          }, () => land({ id: 'account', accountId: id }, 'Listo. Ya la mandamos a revisar.'));
        }}
        onRefresh={(id) => {
          void run(async () => {
            const r = await client.mutations.peyAction({ action: 'refreshAccount', id });
            if (r.errors?.length) throw new Error('pey');
            await load();
          }, () => setNote('Ya revisamos la cuenta.'));
        }}
      />
    </Shell>
  );
}
