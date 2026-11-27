// NFC keychain screens: the images of the active people (to download and print), and each person's keychain
// (activate, switch off when lost, a new code for a replacement, the address that is written in the chip).
import { useEffect, useRef, useState } from 'react';
import type { StageProps } from './screens';
import { pageOf, type Per } from './model';
import { emblemOf } from './emblems';
import { activeForKeyring, dedupeNames, keyState, keyringFileName, keyringUrl, type KeyState } from './keyring';
import { keychainPng, saveBlob } from './keychain';
import { PROBLEM_TEXT, classifyTag, eraseTag, fitsSmallChip, nfcProblem, nfcSupported, readTag, writeTag, type NfcProblem, type TagContent } from './nfc';
import { Alert, Avatar, Choice, IcoAlert, IcoCash, IcoClock, IcoKey, IcoPeople, Result, Status, WhoLine } from './ui';

export type KeyAction = 'activate' | 'on' | 'off' | 'new' | 'emblem';

const hasImage = (p: Per) => !!(p.photo || emblemOf(p.emblem));
const fileFor = (p: Per) => keyringFileName({ name: p.name, emblemName: emblemOf(p.emblem)?.name, hasPhoto: !!p.photo });
const makeImage = (p: Per) => keychainPng({ glyph: emblemOf(p.emblem)?.glyph, photo: p.photo });
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

const STATE_WORDS: Record<KeyState, { kind: 'paid' | 'due' | 'bad'; text: string }> = {
  none: { kind: 'due', text: 'Sin llavero' },
  on: { kind: 'paid', text: 'Llavero activo' },
  off: { kind: 'bad', text: 'Llavero desactivado' },
};

function NotFound({ onView }: Pick<StageProps, 'onView'>) {
  return (
    <section className="stack" data-guion="ya-no-esta">
      <h1>No encontramos a esa persona</h1>
      <Choice primary label="Ir al inicio" onClick={() => onView({ id: 'home' })} />
    </section>
  );
}

/** "Más opciones" → images of the active people, and how to make the keychains work. */
export function KeyringHub({ people, onView }: StageProps) {
  const active = activeForKeyring(people);
  const withImage = active.filter(hasImage);
  const withKey = active.filter((p) => keyState(p) === 'on');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');
  // Files already made, waiting for the second tap (phones: the share sheet must open straight from a tap).
  const [ready, setReady] = useState<File[] | null>(null);

  // Forget the prepared files when somebody's picture changes.
  const sameImages = withImage.map((p) => `${p.id}:${p.emblem ?? ''}:${p.photo?.length ?? 0}`).join('|');
  useEffect(() => setReady(null), [sameImages]);

  // A phone or tablet with a share sheet that takes files (iPhone: "Guardar imágenes", AirDrop, WhatsApp...).
  const canShareFiles = (files: File[]) => navigator.maxTouchPoints > 0 && !!navigator.canShare && navigator.canShare({ files });

  async function sendReady(files: File[]) {
    try {
      await navigator.share({ files });
    } catch (e) {
      // Closing the menu is not an error.
      if (!(e instanceof DOMException && e.name === 'AbortError')) setError('No se pudo abrir el menú. Descarga las imágenes una por una.');
    }
  }

  // One image file per person. On a phone: make them all, then a second tap opens the share sheet. On a computer:
  // downloads one after another (the browser may ask permission to download several files).
  async function downloadAll() {
    setError('');
    if (ready) { void sendReady(ready); return; } // straight from the tap, as the phone requires
    const names = dedupeNames(withImage.map(fileFor));
    try {
      const files: File[] = [];
      for (const [i, p] of withImage.entries()) {
        setProgress({ done: i, total: withImage.length });
        files.push(new File([await makeImage(p)], names[i], { type: 'image/png' }));
      }
      if (canShareFiles(files)) { setReady(files); return; }
      for (const f of files) {
        saveBlob(f, f.name);
        await pause(500);
      }
    } catch {
      setError('No se pudieron guardar todas. Descarga las imágenes una por una.');
    } finally {
      setProgress(null);
    }
  }

  return (
    <section className="stack" data-guion="llaveros">
      <h1>Imágenes y llaveros</h1>
      <p className="lead">La imagen de cada persona activa, para mandar a imprimir en su llavero.</p>
      <div className="stat">
        <p><strong>Personas activas:</strong> {active.length}</p>
        <p><strong>Con llavero activo:</strong> {withKey.length}</p>
        {active.length > withImage.length ? <p><strong>Sin imagen:</strong> {active.length - withImage.length}</p> : null}
      </div>
      {error ? <Alert>{error}</Alert> : null}
      <Choice primary icon={<IcoPeople />} label="Ver las imágenes" hint="Una por persona, para descargar" onClick={() => onView({ id: 'keyrings', page: 0 })} />
      <Choice
        icon={<IcoCash />}
        label={progress ? `Preparando ${progress.done + 1} de ${progress.total}…` : ready ? 'Guardar o mandar las imágenes' : 'Descargar todas las imágenes'}
        hint={ready ? 'Toca otra vez: se abre el menú del celular' : withImage.length ? `${withImage.length} archivos de imagen` : 'Aún no hay imágenes'}
        onClick={() => { if (!progress && withImage.length) void downloadAll(); }}
      />
      <Choice icon={<IcoKey />} label="Cómo programar los llaveros" hint="Escribir el chip, probarlo y bloquearlo" onClick={() => onView({ id: 'keyring-help' })} />
    </section>
  );
}

