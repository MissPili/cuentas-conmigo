// Public signup page: opens from the QR, no account. It only REGISTERS the person; the collector approves later.
// Four steps: name, picture that identifies them (own photo with consent, or one from a bank), WhatsApp numbers
// (their own, and whoever helps pay with name and relation: person 1 required, 2 and 3 optional), review,
// choose where codes go, and confirm. The picture and "how do you pay" pieces are shared with the collector's
// "add person" flow (see pickers.tsx), so both ask the same things in the same way.
import { useEffect, useState, type FormEvent } from 'react';
import { emblemOf } from './emblems';
import { money, monthName, shiftMonth, type Helper } from './model';
import { digits, fmtTel, payProblem, type PayMode } from './payers';
import { PayersFields, PictureStep, SendToChoice, Steps, usePayers, usePicture } from './pickers';
import { Alert, Choice, Field, IcoCheck, IcoClock, IcoPeople, IcoPhone, IcoAlert, Shell } from './ui';

/** What the project charges, as the signup page receives it. */
type PublicPlan = { concept: string; amount: number; kind: 'ONCE' | 'MONTHLY'; months: number | null; start: string | null };

type Info = { status: 'open' | 'closed' | 'limit' | 'error'; name?: string; full?: boolean; detail?: string; taken?: string[]; plans?: PublicPlan[] };
type Done = 'registered' | 'waitlist' | 'already' | 'closed' | 'limit' | 'invalid' | 'error';

/** The costs, in plain words, before asking how the person will pay. */
function Costs({ plans }: { plans: PublicPlan[] }) {
  const total = plans.reduce((n, p) => n + p.amount * (p.kind === 'MONTHLY' ? p.months ?? 1 : 1), 0);
  const label = (ym: string) => `${monthName(ym).toLowerCase()} ${ym.slice(0, 4)}`;
  return (
    <div className="costs" role="group" aria-label="Lo que se paga">
      <h2 className="ask">Lo que se paga</h2>
      {plans.map((p) => (
        <p key={p.concept} className="cost-row">
          <strong>{p.concept}: {money(p.amount)}</strong>
          <span>{p.kind === 'ONCE' ? 'Se paga una sola vez.' : 'Se paga cada mes.'}</span>
          {p.kind === 'MONTHLY' && p.start && p.months ? (
            <span className="cost-note">{p.months} meses, de {label(p.start)} a {label(shiftMonth(p.start, p.months - 1))}.</span>
          ) : null}
        </p>
      ))}
      {plans.length > 1 || plans[0]?.kind === 'MONTHLY' ? <p className="cost-total">Suma de todo el ciclo: {money(total)}</p> : null}
    </div>
  );
}

