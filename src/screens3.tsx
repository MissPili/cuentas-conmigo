// Places (cupos) screens for the collector: hub, who has a place, one person, signup QR and settings.
import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import type { StageProps } from './screens';
import { money, monthName, pageOf, parseAmount, thisMonth, ready, type Kind, type Per } from './model';
import { emblemOf } from './emblems';
import { Alert, Avatar, WhoLine, Choice, Field, IcoCash, IcoPeople, IcoPhone, IcoQr, IcoClock, Status } from './ui';
import {
  confirmedCount, freeSpots, isFull, occupied, placeState, placesOn, toApprove, waitlisted, type PlaceState,
} from './places';

const busyLabel = 'Un momento…';

export const signupLink = (token: string) => `${location.origin}/?i=${token}`;

const WORDS: Record<PlaceState, { kind: Kind; text: string }> = {
  confirmed: { kind: 'paid', text: 'Lugar confirmado' },
  held: { kind: 'wait', text: 'Lugar apartado' },
  overdue: { kind: 'bad', text: 'Se venció el apartado' },
  pending: { kind: 'wait', text: 'Por aprobar' },
  waitlist: { kind: 'due', text: 'En lista de espera' },
  released: { kind: 'due', text: 'Sin lugar' },
};

const fmtTel = (t: string) => (t.length === 10 ? `${t.slice(0, 2)} ${t.slice(2, 6)} ${t.slice(6)}` : t);

export function PlacesHub({ project, people, charges, onView }: StageProps) {
  const now = new Date();
  if (!placesOn(project)) {
    return (
      <section className="stack">
        <h1>Lugares del taller</h1>
        <p className="lead">Pon cuántos lugares hay y recibe inscripciones con un código QR.</p>
        <Choice primary icon={<IcoPeople />} label="Activar lugares" hint="Cuántos lugares hay" onClick={() => onView({ id: 'places-settings' })} />
      </section>
    );
  }
  const taken = occupied(people, project, charges, now);
  const sure = confirmedCount(people, project, charges, now);
  const review = toApprove(people).length;
  const waiting = waitlisted(people).length;
  const full = isFull(people, project, charges, now);
  return (
    <section className="stack">
      <h1>Lugares</h1>
      <div className="stat">
        <p><strong>{taken} de {project.capacity}</strong> lugares ocupados.</p>
        <p>{sure} confirmados. {freeSpots(people, project, charges, now)} libres.</p>
      </div>
      {full ? <Status kind="bad">Taller lleno</Status> : null}
      <Choice
        primary={review > 0}
        icon={<IcoPeople />}
        label="Inscripciones"
        hint={review ? `${review} por revisar${waiting ? `. ${waiting} en espera` : ''}` : waiting ? `${waiting} en espera` : 'Nada por revisar'}
        onClick={() => onView({ id: 'seats', page: 0, only: 'review' })}
      />
      <Choice icon={<IcoCash />} label="Quién tiene lugar" hint="Confirmados y apartados" onClick={() => onView({ id: 'seats', page: 0 })} />
      <Choice primary={review === 0} icon={<IcoQr />} label="Código para inscribir" hint="Para que se anoten solos" onClick={() => onView({ id: 'reg-qr' })} />
      <Choice icon={<IcoClock />} label="Ajustes" hint="Lugares y días de apartado" onClick={() => onView({ id: 'places-settings' })} />
    </section>
  );
}

export function Seats({ project, people, charges, page, only, onView }: StageProps & { page: number; only?: 'review' }) {
  const now = new Date();
  if (!placesOn(project)) return <PlacesHub {...({ project, people, charges, onView } as StageProps)} />;
  const list: { person: Per; state: PlaceState }[] = people
    .map((person) => ({ person, state: placeState(person, project, charges, now) }))
    .filter((x) => (only === 'review' ? x.state === 'pending' || x.state === 'waitlist' : x.state !== 'released' && x.state !== 'waitlist' && x.state !== 'pending'))
    .sort((a, b) => a.person.name.localeCompare(b.person.name, 'es'));
  const ordered = only === 'review' ? [...list.filter((x) => x.state === 'pending'), ...list.filter((x) => x.state === 'waitlist')] : list;
  const slice = pageOf(ordered, page);
  return (
    <section className="stack">
      <h1>{only === 'review' ? 'Inscripciones' : 'Quién tiene lugar'}</h1>
      {ordered.length ? null : <p className="lead">{only === 'review' ? 'No hay inscripciones por revisar.' : 'Todavía nadie tiene lugar.'}</p>}
      {slice.rows.map(({ person, state }) => (
        <button key={person.id} type="button" className="person" onClick={() => onView({ id: 'seat', personId: person.id })}>
          <Avatar person={person} />
          <span className="person-name">{person.name}</span>
          <Status kind={WORDS[state].kind}>{WORDS[state].text}</Status>
        </button>
      ))}
      {slice.more ? (
        <Choice label={slice.more.label} hint={slice.more.hint} onClick={() => onView({ id: 'seats', page: slice.more!.page, only })} />
      ) : null}
    </section>
  );
}

