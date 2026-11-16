// Places (cupos) screens for the collector: hub, who has a place, one person, signup QR and settings.
import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import type { StageProps } from './screens';
import { money, monthName, pageOf, parseAmount, shiftMonth, thisMonth, ready, type Kind, type Per } from './model';
import { emblemOf } from './emblems';
import { MAX_PLANS, cycleEnd, cycleStart, duePlans, type Plan } from './plans';
import { Alert, Avatar, WhoLine, Choice, Field, IcoCash, IcoCheck, IcoPeople, IcoPhone, IcoQr, IcoClock, Status } from './ui';
import { signupMessage, whatsappShareUrl } from './links';
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
      <section className="stack" data-guion="lugares-off">
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
    <section className="stack" data-guion="lugares">
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
    <section className="stack" data-guion="lugares-lista">
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
      <section className="stack" data-guion="lugar-no">
        <h1>Ya no está</h1>
        <Choice primary label="Volver a lugares" onClick={() => onView({ id: 'places' })} />
      </section>
    );
  }
  const state = placeState(person, project, charges, new Date());
  const words = WORDS[state];
  const free = freeSpots(people, project, charges, new Date());
  const month = thisMonth();
  const due = (state === 'held' || state === 'confirmed' || state === 'overdue')
    ? duePlans(project.plans, person.id, charges, month).filter((d) => accounts.some((a) => a.id === d.plan.accountId)).slice(0, 2)
    : [];
  const feeCharge = charges.find((c) => c.personId === person.id && c.month === month);
  return (
    <section className="stack" data-guion="lugar">
      <WhoLine name={person.name} person={person} />
      {emblemOf(person.emblem) && !person.photo ? <p className="hint">Su imagen: {emblemOf(person.emblem)!.name}</p> : null}
      <Status kind={words.kind}>{words.text}</Status>
      <div className="stat">
        <p><strong>Su WhatsApp:</strong> {fmtTel(person.tel)}</p>
        {person.helperInfo?.length
          ? person.helperInfo.map((h) => (
            <p key={h.tel}><strong>{h.name ? `${h.name}${h.rel ? ` (${h.rel})` : ''}` : 'Quien le ayuda'}:</strong> {fmtTel(h.tel)}{person.sendTo === h.tel ? ' · le mandas sus códigos' : ''}</p>
          ))
          : null}
      </div>
      {due.map((d, i) => (
        <Choice
          key={d.plan.id}
          primary={i === 0}
          icon={<IcoPhone />}
          label={`Cobrarle ${money(d.plan.amount)}`}
          hint={d.plan.kind === 'ONCE' ? `${d.plan.concept} (una sola vez)` : `${d.plan.concept} de ${monthName(month).toLowerCase()}, mes ${d.nth} de ${d.total}`}
          onClick={() => onCreateCharge(person.id, d.plan.concept, d.plan.amount, d.plan.accountId, d.confirms)}
        />
      ))}
      {feeCharge && !due.length ? (
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
          <Choice primary={!due.length} label={busy ? busyLabel : `Dejar ${project.holdDays} días más`} onClick={() => onSeat(person.id, 'extend')} />
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
  const [shared, setShared] = useState<{ ok: boolean; text: string } | null>(null);
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
      <section className="stack" data-guion="lugares-off">
        <h1>Código para inscribir</h1>
        <p className="lead">Primero activa los lugares.</p>
        <Choice primary label="Activar lugares" onClick={() => onView({ id: 'places-settings' })} />
      </section>
    );
  }
  const message = signupMessage(project.name || '');

  // The same page the QR opens, to send by WhatsApp or any other way. Nothing leaves the phone by itself.
  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: project.name || 'Inscripción', text: message, url: link });
        setShared(null);
        return;
      }
      await navigator.clipboard.writeText(link);
      setShared({ ok: true, text: 'Enlace copiado. Pégalo donde quieras mandarlo.' });
    } catch (e) {
      // The person closing the share sheet is not an error.
      if ((e as Error).name === 'AbortError') return;
      setShared({ ok: false, text: 'No se pudo compartir. Mantén el dedo sobre el enlace para copiarlo.' });
    }
  };

  return (
    <section className="stack" data-guion="inscribir-codigo">
      <h1>Código para inscribir</h1>
      <p className="who-line">{project.name || 'Mi proyecto'}</p>
      {failed ? <Alert>No se pudo hacer el código. Intenta de nuevo.</Alert> : img ? <img className="shot" alt="Código QR para inscribirse al taller" src={img} /> : null}
      <p className="lead">Quien lo escanee se inscribe a este proyecto. Tú apruebas antes de cobrar.</p>
      <div className="linkbox">
        <p><strong>O manda este enlace:</strong></p>
        <p className="link-text">{link}</p>
      </div>
      {project.open ? null : <Alert>Las inscripciones están cerradas: quien abra el enlace verá que no hay lugar por ahora.</Alert>}
      {shared?.ok ? <p className="note" role="status"><IcoCheck /><span>{shared.text}</span></p> : null}
      {shared && !shared.ok ? <Alert>{shared.text}</Alert> : null}
      <Choice primary mark="💬" label="Mandar el enlace por WhatsApp" hint="Eliges a quién; tú tocas Enviar" onClick={() => window.open(whatsappShareUrl(`${message}

${link}`), '_blank', 'noopener')} />
      <Choice icon={<IcoQr />} label="Compartir o copiar el enlace" hint="Mensajes, correo u otra app" onClick={() => { void share(); }} />
      <Choice icon={<IcoPhone />} label={project.open ? 'Cerrar inscripciones' : 'Abrir inscripciones'} hint={project.open ? 'Ahora se puede inscribir cualquiera con el enlace' : 'Ahora nadie se puede inscribir'} onClick={onToggleOpen} />
      <Choice icon={<IcoQr />} label={busy ? busyLabel : 'Hacer un código nuevo'} hint="El código y el enlace anteriores dejan de servir" onClick={onRotateToken} />
    </section>
  );
}