export default function Inscripcion({ token, registerUrl, initial }: {
  token: string;
  registerUrl: string;
  /** Only for the demo harness (screenshots): start on a given step with sample values. */
  initial?: { pay?: 'self' | 'helper'; step: number; name?: string; tel?: string; helpers?: Helper[]; emblem?: string; pic?: 'menu' | 'pick' };
}) {
  const [info, setInfo] = useState<Info | null>(null);
  const [step, setStep] = useState(initial?.step ?? 1);
  const [name, setName] = useState(initial?.name ?? '');
  const [tel, setTel] = useState(initial?.tel ?? '');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [detail, setDetail] = useState(''); // technical reason from the server, shown small so a failure can be diagnosed

  const picture = usePicture(info?.taken ?? [], setError, { emblem: initial?.emblem, pic: initial?.pic });
  const pay = usePayers({ mode: initial?.pay as PayMode | undefined, helpers: initial?.helpers });
  const sendTel = pay.sendTel(digits(tel));

  const loadInfo = () =>
    fetch(`${registerUrl}?token=${encodeURIComponent(token)}`)
      .then((r) => r.json() as Promise<Info>)
      .catch((): Info => ({ status: 'error' }));

  useEffect(() => {
    if (!registerUrl) { setInfo({ status: 'error' }); return; }
    void loadInfo().then((i) => {
      setInfo(i);
      if (initial?.pic === 'pick') picture.offer(i.taken ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, registerUrl]);

  function next(e?: FormEvent) {
    e?.preventDefault();
    setError('');
    if (step === 1) {
      if (name.trim().length < 2) { setError('Escribe tu nombre.'); return; }
    } else if (step === 3) {
      if (digits(tel).length !== 10) { setError('Tu WhatsApp debe tener 10 números.'); return; }
      const problem = payProblem(pay.mode, pay.helpers, 'self');
      if (problem) { setError(problem); return; }
    }
    setStep((s) => s + 1);
  }

  async function send() {
    if (!consent) { setError('Marca la casilla para poder enviar.'); return; }
    setBusy(true);
    setError('');
    try {
      const r = await fetch(registerUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token, name: name.trim(), tel: digits(tel), helpers: pay.clean, sendTo: sendTel, consent: true,
          ...(picture.photo ? { photo: picture.photo, photoConsent: true } : { emblem: picture.emblem }),
        }),
      });
      const j = (await r.json()) as { status?: Done | 'taken'; detail?: string };
      setDetail(j.detail ?? '');
      if (j.status === 'taken') {
        // Someone chose that picture a moment ago: refresh what is free and ask again.
        const fresh = await loadInfo();
        setInfo(fresh);
        picture.setEmblem('');
        picture.setPic('pick');
        picture.offer(fresh.taken ?? []);
        setStep(2);
        setError('Esa imagen ya la eligió otra persona. Elige otra.');
        return;
      }
      setDone((j.status as Done | undefined) ?? 'error');
    } catch (e) {
      setDetail(`sin respuesta (${(e as Error).message})`);
      setDone('error');
    } finally {
      setBusy(false);
    }
  }

  const back = () => {
    setError('');
    if (step === 2 && picture.pic !== 'menu') { picture.setPic('menu'); return; }
    setStep((s) => Math.max(1, s - 1));
  };
  const again = () => { setDone(null); setError(''); };

  if (!info) {
    return (
      <Shell canBack={false} onBack={() => {}}>
        <section className="stack"><h1>Un momento…</h1><p className="lead">Estamos abriendo la inscripción.</p></section>
      </Shell>
    );
  }

  if (info.status === 'closed' || done === 'closed') {
    return (
      <Shell canBack={false} onBack={() => {}}>
        <section className="stack">
          <div className="result"><div className="seal bad"><IcoAlert /></div><h1>Inscripciones cerradas</h1><p>Por ahora no se reciben inscripciones. Pregunta a quien da el taller.</p></div>
        </section>
      </Shell>
    );
  }

  if (info.status === 'limit' || done === 'limit') {
    return (
      <Shell canBack={false} onBack={() => {}}>
        <section className="stack">
          <div className="result"><div className="seal bad"><IcoClock /></div><h1>Intenta más tarde</h1><p>Hubo muchos intentos. Vuelve a probar en un rato.</p></div>
        </section>
      </Shell>
    );
  }

  if (done === 'registered' || done === 'waitlist' || done === 'already') {
    const title = done === 'already' ? 'Ya estás inscrito' : done === 'waitlist' ? 'Estás en la lista de espera' : 'Listo, te anotamos';
    const text =
      done === 'already' ? 'Ese WhatsApp ya está anotado.'
      : done === 'waitlist' ? 'El taller está lleno. Si se libera un lugar, te avisará quien da el taller.'
      : 'Quien da el taller revisará tu inscripción. Todavía no se te cobra nada.';
    return (
      <Shell canBack={false} onBack={() => {}}>
        <section className="stack">
          <div className="result"><div className="seal ok"><IcoCheck /></div><h1>{title}</h1><p>{text}</p></div>
        </section>
      </Shell>
    );
  }

  if (done === 'invalid' || done === 'error' || info.status === 'error') {
    return (
      <Shell canBack={false} onBack={() => {}}>
        <section className="stack">
          <div className="result"><div className="seal bad"><IcoAlert /></div><h1>No se pudo</h1><p>Revisa tus datos e inténtalo de nuevo.</p>{detail || info.detail ? <p className="hint">Detalle: {detail || info.detail}</p> : null}</div>
          <Choice primary mark="🔄" label="Intentar de nuevo" onClick={() => { setStep(1); again(); }} />
        </section>
      </Shell>
    );
  }

  return (
    <Shell canBack={step > 1} onBack={back}>
      <section className="stack">
        <Steps n={step} />
        {info.name ? <p className="who-line">{info.name}</p> : null}
        {info.full && step === 1 ? <p className="note" role="status"><IcoAlert /><span>El taller está lleno. Te anotamos en lista de espera.</span></p> : null}
        {error ? <Alert>{error}</Alert> : null}

        {step === 1 ? (
          <form className="stack" onSubmit={next}>
            <h1>¿Cómo te llamas?</h1>
            <Field label="Nombre completo"><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></Field>
            <Choice primary type="submit" icon={<IcoPeople />} label="Siguiente" />
          </form>
        ) : null}

        {step === 2 ? <PictureStep p={picture} who="self" setError={setError} onChosen={() => setStep(3)} /> : null}

        {step === 3 ? (
          <form className="stack" onSubmit={next}>
            <h1>Tu WhatsApp</h1>
            <p className="lead">Te escribiremos a este número para todo lo del taller: avisos, cobros y comprobantes.</p>
            <Field label="Tu WhatsApp (10 números)"><input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="numeric" autoComplete="tel" required /></Field>

            {info.plans?.length ? <Costs plans={info.plans} /> : null}

            <PayersFields p={pay} who="self" />
            <Choice primary type="submit" icon={<IcoPhone />} label="Siguiente" />
          </form>
        ) : null}

        {step === 4 ? (
          <div className="stack">
            <h1>Revisa y confirma</h1>
            <div className="stat">
              <p><strong>Nombre:</strong> {name.trim()}</p>
              <p><strong>Tu imagen:</strong> {picture.photo ? 'tu foto' : `${emblemOf(picture.emblem)?.glyph ?? ''} ${emblemOf(picture.emblem)?.name ?? ''}`}</p>
              <p><strong>Tu WhatsApp:</strong> {fmtTel(digits(tel))}</p>
              <p><strong>Cómo pagas:</strong> {pay.clean.length ? 'con ayuda' : 'tú, desde tu celular'}</p>
              {pay.clean.map((h) => (
                <p key={h.tel}><strong>{h.name} ({h.rel}):</strong> {fmtTel(h.tel)}</p>
              ))}
            </div>
            {pay.clean.length ? <SendToChoice p={pay} own={digits(tel)} who="self" /> : null}
            <div className="consent">
              <h2 className="ask">Antes de enviar</h2>
              <label className="check">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>Acepto que estos teléfonos se compartan con quien da el taller.</span>
              </label>
            </div>
            <Choice primary mark="📝" label={busy ? 'Un momento…' : 'Enviar inscripción'} onClick={() => { void send(); }} />
          </div>
        ) : null}
      </section>
    </Shell>
  );
}