/** The active people, three at a time, each with the state of their keychain. */
export function Keyrings({ people, page, onView }: StageProps & { page: number }) {
  const active = activeForKeyring(people);
  const slice = pageOf(active, page);
  return (
    <section className="stack" data-guion="llaveros-lista">
      <h1>Personas activas</h1>
      <p className="lead">{active.length ? 'Elige a una persona para ver su imagen.' : 'Todavía no hay personas activas.'}</p>
      {slice.rows.map((p) => {
        const w = STATE_WORDS[keyState(p)];
        return (
          <button key={p.id} type="button" className="person" onClick={() => onView({ id: 'keyring', personId: p.id })}>
            <Avatar person={p} />
            <span className="person-name">{p.name}</span>
            {hasImage(p) ? <Status kind={w.kind}>{w.text}</Status> : <Status kind="wait">Sin imagen</Status>}
          </button>
        );
      })}
      {slice.more ? <Choice label={slice.more.label} hint={slice.more.hint} onClick={() => onView({ id: 'keyrings', page: slice.more!.page })} /> : null}
    </section>
  );
}

/** One person: the image to print, and their keychain. */
export function KeyringDetail({ people, personId, busy, onKey, onView }: StageProps & { personId: string }) {
  const person = people.find((x) => x.id === personId);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState('');
  const [failed, setFailed] = useState(false);
  const [asking, setAsking] = useState(false);
  const [copied, setCopied] = useState<'' | 'ok' | 'fail'>('');

  const glyph = emblemOf(person?.emblem)?.glyph;
  const photo = person?.photo;
  useEffect(() => {
    if (!person || !(glyph || photo)) { setBlob(null); setPreview(''); return; }
    let alive = true;
    let made = '';
    setFailed(false);
    keychainPng({ glyph, photo })
      .then((b) => { if (!alive) return; made = URL.createObjectURL(b); setBlob(b); setPreview(made); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; if (made) URL.revokeObjectURL(made); };
  }, [person?.id, glyph, photo]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!person) return <NotFound onView={onView} />;
  const state = keyState(person);
  const words = STATE_WORDS[state];
  const address = person.keyCode ? keyringUrl(location.origin, person.keyCode) : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied('ok');
    } catch {
      setCopied('fail');
    }
  };

  if (asking) {
    return (
      <section className="stack" data-guion="llavero-nuevo">
        <WhoLine name={person.name} person={person} />
        <h1>¿Hacer un código nuevo?</h1>
        <Alert>El llavero que tiene ahora dejará de funcionar para siempre. Hazlo solo si se perdió o vas a cambiarlo.</Alert>
        <Choice danger icon={<IcoAlert />} label={busy ? 'Un momento…' : 'Sí, hacer un código nuevo'} onClick={() => { setAsking(false); onKey(person.id, 'new'); }} />
        <Choice label="No, dejarlo como está" onClick={() => setAsking(false)} />
      </section>
    );
  }

  return (
    <section className="stack" data-guion="llavero">
      <WhoLine name={person.name} person={person} />
      <h1>Imagen del llavero</h1>
      {preview ? <img className="shot" alt={`Imagen del llavero de ${person.name}`} src={preview} /> : null}
      {!hasImage(person) ? <p className="lead">Aún no tiene dibujo ni foto.</p> : null}
      {failed ? <Alert>No se pudo hacer la imagen. Intenta de nuevo.</Alert> : null}
      {preview ? <p className="hint">También puedes mantener el dedo sobre la imagen para guardarla.</p> : null}
      <Status kind={words.kind}>{words.text}</Status>
      {copied === 'ok' ? <p className="note" role="status"><IcoClock /><span>Dirección copiada. Pégala al escribir el chip.</span></p> : null}
      {copied === 'fail' ? <Alert>No se pudo copiar. Mantén el dedo sobre la dirección para copiarla.</Alert> : null}
      {address && state === 'on' ? (
        <div className="linkbox">
          <p><strong>Dirección que se escribe en el chip:</strong></p>
          <p className="link-text">{address}</p>
        </div>
      ) : null}

      {!hasImage(person) ? (
        <Choice primary icon={<IcoPeople />} label={busy ? 'Un momento…' : 'Elegir un dibujo'} hint="La app elige uno que nadie más tenga" onClick={() => onKey(person.id, 'emblem')} />
      ) : (
        <Choice primary icon={<IcoCash />} label="Descargar imagen" hint={fileFor(person)} onClick={() => { if (blob) saveBlob(blob, fileFor(person)); }} />
      )}
      {state === 'none' ? <Choice icon={<IcoKey />} label={busy ? 'Un momento…' : 'Activar llavero'} hint="Crea su código y su dirección" onClick={() => onKey(person.id, 'activate')} /> : null}
      {state === 'on' ? (
        <>
          {nfcSupported() ? <Choice primary icon={<IcoKey />} label="Escribir en el chip" hint="Acerca el llavero al celular" onClick={() => onView({ id: 'keyring-write', personId: person.id, mode: 'write' })} /> : null}
          <Choice icon={<IcoKey />} label="Copiar la dirección" hint="Para escribirla con otra aplicación" onClick={() => { void copy(); }} />
          <Choice icon={<IcoAlert />} label={busy ? 'Un momento…' : 'Desactivar: se perdió'} hint="Deja de funcionar al momento" onClick={() => onKey(person.id, 'off')} />
          <Choice label="Hacer un código nuevo" hint="Para un llavero de reemplazo" onClick={() => setAsking(true)} />
        </>
      ) : null}
      {state === 'off' ? (
        <>
          <Choice icon={<IcoKey />} label={busy ? 'Un momento…' : 'Activar de nuevo'} hint="Si ya lo encontraste" onClick={() => onKey(person.id, 'on')} />
          <Choice label="Hacer un código nuevo" hint="Para un llavero de reemplazo" onClick={() => setAsking(true)} />
        </>
      ) : null}
      {nfcSupported() ? <Choice icon={<IcoAlert />} label="Borrar un chip" hint="Lo deja vacío para usarlo de nuevo" onClick={() => onView({ id: 'keyring-write', personId: person.id, mode: 'erase' })} /> : <p className="hint">Para escribir o borrar chips desde la app hace falta Chrome en un Android. En iPhone, usa la guía con otra aplicación.</p>}
    </section>
  );
}

