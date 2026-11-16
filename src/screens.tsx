import { useState, type FormEvent, type ReactNode } from 'react';
import {
  accountWords, chargeKind, chargeWords, money, monthName, pageOf, parseAmount, personWords, ready, thisMonth,
  type Acc, type Chg, type Helper, type NewPerson, type Per, type Proj, type View,
} from './model';
import { Alert, Avatar, WhoLine, Choice, Field, IcoBank, IcoCash, IcoClock, IcoOut, IcoPeople, IcoPhone, IcoQr, Result, Status } from './ui';
import ReceiptView from './Receipt';
import { helpersOf } from './payers';
import { destinations, folioOf, payCardSvg, payText, type Dest } from './comprobante';
import { PictureSend } from './Receipt';
import { Access, DangerZone, More, ReportView } from './screens2';
import { PlacesHub, PlacesSettings, RegQr, SeatDetail, Seats } from './screens3';
import { duePlans, type Plan } from './plans';
import type { Problem } from './problems';
import { AddPerson, type AddPersonInitial } from './AddPerson';
import { KeyTap, KeyringDetail, KeyringHelp, KeyringHub, Keyrings, type KeyAction } from './screensKeys';
import { ChargeTo, People, PersonData, PersonEditHelpers, PersonEditOwn } from './screensPeople';
import { canCharge, placesOn, toApprove, waitlisted } from './places';

export type StageProps = {
  view: View;
  busy: boolean;
  formError: string;
  accounts: Acc[];
  people: Per[];
  charges: Chg[];
  project: Proj | null;
  signOut?: () => void;
  onView: (next: View) => void;
  onReset: (next: View) => void;
  onOpenPerson: (personId: string) => void;
  onAddPerson: (input: NewPerson) => void;
  /** NFC keychain of a person: make it, switch it off or on, new code for a replacement, or pick a drawing for the image. */
  onKey: (personId: string, action: KeyAction) => void;
  /** A screen with its own steps asks the bar's "Atrás" to go back inside it first (returns true when it did). */
  onInterceptBack: (fn: (() => boolean) | null) => void;
  /** Only for the demo harness (screenshots). */
  addPersonInitial?: AddPersonInitial;
  onAddAccount: (input: { alias: string; legalName: string; clabe: string; entity: 'PERSON' | 'BUSINESS' }) => void;
  onCreateCharge: (personId: string, concept: string, amount: number, accountId: string, confirmsPlace: boolean) => void;
  onSaveProject: (input: { name: string; capacity: number; holdDays: number; plans: Plan[] }) => void;
  projects: Proj[];
  /** Cobrado este mes por proyecto, para la lista de proyectos. */
  totals?: Record<string, number>;
  onPickProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteAccount: (id: string) => void;
  /** Stores a picture behind a link and returns the link (to send by WhatsApp). */
  onShareLink: (input: { kind: 'PAY' | 'RECEIPT'; title: string; description: string; image: string }) => Promise<string>;
  onToggleOpen: () => void;
  /** Sends a code to the collector's email. Returns an error message, or '' when it went out. */
  onSendCode: () => Promise<string>;
  /** Checks the emailed code and, only if right, deletes all people and charges. Returns an error message or ''. */
  onWipe: (code: string) => Promise<string>;
  onRotateToken: () => void;
  onSeat: (personId: string, action: 'approve' | 'give' | 'extend' | 'release') => void;
  /** Asks Pey for a CoDi request on the phone. `phone` = which registered number gets it (default: the person's own). */
  onRequest: (chargeId: string, phone?: string) => void;
  /** Corrects the person's own name and WhatsApp (also on their charges). */
  onSaveOwn: (personId: string, input: { name: string; tel: string }) => void;
  /** Completes or corrects who helps the person pay, and where codes go by default. */
  onSaveHelpers: (personId: string, input: { helpers: Helper[]; sendTo: string; consentShared: boolean }) => void;
  onShowQr: (chargeId: string) => void;
  onCash: (chargeId: string) => void;
  onCheck: (chargeId: string) => void;
  onRegister: (accountId: string) => void;
  onRefresh: (accountId: string) => void;
  onRetry: () => void;
  /** Closes the error screen and stays on the screen where it happened. */
  onDismiss: () => void;
  problem: Problem | null;
};

