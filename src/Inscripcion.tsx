// Public signup page: opens from the QR, no account. It only REGISTERS the person; the collector approves later.
// Four steps, one action each: name, own WhatsApp, WhatsApp of whoever helps pay (1 to 3), review and confirm.
import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Choice, Field, IcoCheck, IcoClock, IcoPeople, IcoPhone, IcoAlert, Shell } from './ui';

type Info = { status: 'open' | 'closed' | 'limit' | 'error'; name?: string; full?: boolean };
type Done = 'registered' | 'waitlist' | 'already' | 'closed' | 'limit' | 'invalid' | 'error';

const digits = (s: string) => s.replace(/\D/g, '');
const fmtTel = (t: string) => (t.length === 10 ? `${t.slice(0, 2)} ${t.slice(2, 6)} ${t.slice(6)}` : t);

function Steps({ n }: { n: number }) {
  return (
    <div className="steps" role="group" aria-label={`Paso ${n} de 4`}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={i === n ? 'step now' : i < n ? 'step past' : 'step'} aria-current={i === n ? 'step' : undefined}>
          {i < n ? <IcoCheck /> : i}
        </span>
      ))}
      <span className="steps-text">Paso {n} de 4</span>
    </div>
  );
}

export default function Inscripcion({ token, registerUrl, initial }: {
  token: string;
  registerUrl: string;
  /** Only for the demo harness (screenshots): start on a given step with sample values. */
  initial?: { step: number; name?: string; tel?: string; helpers?: string[] };
}) {
  const [info, setInfo] = useState<Info | null>(null);
  const [step, setStep] = useState(initial?.step ?? 1);
  const [name, setName] = useState(initial?.name ?? '');
  const [tel, setTel] = useState(initial?.tel ?? '');
  const [helpers, setHelpers] = useState<string[]>(initial?.helpers ?? ['']);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);

  useEffect(() => {
    if (!registerUrl) { setInfo({ status: 'error' }); return; }
    fetch(`${registerUrl}?token=${encodeURIComponent(token)}`)
      .then((r) => r.json() as Promise<Info>)
      .then(setInfo)
      .catch(() => setInfo({ status: 'error' }));
  }, [token, registerUrl]);

  const cleanHelpers = [...new Set(helpers.map(digits).filter(Boolean))];

  function next(e?: FormEvent) {
    e?.preventDefault();
    setError('');
    if (step === 1) {
      if (name.trim().length < 2) { setError('Escribe tu nombre.'); return; }
    } else if (step === 2) {
      if (digits(tel).length !== 10) { setError('Tu WhatsApp debe tener 10 números.'); return; }
    } else if (step === 3) {
      if (!cleanHelpers.length) { setError('Escribe el WhatsApp de quien te ayuda a pagar.'); return; }
      if (cleanHelpers.some((h) => h.length !== 10)) { setError('Cada número debe tener 10 números.'); return; }
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
        body: JSON.stringify({ token, name: name.trim(), tel: digits(tel), helpers: cleanHelpers, consent: true }),
      });
      const j = (await r.json()) as { status?: Done };
      setDone(j.status ?? 'error');
    } catch {
      setDone('error');
    } finally {
      setBusy(false);
    }
  }

  const back = () => { setError(''); setStep((s) => Math.max(1, s - 1)); };
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
          <div className="result"><div className="seal bad"><IcoAlert /></div><h1>No se pudo</h1><p>Revisa tus datos e inténtalo de nuevo.</p></div>
          <Choice primary icon={<IcoClock />} label="Intentar de nuevo" onClick={() => { setStep(1); again(); }} />
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

        {step === 2 ? (
          <form className="stack" onSubmit={next}>
            <h1>Tu WhatsApp</h1>
            <Field label="10 números"><input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="numeric" autoComplete="tel" required /></Field>
            <Choice primary type="submit" icon={<IcoPhone />} label="Siguiente" />
          </form>
        ) : null}

        {step === 3 ? (
          <form className="stack" onSubmit={next}>
            <h1>¿Quién te ayuda a pagar?</h1>
            <p className="lead">Escribe su WhatsApp. Puedes poner hasta 3.</p>
            {helpers.map((h, i) => (
              <Field key={i} label={`WhatsApp ${i + 1}`}>
                <input value={h} onChange={(e) => setHelpers(helpers.map((x, j) => (j === i ? e.target.value : x)))} inputMode="numeric" autoComplete="off" required={i === 0} />
              </Field>
            ))}
            <Choice primary type="submit" icon={<IcoPhone />} label="Siguiente" />
            {helpers.length < 3 ? <Choice icon={<IcoPeople />} label="Agregar otro número" onClick={() => setHelpers([...helpers, ''])} /> : null}
          </form>
        ) : null}

        {step === 4 ? (
          <div className="stack">
            <h1>Revisa y confirma</h1>
            <div className="stat">
              <p><strong>Nombre:</strong> {name.trim()}</p>
              <p><strong>Tu WhatsApp:</strong> {fmtTel(digits(tel))}</p>
              <p><strong>Quien te ayuda:</strong> {cleanHelpers.map(fmtTel).join(', ')}</p>
            </div>
            <label className="check">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>Acepto que estos teléfonos se compartan con quien da el taller.</span>
            </label>
            <Choice primary icon={<IcoCheck />} label={busy ? 'Un momento…' : 'Enviar inscripción'} onClick={() => { void send(); }} />
          </div>
        ) : null}
      </section>
    </Shell>
  );
}
