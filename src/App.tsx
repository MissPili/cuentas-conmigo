import { useCallback, useEffect, useRef, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import { confirmUserAttribute, sendUserAttributeVerificationCode } from 'aws-amplify/auth';
import type { Schema } from '../amplify/data/resource';
import type { Acc, Chg, Per, Proj, View } from './model';
import { freeSpots, isFull } from './places';
import { chargeKind, thisMonth } from './model';
import { Stage } from './screens';
import { Shell } from './ui';

const client = generateClient<Schema>();
type Account = Schema['Account']['type'];
type Person = Schema['Person']['type'];
type Charge = Schema['Charge']['type'];
type Project = Schema['Project']['type'];

function mapProject(p: Project): Proj | null {
  if (!p.id || !p.token || p.open == null || p.capacity == null || p.holdDays == null) return null;
  return { id: p.id, name: p.name, open: p.open, token: p.token, capacity: p.capacity, holdDays: p.holdDays, monthlyConcept: p.monthlyConcept, monthlyAmount: p.monthlyAmount, accountId: p.accountId };
}

function newToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return btoa(String.fromCharCode(...b)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

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
  return {
    id: p.id,
    name: p.name,
    tel: p.tel,
    status: p.status,
    heldOn: p.heldOn,
    via: p.via,
    helpers: (p.helpers ?? []).filter((h): h is string => !!h),
    regAt: p.regAt,
  };
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
    paidAt: c.paidAt,
    confirmsPlace: c.confirmsPlace,
  };
}

export default function App({ signOut }: { signOut?: () => void }) {
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [people, setPeople] = useState<Per[]>([]);
  const [charges, setCharges] = useState<Chg[]>([]);
  const [project, setProject] = useState<Proj | null>(null);
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
    const [a, p, c, j] = await Promise.all([
      client.models.Account.list(),
      client.models.Person.list(),
      client.models.Charge.list(),
      client.models.Project.list(),
    ]);
    if (a.errors?.length || p.errors?.length || c.errors?.length || j.errors?.length) {
      throw new Error('list');
    }
    setAccounts(a.data.map(mapAccount).filter((x): x is Acc => !!x));
    setPeople(p.data.map(mapPerson).filter((x): x is Per => !!x));
    setCharges(c.data.map(mapCharge).filter((x): x is Chg => !!x));
    setProject(j.data.map(mapProject).find((x): x is Proj => !!x) ?? null);
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
    if (view.id !== 'wait' && view.id !== 'qr') return;
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
        project={project}
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
            await client.models.Person.create({ name: name.trim(), tel: digits, via: 'MANUAL', status: 'ENROLLED', heldOn: new Date().toISOString() });
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
        onCreateCharge={(personId, concept, amount, accountId, confirmsPlace) => {
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
              confirmsPlace,
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
        onShowQr={(id) => {
          void run(async () => {
            const r = await client.mutations.peyAction({ action: 'requestQr', id });
            if (r.errors?.length || !r.data) throw new Error('qr');
            const parsed = JSON.parse(r.data) as { qrImage?: string | null };
            if (!parsed.qrImage) throw new Error('qr');
            await load();
            setView({ id: 'qr', chargeId: id, img: parsed.qrImage });
          });
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
        onSaveProject={(input) => {
          if (!(input.capacity >= 1 && input.capacity <= 200)) { setFormError('Escribe cuántos lugares hay, de 1 a 200.'); return; }
          if (!(input.holdDays >= 1 && input.holdDays <= 60)) { setFormError('Los días de apartado van de 1 a 60.'); return; }
          const fields = {
            name: input.name,
            capacity: input.capacity,
            holdDays: input.holdDays,
            monthlyAmount: input.monthlyAmount > 0 ? input.monthlyAmount : null,
            monthlyConcept: input.monthlyConcept || null,
            accountId: input.accountId || null,
          };
          void run(async () => {
            const r = project
              ? await client.models.Project.update({ id: project.id, ...fields })
              : await client.models.Project.create({ ...fields, open: true, token: newToken() });
            if (r.errors?.length) throw new Error('project');
            await load();
          }, () => land({ id: 'places' }, 'Listo. Ya quedó guardado.'));
        }}
        onSendCode={async () => {
          try {
            await sendUserAttributeVerificationCode({ userAttributeKey: 'email' });
            return '';
          } catch {
            return 'No se pudo mandar el código. Intenta de nuevo en un momento.';
          }
        }}
        onWipe={async (code) => {
          try {
            await confirmUserAttribute({ userAttributeKey: 'email', confirmationCode: code.trim() });
          } catch {
            return 'El código no es correcto o ya venció.';
          }
          try {
            // The code was right: delete in small groups so a long list does not flood the connection.
            const jobs: (() => Promise<unknown>)[] = [];
            for (const c of charges) jobs.push(() => client.models.Charge.delete({ id: c.id }));
            for (const p of people) jobs.push(() => client.models.Person.delete({ id: p.id }));
            for (let i = 0; i < jobs.length; i += 10) await Promise.all(jobs.slice(i, i + 10).map((j) => j()));
            await load();
            land({ id: 'home' }, 'Listo. Se borraron las personas y los cobros.');
            return '';
          } catch {
            await load();
            return 'No se pudo borrar todo. Intenta de nuevo.';
          }
        }}
        onToggleOpen={() => {
          if (!project) return;
          void run(async () => {
            const r = await client.models.Project.update({ id: project.id, open: !project.open });
            if (r.errors?.length) throw new Error('project');
            await load();
          }, () => setNote(project.open ? 'Inscripciones cerradas.' : 'Inscripciones abiertas.'));
        }}
        onRotateToken={() => {
          if (!project) return;
          void run(async () => {
            const r = await client.models.Project.update({ id: project.id, token: newToken() });
            if (r.errors?.length) throw new Error('project');
            await load();
          }, () => setNote('Listo. El código anterior ya no sirve.'));
        }}
        onSeat={(personId, action) => {
          if (action === 'give' && project && isFull(people, project, charges, new Date()) && freeSpots(people, project, charges, new Date()) === 0) {
            setNote('No hay lugar libre. Libera uno primero.');
            return;
          }
          const now = new Date().toISOString();
          const patch =
            action === 'release' ? { status: 'RELEASED' as const }
            : action === 'extend' ? { heldOn: now }
            : { status: 'ENROLLED' as const, heldOn: now };
          const message =
            action === 'release' ? 'Listo. Ese lugar quedó libre.'
            : action === 'extend' ? 'Listo. Se apartó más días.'
            : 'Listo. Ya tiene lugar. Ya le puedes cobrar.';
          void run(async () => {
            const r = await client.models.Person.update({ id: personId, ...patch });
            if (r.errors?.length) throw new Error('seat');
            await load();
          }, () => land(action === 'release' || action === 'extend' ? { id: 'places' } : { id: 'seat', personId }, message));
        }}
        onCheck={(id) => {
          void run(async () => {
            const r = await client.mutations.peyAction({ action: 'checkCharge', id });
            if (r.errors?.length) throw new Error('pey');
            await load();
            setNote(r.data === 'PAID' ? 'Sí, ya pagó.' : 'Todavía no vemos el pago. Intenta en un momento.');
          });
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