const busyLabel = 'Un momento…';

function findCharge(charges: Chg[], id: string) {
  return charges.find((c) => c.id === id);
}
function findPerson(people: Per[], id: string) {
  return people.find((p) => p.id === id);
}
function findAccount(accounts: Acc[], id: string) {
  return accounts.find((a) => a.id === id);
}

export function Stage(p: StageProps) {
  if (p.view.id === 'loading') {
    return (
      <section className="stack">
        <h1>Un momento…</h1>
        <p className="lead">Estamos leyendo tus cobros.</p>
        <Status kind="wait">Cargando</Status>
        {p.signOut ? <Choice icon={<IcoOut />} label="Salir" onClick={p.signOut} /> : null}
      </section>
    );
  }

  if (p.problem) {
    return (
      <section className="stack">
        <Result kind="bad" title={p.problem.title} text={p.problem.detail} tech={p.problem.tech} />
        <Choice primary icon={<IcoClock />} label={p.busy ? busyLabel : 'Intentar de nuevo'} onClick={p.onRetry} />
        <Choice label="Volver" hint="Para elegir otra forma de cobrar" onClick={p.onDismiss} />
        <button type="button" className="quiet" onClick={() => p.onReset({ id: 'home' })}>Ir al inicio</button>
      </section>
    );
  }

  const v = p.view;
  // What a keychain tap shows when it cannot open a charge: it must not depend on having chosen a project.
  if (v.id === 'key-tap') return <KeyTap {...p} kind={v.kind} personId={v.personId} />;
  // Creating a project must work with NO project yet (a brand new user), so it comes before the "no project" welcome.
  if (v.id === 'new-project') return <NewProject {...p} />;
  if (v.id === 'projects' || !p.project) return <ProjectsView {...p} />;
  if (v.id === 'home') return <Home {...p} />;
  if (v.id === 'who') return <Who {...p} page={v.page} />;
  if (v.id === 'person') return <PersonCharges {...p} personId={v.personId} page={v.page} />;
  if (v.id === 'charge') return <ChargeStep {...p} charge={findCharge(p.charges, v.chargeId)} />;
  if (v.id === 'cash') return <CashStep {...p} charge={findCharge(p.charges, v.chargeId)} />;
  if (v.id === 'wait') return <WaitStep {...p} charge={findCharge(p.charges, v.chargeId)} />;
  if (v.id === 'qr') return <QrStep {...p} charge={findCharge(p.charges, v.chargeId)} img={v.img} />;
  if (v.id === 'send-qr') return <SendQr {...p} charge={findCharge(p.charges, v.chargeId)} img={v.img} />;
  if (v.id === 'paid') return <PaidStep {...p} charge={findCharge(p.charges, v.chargeId)} />;
  if (v.id === 'receipt') return <ReceiptStep {...p} charge={findCharge(p.charges, v.chargeId)} />;
  if (v.id === 'more') return <More {...p} />;
  if (v.id === 'access') return <Access />;
  if (v.id === 'danger') return <DangerZone {...p} />;
  if (v.id === 'places') return <PlacesHub {...p} />;
  if (v.id === 'seats') return <Seats {...p} page={v.page} only={v.only} />;
  if (v.id === 'seat') return <SeatDetail {...p} personId={v.personId} />;
  if (v.id === 'reg-qr') return <RegQr {...p} />;
  if (v.id === 'places-settings') return <PlacesSettings {...p} />;
  if (v.id === 'report') return <ReportView {...p} month={v.month} />;
  if (v.id === 'keyring-hub') return <KeyringHub {...p} />;
  if (v.id === 'keyrings') return <Keyrings {...p} page={v.page} />;
  if (v.id === 'keyring') return <KeyringDetail {...p} personId={v.personId} />;
  if (v.id === 'keyring-help') return <KeyringHelp />;
  if (v.id === 'people') return <People {...p} page={v.page ?? 0} />;
  if (v.id === 'person-data') return <PersonData {...p} personId={v.personId} />;
  if (v.id === 'person-edit') return v.part === 'own' ? <PersonEditOwn {...p} personId={v.personId} /> : <PersonEditHelpers {...p} personId={v.personId} />;
  if (v.id === 'charge-to') return <ChargeTo {...p} charge={findCharge(p.charges, v.chargeId)} />;
  if (v.id === 'add-person') return <AddPerson {...p} />;
  if (v.id === 'accounts') return <Accounts {...p} page={v.page} />;
  if (v.id === 'account') return <AccountStep {...p} account={findAccount(p.accounts, v.accountId)} />;
  if (v.id === 'add-account') return <AddAccount {...p} />;
  return <NewCharge {...p} personId={v.personId} />;
}

