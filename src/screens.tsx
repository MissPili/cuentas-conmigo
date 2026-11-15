import { useState, type FormEvent, type ReactNode } from 'react';
import {
  accountWords, chargeKind, chargeWords, money, monthName, pageOf, parseAmount, personWords, ready, thisMonth,
  type Acc, type Chg, type Per, type Proj, type View,
} from './model';
import { Alert, Avatar, WhoLine, Choice, Field, IcoBank, IcoCash, IcoClock, IcoOut, IcoPeople, IcoPhone, IcoQr, Result, Status } from './ui';
import ReceiptView from './Receipt';
import { destinations, folioOf, payCardSvg, payText, type Dest } from './comprobante';
import { PictureSend } from './Receipt';
import { DangerZone, More, ReportView } from './screens2';
import { PlacesHub, PlacesSettings, RegQr, SeatDetail, Seats } from './screens3';
import type { Plan } from './plans';
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
  onAddPerson: (name: string, tel: string) => void;
  onAddAccount: (input: { alias: string; legalName: string; clabe: string; entity: 'PERSON' | 'BUSINESS' }) => void;
  onCreateCharge: (personId: string, concept: string, amount: number, accountId: string, confirmsPlace: boolean) => void;
  onSaveProject: (input: { name: string; capacity: number; holdDays: number; plans: Plan[] }) => void;
  projects: Proj[];
  /** Cobrado este mes por proyecto, para la lista de proyectos. */
  totals?: Record<string, number>;
  onPickProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteAccount: (id: string) => void;
  onToggleOpen: () => void;
  /** Sends a code to the collector's email. Returns an error message, or '' when it went out. */
  onSendCode: () => Promise<string>;
  /** Checks the emailed code and, only if right, deletes all people and charges. Returns an error message or ''. */
  onWipe: (code: string) => Promise<string>;
  onRotateToken: () => void;
  onSeat: (personId: string, action: 'approve' | 'give' | 'extend' | 'release') => void;
  onRequest: (chargeId: string) => void;
  onShowQr: (chargeId: string) => void;
  onCash: (chargeId: string) => void;
  onCheck: (chargeId: string) => void;
  onRegister: (accountId: string) => void;
  onRefresh: (accountId: string) => void;
  onRetry: () => void;
  problem: { title: string; detail: string } | null;
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
        <Result kind="bad" title={p.problem.title} text={p.problem.detail} />
        <Choice primary icon={<IcoClock />} label={p.busy ? busyLabel : 'Intentar de nuevo'} onClick={p.onRetry} />
        <Choice label="Volver al inicio" onClick={() => p.onReset({ id: 'home' })} />
      </section>
    );
  }

  const v = p.view;
  if (v.id === 'projects' || !p.project) return <ProjectsView {...p} />;
  if (v.id === 'new-project') return <NewProject {...p} />;
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
  if (v.id === 'danger') return <DangerZone {...p} />;
  if (v.id === 'places') return <PlacesHub {...p} />;
  if (v.id === 'seats') return <Seats {...p} page={v.page} only={v.only} />;
  if (v.id === 'seat') return <SeatDetail {...p} personId={v.personId} />;
  if (v.id === 'reg-qr') return <RegQr {...p} />;
  if (v.id === 'places-settings') return <PlacesSettings {...p} />;
  if (v.id === 'report') return <ReportView {...p} month={v.month} />;
  if (v.id === 'people') return <People {...p} />;
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
        <Choice icon={<IcoPeople />} label={`Aprobar inscripciones (${review})`} hint={review === 1 ? 'Hay 1 persona esperando' : `Hay ${review} personas esperando`} onClick={() => onView({ id: 'seats', page: 0, only: 'review' })} />
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

