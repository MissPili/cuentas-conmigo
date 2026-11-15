// Screens added after the first MVP: "more options" and the monthly report.
import { useState } from 'react';
import type { StageProps } from './screens';
import { money, monthName, shiftMonth, thisMonth } from './model';
import { Choice, IcoBank, IcoCash, IcoEye, IcoOut, Status } from './ui';
import { canCharge } from './places';
import { buildReport, reportCsv } from './report';
import { feedback, speak, stopSpeak, updateA11y, useA11y, type A11y } from './a11y';

export function More({ onView, signOut }: StageProps) {
  return (
    <section className="stack">
      <h1>Más opciones</h1>
      <Choice primary icon={<IcoCash />} label="Reporte del mes" hint="Quién pagó y quién falta" onClick={() => onView({ id: 'report', month: thisMonth() })} />
      <Choice icon={<IcoEye />} label="Ver mejor" hint="Voz, letra y colores" onClick={() => onView({ id: 'access' })} />
      <Choice icon={<IcoBank />} label="Cuenta que recibe" hint="A dónde llega el dinero" onClick={() => onView({ id: 'accounts', page: 0 })} />
      {signOut ? <Choice icon={<IcoOut />} label="Salir" onClick={signOut} /> : null}
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
    <section className="stack">
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
  { key: 'voice', label: 'Voz que lee' },
  { key: 'sound', label: 'Sonido y vibración' },
];

export function Access() {
  const set = useA11y();
  function flip(key: keyof A11y) {
    const next = !set[key];
    updateA11y({ [key]: next });
    if (key === 'voice') {
      if (next) speak('Voz activada');
      else stopSpeak();
    }
    if (key === 'sound' && next) feedback('ok');
  }
  return (
    <section className="stack">
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