function Home({ accounts, people, charges, project, onView }: StageProps) {
  const month = thisMonth();
  const collected = charges.filter((c) => c.month === month && c.status === 'PAID').reduce((n, c) => n + c.amount, 0);
  const review = placesOn(project) ? toApprove(people).length + waitlisted(people).length : 0;
  const hasAccount = accounts.length > 0;
  const hasPeople = people.length > 0;

  let primary: ReactNode;
  if (!hasAccount) {
    primary = <Choice primary icon={<IcoBank />} label="Agregar cuenta" hint="Ahí llega el dinero" onClick={() => onView({ id: 'add-account' })} />;
  } else if (!hasPeople) {
    primary = <Choice primary icon={<IcoPeople />} label="Agregar persona" hint="Nombre y WhatsApp" onClick={() => onView({ id: 'add-person' })} />;
  } else {
    primary = <Choice primary icon={<IcoCash />} label="Cobrar" hint="Elegir a quién" onClick={() => onView({ id: 'who', page: 0 })} />;
  }

  return (
    <section className="stack">
      <h1>{project?.name || 'Mi proyecto'}</h1>
      <div className="stat">
        <p><strong>Cobrado en {monthName(month).toLowerCase()}:</strong></p>
        <p className="amount">{money(collected)}</p>
      </div>
      {primary}
      {review ? (
        <Choice attention icon={<span className="ico-emoji" aria-hidden="true">🔔</span>} label={`Aprobar inscripciones (${review})`} hint={review === 1 ? 'Hay 1 persona esperando tu respuesta' : `Hay ${review} personas esperando tu respuesta`} onClick={() => onView({ id: 'seats', page: 0, only: 'review' })} />
      ) : null}
      <Choice icon={<IcoBank />} label="Más opciones" hint="Personas, lugares, reporte y cuentas" onClick={() => onView({ id: 'more' })} />
    </section>
  );
}

function ProjectsView({ projects, totals, onPickProject, onView, signOut }: StageProps) {
  const month = monthName(thisMonth()).toLowerCase();
  if (!projects.length) {
    return (
      <section className="stack">
        <h1>Bienvenida</h1>
        <p className="lead">Empieza creando tu primer taller o proyecto de cobro.</p>
        <Choice primary icon={<IcoPeople />} label="Crear mi primer proyecto" onClick={() => onView({ id: 'new-project' })} />
        {signOut ? <Choice icon={<IcoOut />} label="Salir" onClick={signOut} /> : null}
      </section>
    );
  }
  return (
    <section className="stack">
      <h1>Tus proyectos</h1>
      <p className="lead">Elige a cuál entrar.</p>
      {projects.map((x) => (
        <Choice key={x.id} primary={projects.length === 1} icon={<IcoPeople />} label={x.name || 'Sin nombre'} hint={`Cobrado en ${month}: ${money(totals?.[x.id] ?? 0)}`} onClick={() => onPickProject(x.id)} />
      ))}
      <Choice icon={<IcoCash />} label="Nuevo proyecto" hint="Otro taller o cobro" onClick={() => onView({ id: 'new-project' })} />
      {signOut ? <button type="button" className="quiet" onClick={signOut}>Salir</button> : null}
    </section>
  );
}

function NewProject({ busy, formError, onCreateProject, onView, projects }: StageProps) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onCreateProject(String(new FormData(e.currentTarget).get('name') || ''));
  };
  return (
    <section className="stack">
      <h1>Nuevo proyecto</h1>
      <form className="stack" onSubmit={submit}>
        {formError ? <Alert>{formError}</Alert> : null}
        <Field label="Nombre del taller o proyecto"><input name="name" required autoComplete="off" placeholder="Taller de costura" /></Field>
        <Choice primary type="submit" label={busy ? busyLabel : 'Crear'} />
      </form>
      {projects.length ? <Choice label="Volver a mis proyectos" onClick={() => onView({ id: 'projects' })} /> : null}
    </section>
  );
}

