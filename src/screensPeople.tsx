// People: the list, what is registered about each one (and who helps them pay), correcting or completing it,
// and choosing WHICH registered number gets a CoDi request on a given day.
import { useState, type FormEvent } from 'react';
import type { StageProps } from './screens';
import { chargeKind, money, pageOf, type Chg, type Per } from './model';
import { emblemOf } from './emblems';
import { destinations } from './comprobante';
import { digits, fmtTel, helperGaps, helpersOf, payProblem } from './payers';
import { PayersFields, SendToChoice, usePayers } from './pickers';
import { Alert, Avatar, Choice, Field, IcoCheck, IcoPeople, IcoPhone, Status, WhoLine } from './ui';

const busyLabel = 'Un momento…';

function Missing({ onHome }: { onHome: () => void }) {
  return (
    <section className="stack">
      <h1>No encontramos a esa persona</h1>
      <Choice primary label="Ir al inicio" onClick={onHome} />
    </section>
  );
}

/** Everyone the collector charges, three at a time. Toca el nombre para ver y corregir sus datos. */
export function People({ people: all, page, onView }: StageProps & { page: number }) {
  const people = all.filter((x) => x.status !== 'RELEASED').sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const slice = pageOf(people, page);
  return (
    <section className="stack">
      <h1>Personas</h1>
      <p className="lead">{people.length ? 'Toca un nombre para ver o corregir sus datos.' : 'Aún no hay personas.'}</p>
      {slice.rows.map((p) => {
        const gaps = helpersOf(p).some((h) => helperGaps(h).length > 0);
        return (
          <button key={p.id} type="button" className="person" onClick={() => onView({ id: 'person-data', personId: p.id })}>
            <Avatar person={p} />
            <span className="person-name">{p.name}</span>
            {gaps ? <Status kind="wait">Faltan datos</Status> : <span className="person-amt">{fmtTel(p.tel)}</span>}
          </button>
        );
      })}
      {slice.more ? <Choice label={slice.more.label} hint={slice.more.hint} onClick={() => onView({ id: 'people', page: slice.more!.page })} /> : null}
      <Choice primary icon={<IcoPeople />} label="Agregar persona" hint="Nombre y WhatsApp" onClick={() => onView({ id: 'add-person' })} />
    </section>
  );
}

/** What is registered about one person, and who helps them pay. */
export function PersonData({ people, personId, onView, onOpenPerson }: StageProps & { personId: string }) {
  const person = people.find((x) => x.id === personId);
  if (!person) return <Missing onHome={() => onView({ id: 'home' })} />;
  const helpers = helpersOf(person);
  const picture = person.photo ? 'su foto (con su permiso)' : emblemOf(person.emblem) ? `${emblemOf(person.emblem)!.glyph} ${emblemOf(person.emblem)!.name}` : 'todavía no tiene';
  const gets = destinations(person.tel, helpers, person.sendTo, 4).find((d) => d.chosen);
  return (
    <section className="stack">
      <WhoLine name={person.name} person={person} />
      <h1>Sus datos</h1>
      <div className="stat">
        <p><strong>Su WhatsApp:</strong> {fmtTel(person.tel)}</p>
        <p><strong>Su imagen:</strong> {picture}</p>
        <p><strong>Cómo paga:</strong> {helpers.length ? 'con ayuda de un familiar' : 'desde su celular'}</p>
      </div>
      {helpers.map((h, i) => {
        const gaps = helperGaps(h);
        return (
          <div key={h.tel + i} className="stat">
            <p><strong>Persona {i + 1}:</strong> {h.name || 'sin nombre'}{h.rel ? ` (${h.rel})` : ''}</p>
            <p><strong>WhatsApp:</strong> {fmtTel(h.tel)}</p>
            {gaps.length ? <Status kind="wait">Falta: {gaps.join(' y ')}</Status> : null}
          </div>
        );
      })}
      {helpers.length ? (
        <p className="hint">Sus códigos y comprobantes se mandan a: {gets?.label ?? 'su celular'}. {person.consentShared ? 'Está de acuerdo en que se guarden esos teléfonos.' : 'Falta su permiso para guardar esos teléfonos.'}</p>
      ) : null}
      <Choice primary mark="💰" label="Cobrarle" hint="Ver sus cobros" onClick={() => onOpenPerson(person.id)} />
      <Choice icon={<IcoPeople />} label="Corregir su nombre o WhatsApp" onClick={() => onView({ id: 'person-edit', personId, part: 'own' })} />
      <Choice icon={<IcoPeople />} label={helpers.length ? 'Corregir quién le ayuda' : 'Agregar quién le ayuda'} hint={helpers.length ? 'Cambiar, completar o quitar' : 'Hasta 3 personas'} onClick={() => onView({ id: 'person-edit', personId, part: 'helpers' })} />
    </section>
  );
}