/** Write, erase or check a chip with the phone's own NFC (Chrome on Android). Reads the chip first so it never covers
 *  another person's keychain without asking, and never claims success before the browser says the write finished. */
type WriteStep =
  | { k: 'ready' }
  | { k: 'reading' }
  | { k: 'confirm'; found: TagContent<Per> }
  | { k: 'working' }
  | { k: 'done' }
  | { k: 'checking' }
  | { k: 'checked'; ok: boolean; found: TagContent<Per> }
  | { k: 'error'; problem: NfcProblem };

export function KeyringWrite({ people, personId, mode, onView }: StageProps & { personId: string; mode: 'write' | 'erase' }) {
  const person = people.find((x) => x.id === personId);
  const [step, setStep] = useState<WriteStep>({ k: 'ready' });
  const run = useRef<AbortController | null>(null);
  useEffect(() => () => run.current?.abort(), []);
  if (!person) return <NotFound onView={onView} />;
  const first = person.name.split(' ')[0] ?? person.name;
  const address = person.keyCode ? keyringUrl(location.origin, person.keyCode) : '';
  const back = () => { run.current?.abort(); onView({ id: 'keyring', personId: person.id }); };
  const fresh = () => { run.current?.abort(); const c = new AbortController(); run.current = c; return c.signal; };
  const fail = (e: unknown) => { const problem = nfcProblem(e); if (problem === 'cancelled') setStep({ k: 'ready' }); else setStep({ k: 'error', problem }); };
  const nameOf = (c: TagContent<Per>) => (c.kind === 'other' || c.kind === 'same' ? c.person.name.split(' ')[0] : '');

  if (!nfcSupported()) {
    return (
      <section className="stack" data-guion="llavero-escribir">
        <WhoLine name={person.name} person={person} />
        <h1>{mode === 'write' ? 'Escribir en el chip' : 'Borrar un chip'}</h1>
        <Alert>{PROBLEM_TEXT.unsupported}</Alert>
        <Choice primary icon={<IcoKey />} label="Ver la guía" onClick={() => onView({ id: 'keyring-help' })} />
        <Choice label="Volver" onClick={back} />
      </section>
    );
  }
  if (mode === 'write' && (!address || keyState(person) !== 'on')) {
    return (
      <section className="stack" data-guion="llavero-escribir">
        <WhoLine name={person.name} person={person} />
        <h1>Escribir en el chip</h1>
        <Alert>Primero activa el llavero de {first}. Un llavero desactivado no se escribe.</Alert>
        <Choice primary label="Volver" onClick={back} />
      </section>
    );
  }
  if (mode === 'write' && !fitsSmallChip(address)) {
    return (
      <section className="stack" data-guion="llavero-escribir">
        <WhoLine name={person.name} person={person} />
        <h1>Escribir en el chip</h1>
        <Alert>La dirección es demasiado larga para los chips pequeños (NTAG213). Usa un chip más grande, como el NTAG215.</Alert>
        <Choice primary label="Volver" onClick={back} />
      </section>
    );
  }

  const doWork = async () => {
    setStep({ k: 'working' });
    try {
      const signal = fresh();
      if (mode === 'write') await writeTag(address, signal);
      else await eraseTag(signal);
      setStep({ k: 'done' });
    } catch (e) { fail(e); }
  };
  const start = async () => {
    setStep({ k: 'reading' });
    try {
      const found = classifyTag(await readTag(fresh()), people, person.id);
      if (mode === 'write' && (found.kind === 'empty' || found.kind === 'same')) await doWork();
      else if (mode === 'erase' && found.kind === 'empty') setStep({ k: 'done' });
      else setStep({ k: 'confirm', found });
    } catch (e) { fail(e); }
  };
  const check = async () => {
    setStep({ k: 'checking' });
    try {
      const found = classifyTag(await readTag(fresh()), people, person.id);
      setStep({ k: 'checked', ok: mode === 'write' ? found.kind === 'same' : found.kind === 'empty', found });
    } catch (e) { fail(e); }
  };

  const title = mode === 'write' ? `Escribir el llavero de ${first}` : 'Borrar un chip';
  return (
    <section className="stack" data-guion="llavero-escribir">
      <WhoLine name={person.name} person={person} />
      <h1>{title}</h1>
      {step.k === 'ready' ? (
        <>
          <p className="lead">{mode === 'write' ? 'Se guarda en el chip la dirección de este llavero. Primero se mira lo que el chip ya tiene.' : 'Se deja el chip vacío para poder usarlo otra vez. Primero se mira lo que tiene.'}</p>
          <p className="hint">Funciona si el chip no está bloqueado. Un chip bloqueado no se puede cambiar.</p>
          <Choice primary icon={<IcoKey />} label="Empezar" hint="Después acerca el chip al celular" onClick={() => { void start(); }} />
          <Choice label="Volver" onClick={back} />
        </>
      ) : null}
      {step.k === 'reading' || step.k === 'working' || step.k === 'checking' ? (
        <>
          <p className="note" role="status"><IcoClock /><span>{step.k === 'reading' ? 'Acerca el chip a la parte de atrás del celular…' : step.k === 'checking' ? 'Acerca el chip otra vez para comprobarlo…' : 'Grabando. No muevas el chip.'}</span></p>
          <Choice label="Cancelar" onClick={() => { run.current?.abort(); setStep({ k: 'ready' }); }} />
        </>
      ) : null}
      {step.k === 'confirm' ? (
        <>
          <Alert>
            {step.found.kind === 'other' ? `Este chip es el llavero de ${nameOf(step.found)}. Si sigues, el llavero de ${nameOf(step.found)} dejará de abrir.`
              : step.found.kind === 'same' ? `Este chip ya es el llavero de ${nameOf(step.found)}.`
              : step.found.kind === 'unknown' ? 'Este chip tiene un llavero de otro taller o uno que ya se cambió.'
              : 'Este chip ya tiene otra cosa guardada.'}
          </Alert>
          <Choice primary danger icon={<IcoAlert />} label={mode === 'write' ? 'Sí, reemplazarlo' : 'Sí, borrarlo'} hint="Acerca el chip y no lo muevas" onClick={() => { void doWork(); }} />
          <Choice label="No, dejarlo como está" onClick={back} />
        </>
      ) : null}
      {step.k === 'done' ? (
        <>
          <Result kind="paid" title={mode === 'write' ? 'Listo, se grabó' : 'Listo, quedó vacío'} text={mode === 'write' ? 'Ahora compruébalo: acerca el chip otra vez y mira que sea el de esta persona.' : 'Ya puedes escribir otro llavero en este chip.'} />
          <Choice primary icon={<IcoKey />} label="Comprobar el chip" onClick={() => { void check(); }} />
          <Choice label="Terminar" onClick={back} />
        </>
      ) : null}
      {step.k === 'checked' ? (
        <>
          <Result kind={step.ok ? 'paid' : 'bad'} title={step.ok ? 'El chip está bien' : 'El chip no coincide'} text={step.ok ? (mode === 'write' ? `Es el llavero de ${first}.` : 'Está vacío.') : step.found.kind === 'empty' ? 'Está vacío.' : step.found.kind === 'same' || step.found.kind === 'other' ? `Es el llavero de ${nameOf(step.found)}.` : 'Tiene otra cosa guardada.'} />
          {step.ok ? null : <Choice primary icon={<IcoKey />} label={mode === 'write' ? 'Escribir otra vez' : 'Borrar otra vez'} onClick={() => { void start(); }} />}
          <Choice primary={step.ok} label="Terminar" onClick={back} />
        </>
      ) : null}
      {step.k === 'error' ? (
        <>
          <Alert>{PROBLEM_TEXT[step.problem]}</Alert>
          <Choice primary icon={<IcoKey />} label="Intentar de nuevo" onClick={() => setStep({ k: 'ready' })} />
          <Choice label="Volver" onClick={back} />
        </>
      ) : null}
    </section>
  );
}