function Who({ people, charges, onOpenPerson, onView, page }: StageProps & { page: number }) {
  const month = thisMonth();
  const ranked = people
    .filter(canCharge)
    .map((person) => {
      const mine = charges.filter((c) => c.personId === person.id && c.month === month);
      const words = personWords(mine);
      const urgency = !mine.length ? 1 : words.kind === 'due' ? 0 : words.kind === 'wait' ? 2 : 3;
      return { person, words, urgency };
    })
    .sort((a, b) => a.urgency - b.urgency || a.person.name.localeCompare(b.person.name, 'es'));
  const slice = pageOf(ranked, page);
  return (
    <section className="stack">
      <h1>¿Quién paga?</h1>
      <p className="lead">Toca el nombre.</p>
      {slice.rows.map(({ person, words }) => (
        <button key={person.id} type="button" className="person" onClick={() => onOpenPerson(person.id)}>
          <Avatar person={person} />
          <span className="person-name">{person.name}</span>
          <Status kind={words.kind}>{words.text}</Status>
        </button>
      ))}
      {slice.more ? (
        <Choice label={slice.more.label} hint={slice.more.hint} onClick={() => onView({ id: 'who', page: slice.more!.page })} />
      ) : null}
      <Choice icon={<IcoPeople />} label="Agregar persona" hint="Nombre y WhatsApp" onClick={() => onView({ id: 'add-person' })} />
    </section>
  );
}

function PersonCharges({ people, charges, accounts, project, onCreateCharge, onView, personId, page }: StageProps & { personId: string; page: number }) {
  const person = findPerson(people, personId);
  if (!person) return <Missing onHome={() => onView({ id: 'home' })} />;
  const month = thisMonth();
  const mine = charges.filter((c) => c.personId === personId && c.month === month);
  type Row = { key: string; node: ReactNode };
  const chargeRow = (c: Chg): Row => ({
    key: c.id,
    node: (
      <button type="button" className="person" onClick={() => onView(chargeKind(c) === 'paid' ? { id: 'paid', chargeId: c.id } : { id: 'charge', chargeId: c.id })}>
        <span className="person-name">{c.concept}</span>
        <span className="person-amt">{money(c.amount)}</span>
        <Status kind={chargeKind(c)}>{chargeWords(c)}</Status>
      </button>
    ),
  });
  // Order: what is waiting for payment, what the project charges (set in its settings), an extraordinary one, then what is already paid.
  const due = duePlans(project?.plans ?? [], personId, charges, month).filter((d) => accounts.some((x) => x.id === d.plan.accountId));
  const rows: Row[] = [
    ...mine.filter((c) => chargeKind(c) !== 'paid').map(chargeRow),
    ...due.map((d): Row => ({
      key: 'plan-' + d.plan.id,
      node: (
        <Choice
          primary={!mine.some((c) => chargeKind(c) !== 'paid') && due[0] === d}
          icon={<IcoCash />}
          label={`Cobrar ${money(d.plan.amount)}`}
          hint={d.plan.kind === 'ONCE' ? `${d.plan.concept} (una sola vez)` : `${d.plan.concept}, mes ${d.nth} de ${d.total}`}
          onClick={() => onCreateCharge(personId, d.plan.concept, d.plan.amount, d.plan.accountId, d.confirms)}
        />
      ),
    })),
    {
      key: 'extra',
      node: <Choice icon={<IcoCash />} label="Cobro extraordinario" hint="Por ejemplo, una cooperación" onClick={() => onView({ id: 'new-charge', personId })} />,
    },
    ...mine.filter((c) => chargeKind(c) === 'paid').map(chargeRow),
  ];
  const slice = pageOf(rows, page);
  return (
    <section className="stack">
      <WhoLine name={person.name} person={person} />
      <h1>Sus cobros de {monthName(month).toLowerCase()}</h1>
      {slice.rows.map((row) => <div key={row.key}>{row.node}</div>)}
      {slice.more ? <Choice label={slice.more.label} hint={slice.more.hint} onClick={() => onView({ id: 'person', personId, page: slice.more!.page })} /> : null}
    </section>
  );
}