/** Correct the name and the WhatsApp of the person. */
export function PersonEditOwn({ people, personId, busy, formError, onSaveOwn, onView }: StageProps & { personId: string }) {
  const person = people.find((x) => x.id === personId);
  const [error, setError] = useState('');
  if (!person) return <Missing onHome={() => onView({ id: 'home' })} />;
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get('name') || '').trim().replace(/\s+/g, ' ');
    const tel = digits(String(data.get('tel') || ''));
    if (name.length < 2) { setError('Escribe el nombre.'); return; }
    if (tel.length !== 10) { setError('El WhatsApp debe tener 10 números.'); return; }
    setError('');
    onSaveOwn(person.id, { name, tel });
  };
  return (
    <section className="stack">
      <WhoLine name={person.name} person={person} />
      <h1>Corregir sus datos</h1>
      {error || formError ? <Alert>{error || formError}</Alert> : null}
      <form className="stack" onSubmit={submit}>
        <Field label="Nombre completo"><input name="name" defaultValue={person.name} autoComplete="off" required /></Field>
        <Field label="WhatsApp, 10 números"><input name="tel" defaultValue={person.tel} inputMode="numeric" autoComplete="off" required /></Field>
        <p className="hint">Los cobros que todavía no pagan se corrigen con el nombre y el número nuevos.</p>
        <Choice primary type="submit" icon={<IcoCheck />} label={busy ? busyLabel : 'Guardar'} />
      </form>
    </section>
  );
}

/** Complete, correct or remove who helps the person pay, and choose where codes and receipts go by default. */
export function PersonEditHelpers({ people, personId, busy, formError, onSaveHelpers, onView }: StageProps & { personId: string }) {
  const person = people.find((x) => x.id === personId);
  const saved = person ? helpersOf(person) : [];
  const pay = usePayers({ mode: saved.length ? 'helper' : '', helpers: saved.length ? saved : undefined, sendTo: person?.sendTo ?? '' });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  if (!person) return <Missing onHome={() => onView({ id: 'home' })} />;

  const needsConsent = pay.clean.length > 0 && !person.consentShared;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const problem = payProblem(pay.mode, pay.helpers, 'other');
    if (problem) { setError(problem); return; }
    if (needsConsent && !consent) { setError('Marca la casilla para poder guardar.'); return; }
    setError('');
    onSaveHelpers(person.id, { helpers: pay.clean, sendTo: pay.sendTel(person.tel), consentShared: pay.clean.length > 0 && (!!person.consentShared || consent) });
  };

  return (
    <form className="stack" onSubmit={submit}>
      <WhoLine name={person.name} person={person} />
      {error || formError ? <Alert>{error || formError}</Alert> : null}
      <PayersFields p={pay} who="other" title />
      {pay.clean.length ? <SendToChoice p={pay} own={person.tel} who="other" /> : null}
      {needsConsent ? (
        <div className="consent">
          <h2 className="ask">Antes de guardar</h2>
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>La persona está de acuerdo en que guardemos los teléfonos de quien le ayuda.</span>
          </label>
        </div>
      ) : null}
      <Choice primary type="submit" icon={<IcoCheck />} label={busy ? busyLabel : 'Guardar'} />
    </form>
  );
}

/** Which registered number gets the CoDi request today: the person's own or one of their helpers. */
export function ChargeTo({ charge, people, busy, onRequest, onView }: StageProps & { charge: Chg | undefined }) {
  if (!charge) return <Missing onHome={() => onView({ id: 'home' })} />;
  const person: Per | undefined = people.find((x) => x.id === charge.personId);
  const dests = destinations(person?.tel ?? charge.tel, person ? helpersOf(person) : [], person?.sendTo, 4);
  return (
    <section className="stack">
      <WhoLine name={person?.name ?? charge.personName} person={person} />
      <h1>¿A quién le pedimos el pago?</h1>
      <p className="amount">{money(charge.amount)}</p>
      <p className="lead">El banco le manda el aviso a ese celular. Debe tener CoDi.</p>
      {chargeKind(charge) === 'wait' && charge.pushTel ? <Status kind="wait">Ya se pidió a {dests.find((d) => d.tel === charge.pushTel)?.label ?? 'otro número'}</Status> : null}
      {dests.map((d, i) => (
        <Choice
          key={d.tel}
          primary={i === 0}
          mark={i === 0 ? '💬' : undefined}
          icon={<IcoPhone />}
          label={busy ? busyLabel : d.label}
          hint={`Celular ${d.sub}${d.chosen ? ' · el que prefiere' : ''}`}
          onClick={() => onRequest(charge.id, d.tel)}
        />
      ))}
    </section>
  );
}
