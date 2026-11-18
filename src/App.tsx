import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateClient } from 'aws-amplify/data';
import { confirmUserAttribute, sendUserAttributeVerificationCode } from 'aws-amplify/auth';
import type { Schema } from '../amplify/data/resource';
import type { Acc, Chg, Per, Proj, View } from './model';
import { freeSpots, isFull, placesOn } from './places';
import { RESET_SENT, canEditCharge, chargeLock } from './chargeEdit';
import { pickEmblems } from './emblems';
import { KEY_PARAM, codeFromAddress, newKeyCode, resolveTap } from './keyring';
import { legacyPlan, parsePlans, serializePlans } from './plans';
import { chargeKind, thisMonth } from './model';
import { feedback } from './a11y';
import { Stage } from './screens';
import { explainProblem, type Problem, type Topic } from './problems';
import { shareLink, shortLinksWork } from './links';
import { Shell } from './ui';
import outputs from '../amplify_outputs.json';

const shareUrl = (outputs as { custom?: { shareUrl?: string } }).custom?.shareUrl ?? '';

const client = generateClient<Schema>();
type Account = Schema['Account']['type'];
type Person = Schema['Person']['type'];
type Charge = Schema['Charge']['type'];
type Project = Schema['Project']['type'];

function mapProject(p: Project): Proj | null {
  if (!p.id || !p.token || p.open == null || p.capacity == null || p.holdDays == null) return null;
  const saved = parsePlans(p.plansJson);
  const plans = saved.length ? saved : legacyPlan(p.monthlyAmount, p.monthlyConcept, p.accountId, new Date());
  return { id: p.id, name: p.name, open: p.open, token: p.token, capacity: p.capacity, holdDays: p.holdDays, monthlyConcept: p.monthlyConcept, monthlyAmount: p.monthlyAmount, accountId: p.accountId, plans, createdAt: p.createdAt };
}

/** Random token, base64url. 24 bytes for a project; 16 bytes (22 characters, still 128 bits) for the short link of a picture. */
function newToken(bytes = 24): string {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
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
    projectId: p.projectId,
    sendTo: p.sendTo,
    consentShared: p.consentShared,
    helperInfo: (p.helpers ?? []).map((tel, i) => ({ tel: tel ?? '', name: p.helperNames?.[i] ?? '', rel: p.helperRels?.[i] ?? '' })).filter((h) => !!h.tel),
    emblem: p.emblem,
    photo: p.photo,
    keyCode: p.keyCode,
    keyOn: p.keyOn,
    keyAt: p.keyAt,
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
    pushTel: c.pushTel,
    paidAt: c.paidAt,
    sentAt: c.sentAt,
    updatedAt: c.updatedAt,
    confirmsPlace: c.confirmsPlace,
    projectId: c.projectId,
  };
}

const lockWasExpired = (c: Chg) => chargeLock(c).kind === 'expired';