function ChargeStep({ charge, accounts, people, busy, onRequest, onShowQr, onView }: StageProps & { charge: Chg | undefined }) {
  if (!charge) return <Missing onHome={() => onView({ id: 'home' })} />;
  const account = findAccount(accounts, charge.accountId);
  const canCell = ready(account);
  const name = findPerson(people, charge.personId)?.name || charge.personName;
  // With registered helpers the collector chooses who gets the request today; with none it goes to the person.
  const several = (() => { const who = findPerson(people, charge.personId); return !!who && helpersOf(who).length > 0; })();
  return (
    <section className="stack">
      <WhoLine name={name} person={findPerson(people, charge.personId)} />
      <h1>¿Cómo paga?</h1>
      <p className="amount">{money(charge.amount)}</p>
      <p className="lead">{charge.concept}. {account ? `El dinero llega a ${account.alias}.` : 'No encuentro la cuenta de este cobro.'}</p>
      <Status kind={chargeKind(charge)}>{chargeWords(charge)}</Status>
      {!canCell ? <Alert>Esta cuenta aún no está lista. Por ahora solo puedes anotar efectivo.</Alert> : null}
      {canCell ? (
        <Choice primary icon={<IcoQr />} label={busy ? busyLabel : 'Mostrar código para pagar'} hint="Lo escanea con su banco" onClick={() => onShowQr(charge.id)} />
      ) : null}
      {canCell ? (
        <Choice
          icon={<IcoPhone />}
          label={busy ? busyLabel : several ? 'Pedir el pago por CoDi' : 'Pedir el pago a su celular'}
          hint={several ? 'Tú eliges a quién' : 'Puede no llegar a todos los bancos'}
          onClick={() => (several ? onView({ id: 'charge-to', chargeId: charge.id }) : onRequest(charge.id))}
        />
      ) : null}
      <Choice primary={!canCell} icon={<IcoCash />} label="Ya lo recibí en efectivo" hint="Tú guardas el dinero" onClick={() => onView({ id: 'cash', chargeId: charge.id })} />
      <Choice label="Crear otro cobro" onClick={() => onView({ id: 'new-charge', personId: charge.personId })} />
    </section>
  );
}

function CashStep({ charge, people, busy, onCash, onView }: StageProps & { charge: Chg | undefined }) {
  if (!charge) return <Missing onHome={() => onView({ id: 'home' })} />;
  return (
    <section className="stack">
      <WhoLine name={charge.personName} person={findPerson(people, charge.personId)} />
      <h1>¿Recibiste {money(charge.amount)}?</h1>
      <p className="lead">Cuéntalos antes de confirmar. Es de {charge.concept}.</p>
      <Choice primary icon={<IcoCash />} label={busy ? busyLabel : 'Sí, ya lo recibí'} onClick={() => onCash(charge.id)} />
    </section>
  );
}

function WaitStep({ charge, people, busy, onCheck, onShowQr, onView }: StageProps & { charge: Chg | undefined }) {
  if (!charge) return <Missing onHome={() => onView({ id: 'home' })} />;
  const who = findPerson(people, charge.personId);
  const dests = destinations(who?.tel ?? charge.tel, who ? helpersOf(who) : [], who?.sendTo, 4);
  const askedTo = charge.pushTel ? dests.find((d) => d.tel === charge.pushTel)?.label : undefined;
  return (
    <section className="stack">
      <WhoLine name={charge.personName} person={findPerson(people, charge.personId)} />
      <h1>Esperando el pago</h1>
      <p className="amount">{money(charge.amount)}</p>
      <Status kind="wait">Esperando el pago</Status>
      <p className="lead">{askedTo ? `Se pidió a ${askedTo}. ` : ''}Cuando pague, aquí se marca solo. Si ya pagó y no cambia, revisa.</p>
      <Choice primary icon={<IcoClock />} label={busy ? busyLabel : 'Revisar si ya pagó'} hint="Le preguntamos a Pey" onClick={() => onCheck(charge.id)} />
      {dests.length > 1 ? <Choice icon={<IcoPhone />} label="Pedirlo a otra persona" hint="Si no le llegó el aviso" onClick={() => onView({ id: 'charge-to', chargeId: charge.id })} /> : null}
      <Choice icon={<IcoQr />} label="Mostrar el código otra vez" hint="Hace uno nuevo" onClick={() => onShowQr(charge.id)} />
      <Choice icon={<IcoCash />} label="Ya lo recibí en efectivo" hint="Si no fue por celular" onClick={() => onView({ id: 'cash', chargeId: charge.id })} />
    </section>
  );
}