export function SeatDetail({ project, people, charges, accounts, personId, busy, onSeat, onCreateCharge, onView }: StageProps & { personId: string }) {
  const [leaving, setLeaving] = useState(false);
  const person = people.find((p) => p.id === personId);
  if (!person || !placesOn(project)) {
    return (
      <section className="stack">
        <h1>Ya no está</h1>
        <Choice primary label="Volver a lugares" onClick={() => onView({ id: 'places' })} />
      </section>
    );
  }
  const state = placeState(person, project, charges, new Date());
  const words = WORDS[state];
  const free = freeSpots(people, project, charges, new Date());
  const fee = project.monthlyAmount ?? 0;
  const feeAccount = accounts.find((a) => a.id === project.accountId);
  const feeConcept = project.monthlyConcept || 'Mensualidad';
  const month = thisMonth();
  const feeCharge = charges.find((c) => c.personId === person.id && c.month === month && c.confirmsPlace);
  const canQuick = (state === 'held' || state === 'confirmed' || state === 'overdue') && fee > 0 && !!feeAccount && !feeCharge;
  return (
    <section className="stack">
      <WhoLine name={person.name} person={person} />
      {emblemOf(person.emblem) && !person.photo ? <p className="hint">Su imagen: {emblemOf(person.emblem)!.name}</p> : null}
      <Status kind={words.kind}>{words.text}</Status>
      <div className="stat">
        <p><strong>Su WhatsApp:</strong> {fmtTel(person.tel)}</p>
        {person.helpers?.length ? <p><strong>Quien le ayuda a pagar:</strong> {person.helpers.map(fmtTel).join(', ')}</p> : null}
      </div>
      {canQuick ? (
        <Choice primary icon={<IcoPhone />} label={`Cobrarle ${money(fee)}`} hint={`${feeConcept} de ${monthName(month).toLowerCase()}`} onClick={() => onCreateCharge(person.id, feeConcept, fee, feeAccount.id, true)} />
      ) : null}
      {feeCharge ? (
        <Choice primary icon={<IcoPhone />} label={feeCharge.status === 'PAID' ? 'Ver su pago' : 'Ver su cobro'} hint={feeCharge.status === 'PAID' ? 'Enviar comprobante' : 'Mostrar el código para pagar'} onClick={() => onView({ id: feeCharge.status === 'PAID' ? 'receipt' : 'charge', chargeId: feeCharge.id })} />
      ) : null}
      {state === 'pending' ? (
        <>
          <p className="hint">Hasta que lo apruebes no se le manda ningún cobro ni mensaje.</p>
          <Choice primary icon={<IcoPeople />} label={busy ? busyLabel : 'Aprobar'} hint="Apartarle su lugar" onClick={() => onSeat(person.id, 'approve')} />
          <Choice danger label="No aceptar" hint="Se quita la inscripción" onClick={() => onSeat(person.id, 'release')} />
        </>
      ) : null}
      {state === 'waitlist' ? (
        <>
          <Choice primary icon={<IcoPeople />} label={busy ? busyLabel : 'Darle lugar'} hint={free ? 'Hay lugar libre' : 'No hay lugar libre todavía'} onClick={() => onSeat(person.id, 'give')} />
          <Choice danger label="Quitar de la lista" onClick={() => onSeat(person.id, 'release')} />
        </>
      ) : null}
      {state === 'overdue' ? (
        <>
          <p className="hint">Pasaron los {project.holdDays} días y no ha pagado.</p>
          <Choice primary label={busy ? busyLabel : `Dejar ${project.holdDays} días más`} onClick={() => onSeat(person.id, 'extend')} />
          <Choice danger label="Dar de baja" hint="Queda libre su lugar" onClick={() => setLeaving(true)} />
        </>
      ) : null}
      {state === 'held' || state === 'confirmed' ? (
        <Choice danger label="Dar de baja" hint="Queda libre su lugar" onClick={() => setLeaving(true)} />
      ) : null}
      {leaving ? (
        <div className="stack">
          <Alert>Se borran su foto, sus teléfonos y sus notas. Solo queda “{person.name.trim().split(' ')[0]} (baja)” con sus cobros. Si regresa, tiene que inscribirse de nuevo.</Alert>
          <Choice danger label={busy ? busyLabel : 'Sí, dar de baja'} onClick={() => onSeat(person.id, 'release')} />
          <Choice label="No, volver" onClick={() => setLeaving(false)} />
        </div>
      ) : null}
    </section>
  );
}

