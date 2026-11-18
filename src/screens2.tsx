// Screens added after the first MVP: "more options" and the monthly report.
import { useState, type FormEvent } from 'react';
import type { StageProps } from './screens';
import { money, monthName, shiftMonth, thisMonth } from './model';
import { Alert, Choice, Field, IcoBank, IcoCash, IcoEye, IcoKey, IcoOut, IcoPeople, Status } from './ui';
import { canCharge } from './places';
import { buildReport, reportCsv } from './report';
import { feedback, speak, stopSpeak, updateA11y, useA11y, type A11y } from './a11y';

export function More({ view, project, projects, onView, onReset, signOut }: StageProps) {
  const page = view.id === 'more' ? view.page ?? 0 : 0;
  if (page <= 0) {
    return (
      <section className="stack" data-guion="mas">
        <h1>Más opciones</h1>
        <Choice primary icon={<IcoCash />} label="Reporte del mes" hint="Quién pagó y quién falta" onClick={() => onView({ id: 'report', month: thisMonth() })} />
        <Choice icon={<IcoPeople />} label="Personas" hint="Corregir sus datos o dar de baja" onClick={() => onView({ id: 'people' })} />
        <Choice icon={<IcoPeople />} label="Lugares e inscripciones" hint="Cupo, código QR y lista de espera" onClick={() => onView({ id: 'places' })} />
        <Choice icon={<IcoKey />} label="Imágenes y llaveros" hint="Imágenes, escribir y activar llaveros" onClick={() => onView({ id: 'keyring-hub' })} />
        <Choice label="Ver más" hint="Voz, cuenta que recibe y salir" onClick={() => onView({ id: 'more', page: 1 })} />
      </section>
    );
  }
  if (page === 1) {
    return (
      <section className="stack" data-guion="mas-2">
        <h1>Más opciones</h1>
        <Choice primary icon={<IcoEye />} label="Ver mejor" hint="Voz, letra y colores" onClick={() => onView({ id: 'access' })} />
        <Choice icon={<IcoBank />} label="Cuenta que recibe" hint="A dónde llega el dinero" onClick={() => onView({ id: 'accounts', page: 0 })} />
        <Choice label="Ver más" hint="Cambiar de proyecto o salir" onClick={() => onView({ id: 'more', page: 2 })} />
      </section>
    );
  }
  return (
    <section className="stack" data-guion="mas-3">
      <h1>Más opciones</h1>
      {projects.length > 1 || !project ? <Choice icon={<IcoPeople />} label="Cambiar de proyecto" hint="Otro taller o cobro" onClick={() => onReset({ id: 'projects' })} /> : <Choice icon={<IcoPeople />} label="Nuevo proyecto" hint="Otro taller o cobro" onClick={() => onView({ id: 'new-project' })} />}
      {signOut ? <Choice primary icon={<IcoOut />} label="Salir" onClick={signOut} /> : null}
      <p className="hint">Versión de la app: {__BUILD__}{__ENV__ ? ` · ${__ENV__}` : ''}</p>
      {/* The danger entry is deliberately plain and last, so it is not tapped by mistake. */}
      <button type="button" className="quiet" onClick={() => onView({ id: 'danger' })}>Zona de peligro (solo para quien configura)</button>
    </section>
  );
}