function PaidStep({ charge, people, onReset, onView }: StageProps & { charge: Chg | undefined }) {
  if (!charge) return <Missing onHome={() => onReset({ id: 'home' })} />;
  const name = findPerson(people, charge.personId)?.name || charge.personName;
  return (
    <section className="stack">
      <Result kind="paid" title="Ya pagó" text={`${name} pagó ${money(charge.amount)}. ${charge.concept}.`} />
      <Status kind="paid">{chargeWords(charge)}</Status>
      <Choice primary icon={<IcoPhone />} label="Enviar comprobante" hint="Por WhatsApp" onClick={() => onView({ id: 'receipt', chargeId: charge.id })} />
      <Choice icon={<IcoPeople />} label="Siguiente persona" onClick={() => onReset({ id: 'who', page: 0 })} />
    </section>
  );
}

function QrStep({ charge, people, img, busy, onCheck, onView }: StageProps & { charge: Chg | undefined; img: string }) {
  if (!charge) return <Missing onHome={() => onView({ id: 'home' })} />;
  return (
    <section className="stack">
      <WhoLine name={charge.personName} person={findPerson(people, charge.personId)} />
      <h1>Muestra el código</h1>
      <img className="shot" alt={`Código para que ${charge.personName} pague ${money(charge.amount)}`} src={`data:image/png;base64,${img}`} />
      <p className="lead">Escanéalo con la app del banco. Cuando pague, aquí se marca solo.</p>
      <Status kind="wait">Esperando el pago</Status>
      <Choice primary icon={<IcoPhone />} label="Mandar el código por WhatsApp" hint="Imagen para quien ayuda a pagar" onClick={() => onView({ id: 'send-qr', chargeId: charge.id, img })} />
      <Choice icon={<IcoClock />} label={busy ? busyLabel : 'Revisar si ya pagó'} hint="Le preguntamos a Pey" onClick={() => onCheck(charge.id)} />
      <Choice icon={<IcoCash />} label="Ya lo recibí en efectivo" hint="Si no fue con el código" onClick={() => onView({ id: 'cash', chargeId: charge.id })} />
    </section>
  );
}

function destsFor(people: Per[], tel: string, personId: string): Dest[] {
  const person = people.find((x) => x.id === personId) ?? people.find((x) => x.tel === tel);
  return destinations(tel, person ? helpersOf(person) : [], person?.sendTo);
}

function SendQr({ charge, img, accounts, people, project, onShareLink, onView }: StageProps & { charge: Chg | undefined; img: string }) {
  if (!charge) return <Missing onHome={() => onView({ id: 'home' })} />;
  const card = {
    projectName: project?.name || findAccount(accounts, charge.accountId)?.alias || 'Cuentas conmigo',
    payerName: charge.personName,
    concept: charge.concept,
    amount: charge.amount,
    qrPng: img,
  };
  return (
    <PictureSend
      title="Mandar el código"
      alt={`Código para que ${charge.personName} pague ${money(charge.amount)}`}
      svg={payCardSvg(card)}
      filename={`codigo-${folioOf(charge.id)}.png`}
      msg={payText(card, destsFor(people, charge.tel, charge.personId)[0]?.name ?? '')}
      link={{ kind: 'PAY', title: `Código para pagar · ${card.projectName}`, description: `Para pagar ${money(card.amount)} de ${card.concept} por ${card.payerName}. Abre la app de tu banco, elige CoDi y escanea el código.`, onShareLink }}
      dests={destsFor(people, charge.tel, charge.personId)}
    >
      <p className="hint">La liga explica qué hacer si la abre en el mismo celular con el que paga.</p>
      <Choice icon={<IcoQr />} label="Volver al código" onClick={() => onView({ id: 'qr', chargeId: charge.id, img })} />
    </PictureSend>
  );
}