export default function App({ signOut }: { signOut?: () => void }) {
  const [accounts, setAccounts] = useState<Acc[]>([]);
  const [allPeople, setPeople] = useState<Per[]>([]);
  const [allCharges, setCharges] = useState<Chg[]>([]);
  const [projects, setProjects] = useState<Proj[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const projectsRef = useRef<Proj[]>([]);

  // Everything below works on ONE project (taller). Rows saved before projects existed belong to the oldest one.
  const project = useMemo(() => projects.find((x) => x.id === projectId) ?? null, [projects, projectId]);
  const legacyId = useMemo(
    () => [...projects].sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''))[0]?.id ?? null,
    [projects],
  );
  const mine = (pid?: string | null) => (pid ? pid === projectId : projectId === legacyId);
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const c of allCharges) {
      const pid = c.projectId ?? legacyId;
      if (pid && c.status === 'PAID' && c.month === thisMonth()) t[pid] = (t[pid] ?? 0) + c.amount;
    }
    return t;
  }, [allCharges, legacyId]);
  const people = useMemo(() => allPeople.filter((x) => mine(x.projectId)), [allPeople, projectId, legacyId]); // eslint-disable-line react-hooks/exhaustive-deps
  const charges = useMemo(() => allCharges.filter((x) => mine(x.projectId)), [allCharges, projectId, legacyId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [view, setView] = useState<View>({ id: 'loading' });
  const [hist, setHist] = useState<View[]>([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<Problem | null>(null);
  const retryRef = useRef<(() => void) | null>(null);
  // A screen with steps of its own (add person) takes the bar's "Atrás" first; it returns true when it went back inside itself.
  const interceptRef = useRef<(() => boolean) | null>(null);
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
    const everyone = p.data.map(mapPerson).filter((x): x is Per => !!x);
    setAccounts(a.data.map(mapAccount).filter((x): x is Acc => !!x));
    setPeople(everyone);
    setCharges(c.data.map(mapCharge).filter((x): x is Chg => !!x));
    const list = j.data.map(mapProject).filter((x): x is Proj => !!x);
    projectsRef.current = list;
    setProjects(list);
    // With a single project there is nothing to choose: go straight in.
    setProjectId((cur) => (cur && list.some((x) => x.id === cur) ? cur : list.length === 1 ? list[0].id : null));
    return { people: everyone, projects: list };
  }, []);

  const firstView = (): View => (projectsRef.current.length === 1 ? { id: 'home' } : { id: 'projects' });

  // The NFC keychain opens the app on /?l=<code>. It is read once, here, and resolved with the people just loaded.
  const tapCode = useRef<string | null>(codeFromAddress(location.pathname, location.search));

  /** First screen after the data arrives: the person of a tapped keychain, or the usual start. */
  function openFirst(d: { people: Per[]; projects: Proj[] }) {
    const code = tapCode.current;
    tapCode.current = null;
    if (!code) { setView((v) => (v.id === 'loading' ? firstView() : v)); return; }
    // The code does not stay in the address bar (history, screenshots, a refresh that would reopen it).
    const clean = new URL(location.href);
    clean.searchParams.delete(KEY_PARAM);
    if (clean.pathname.startsWith('/llavero')) clean.pathname = '/';
    history.replaceState(null, '', clean);

    const tap = resolveTap(d.people, code);
    setProblem(null);
    setFormError('');
    if (tap.kind === 'unknown') { setHist([]); setView({ id: 'key-tap', kind: 'unknown' }); return; }
    // Rows from before projects existed belong to the oldest project.
    const oldest = [...d.projects].sort((x, y) => (x.createdAt ?? '').localeCompare(y.createdAt ?? ''))[0]?.id ?? null;
    const pid = tap.person.projectId ?? oldest;
    if (pid) setProjectId(pid);
    setHist([{ id: 'home' }]);
    if (tap.kind === 'ok') {
      setNote(`Llavero de ${tap.person.name.split(' ')[0]}.`);
      setView({ id: 'person', personId: tap.person.id, page: 0 });
    } else {
      setView({ id: 'key-tap', kind: tap.kind, personId: tap.person.id });
    }
  }

  useEffect(() => {
    let alive = true;
    load()
      .then((d) => { if (alive) openFirst(d); })
      .catch(() => {
        if (!alive) return;
        retryRef.current = () => {
          setProblem(null);
          setView({ id: 'loading' });
          load().then((d) => openFirst(d)).catch(() => {
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

  useEffect(() => {
    if (view.id === 'paid') feedback('ok');
  }, [view]);

  useEffect(() => {
    if (problem) feedback('error');
  }, [problem]);

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
    if (interceptRef.current?.()) return;
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

  /** The error of a backend call, with the real reason when the backend gave one. */
  const failed = (errors?: readonly { message?: string }[] | null) => new Error(errors?.[0]?.message || 'backend');

  async function run(task: () => Promise<void>, done?: () => void, topic: Topic = 'charge') {
    if (busy) return;
    setBusy(true);
    setFormError('');
    try {
      await task();
      done?.();
    } catch (e) {
      const again = () => { void run(task, done, topic); };
      retryRef.current = again;
      setProblem(explainProblem(e instanceof Error ? e.message : String(e), topic));
    } finally {
      setBusy(false);
    }
  }

  function openPerson(personId: string) {
    // Always show the person's page: what the project charges, an extraordinary charge, and what is waiting.
    go({ id: 'person', personId, page: 0 });
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
        projects={projects}
        totals={totals}
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
        onDismiss={() => setProblem(null)}
        onInterceptBack={(fn) => { interceptRef.current = fn; }}
        onAddPerson={(input) => {
          const tel = input.tel.replace(/\D/g, '');
          if (tel.length !== 10) { setFormError('El teléfono debe tener 10 números.'); return; }
          void run(async () => {
            // A photo is only kept with permission (asked in the form); otherwise a drawing nobody else in the project has.
            const emblem = input.photo
              ? undefined
              : input.emblem || pickEmblems(people.filter((x) => x.status !== 'RELEASED').map((x) => x.emblem ?? ''), 1)[0]?.id;
            const r = await client.models.Person.create({
              name: input.name.trim(),
              tel,
              via: 'MANUAL',
              status: 'ENROLLED',
              heldOn: new Date().toISOString(),
              projectId: project?.id,
              ...(input.photo ? { photo: input.photo, photoConsent: true } : { emblem }),
              helpers: input.helpers.map((h) => h.tel),
              helperNames: input.helpers.map((h) => h.name),
              helperRels: input.helpers.map((h) => h.rel),
              sendTo: input.sendTo || input.helpers[0]?.tel || tel, // with no helper, codes go to the person
              consentShared: input.consentShared,
            });
            if (r.errors?.length) throw new Error('person');
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
              projectId: project?.id,
            });
            if (created.errors?.length || !created.data?.id) throw new Error('create');
            await load();
            go({ id: 'charge', chargeId: created.data.id });
          });
        }}
        onSaveOwn={(personId, input) => {
          const person = people.find((x) => x.id === personId);
          if (!person) return;
          void run(async () => {
            const r = await client.models.Person.update({
              id: personId,
              name: input.name,
              tel: input.tel,
              // When codes went to the person's own number, they keep going there after the number is corrected.
              ...(person.sendTo === person.tel ? { sendTo: input.tel } : {}),
            });
            if (r.errors?.length) throw failed(r.errors);
            // The charges carry a copy of the name and the number: correct them too, so the next request goes to the right place.
            const mine = allCharges.filter((c) => c.personId === personId && (c.personName !== input.name || c.tel !== input.tel));
            for (let i = 0; i < mine.length; i += 10) {
              const rs = await Promise.all(mine.slice(i, i + 10).map((c) => client.models.Charge.update({ id: c.id, personName: input.name, tel: input.tel })));
              if (rs.some((x) => x.errors?.length)) throw new Error('person');
            }
            await load();
          }, () => land({ id: 'person-data', personId }, 'Listo. Se guardaron sus datos.'));
        }}
        onSaveHelpers={(personId, input) => {
          void run(async () => {
            const r = await client.models.Person.update({
              id: personId,
              helpers: input.helpers.map((h) => h.tel),
              helperNames: input.helpers.map((h) => h.name),
              helperRels: input.helpers.map((h) => h.rel),
              sendTo: input.sendTo,
              consentShared: input.consentShared,
            });
            if (r.errors?.length) throw failed(r.errors);
            await load();
          }, () => land({ id: 'person-data', personId }, 'Listo. Se guardaron sus datos.'));
        }}
        onRequest={(id, phone) => {
          void run(async () => {
            const r = await client.mutations.peyAction({ action: 'requestCodi', id, ...(phone ? { phone } : {}) });
            if (r.errors?.length) throw failed(r.errors);
            await load();
          }, () => setView({ id: 'wait', chargeId: id }));
        }}
        onShowQr={(id) => {
          void run(async () => {
            const r = await client.mutations.peyAction({ action: 'requestQr', id });
            if (r.errors?.length) throw failed(r.errors);
            if (!r.data) throw new Error('qr');
            const parsed = JSON.parse(r.data) as { qrImage?: string | null };
            if (!parsed.qrImage) throw new Error('qr');
            await load();
            setView({ id: 'qr', chargeId: id, img: parsed.qrImage });
          });
        }}
        onEditCharge={(id, concept, amount) => {
          const current = charges.find((x) => x.id === id);
          if (!current) return;
          if (!canEditCharge(chargeLock(current))) { setFormError('Este cobro ya se mandó a pagar y todavía no caduca.'); return; }
          if (!(amount > 0)) { setFormError('Escribe el monto.'); return; }
          if (!concept.trim()) { setFormError('Escribe para qué es.'); return; }
          void run(async () => {
            // Read it again from the database: another phone may have sent it to pay a moment ago.
            const cur = await client.models.Charge.get({ id });
            if (cur.errors?.length || !cur.data) throw new Error('charge');
            const lock = chargeLock(cur.data);
            if (!canEditCharge(lock)) throw new Error('charge locked');
            // An expired code must not stay linked to the corrected charge (sentAmount stays: it guards a late payment).
            const r = await client.models.Charge.update({ id, concept: concept.trim(), amount, ...(lock.kind === 'expired' ? RESET_SENT : {}) });
            if (r.errors?.length) throw new Error('charge');
            await load();
          }, () => land({ id: 'charge', chargeId: id }, lockWasExpired(current) ? 'Listo. Se corrigió el cobro. Hay que mandar un código nuevo.' : 'Listo. Se corrigió el cobro.'));
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
            if (r.errors?.length) throw failed(r.errors);
            await load();
          }, () => land({ id: 'account', accountId: id }, 'Listo. Ya la mandamos a revisar.'), 'account');
        }}
        onSaveProject={(input) => {
          if (!(input.capacity >= 1 && input.capacity <= 200)) { setFormError('Escribe cuántos lugares hay, de 1 a 200.'); return; }
          if (!(input.holdDays >= 1 && input.holdDays <= 60)) { setFormError('Los días de apartado van de 1 a 60.'); return; }
          const fields = {
            name: input.name,
            capacity: input.capacity,
            holdDays: input.holdDays,
            plansJson: serializePlans(input.plans),
            monthlyAmount: null,
            monthlyConcept: null,
            accountId: null,
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
        onPickProject={(id) => {
          setProjectId(id);
          setProblem(null);
          setFormError('');
          setNote('');
          setHist([]);
          setView({ id: 'home' });
        }}
        onCreateProject={(name) => {
          if (name.trim().length < 2) { setFormError('Escribe el nombre del taller o proyecto.'); return; }
          void run(async () => {
            const r = await client.models.Project.create({ name: name.trim(), capacity: 0, holdDays: 5, open: true, token: newToken() });
            if (r.errors?.length || !r.data?.id) throw new Error('project');
            await load();
            setProjectId(r.data.id);
          }, () => land({ id: 'home' }, 'Listo. Ya puedes empezar.'));
        }}
        onDeleteAccount={(id) => {
          // A charge already sent to Pey and still unpaid could be paid into this account: do not lose track of it.
          if (allCharges.some((c) => c.accountId === id && c.status !== 'PAID' && c.transactionId)) {
            setNote('Esta cuenta tiene cobros esperando pago. Espera a que paguen y vuelve a intentarlo.');
            return;
          }
          void run(async () => {
            for (const j of projects.filter((x) => x.accountId === id)) {
              const u = await client.models.Project.update({ id: j.id, accountId: null });
              if (u.errors?.length) throw new Error('project');
            }
            const d = await client.models.Account.delete({ id });
            if (d.errors?.length) throw new Error('account');
            await load();
          }, () => land({ id: 'accounts', page: 0 }, 'Listo. La cuenta se eliminó.'));
        }}
        onShareLink={async ({ kind, title, description, image }) => {
          // The random token is the only secret of the link; the code to pay lasts a week, a receipt much longer.
          // The short link (on this app's own domain) is used when the Amplify rewrite for /p/ is set up; else the long one.
          const token = newToken(16);
          // The Amplify rewrite rule is shared by every branch and points at production's function, so dev/qa always use the long link.
          const short = !__ENV__ && (await shortLinksWork(location.origin));
          if (!short && !shareUrl) throw new Error('share');
          const days = kind === 'PAY' ? 7 : 180;
          const r = await client.models.Share.create({
            token, kind, title, description, image,
            base: short ? location.origin : undefined,
            expiresAt: new Date(Date.now() + days * 86400000).toISOString(),
          });
          if (r.errors?.length) throw new Error('share');
          return shareLink({ short, origin: location.origin, shareUrl, token });
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
          const patch = action === 'extend' ? { heldOn: now } : { status: 'ENROLLED' as const, heldOn: now };
          const message =
            action === 'release' ? 'Listo. Quedó dado de baja y su lugar está libre.'
            : action === 'extend' ? 'Listo. Se apartó más días.'
            : 'Listo. Ya tiene lugar. Ya le puedes cobrar.';
          void run(async () => {
            if (action === 'release') {
              // A person with no charges just disappears. One with charges stays only as "Name (baja)" so the
              // money records keep their meaning; everything else about them (photo, phones, notes) is erased.
              const person = people.find((x) => x.id === personId);
              if (!person) return;
              const mine = charges.filter((c) => c.personId === personId);
              if (!mine.length) {
                const d = await client.models.Person.delete({ id: personId });
                if (d.errors?.length) throw new Error('seat');
              } else {
                const label = `${person.name.trim().split(/\s+/)[0]} (baja)`;
                for (let i = 0; i < mine.length; i += 10) {
                  const rs = await Promise.all(mine.slice(i, i + 10).map((c) => client.models.Charge.update({ id: c.id, personName: label, tel: 'baja' })));
                  if (rs.some((x) => x.errors?.length)) throw new Error('seat');
                }
                const u = await client.models.Person.update({
                  id: personId, name: label, tel: 'baja', status: 'RELEASED', note: null, helpers: [], emblem: null, photo: null,
                  photoConsent: false, consentShared: false, heldOn: null, regAt: null, via: null,
                  keyCode: null, keyOn: null, keyAt: null, // a keychain of someone dada de baja must never open anything again
                });
                if (u.errors?.length) throw new Error('seat');
              }
              await load();
              return;
            }
            const r = await client.models.Person.update({ id: personId, ...patch });
            if (r.errors?.length) throw new Error('seat');
            await load();
          }, () => land(action === 'release' ? (placesOn(project) ? { id: 'places' } : { id: 'people' }) : action === 'extend' ? { id: 'places' } : { id: 'seat', personId }, message));
        }}
        onKey={(personId, action) => {
          const person = people.find((x) => x.id === personId);
          if (!person) return;
          void run(async () => {
            if (action === 'emblem') {
              const taken = people.filter((x) => x.status !== 'RELEASED').map((x) => x.emblem ?? '');
              const pick = pickEmblems(taken, 1)[0];
              if (!pick) throw new Error('emblem');
              const r = await client.models.Person.update({ id: personId, emblem: pick.id });
              if (r.errors?.length) throw failed(r.errors);
            } else {
              const now = new Date().toISOString();
              // 'activate' reuses a code that already exists (never two codes for one person); 'new' always makes another.
              const patch =
                action === 'activate' ? { keyCode: person.keyCode || newKeyCode(), keyOn: true, keyAt: person.keyCode ? person.keyAt : now }
                : action === 'on' ? { keyOn: true }
                : action === 'off' ? { keyOn: false }
                : { keyCode: newKeyCode(), keyOn: true, keyAt: now };
              const r = await client.models.Person.update({ id: personId, ...patch });
              if (r.errors?.length) throw failed(r.errors);
            }
            await load();
          }, () => setNote(
            action === 'emblem' ? 'Listo. Ya tiene su dibujo.'
            : action === 'activate' ? 'Listo. Su llavero está activo.'
            : action === 'on' ? 'Listo. Su llavero volvió a funcionar.'
            : action === 'off' ? 'Listo. Su llavero ya no abre nada.'
            : 'Listo. Hay un código nuevo. El llavero anterior ya no sirve.',
          ));
        }}
        onCheck={(id) => {
          void run(async () => {
            const r = await client.mutations.peyAction({ action: 'checkCharge', id });
            if (r.errors?.length) throw failed(r.errors);
            await load();
            setNote(r.data === 'PAID' ? 'Sí, ya pagó.' : 'Todavía no vemos el pago. Intenta en un momento.');
          });
        }}
        onRefresh={(id) => {
          void run(async () => {
            const r = await client.mutations.peyAction({ action: 'refreshAccount', id });
            if (r.errors?.length) throw failed(r.errors);
            await load();
          }, () => setNote('Ya revisamos la cuenta.'), 'account');
        }}
      />
    </Shell>
  );
}
