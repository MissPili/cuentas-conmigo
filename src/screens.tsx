import type { FormEvent, ReactNode } from 'react';
import {
  accountWords, chargeKind, chargeWords, money, monthName, pageOf, parseAmount, personWords, ready, thisMonth,
  type Acc, type Chg, type Per, type Proj, type View,
} from './model';
import { Alert, Choice, Field, IcoBank, IcoCash, IcoClock, IcoOut, IcoPeople, IcoPhone, IcoQr, Result, Status } from './ui';
import ReceiptView from './Receipt';
import { folioOf } from './comprobante';
import { More, ReportView, Access } from './screens2';
import { PlacesHub, PlacesSettings, RegQr, SeatDetail, Seats } from './screens3';
import { canCharge, isFull, placesOn, toApprove } from './places';

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
  onSaveProject: (input: { name: string; capacity: number; holdDays: number }) => void;
  onToggleOpen: () => void;
  onRotateToken: () => void;
  onSeat: (personId: string, action: 'approve' | 'give' | 'extend' | 'release') => void;
  onRequest: (chargeId: string) => void;
  onShowQr: (chargeId: string) => void;
  onCash: (chargeId: string) => void;
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
  if (v.id === 'home') return <Home {...p} />;
  if (v.id === 'who') return <Who {...p} page={v.page} />;
  if (v.id === 'person') return <PersonCharges {...p} personId={v.personId} page={v.page} />;
  if (v.id === 'charge') return <ChargeStep {...p} charge={findCharge(p.charges, v.chargeId)} />;
  if (v.id === 'cash') return <CashStep {...p} charge={findCharge(p.charges, v.chargeId)} />;
  if (v.id === 'wait') return <WaitStep {...p} charge={findCharge(p.charges, v.chargeId)} />;
  if (v.id === 'qr') return <QrStep {...p} charge={findCharge(p.charges, v.chargeId)} img={v.img} />;
  if (v.id === 'paid') return <PaidStep {...p} charge={findCharge(p.charges, v.chargeId)} />;
  if (v.id === 'receipt') return <ReceiptStep {...p} charge={findCharge(p.charges, v.chargeId)} />;
  if (v.id === 'more') return <More {...p} />;
  if (v.id === 'access') return <Access />;
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
  const now = charges.filter((c) => c.month === month);
  const paid = now.filter((c) => c.status === 'PAID').length;
  const waiting = now.filter((c) => c.status !== 'PAID' && !!c.transactionId).length;
  const due = now.length - paid - waiting;
  const hasAccount = accounts.length > 0;
  const hasPeople = people.length > 0;
  const name = monthName(month);

  let primary: ReactNode;
  if (!hasAccount) {
    primary = <Choice primary icon={<IcoBank />} label="Agregar cuenta" hint="Ahí llega el dinero" onClick={() => onView({ id: 'add-account' })} />;
  } else if (!hasPeople) {
    primary = <Choice primary icon={<IcoPeople />} label="Agregar persona" hint="Nombre y WhatsApp" onClick={() => onView({ id: 'add-person' })} />;
  } else {
    primary = <Choice primary icon={<IcoCash />} label="Cobrar" hint="Elegir a quién" onClick={() => onView({ id: 'who', page: 0 })} />;
  }

  const extras: ReactNode[] = [
    <Choice key="people" icon={<IcoPeople />} label="Personas" hint="Nombres y teléfonos" onClick={() => onView({ id: 'people' })} />,
    ...(placesOn(project) ? [<Choice key="places" icon={<IcoPeople />} label="Lugares" hint={placesHint(people, charges, project)} onClick={() => onView({ id: 'places' })} />] : []),
    <Choice key="more" icon={<IcoBank />} label="Más opciones" hint="Reporte, cuenta y salir" onClick={() => onView({ id: 'more' })} />,
  ];

  return (
    <section className="stack">
      <h1>¿Qué quieres hacer?</h1>
      {now.length ? (
        <div className="stat">
          <p><strong>{name}:</strong> {paid} de {now.length} ya pagaron.</p>
          <p>{waiting} esperando. {due} faltan.</p>
        </div>
      ) : (
        <p className="lead">En {name.toLowerCase()} todavía no hay cobros.</p>
      )}
      {primary}
      {extras}
    </section>
  );
}

