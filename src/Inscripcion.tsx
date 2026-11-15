// Public signup page: opens from the QR, no account. It only REGISTERS the person; the collector approves later.
// Four steps: name, picture that identifies them (own photo with consent, or one from a bank), WhatsApp numbers
// (their own, and whoever helps pay with name and relation, 1 to 3), review, choose where codes go, and confirm.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { emblemOf, pickEmblems, type Emblem } from './emblems';
import type { Helper } from './model';
import { Alert, Choice, Field, IcoCheck, IcoClock, IcoPeople, IcoPhone, IcoAlert, Shell } from './ui';

type Info = { status: 'open' | 'closed' | 'limit' | 'error'; name?: string; full?: boolean; detail?: string; taken?: string[] };
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
  initial?: { pay?: 'self' | 'helper'; step: number; name?: string; tel?: string; helpers?: Helper[]; emblem?: string; pic?: 'menu' | 'pick' };
}) {
  const [info, setInfo] = useState<Info | null>(null);
  const [step, setStep] = useState(initial?.step ?? 1);
  const [name, setName] = useState(initial?.name ?? '');
  const [tel, setTel] = useState(initial?.tel ?? '');
  const [helpers, setHelpers] = useState<Helper[]>(initial?.helpers ?? [{ name: '', rel: '', tel: '' }]);
  const [sendTo, setSendTo] = useState('');
  // How the person pays: from their own phone with CoDi, or with a relative who helps. Help is optional.
  const [payMode, setPayMode] = useState<'' | 'self' | 'helper'>(initial?.pay ?? (initial?.helpers?.some((h) => h.tel) ? 'helper' : ''));
  const [consent, setConsent] = useState(false);
  const [emblem, setEmblem] = useState(initial?.emblem ?? '');
  const [photo, setPhoto] = useState('');
  const [photoOk, setPhotoOk] = useState(false);
  const [pic, setPic] = useState<'menu' | 'pick' | 'photo'>(initial?.pic ?? 'menu');
  const [offered, setOffered] = useState<Emblem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [detail, setDetail] = useState(''); // technical reason from the server, shown small so a failure can be diagnosed

  const loadInfo = () =>
    fetch(`${registerUrl}?token=${encodeURIComponent(token)}`)
      .then((r) => r.json() as Promise<Info>)
      .catch((): Info => ({ status: 'error' }));

  useEffect(() => {
    if (!registerUrl) { setInfo({ status: 'error' }); return; }
    void loadInfo().then((i) => {
      setInfo(i);
      if (initial?.pic === 'pick') setOffered(pickEmblems(i.taken ?? [], 3));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, registerUrl]);

  const offer = (i: Info | null = info) => setOffered(pickEmblems(i?.taken ?? [], 3));

  /** Shrinks the photo to a small JPEG so it is light to send and store. */
  async function takePhoto(file: File | undefined) {
    if (!file) return;
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k);
      c.height = Math.round(bmp.height * k);
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
      setPhoto(c.toDataURL('image/jpeg', 0.75));
      setEmblem('');
      setPhotoOk(false);
      setError('');
    } catch {
      setError('No se pudo usar esa foto. Prueba con otra.');
    }
  }

  const cleanHelpers: Helper[] = payMode !== 'helper' ? [] : helpers
    .map((h) => ({ name: h.name.trim().replace(/\s+/g, ' '), rel: h.rel.trim().replace(/\s+/g, ' '), tel: digits(h.tel) }))
    .filter((h) => h.name || h.rel || h.tel)
    .filter((h, i, all) => all.findIndex((x) => x.tel === h.tel) === i || !h.tel);
  const sendTel = cleanHelpers.some((h) => h.tel === sendTo) || sendTo === digits(tel) ? sendTo : (cleanHelpers[0]?.tel ?? digits(tel));

  function next(e?: FormEvent) {
    e?.preventDefault();
    setError('');
    if (step === 1) {
      if (name.trim().length < 2) { setError('Escribe tu nombre.'); return; }
    } else if (step === 3) {
      if (digits(tel).length !== 10) { setError('Tu WhatsApp debe tener 10 números.'); return; }
      if (!payMode) { setError('Elige cómo vas a pagar.'); return; }
      if (payMode === 'helper' && !cleanHelpers.length) { setError('Escribe quién te ayuda a pagar.'); return; }
      if (cleanHelpers.some((h) => h.name.length < 2)) { setError('Escribe el nombre de quien te ayuda.'); return; }
      if (cleanHelpers.some((h) => h.rel.length < 2)) { setError('Escribe qué es tuyo, por ejemplo: mi hija.'); return; }
      if (cleanHelpers.some((h) => h.tel.length !== 10)) { setError('Cada WhatsApp debe tener 10 números.'); return; }
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
        body: JSON.stringify({ token, name: name.trim(), tel: digits(tel), helpers: cleanHelpers, sendTo: sendTel, consent: true, ...(photo ? { photo, photoConsent: true } : { emblem }) }),
      });
      const j = (await r.json()) as { status?: Done | 'taken'; detail?: string };
      setDetail(j.detail ?? '');
      if (j.status === 'taken') {
        // Someone chose that picture a moment ago: refresh what is free and ask again.
        const fresh = await loadInfo();
        setInfo(fresh);
        setEmblem('');
        setPic('pick');
        offer(fresh);
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
    if (step === 2 && pic !== 'menu') { setPic('menu'); return; }
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

        {step === 2 && pic === 'menu' ? (
          <div className="stack">
            <h1>Tu imagen</h1>
            <p className="lead">Con ella te reconoce quien da el taller.</p>
            <Choice primary icon={<IcoPeople />} label="Elegir un dibujo" hint="Uno que nadie más tenga" onClick={() => { offer(); setPic('pick'); }} />
            <Choice icon={<IcoPhone />} label="Usar mi foto" hint="Si tú quieres" onClick={() => setPic('photo')} />
          </div>
        ) : null}

        {step === 2 && pic === 'pick' ? (
          <div className="stack">
            <h1>Elige tu dibujo</h1>
            {offered.length ? (
              <div className="emblems">
                {offered.map((e) => (
                  <button key={e.id} type="button" className="emblem-btn" onClick={() => { setEmblem(e.id); setPhoto(''); setError(''); setStep(3); }}>
                    <span className="emblem-glyph" aria-hidden="true">{e.glyph}</span>
                    <span>{e.name}</span>
                  </button>
                ))}
              </div>
            ) : <p className="lead">Ya no quedan dibujos libres. Usa tu foto.</p>}
            {offered.length ? <Choice icon={<IcoClock />} label="Ver otros" onClick={() => offer()} /> : null}
          </div>
        ) : null}

        {step === 2 && pic === 'photo' ? (
          <div className="stack">
            <h1>Tu foto</h1>
            <input ref={fileRef} type="file" accept="image/*" capture="user" hidden onChange={(e) => { void takePhoto(e.target.files?.[0]); e.target.value = ''; }} />
            {photo ? (
              <>
                <img className="shot" alt="Tu foto" src={photo} />
                <label className="check">
                  <input type="checkbox" checked={photoOk} onChange={(e) => setPhotoOk(e.target.checked)} />
                  <span>Autorizo que quien da el taller guarde mi foto para reconocerme.</span>
                </label>
                <Choice primary icon={<IcoCheck />} label="Usar esta foto" onClick={() => { if (!photoOk) { setError('Marca la casilla para usar tu foto.'); return; } setError(''); setStep(3); }} />
                <Choice icon={<IcoPhone />} label="Tomar otra" onClick={() => fileRef.current?.click()} />
              </>
            ) : (
              <Choice primary icon={<IcoPhone />} label="Tomar mi foto" hint="Se abre la cámara" onClick={() => fileRef.current?.click()} />
            )}
          </div>
        ) : null}

        {step === 3 ? (
          <form className="stack" onSubmit={next}>
            <h1>Tu WhatsApp</h1>
            <Field label="Tu WhatsApp (10 números)"><input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="numeric" autoComplete="tel" required /></Field>

            <h2 className="ask">¿Cómo vas a pagar?</h2>
            <p className="lead">Se paga con CoDi, desde la app de un banco.</p>
            <div className="emblems">
              <button type="button" className={payMode === 'self' ? 'emblem-btn on' : 'emblem-btn'} aria-pressed={payMode === 'self'} onClick={() => setPayMode('self')}>
                <span className="emblem-glyph" aria-hidden="true">📱</span>
                <span>Yo, desde mi celular{payMode === 'self' ? ' ✔ Elegido' : ''}</span>
              </button>
              <button type="button" className={payMode === 'helper' ? 'emblem-btn on' : 'emblem-btn'} aria-pressed={payMode === 'helper'} onClick={() => setPayMode('helper')}>
                <span className="emblem-glyph" aria-hidden="true">👪</span>
                <span>Me ayuda un familiar{payMode === 'helper' ? ' ✔ Elegido' : ''}</span>
              </button>
            </div>

            {payMode === 'helper' ? (
              <>
                <h2 className="ask">¿Quién te ayuda a pagar?</h2>
                <p className="lead">Escribe sus datos. Si no entiende de qué se trata, le explicaremos por WhatsApp.</p>
                {helpers.map((h, i) => (
                  <div key={i} className="stack plan">
                    {helpers.length > 1 ? <p className="who-line">Persona {i + 1}</p> : null}
                    <Field label="Su nombre"><input value={h.name} onChange={(e) => setHelpers(helpers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} autoComplete="off" /></Field>
                    <Field label="¿Qué es tuyo? (mi hija, mi vecino…)"><input value={h.rel} onChange={(e) => setHelpers(helpers.map((x, j) => (j === i ? { ...x, rel: e.target.value } : x)))} autoComplete="off" /></Field>
                    <Field label="Su WhatsApp (10 números)"><input value={h.tel} onChange={(e) => setHelpers(helpers.map((x, j) => (j === i ? { ...x, tel: e.target.value } : x)))} inputMode="numeric" autoComplete="off" /></Field>
                  </div>
                ))}
                {helpers.length < 3 ? <Choice icon={<IcoPeople />} label="Agregar a otra persona" onClick={() => setHelpers([...helpers, { name: '', rel: '', tel: '' }])} /> : null}
              </>
            ) : null}
            <Choice primary type="submit" icon={<IcoPhone />} label="Siguiente" />
          </form>
        ) : null}

        {step === 4 ? (
          <div className="stack">
            <h1>Revisa y confirma</h1>
            <div className="stat">
              <p><strong>Nombre:</strong> {name.trim()}</p>
              <p><strong>Tu imagen:</strong> {photo ? 'tu foto' : `${emblemOf(emblem)?.glyph ?? ''} ${emblemOf(emblem)?.name ?? ''}`}</p>
              <p><strong>Tu WhatsApp:</strong> {fmtTel(digits(tel))}</p>
              <p><strong>Cómo pagas:</strong> {cleanHelpers.length ? 'con ayuda' : 'tú, desde tu celular'}</p>
              {cleanHelpers.map((h) => (
                <p key={h.tel}><strong>{h.name} ({h.rel}):</strong> {fmtTel(h.tel)}</p>
              ))}
            </div>
            {cleanHelpers.length ? (
            <fieldset className="stack choose">
              <legend className="who-line">¿A quién le mandamos tu código de pago y tu comprobante?</legend>
              {[...cleanHelpers.map((h) => ({ tel: h.tel, text: `${h.name} (${h.rel})` })), { tel: digits(tel), text: 'A mí, a mi WhatsApp' }].map((o) => (
                <label key={o.tel} className="check">
                  <input type="radio" name="sendTo" checked={sendTel === o.tel} onChange={() => setSendTo(o.tel)} />
                  <span>{o.text}</span>
                </label>
              ))}
            </fieldset>
            ) : null}
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