/** Steps to write a chip, test it and lock it. Written for whoever helps set up the keychains. */
export function KeyringHelp() {
  return (
    <section className="stack" data-guion="llavero-ayuda">
      <h1>Cómo programar un llavero</h1>
      {nfcSupported() ? <p className="lead">Con este celular puedes hacerlo desde la app: entra a la persona, activa su llavero y toca <strong>Escribir en el chip</strong>. Si prefieres otra aplicación, sigue estos pasos.</p> : <p className="hint">Este celular no puede escribir chips desde la app (pasa en iPhone). Un Android con Chrome sí puede, y después el iPhone solo tiene que leerlos. Mientras tanto, usa estos pasos.</p>}
      <ol className="steps-list">
        <li>Entra a la persona, activa su llavero y copia la dirección.</li>
        <li>Abre en tu celular una app para escribir etiquetas NFC (por ejemplo NFC Tools). Elige escribir un registro de tipo enlace y pega la dirección.</li>
        <li>Acerca el llavero a la parte de atrás del celular y espera el aviso de que se escribió.</li>
        <li>Pruébalo: con la app cerrada, acerca el llavero otra vez. En iPhone puede aparecer un aviso arriba: tócalo. Debe abrirse la pantalla de cobro de esa persona.</li>
        <li>Solo si la prueba salió bien, bloquea el chip. Después ya no se puede cambiar.</li>
      </ol>
      <Alert>La dirección queda grabada para siempre en el chip. Cópiala desde la misma dirección web y el mismo navegador con los que cobras, y no bloquees ningún chip hasta estar segura de seguir usando este sitio.</Alert>
      <p className="hint">Si se pierde un llavero, desactívalo y haz un código nuevo para el de reemplazo.</p>
    </section>
  );
}

