// NFC keychain screens: the images of the active people (to download and print), and each person's keychain
// (activate, switch off when lost, a new code for a replacement, the address that is written in the chip).
import { useEffect, useState } from 'react';
import type { StageProps } from './screens';
import { pageOf, type Per } from './model';
import { emblemOf } from './emblems';
import { activeForKeyring, dedupeNames, keyState, keyringFileName, keyringUrl, type KeyState } from './keyring';
import { keychainPng, saveBlob } from './keychain';
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
    <section className="stack">
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

  // One image file per person. The browser may ask permission to download several files.
  async function downloadAll() {
    setError('');
    const names = dedupeNames(withImage.map(fileFor));
    try {
      for (const [i, p] of withImage.entries()) {
        setProgress({ done: i, total: withImage.length });
        saveBlob(await makeImage(p), names[i]);
        await pause(500);
      }
    } catch {
      setError('No se pudieron guardar todas. Descarga las imágenes una por una.');
    } finally {
      setProgress(null);
    }
  }

  return (
    <section className="stack">
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
        label={progress ? `Descargando ${progress.done + 1} de ${progress.total}…` : 'Descargar todas las imágenes'}
        hint={withImage.length ? `${withImage.length} archivos de imagen` : 'Aún no hay imágenes'}
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
    <section className="stack">
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
      <section className="stack">
        <WhoLine name={person.name} person={person} />
        <h1>¿Hacer un código nuevo?</h1>
        <Alert>El llavero que tiene ahora dejará de funcionar para siempre. Hazlo solo si se perdió o vas a cambiarlo.</Alert>
        <Choice danger icon={<IcoAlert />} label={busy ? 'Un momento…' : 'Sí, hacer un código nuevo'} onClick={() => { setAsking(false); onKey(person.id, 'new'); }} />
        <Choice label="No, dejarlo como está" onClick={() => setAsking(false)} />
      </section>
    );
  }

  return (
    <section className="stack">
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
          <Choice icon={<IcoKey />} label="Copiar la dirección" hint="Para escribirla en el chip" onClick={() => { void copy(); }} />
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
    </section>
  );
}

/** Steps to write a chip, test it and lock it. Written for whoever helps set up the keychains. */
export function KeyringHelp() {
  return (
    <section className="stack">
      <h1>Cómo programar un llavero</h1>
      <ol className="steps-list">
        <li>Entra a la persona, activa su llavero y copia la dirección.</li>
        <li>Abre en tu celular una app para escribir etiquetas NFC (por ejemplo NFC Tools). Elige escribir un registro de tipo enlace y pega la dirección.</li>
        <li>Acerca el llavero a la parte de atrás del celular y espera el aviso de que se escribió.</li>
        <li>Pruébalo: con la app cerrada, acerca el llavero otra vez. Debe abrirse la pantalla de cobro de esa persona.</li>
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
        : { title: 'No reconocemos este llavero', text: 'Puede ser de otro taller, o haber sido cambiado por uno nuevo.' };
  return (
    <section className="stack">
      <Result kind="bad" title={copy.title} text={copy.text} />
      {kind === 'off' && person ? <Choice primary icon={<IcoKey />} label={`Ver el llavero de ${person.name.split(' ')[0]}`} hint="Ahí puedes activarlo de nuevo" onClick={() => onView({ id: 'keyring', personId: person.id })} /> : null}
      <Choice primary={!(kind === 'off' && person)} label="Ir al inicio" onClick={() => onReset({ id: 'home' })} />
    </section>
  );
}
