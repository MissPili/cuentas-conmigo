// "Add a person" by hand (People → Add, or Charge → Add): the same four steps the person would follow in the signup,
// typed by the collector: name and WhatsApp, picture (a drawing or a photo WITH permission), how they pay (alone or
// with relatives who help: person 1 required, 2 and 3 optional), and a review. Nothing is charged or sent from here.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { emblemOf } from './emblems';
import type { Helper } from './model';
import type { StageProps } from './screens';
import { digits, fmtTel, payProblem, type PayMode } from './payers';
import { PayersFields, PictureStep, SendToChoice, Steps, usePayers, usePicture } from './pickers';
import { Alert, Choice, Field, IcoCheck, IcoPeople, IcoPhone } from './ui';

/** Only for the demo harness (screenshots): start on a given step with sample values. */
export type AddPersonInitial = { step: number; name?: string; tel?: string; pic?: 'menu' | 'pick'; emblem?: string; mode?: PayMode; helpers?: Helper[] };

export function AddPerson({ people, busy, formError, onAddPerson, onInterceptBack, addPersonInitial: initial }: StageProps) {
  const [step, setStep] = useState(initial?.step ?? 1);
  const [name, setName] = useState(initial?.name ?? '');
  const [tel, setTel] = useState(initial?.tel ?? '');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');

  // Drawings held by the people already in this project are never offered again.
  const taken = people.filter((x) => x.status !== 'RELEASED' && x.emblem).map((x) => x.emblem as string);
  const picture = usePicture(taken, setError, { emblem: initial?.emblem, pic: initial?.pic });
  const pay = usePayers({ mode: initial?.mode, helpers: initial?.helpers });
  const own = digits(tel);
  useEffect(() => {
    if (initial?.pic === 'pick') picture.offer(); // demo harness only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The bar's "Atrás" goes back one step inside this flow (and one screen out of the picture menus) before leaving it.
  const goBack = () => {
    setError('');
    if (step === 2 && picture.pic !== 'menu') { picture.setPic('menu'); return true; }
    if (step > 1) { setStep(step - 1); return true; }
    return false;
  };
  const backRef = useRef(goBack);
  backRef.current = goBack;
  useEffect(() => {
    onInterceptBack(() => backRef.current());
    return () => onInterceptBack(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = (e?: FormEvent) => {
    e?.preventDefault();
    setError('');
    if (step === 1) {
      if (name.trim().length < 2) { setError('Escribe el nombre.'); return; }
      if (own.length !== 10) { setError('El WhatsApp debe tener 10 números.'); return; }
    } else if (step === 3) {
      const problem = payProblem(pay.mode, pay.helpers, 'other');
      if (problem) { setError(problem); return; }
    }
    setStep(step + 1);
  };

  const save = () => {
    if (pay.clean.length && !consent) { setError('Marca la casilla para poder guardar.'); return; }
    onAddPerson({
      name: name.trim().replace(/\s+/g, ' '),
      tel: own,
      emblem: picture.photo ? '' : picture.emblem,
      photo: picture.photo,
      helpers: pay.clean,
      sendTo: pay.sendTel(own),
      consentShared: pay.clean.length > 0 && consent,
    });
  };

  return (
    <section className="stack">
      <Steps n={step} />
      {error || formError ? <Alert>{error || formError}</Alert> : null}

      {step === 1 ? (
        <form className="stack" onSubmit={next}>
          <h1>Nueva persona</h1>
          <Field label="Nombre completo"><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" required /></Field>
          <Field label="WhatsApp, 10 números"><input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="numeric" autoComplete="off" required /></Field>
          <Choice primary type="submit" icon={<IcoPeople />} label="Siguiente" />
        </form>
      ) : null}

      {step === 2 ? <PictureStep p={picture} who="other" setError={setError} onChosen={() => setStep(3)} /> : null}

      {step === 3 ? (
        <form className="stack" onSubmit={next}>
          <PayersFields p={pay} who="other" title />
          <Choice primary type="submit" icon={<IcoPhone />} label="Siguiente" />
        </form>
      ) : null}

      {step === 4 ? (
        <div className="stack">
          <h1>Revisa y guarda</h1>
          <div className="stat">
            <p><strong>Nombre:</strong> {name.trim()}</p>
            <p><strong>Su imagen:</strong> {picture.photo ? 'su foto' : `${emblemOf(picture.emblem)?.glyph ?? ''} ${emblemOf(picture.emblem)?.name ?? ''}`}</p>
            <p><strong>Su WhatsApp:</strong> {fmtTel(own)}</p>
            <p><strong>Cómo paga:</strong> {pay.clean.length ? 'con ayuda' : 'desde su celular'}</p>
            {pay.clean.map((h) => (
              <p key={h.tel}><strong>{h.name} ({h.rel}):</strong> {fmtTel(h.tel)}</p>
            ))}
          </div>
          {pay.clean.length ? <SendToChoice p={pay} own={own} who="other" /> : null}
          {pay.clean.length ? (
            <div className="consent">
              <h2 className="ask">Antes de guardar</h2>
              <label className="check">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>La persona está de acuerdo en que guardemos los teléfonos de quien le ayuda.</span>
              </label>
            </div>
          ) : null}
          <Choice primary icon={<IcoCheck />} label={busy ? 'Un momento…' : 'Guardar persona'} onClick={save} />
        </div>
      ) : null}
    </section>
  );
}