/** What a tap shows when it must NOT open the charge screen. */
export function KeyTap({ kind, personId, people, onView, onReset }: StageProps & { kind: 'off' | 'unknown' | 'gone'; personId?: string }) {
  const person = personId ? people.find((x) => x.id === personId) : undefined;
  const copy =
    kind === 'off'
      ? { title: 'Este llavero está desactivado', text: 'Se marcó como perdido. Con él no se puede cobrar a nadie.' }
      : kind === 'gone'
        ? { title: 'Esa persona ya no está activa', text: 'Su llavero ya no sirve.' }
        : { title: 'No reconocemos este llavero', text: 'Puede ser de otro taller, de alguien que ya se dio de baja, o haber sido cambiado por uno nuevo.' };
  return (
    <section className="stack" data-guion="llavero-toque">
      <Result kind="bad" title={copy.title} text={copy.text} />
      {kind === 'off' && person ? <Choice primary icon={<IcoKey />} label="Ver el llavero y activarlo de nuevo" hint={`Es el de ${person.name.split(' ')[0]}`} onClick={() => onView({ id: 'keyring', personId: person.id })} /> : null}
      <Choice primary={!(kind === 'off' && person)} label="Ir al inicio" onClick={() => onReset({ id: 'home' })} />
    </section>
  );
}
