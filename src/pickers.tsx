// Pieces shared by the public signup and the collector's "add person" flow, so both ask the same things in the same way:
// the step circles, the picture that identifies a person (a drawing from the bank or their photo with consent),
// and how they pay (alone, or with relatives who help; person 1 required, persons 2 and 3 optional).
import { useRef, useState, type ReactNode } from 'react';
import { pickEmblems, type Emblem } from './emblems';
import type { Helper } from './model';
import { MAX_HELPERS, chooseSendTo, cleanHelpers, emptyHelper, type PayMode, type Who } from './payers';
import { Choice, Field, IcoCheck, IcoClock, IcoPeople, IcoPhone } from './ui';

export function Steps({ n }: { n: number }) {
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

// ---------------------------------------------------------------- picture

type PicMode = 'menu' | 'pick' | 'photo';

/** State of the picture step. `taken` are the drawings other people already hold (never offered again). */
export function usePicture(taken: string[], setError: (message: string) => void, initial?: { emblem?: string; pic?: 'menu' | 'pick' }) {
  const [emblem, setEmblem] = useState(initial?.emblem ?? '');
  const [photo, setPhoto] = useState('');
  const [photoOk, setPhotoOk] = useState(false);
  const [pic, setPic] = useState<PicMode>(initial?.pic ?? 'menu');
  const [offered, setOffered] = useState<Emblem[]>([]);

  const offer = (list: string[] = taken) => setOffered(pickEmblems(list, 3));

  /** Shrinks the photo to a small JPEG so it is light to send and store. */
  async function take(file: File | undefined) {
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

  return { emblem, setEmblem, photo, setPhoto, photoOk, setPhotoOk, pic, setPic, offered, offer, take, taken };
}
export type Picture = ReturnType<typeof usePicture>;

const PIC = {
  self: {
    title: 'Tu imagen',
    lead: 'Con ella te reconoce quien da el taller.',
    pickTitle: 'Elige tu dibujo',
    useOwn: 'Usar mi foto',
    useOwnHint: 'Si tú quieres',
    photoTitle: 'Tu foto',
    shoot: 'Tomar mi foto',
    alt: 'Tu foto',
    consent: 'Autorizo que quien da el taller guarde mi foto para reconocerme.',
    needConsent: 'Marca la casilla para usar tu foto.',
    none: 'Ya no quedan dibujos libres. Usa tu foto.',
    capture: 'user',
  },
  other: {
    title: 'Su imagen',
    lead: 'Con ella reconoces a la persona en tu lista.',
    pickTitle: 'Elige su dibujo',
    useOwn: 'Usar su foto',
    useOwnHint: 'Solo con su permiso',
    photoTitle: 'Su foto',
    shoot: 'Tomar su foto',
    alt: 'Foto de la persona',
    consent: 'La persona me permitió guardar su foto para reconocerla.',
    needConsent: 'Marca la casilla: sin su permiso no se guarda la foto.',
    none: 'Ya no quedan dibujos libres. Usa su foto.',
    capture: 'environment',
  },
} as const;

/** The three screens of "picture": menu, pick a drawing, take a photo. `onChosen` fires when one is chosen. */
export function PictureStep({ p, who, setError, onChosen }: { p: Picture; who: Who; setError: (m: string) => void; onChosen: () => void }) {
  const t = PIC[who];
  const fileRef = useRef<HTMLInputElement>(null);

  if (p.pic === 'pick') {
    return (
      <div className="stack">
        <h1>{t.pickTitle}</h1>
        {p.offered.length ? (
          <div className="emblems">
            {p.offered.map((e) => (
              <button key={e.id} type="button" className="emblem-btn" onClick={() => { p.setEmblem(e.id); p.setPhoto(''); setError(''); onChosen(); }}>
                <span className="emblem-glyph" aria-hidden="true">{e.glyph}</span>
                <span>{e.name}</span>
              </button>
            ))}
          </div>
        ) : <p className="lead">{t.none}</p>}
        {p.offered.length ? <Choice icon={<IcoClock />} label="Ver otros" onClick={() => p.offer()} /> : null}
      </div>
    );
  }

  if (p.pic === 'photo') {
    return (
      <div className="stack">
        <h1>{t.photoTitle}</h1>
        <input ref={fileRef} type="file" accept="image/*" capture={t.capture} hidden onChange={(e) => { void p.take(e.target.files?.[0]); e.target.value = ''; }} />
        {p.photo ? (
          <>
            <img className="shot" alt={t.alt} src={p.photo} />
            <label className="check">
              <input type="checkbox" checked={p.photoOk} onChange={(e) => p.setPhotoOk(e.target.checked)} />
              <span>{t.consent}</span>
            </label>
            <Choice primary icon={<IcoCheck />} label="Usar esta foto" onClick={() => { if (!p.photoOk) { setError(t.needConsent); return; } setError(''); onChosen(); }} />
            <Choice icon={<IcoPhone />} label="Tomar otra" onClick={() => fileRef.current?.click()} />
          </>
        ) : (
          <Choice primary icon={<IcoPhone />} label={t.shoot} hint="Se abre la cámara" onClick={() => fileRef.current?.click()} />
        )}
      </div>
    );
  }

  return (
    <div className="stack">
      <h1>{t.title}</h1>
      <p className="lead">{t.lead}</p>
      <Choice primary icon={<IcoPeople />} label="Elegir un dibujo" hint="Uno que nadie más tenga" onClick={() => { p.offer(); p.setPic('pick'); }} />
      <Choice icon={<IcoPhone />} label={t.useOwn} hint={t.useOwnHint} onClick={() => p.setPic('photo')} />
      {who === 'other' ? (
        <Choice
          icon={<IcoClock />}
          label="Que lo elija la app"
          hint="Uno que nadie más tenga"
          onClick={() => {
            const one = pickEmblems(p.taken, 1)[0];
            if (!one) { setError('Ya no quedan dibujos libres. Usa su foto.'); return; }
            p.setEmblem(one.id);
            p.setPhoto('');
            setError('');
            onChosen();
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- how they pay

/** State of "how do they pay": alone or with relatives. Person 1 is required, persons 2 and 3 are optional. */
export function usePayers(initial?: { mode?: PayMode; helpers?: Helper[] }) {
  const [mode, setMode] = useState<PayMode>(initial?.mode ?? (initial?.helpers?.some((h) => h.tel) ? 'helper' : ''));
  const [helpers, setHelpers] = useState<Helper[]>(initial?.helpers ?? [emptyHelper()]);
  const [sendTo, setSendTo] = useState('');
  const clean = cleanHelpers(mode, helpers);
  /** The number that receives codes and receipts, given the person's own number. */
  const sendTel = (own: string) => chooseSendTo(clean, sendTo, own);
  return { mode, setMode, helpers, setHelpers, sendTo, setSendTo, clean, sendTel };
}
export type Payers = ReturnType<typeof usePayers>;

const PAY = {
  self: {
    ask: '¿Cómo vas a pagar?',
    alone: 'Yo, desde mi celular',
    help: 'Me ayuda un familiar',
    who: '¿Quién te ayuda a pagar?',
    rel: '¿Qué es tuyo? (mi hija, mi vecino…)',
  },
  other: {
    ask: '¿Cómo va a pagar?',
    alone: 'Desde su celular',
    help: 'Le ayuda un familiar',
    who: '¿Quién le ayuda a pagar?',
    rel: '¿Qué es de la persona? (su hija, su vecino…)',
  },
} as const;

/** "Alone or with help", and, when someone helps, the data of person 1 (required) and persons 2 and 3 (optional). */
export function PayersFields({ p, who, title, children }: { p: Payers; who: Who; /** The question is the page title (no other heading above it). */ title?: boolean; children?: ReactNode }) {
  const t = PAY[who];
  const set = (i: number, patch: Partial<Helper>) => p.setHelpers(p.helpers.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <>
      {children}
      {title ? <h1>{t.ask}</h1> : <h2 className="ask">{t.ask}</h2>}
      <p className="lead">Se paga con CoDi, desde la app de un banco.</p>
      <div className="emblems">
        <button type="button" className={p.mode === 'self' ? 'emblem-btn on' : 'emblem-btn'} aria-pressed={p.mode === 'self'} onClick={() => p.setMode('self')}>
          <span className="emblem-glyph" aria-hidden="true">📱</span>
          <span>{t.alone}{p.mode === 'self' ? ' ✔ Elegido' : ''}</span>
        </button>
        <button type="button" className={p.mode === 'helper' ? 'emblem-btn on' : 'emblem-btn'} aria-pressed={p.mode === 'helper'} onClick={() => p.setMode('helper')}>
          <span className="emblem-glyph" aria-hidden="true">👪</span>
          <span>{t.help}{p.mode === 'helper' ? ' ✔ Elegido' : ''}</span>
        </button>
      </div>

      {p.mode === 'helper' ? (
        <>
          <h2 className="ask">{t.who}</h2>
          <p className="lead">Escribe sus datos. Si no entiende de qué se trata, le explicaremos por WhatsApp.</p>
          {p.helpers.map((h, i) => (
            <div key={i} className="stack plan">
              <p className="who-line">{i === 0 ? 'Persona 1' : `Persona ${i + 1} (opcional)`}</p>
              <Field label="Su nombre"><input value={h.name} onChange={(e) => set(i, { name: e.target.value })} autoComplete="off" /></Field>
              <Field label={t.rel}><input value={h.rel} onChange={(e) => set(i, { rel: e.target.value })} autoComplete="off" /></Field>
              <Field label="Su WhatsApp (10 números)"><input value={h.tel} onChange={(e) => set(i, { tel: e.target.value })} inputMode="numeric" autoComplete="off" /></Field>
              {i > 0 ? <Choice icon={<IcoClock />} label="Quitar a esta persona" onClick={() => p.setHelpers(p.helpers.filter((_, j) => j !== i))} /> : null}
            </div>
          ))}
          {p.helpers.length < MAX_HELPERS ? (
            <Choice icon={<IcoPeople />} label="Agregar a otra persona" hint="Es opcional" onClick={() => p.setHelpers([...p.helpers, emptyHelper()])} />
          ) : null}
        </>
      ) : null}
    </>
  );
}

/** "Where do we send the payment code and the receipt?", among the helpers and the person's own number. */
export function SendToChoice({ p, own, who }: { p: Payers; own: string; who: Who }) {
  const chosen = p.sendTel(own);
  const options = [...p.clean.map((h) => ({ tel: h.tel, text: `${h.name} (${h.rel})` })), { tel: own, text: who === 'self' ? 'A mí, a mi WhatsApp' : 'A su WhatsApp' }];
  return (
    <fieldset className="stack choose">
      <legend className="ask">{who === 'self' ? '¿A quién le mandamos tu código de pago y tu comprobante?' : '¿A quién le mandamos su código de pago y su comprobante?'}</legend>
      {options.map((o) => (
        <label key={o.tel} className={chosen === o.tel ? 'opt on' : 'opt'}>
          <input type="radio" name="sendTo" checked={chosen === o.tel} onChange={() => p.setSendTo(o.tel)} />
          <span>{o.text}{chosen === o.tel ? ' ✔' : ''}</span>
        </label>
      ))}
    </fieldset>
  );
}