function placesHint(people: Per[], charges: Chg[], project: Proj): string {
  const review = toApprove(people).length;
  if (review) return review === 1 ? '1 inscripción por revisar' : `${review} inscripciones por revisar`;
  return isFull(people, project, charges, new Date()) ? 'Taller lleno' : 'Cupos e inscripciones';
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
          <span className="person-name">{person.name}</span>
          <Status kind={words.kind}>{words.text}</Status>
        </button>
      ))}
      {slice.more ? (
        <Choice label={slice.more.label} hint={slice.more.hint} onClick={() => onView({ id: 'who', page: slice.more!.page })} />
      ) : null}
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
      <p className="who-line">{person.name}</p>
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
      <p className="who-line">{name}</p>
      <h1>¿Cómo paga?</h1>
      <p className="amount">{money(charge.amount)}</p>
      <p className="lead">{charge.concept}. {account ? `El dinero llega a ${account.alias}.` : 'No encuentro la cuenta de este cobro.'}</p>
      <Status kind={chargeKind(charge)}>{chargeWords(charge)}</Status>
      {!canCell ? <Alert>Esta cuenta aún no está lista. Por ahora solo puedes anotar efectivo.</Alert> : null}
      {canCell ? (
        <Choice primary icon={<IcoPhone />} label={busy ? busyLabel : 'Pedir el pago a su celular'} hint="Le llega un aviso" onClick={() => onRequest(charge.id)} />
      ) : null}
      {canCell ? (
        <Choice icon={<IcoQr />} label={busy ? busyLabel : 'Mostrar código para pagar'} hint="Lo escanea con su banco" onClick={() => onShowQr(charge.id)} />
      ) : null}
      <Choice primary={!canCell} icon={<IcoCash />} label="Ya lo recibí en efectivo" hint="Tú guardas el dinero" onClick={() => onView({ id: 'cash', chargeId: charge.id })} />
      <Choice label="Crear otro cobro" onClick={() => onView({ id: 'new-charge', personId: charge.personId })} />
    </section>
  );
}

function CashStep({ charge, busy, onCash, onView }: StageProps & { charge: Chg | undefined }) {
  if (!charge) return <Missing onHome={() => onView({ id: 'home' })} />;
  return (
    <section className="stack">
      <p className="who-line">{charge.personName}</p>
      <h1>¿Recibiste {money(charge.amount)}?</h1>
      <p className="lead">Cuéntalos antes de confirmar. Es de {charge.concept}.</p>
      <Choice primary icon={<IcoCash />} label={busy ? busyLabel : 'Sí, ya lo recibí'} onClick={() => onCash(charge.id)} />
    </section>
  );
}

function WaitStep({ charge, onView }: StageProps & { charge: Chg | undefined }) {
  if (!charge) return <Missing onHome={() => onView({ id: 'home' })} />;
  return (
    <section className="stack">
      <p className="who-line">{charge.personName}</p>
      <h1>Esperando el pago</h1>
      <p className="amount">{money(charge.amount)}</p>
      <Status kind="wait">Esperando el pago</Status>
      <p className="lead">Se lo pedimos a su celular. Cuando pague, aquí se marca solo.</p>
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

function QrStep({ charge, img, onView }: StageProps & { charge: Chg | undefined; img: string }) {
  if (!charge) return <Missing onHome={() => onView({ id: 'home' })} />;
  return (
    <section className="stack">
      <p className="who-line">{charge.personName}</p>
      <h1>Muestra el código</h1>
      <img className="shot" alt={`Código para que ${charge.personName} pague ${money(charge.amount)}`} src={`data:image/png;base64,${img}`} />
      <p className="lead">Escanéalo con la app del banco. Cuando pague, aquí se marca solo.</p>
      <Status kind="wait">Esperando el pago</Status>
      <Choice icon={<IcoCash />} label="Ya lo recibí en efectivo" hint="Si no fue con el código" onClick={() => onView({ id: 'cash', chargeId: charge.id })} />
    </section>
  );
}

function ReceiptStep({ charge, accounts, onView }: StageProps & { charge: Chg | undefined }) {
  if (!charge) return <Missing onHome={() => onView({ id: 'home' })} />;
  const account = findAccount(accounts, charge.accountId);
  return (
    <ReceiptView
      tel={charge.tel}
      data={{
        folio: folioOf(charge.id),
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

function People({ people, onView }: StageProps) {
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

function AccountStep({ account, busy, onRegister, onRefresh, onView }: StageProps & { account: Acc | undefined }) {
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
      <p className="who-line">{person.name}</p>
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