function ReceiptStep({ charge, accounts, people, project, onShareLink, onView }: StageProps & { charge: Chg | undefined }) {
  if (!charge) return <Missing onHome={() => onView({ id: 'home' })} />;
  const account = findAccount(accounts, charge.accountId);
  return (
    <ReceiptView
      onShareLink={onShareLink}
      dests={destsFor(people, charge.tel, charge.personId)}
      data={{
        folio: folioOf(charge.id),
        projectName: project?.name || account?.alias || 'Cuentas conmigo',
        payerName: charge.personName,
        concept: charge.concept,
        amount: charge.amount,
        via: charge.via === 'CASH' ? 'CASH' : 'CODI',
        recipient: account?.alias ?? '',
        paidAt: charge.paidAt ?? new Date().toISOString(),
      }}
    />
  );
}

function Accounts({ accounts, page, onView }: StageProps & { page: number }) {
  type Row = { key: string; node: ReactNode };
  const rows: Row[] = accounts.map((a) => {
    const words = accountWords(a);
    return {
      key: a.id,
      node: (
        <button type="button" className="person" onClick={() => onView({ id: 'account', accountId: a.id })}>
          <span className="person-name">{a.alias}</span>
          <Status kind={words.kind}>{words.text}</Status>
        </button>
      ),
    };
  });
  rows.push({
    key: 'new',
    node: <Choice primary={accounts.length === 0} icon={<IcoBank />} label="Agregar cuenta" hint="CLABE de 18 números" onClick={() => onView({ id: 'add-account' })} />,
  });
  const slice = pageOf(rows, page);
  return (
    <section className="stack">
      <h1>Cuenta que recibe</h1>
      <p className="lead">Es la cuenta a la que llega el dinero.</p>
      {slice.rows.map((row) => <div key={row.key}>{row.node}</div>)}
      {slice.more ? <Choice label={slice.more.label} hint={slice.more.hint} onClick={() => onView({ id: 'accounts', page: slice.more!.page })} /> : null}
    </section>
  );
}

function AccountStep({ account, busy, onRegister, onRefresh, onDeleteAccount, onView }: StageProps & { account: Acc | undefined }) {
  const [asking, setAsking] = useState(false);
  const [again, setAgain] = useState(false);
  if (!account) return <Missing onHome={() => onView({ id: 'home' })} />;
  const words = accountWords(account);
  const active = account.codiStatus === 'ACTIVE';

  // The Pey key was changed: Pey does not know the account registered with the old key, so it is sent again.
  if (again) {
    return (
      <section className="stack">
        <h1>¿Registrarla otra vez en Pey?</h1>
        <p className="lead">{account.alias}</p>
        <Alert>Hazlo solo si cambiaste la llave de Pey. Una cuenta nueva puede tardar hasta 5 días hábiles en quedar lista; mientras tanto solo se puede cobrar en efectivo.</Alert>
        <Choice primary icon={<IcoBank />} label={busy ? busyLabel : 'Sí, registrarla otra vez'} onClick={() => { setAgain(false); onRegister(account.id); }} />
        <Choice label="No, volver" onClick={() => setAgain(false)} />
      </section>
    );
  }
  return (
    <section className="stack">
      <h1>{account.alias}</h1>
      <p className="lead">{account.legalName}</p>
      <Status kind={words.kind}>{words.text}</Status>
      {account.errorMessage ? <Alert>{account.errorMessage}</Alert> : null}
      {!account.peyId ? (
        <Choice primary icon={<IcoBank />} label={busy ? busyLabel : 'Registrar para cobrar'} hint="La revisa el banco" onClick={() => onRegister(account.id)} />
      ) : null}
      {account.peyId && !active ? (
        <Choice primary icon={<IcoClock />} label={busy ? busyLabel : 'Revisar si ya está lista'} onClick={() => onRefresh(account.id)} />
      ) : null}
      {active ? <Choice primary icon={<IcoCash />} label="Cobrar" onClick={() => onView({ id: 'who', page: 0 })} /> : null}
      {account.peyId && !asking ? <Choice icon={<IcoBank />} label="Registrarla otra vez en Pey" hint="Solo si cambiaste la llave de Pey" onClick={() => setAgain(true)} /> : null}
      {!asking ? (
        <Choice danger label="Eliminar cuenta" hint={account.codiStatus === 'ERROR' ? 'Tiene un error' : 'Ya no la necesito'} onClick={() => setAsking(true)} />
      ) : (
        <div className="stack" data-ayuda="Esto quita la cuenta de la app. Toca Sí, eliminar. O toca No, volver.">
          <Alert>Se quita de esta app. Los cobros que ya hiciste se conservan, pero sin el nombre de la cuenta. En Pey la cuenta sigue registrada.</Alert>
          <Choice danger label={busy ? busyLabel : 'Sí, eliminar'} onClick={() => onDeleteAccount(account.id)} />
          <Choice label="No, volver" onClick={() => setAsking(false)} />
        </div>
      )}
    </section>
  );
}