function download(name: string, csv: string) {
  // The BOM makes Excel read the accents correctly.
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportView({ month, people, charges, accounts, onView }: StageProps & { month: string }) {
  const [problem, setProblem] = useState('');
  const r = buildReport(month, people, charges, accounts, canCharge);
  const isNow = month >= thisMonth();
  const name = monthName(month);

  function save() {
    try {
      download(`reporte-${month}.csv`, reportCsv(r));
      setProblem('');
    } catch {
      setProblem('No se pudo guardar el archivo. Intenta de nuevo.');
    }
  }

  return (
    <section className="stack" data-guion="reporte">
      <h1>Reporte de {name.toLowerCase()}</h1>
      {r.rows.length ? (
        <div className="stat">
          <p><strong>Esperado:</strong> {money(r.expected)}</p>
          <p><strong>Recibido:</strong> {money(r.received)}</p>
          <p><strong>Falta:</strong> {money(r.pending)}</p>
          <p>Por celular: {money(r.codi)}. En efectivo: {money(r.cash)}.</p>
        </div>
      ) : (
        <p className="lead">En {name.toLowerCase()} no hay cobros.</p>
      )}
      {r.withoutCharge ? <p className="hint">{r.withoutCharge} sin cobro este mes.</p> : null}
      {r.rows.map((row) => (
        <div key={row.personId} className="person" role="group" aria-label={row.name}>
          <span className="person-name">{row.name}</span>
          <span className="person-amt">{money(row.received)} de {money(row.expected)}</span>
          <Status kind={row.pending > 0 ? 'due' : 'paid'}>
            {row.pending > 0 ? `Falta ${money(row.pending)}` : 'Pagado'}
          </Status>
          {row.lines.filter((l) => l.paid).map((l) => (
            <small key={l.chargeId} className="hint">
              {l.concept}: {l.via === 'CASH' ? 'efectivo' : 'por celular'}{l.account ? ` · recibe ${l.account}` : ''}
            </small>
          ))}
        </div>
      ))}
      {problem ? <p className="alert" role="alert">{problem}</p> : null}
      {r.rows.length ? <Choice primary label="Guardar como hoja de cálculo" hint="Se abre en Excel" onClick={save} /> : null}
      <Choice label="Mes anterior" hint={monthName(shiftMonth(month, -1))} onClick={() => onView({ id: 'report', month: shiftMonth(month, -1) })} />
      {!isNow ? <Choice label="Mes siguiente" hint={monthName(shiftMonth(month, 1))} onClick={() => onView({ id: 'report', month: shiftMonth(month, 1) })} /> : null}
    </section>
  );
}

const SWITCHES: { key: keyof A11y; label: string }[] = [
  { key: 'hc', label: 'Colores fuertes' },
  { key: 'xl', label: 'Letra extra grande' },
  { key: 'voice', label: 'Voz guía' },
  { key: 'sound', label: 'Sonido y vibración' },
];

export function Access() {
  const set = useA11y();
  function flip(key: keyof A11y) {
    const next = !set[key];
    updateA11y({ [key]: next });
    if (key === 'voice') {
      if (next) speak('Listo. A partir de ahora te explico cada pantalla.');
      else stopSpeak();
    }
    if (key === 'sound' && next) feedback('ok');
  }
  return (
    <section className="stack" data-guion="ver-mejor">
      <h1>Ver mejor</h1>
      <p className="lead">Toca para activar o apagar. La pantalla se entiende aunque el sonido esté apagado.</p>
      {SWITCHES.map((s) => {
        const on = set[s.key];
        return (
          <button key={s.key} type="button" className="choice sw" role="switch" aria-checked={on} onClick={() => flip(s.key)}>
            <span className="choice-text"><span className="choice-label">{s.label}</span></span>
            <Status kind={on ? 'paid' : 'due'}>{on ? 'Activado' : 'Apagado'}</Status>
          </button>
        );
      })}
    </section>
  );
}

const WORD = 'BORRAR';

/** Wipes test data. Three deliberate steps: read the warning, type a word, type the code sent to the email. */
export function DangerZone({ people, charges, onSendCode, onWipe, onView }: StageProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [word, setWord] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function sendCode(e: FormEvent) {
    e.preventDefault();
    if (word.trim().toUpperCase() !== WORD) { setError(`Escribe la palabra ${WORD} tal como aparece.`); return; }
    setBusy(true);
    setError('');
    const msg = await onSendCode();
    setBusy(false);
    if (msg) setError(msg);
    else setStep(3);
  }

  async function wipe(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) { setError('Escribe el código que llegó a tu correo.'); return; }
    setBusy(true);
    setError('');
    const msg = await onWipe(code);
    setBusy(false);
    if (msg) setError(msg);
  }

  return (
    <section className="stack danger-zone" data-guion={`peligro-${step}`}>
      <h1>Zona de peligro</h1>
      <Alert>Esto borra a TODAS las personas ({people.length}) y TODOS los cobros ({charges.length}). No se puede deshacer. Úsalo solo con quien te ayuda a configurar la app.</Alert>
      <p className="hint">No se borran las cuentas que reciben ni los ajustes de lugares. Los cobros que ya se mandaron a Pey no se cancelan allá.</p>
      {step === 1 ? (
        <Choice label="Entiendo, continuar" hint="Pide una confirmación más" onClick={() => setStep(2)} />
      ) : null}
      {step === 2 ? (
        <form className="stack" onSubmit={sendCode}>
          {error ? <Alert>{error}</Alert> : null}
          <Field label={`Para seguir, escribe ${WORD}`}><input value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" autoCapitalize="characters" /></Field>
          <Choice type="submit" label={busy ? 'Un momento…' : 'Mandar código a mi correo'} hint="Llega al correo con el que entras" />
        </form>
      ) : null}
      {step === 3 ? (
        <form className="stack" onSubmit={wipe}>
          <p className="lead">Te mandamos un código al correo. Escríbelo aquí.</p>
          {error ? <Alert>{error}</Alert> : null}
          <Field label="Código del correo"><input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" /></Field>
          <Choice danger type="submit" label={busy ? 'Borrando…' : 'Borrar personas y cobros'} />
        </form>
      ) : null}
      <Choice primary label="No borrar nada, volver" onClick={() => onView({ id: 'more' })} />
    </section>
  );
}