function PersonCharges({ people, charges, onView, personId, page }: StageProps & { personId: string; page: number }) {
  const person = findPerson(people, personId);
  if (!person) return <Missing onHome={() => onView({ id: 'home' })} />;
  const month = thisMonth();
  const mine = charges.filter((c) => c.personId === personId && c.month === month);
  type Row = { key: string; node: ReactNode };
  const rows: Row[] = mine.map((c) => ({
    key: c.id,
    node: (
      <button type="button" className="person" onClick={() => onView(chargeKind(c) === 'paid' ? { id: 'paid', chargeId: c.id } : { id: 'charge', chargeId: c.id })}>
        <span className="person-name">{c.concept}</span>
        <span className="person-amt">{money(c.amount)}</span>
        <Status kind={chargeKind(c)}>{chargeWords(c)}</Status>
      </button>
    ),
  }));
  rows.push({
    key: 'new',
    node: <Choice icon={<IcoCash />} label="Crear otro cobro" hint="Un monto libre" onClick={() => onView({ id: 'new-charge', personId })} />,
  });
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
        <Choice icon={<IcoPhone />} label={busy ? busyLabel : 'Pedir el pago a su celular'} hint="Puede no llegar a todos los bancos" onClick={() => onRequest(charge.id)} />
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
  return (
    <section className="stack">
      <WhoLine name={charge.personName} person={findPerson(people, charge.personId)} />
      <h1>Esperando el pago</h1>
      <p className="amount">{money(charge.amount)}</p>
      <Status kind="wait">Esperando el pago</Status>
      <p className="lead">Cuando pague, aquí se marca solo. Si ya pagó y no cambia, revisa.</p>
      <Choice primary icon={<IcoClock />} label={busy ? busyLabel : 'Revisar si ya pagó'} hint="Le preguntamos a Pey" onClick={() => onCheck(charge.id)} />
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
  const helpers = person?.helperInfo?.length ? person.helperInfo : (person?.helpers ?? []).map((t) => ({ tel: t, name: '', rel: '' }));
  return destinations(tel, helpers, person?.sendTo);
}

function SendQr({ charge, img, accounts, people, project, onView }: StageProps & { charge: Chg | undefined; img: string }) {
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
      dests={destsFor(people, charge.tel, charge.personId)}
    >
      <Choice icon={<IcoQr />} label="Volver al código" onClick={() => onView({ id: 'qr', chargeId: charge.id, img })} />
    </PictureSend>
  );
}

function ReceiptStep({ charge, accounts, people, project, onView }: StageProps & { charge: Chg | undefined }) {
  if (!charge) return <Missing onHome={() => onView({ id: 'home' })} />;
  const account = findAccount(accounts, charge.accountId);
  return (
    <ReceiptView
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

function People({ people: all, onView }: StageProps) {
  const people = all.filter((x) => x.status !== 'RELEASED');
  return (
    <section className="stack">
      <h1>Personas</h1>
      <p className="lead">{people.length ? 'Estas son las personas a las que les cobras.' : 'Aún no hay personas.'}</p>
      {people.length ? (
        <ul className="plain">
          {people.map((person) => (
            <li key={person.id}><strong>{person.name}</strong><span>{person.tel}</span></li>
          ))}
        </ul>
      ) : null}
      <Choice primary icon={<IcoPeople />} label="Agregar persona" hint="Nombre y WhatsApp" onClick={() => onView({ id: 'add-person' })} />
    </section>
  );
}

function AddPerson({ busy, formError, onAddPerson }: StageProps) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    onAddPerson(String(data.get('name') || ''), String(data.get('tel') || ''));
  };
  return (
    <section className="stack">
      <h1>Nueva persona</h1>
      <form className="stack" onSubmit={submit}>
        {formError ? <Alert>{formError}</Alert> : null}
        <Field label="Nombre"><input name="name" required autoComplete="name" /></Field>
        <Field label="WhatsApp, 10 números"><input name="tel" required inputMode="numeric" autoComplete="tel" /></Field>
        <Choice primary type="submit" label={busy ? busyLabel : 'Guardar'} />
      </form>
    </section>
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
  if (!account) return <Missing onHome={() => onView({ id: 'home' })} />;
  const words = accountWords(account);
  const active = account.codiStatus === 'ACTIVE';
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
      {!asking ? (
        <Choice danger label="Eliminar cuenta" hint={account.codiStatus === 'ERROR' ? 'Tiene un error' : 'Ya no la necesito'} onClick={() => setAsking(true)} />
      ) : (
        <div className="stack">
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
          <select name="entity" defaultValue="PERSON">
            <option value="PERSON">Persona</option>
            <option value="BUSINESS">Negocio o institución</option>
          </select>
        </Field>
        <Choice primary type="submit" label={busy ? busyLabel : 'Guardar'} />
      </form>
    </section>
  );
}

function NewCharge({ people, accounts, personId, project, busy, formError, onCreateCharge, onView }: StageProps & { personId: string }) {
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
    onCreateCharge(person.id, String(data.get('concept') || ''), parseAmount(String(data.get('amount') || '')), accountId, data.get('monthly') === 'on');
  };
  return (
    <section className="stack">
      <WhoLine name={person.name} person={person} />
      <h1>Nuevo cobro</h1>
      <form className="stack" onSubmit={submit}>
        {formError ? <Alert>{formError}</Alert> : null}
        <Field label="¿De qué es el cobro?"><input name="concept" placeholder="Cuota" autoComplete="off" /></Field>
        <Field label="¿Cuánto?">
          <input name="amount" required inputMode="decimal" autoComplete="off" placeholder="0.00" />
        </Field>
        {placesOn(project) ? (
          <label className="check"><input type="checkbox" name="monthly" defaultChecked /><span>Es la mensualidad (confirma el lugar)</span></label>
        ) : null}
        {only ? <p className="lead">El dinero llega a {only.alias}.</p> : (
          <Field label="¿A qué cuenta llega?">
            <select name="account" required defaultValue="">
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