function AddAccount({ busy, formError, onAddAccount }: StageProps) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onAddAccount({
      alias: String(data.get('alias') || ''),
      legalName: String(data.get('legal') || ''),
      clabe: String(data.get('clabe') || ''),
      entity: data.get('entity') === 'BUSINESS' ? 'BUSINESS' : 'PERSON',
    });
  };
  return (
    <section className="stack">
      <h1>Nueva cuenta</h1>
      <form className="stack" onSubmit={submit}>
        {formError ? <Alert>{formError}</Alert> : null}
        <Field label="Nombre corto"><input name="alias" required autoComplete="off" /></Field>
        <p className="hint">Así la vas a reconocer.</p>
        <Field label="Nombre de quien es la cuenta"><input name="legal" required autoComplete="name" /></Field>
        <Field label="CLABE, 18 números"><input name="clabe" required inputMode="numeric" autoComplete="off" /></Field>
        <Field label="¿De quién es la cuenta?">
          <select name="entity" defaultValue="PERSON" data-ayuda="Toca y elige si la cuenta es de una persona o de un negocio.">
            <option value="PERSON">Persona</option>
            <option value="BUSINESS">Negocio o institución</option>
          </select>
        </Field>
        <Choice primary type="submit" label={busy ? busyLabel : 'Guardar'} />
      </form>
    </section>
  );
}

function NewCharge({ people, accounts, personId, busy, formError, onCreateCharge, onView }: StageProps & { personId: string }) {
  const person = findPerson(people, personId);
  if (!person) return <Missing onHome={() => onView({ id: 'home' })} />;
  if (!accounts.length) {
    return (
      <section className="stack">
        <h1>Falta la cuenta</h1>
        <Alert>Primero agrega la cuenta que recibe el dinero.</Alert>
        <Choice primary icon={<IcoBank />} label="Agregar cuenta" onClick={() => onView({ id: 'add-account' })} />
      </section>
    );
  }
  const only = accounts.length === 1 ? accounts[0] : null;
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const accountId = only ? only.id : String(data.get('account') || '');
    onCreateCharge(person.id, String(data.get('concept') || ''), parseAmount(String(data.get('amount') || '')), accountId, false); // an extraordinary charge never confirms a place
  };
  return (
    <section className="stack">
      <WhoLine name={person.name} person={person} />
      <h1>Cobro extraordinario</h1>
      <p className="lead">Para algo que no es el cobro de siempre, por ejemplo una cooperación para un evento.</p>
      <form className="stack" onSubmit={submit}>
        {formError ? <Alert>{formError}</Alert> : null}
        <Field label="¿Para qué es?"><input name="concept" placeholder="Cooperación para el cumpleaños" autoComplete="off" required /></Field>
        <Field label="¿Cuánto?">
          <input name="amount" required inputMode="decimal" autoComplete="off" placeholder="0.00" />
        </Field>
        {only ? <p className="lead">El dinero llega a {only.alias}.</p> : (
          <Field label="¿A qué cuenta llega?">
            <select name="account" required defaultValue="" data-ayuda="Toca y elige a qué cuenta llega el dinero.">
              <option value="" disabled>Elige la cuenta</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.alias}</option>)}
            </select>
          </Field>
        )}
        <Choice primary type="submit" label={busy ? busyLabel : 'Crear cobro'} />
      </form>
    </section>
  );
}

function Missing({ onHome }: { onHome: () => void }) {
  return (
    <section className="stack">
      <Result kind="bad" title="Ya no está" text="Ese dato ya no está en la lista." />
      <Choice primary label="Volver al inicio" onClick={onHome} />
    </section>
  );
}