export function RegQr({ project, busy, onView, onToggleOpen, onRotateToken }: StageProps) {
  const [img, setImg] = useState('');
  const [failed, setFailed] = useState(false);
  const link = project ? signupLink(project.token) : '';
  useEffect(() => {
    if (!link) return;
    let alive = true;
    QRCode.toDataURL(link, { width: 640, margin: 2, errorCorrectionLevel: 'M' })
      .then((u) => { if (alive) { setImg(u); setFailed(false); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [link]);
  if (!placesOn(project)) {
    return (
      <section className="stack">
        <h1>Código para inscribir</h1>
        <p className="lead">Primero activa los lugares.</p>
        <Choice primary label="Activar lugares" onClick={() => onView({ id: 'places-settings' })} />
      </section>
    );
  }
  return (
    <section className="stack">
      <h1>Código para inscribir</h1>
      {failed ? <Alert>No se pudo hacer el código. Intenta de nuevo.</Alert> : img ? <img className="shot" alt="Código QR para inscribirse al taller" src={img} /> : null}
      <p className="lead">Quien lo escanee deja su nombre y su WhatsApp. Tú apruebas antes de cobrar.</p>
      <Status kind={project.open ? 'paid' : 'due'}>{project.open ? 'Inscripciones abiertas' : 'Inscripciones cerradas'}</Status>
      <Choice primary icon={<IcoPhone />} label={project.open ? 'Cerrar inscripciones' : 'Abrir inscripciones'} onClick={onToggleOpen} />
      <Choice icon={<IcoQr />} label={busy ? busyLabel : 'Hacer un código nuevo'} hint="El anterior deja de servir" onClick={onRotateToken} />
    </section>
  );
}

export function PlacesSettings({ project, accounts, busy, formError, onSaveProject }: StageProps) {
  const usable = accounts.filter((a) => ready(a));
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    onSaveProject({
      name: String(d.get('name') || '').trim(),
      capacity: Number(String(d.get('capacity') || '0').replace(/\D/g, '')),
      holdDays: Number(String(d.get('hold') || '5').replace(/\D/g, '')),
      monthlyAmount: parseAmount(String(d.get('fee') || '')),
      monthlyConcept: String(d.get('feeName') || '').trim(),
      accountId: String(d.get('account') || ''),
    });
  };
  return (
    <section className="stack">
      <h1>Lugares</h1>
      <form className="stack" onSubmit={submit}>
        {formError ? <Alert>{formError}</Alert> : null}
        <Field label="Nombre del taller"><input name="name" defaultValue={project?.name ?? ''} autoComplete="off" placeholder="Taller" /></Field>
        <Field label="¿Cuántos lugares hay?"><input name="capacity" required inputMode="numeric" defaultValue={project?.capacity ? String(project.capacity) : '12'} /></Field>
        <Field label="¿Cuántos días se aparta un lugar?"><input name="hold" required inputMode="numeric" defaultValue={String(project?.holdDays ?? 5)} /></Field>
        <Field label="¿Cuánto cuesta la mensualidad? (pesos)"><input name="fee" inputMode="decimal" defaultValue={project?.monthlyAmount ? String(project.monthlyAmount) : ''} placeholder="130" /></Field>
        <Field label="¿Cómo se llama el cobro?"><input name="feeName" defaultValue={project?.monthlyConcept ?? 'Mensualidad'} autoComplete="off" /></Field>
        <Field label="¿A qué cuenta llega?">
          <select name="account" defaultValue={project?.accountId ?? ''}>
            <option value="">Elige la cuenta</option>
            {usable.map((a) => <option key={a.id} value={a.id}>{a.alias}</option>)}
          </select>
        </Field>
        <p className="hint">Con esto, al aprobar a alguien le cobras con un solo botón.</p>
        <p className="hint">El apartado solo vence para quien se inscribió por el código, ya lo aprobaste y aún no paga.</p>
        <Choice primary type="submit" label={busy ? busyLabel : 'Guardar'} />
      </form>
    </section>
  );
}