type Slot = { kind: 'ONCE' | 'MONTHLY'; concept: string; amount: string; accountId: string; start: string; months: string };

const emptySlot = (accountId: string): Slot => ({ kind: 'ONCE', concept: '', amount: '', accountId, start: cycleStart(new Date()), months: '10' });

function toSlot(p: Plan): Slot {
  return { kind: p.kind, concept: p.concept, amount: String(p.amount), accountId: p.accountId, start: p.start ?? cycleStart(new Date()), months: String(p.months ?? 10) };
}

export function PlacesSettings({ project, accounts, busy, formError, onSaveProject }: StageProps) {
  const usable = accounts.filter((a) => ready(a));
  const firstAccount = usable[0]?.id ?? '';
  // Nothing saved yet: suggest the usual first charge (a one-time enrolment). A second one is added on request.
  const initial: Slot[] = project?.plans.length
    ? [...project.plans.map(toSlot), emptySlot(firstAccount)].slice(0, MAX_PLANS)
    : [
        { kind: 'ONCE', concept: 'Inscripción', amount: '40', accountId: firstAccount, start: cycleStart(new Date()), months: '10' },
        emptySlot(firstAccount),
      ];
  const [slots, setSlots] = useState<Slot[]>(initial);
  const [shown, setShown] = useState(project?.plans.length ? Math.max(1, project.plans.length) : 1);
  const [error, setError] = useState('');
  const set = (i: number, patch: Partial<Slot>) => setSlots(slots.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const base = cycleStart(new Date());
  const startOptions = Array.from({ length: 15 }, (_, k) => shiftMonth(base, k - 2));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    const plans: Plan[] = [];
    for (let i = 0; i < shown; i++) {
      const s = slots[i];
      const amount = parseAmount(s.amount);
      if (!(amount > 0)) continue; // an empty slot is simply not used
      if (!s.accountId) { setError(`Elige la cuenta del cobro ${i + 1}.`); return; }
      const months = Number(s.months.replace(/\D/g, ''));
      if (s.kind === 'MONTHLY' && !(months >= 1 && months <= 24)) { setError(`En el cobro ${i + 1}, los meses van de 1 a 24.`); return; }
      const concept = s.concept.trim() || (s.kind === 'ONCE' ? 'Inscripción' : 'Mensualidad');
      plans.push(s.kind === 'ONCE'
        ? { id: `p${i + 1}`, kind: 'ONCE', concept, amount, accountId: s.accountId }
        : { id: `p${i + 1}`, kind: 'MONTHLY', concept, amount, accountId: s.accountId, start: s.start, months });
    }
    if (new Set(plans.map((p) => p.concept.toLowerCase())).size < plans.length) { setError('Cada cobro necesita un nombre distinto.'); return; }
    setError('');
    onSaveProject({
      name: String(d.get('name') || '').trim(),
      capacity: Number(String(d.get('capacity') || '0').replace(/\D/g, '')),
      holdDays: Number(String(d.get('hold') || '5').replace(/\D/g, '')),
      plans,
    });
  };

  return (
    <section className="stack" data-guion="lugares-ajustes">
      <h1>Lugares y cobros</h1>
      <form className="stack" onSubmit={submit}>
        {formError || error ? <Alert>{error || formError}</Alert> : null}
        <Field label="Nombre del taller"><input name="name" defaultValue={project?.name ?? ''} autoComplete="off" placeholder="Taller" /></Field>
        <Field label="¿Cuántos lugares hay?"><input name="capacity" required inputMode="numeric" defaultValue={project?.capacity ? String(project.capacity) : '12'} /></Field>
        <Field label="¿Cuántos días se aparta un lugar?"><input name="hold" required inputMode="numeric" defaultValue={String(project?.holdDays ?? 5)} /></Field>
        <p className="hint">El apartado solo vence para quien se inscribió por el código, ya lo aprobaste y aún no paga.</p>

        {slots.slice(0, shown).map((s, i) => (
          <fieldset key={i} className="stack plan">
            <legend className="who-line">Cobro {i + 1}</legend>
            {i === 0 ? <p className="hint">Es el cobro inicial: cuando lo paguen, el lugar queda confirmado.</p> : null}
            <Field label="¿Cómo se llama?"><input value={s.concept} onChange={(e) => set(i, { concept: e.target.value })} autoComplete="off" placeholder={s.kind === 'ONCE' ? 'Inscripción' : 'Mensualidad'} /></Field>
            <Field label="¿Cuánto es? (pesos)"><input value={s.amount} onChange={(e) => set(i, { amount: e.target.value })} inputMode="decimal" placeholder="Déjalo vacío si no lo usas" /></Field>
            <p className="who-line">¿Cuándo se cobra?</p>
            <label className="check"><input type="radio" name={`kind${i}`} checked={s.kind === 'ONCE'} onChange={() => set(i, { kind: 'ONCE' })} /><span>Una sola vez</span></label>
            <label className="check"><input type="radio" name={`kind${i}`} checked={s.kind === 'MONTHLY'} onChange={() => set(i, { kind: 'MONTHLY' })} /><span>Cada mes</span></label>
            {s.kind === 'MONTHLY' ? (
              <div className="stack" data-guion="lugares-mes">
                <Field label="¿Cuántos meses?"><input value={s.months} onChange={(e) => set(i, { months: e.target.value })} inputMode="numeric" /></Field>
                <Field label="¿Desde qué mes?">
                  <select value={s.start} data-guion="lista-mes" onChange={(e) => set(i, { start: e.target.value })}>
                    {startOptions.map((m) => <option key={m} value={m}>{monthName(m)} {m.slice(0, 4)}</option>)}
                  </select>
                </Field>
                <p className="hint">Termina en {monthName(cycleEnd({ id: 'x', kind: 'MONTHLY', concept: '', amount: 1, accountId: '', start: s.start, months: Number(s.months.replace(/\D/g, '')) || 1 })).toLowerCase()} {cycleEnd({ id: 'x', kind: 'MONTHLY', concept: '', amount: 1, accountId: '', start: s.start, months: Number(s.months.replace(/\D/g, '')) || 1 }).slice(0, 4)}.</p>
              </div>
            ) : null}
            <Field label="¿A qué cuenta llega?">
              <select value={s.accountId} data-guion="lista-cuenta" onChange={(e) => set(i, { accountId: e.target.value })}>
                <option value="">Elige la cuenta</option>
                {usable.map((a) => <option key={a.id} value={a.id}>{a.alias}</option>)}
              </select>
            </Field>
            {i > 0 ? <Choice label="Quitar este cobro" onClick={() => { set(i, { amount: '' }); setShown(i); }} /> : null}
          </fieldset>
        ))}
        {shown < MAX_PLANS ? (
          <Choice
            icon={<IcoCash />}
            label="Añadir otro cobro"
            hint="Por ejemplo, la mensualidad"
            onClick={() => {
              // Suggest the usual second charge: monthly for the school cycle.
              if (!slots[shown].amount) set(shown, { kind: 'MONTHLY', concept: 'Mensualidad', amount: '130', months: '10', accountId: slots[shown].accountId || firstAccount });
              setShown(shown + 1);
            }}
          />
        ) : null}
        <p className="hint">Al aprobar a alguien, su ficha te ofrece cobrarle lo que le toque con un solo botón. Los pagos extraordinarios se cobran desde Cobrar.</p>
        <Choice primary type="submit" label={busy ? busyLabel : 'Guardar'} />
      </form>
    </section>
  );
}
