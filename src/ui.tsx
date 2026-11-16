import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Kind } from './model';
import logo from './assets/logo-cuentas-conmigo.png';
import { getA11y, helpLine, selectHelp, speak, stopSpeak, updateA11y, useA11y } from './a11y';
import { emblemOf } from './emblems';

export function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}

export const IcoCheck = () => <Icon><path d="M5 12.5l4.2 4.2L19 7.5" /></Icon>;
export const IcoClock = () => <Icon><circle cx="12" cy="12" r="8" /><path d="M12 8v4.5l3 2" /></Icon>;
export const IcoRing = () => <Icon><circle cx="12" cy="12" r="8" /></Icon>;
export const IcoAlert = () => <Icon><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17.2v.2" /></Icon>;
export const IcoCash = () => <Icon><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.4" /></Icon>;
export const IcoPeople = () => <Icon><circle cx="9" cy="9" r="3" /><path d="M3.5 19c.6-3 2.6-4.5 5.5-4.5s4.9 1.5 5.5 4.5" /><circle cx="17" cy="9.5" r="2.2" /><path d="M16 14.6c2.2.3 3.6 1.4 4.3 3.4" /></Icon>;
export const IcoBank = () => <Icon><path d="M4 10h16M6 10v7M10 10v7M14 10v7M18 10v7M3 17h18M4 10l8-5 8 5" /></Icon>;
export const IcoPhone = () => <Icon><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M11 18h2" /></Icon>;
export const IcoQr = () => (
  <Icon>
    <rect x="4" y="4" width="6" height="6" />
    <rect x="14" y="4" width="6" height="6" />
    <rect x="4" y="14" width="6" height="6" />
    <path d="M14 14h2v2h-2zM18 14v6h-4M14 18h2" />
  </Icon>
);
export const IcoKey = () => <Icon><circle cx="8" cy="12" r="4" /><path d="M12 12h9M18 12v3.5M21 12v2.5" /></Icon>;
export const IcoBack = () => <Icon><path d="M15 5l-7 7 7 7" /></Icon>;
export const IcoOut = () => <Icon><path d="M10 5H6v14h4M10 12h9M16 8l4 4-4 4" /></Icon>;
export const IcoEye = () => <Icon><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="2.5" /></Icon>;
export const IcoListen = () => <Icon><path d="M4 10v4h3l4 3V7L7 10z" /><path d="M15 9.2a3.6 3.6 0 010 5.6M17.4 7a6.5 6.5 0 010 10" /></Icon>;
export const IcoMute = () => <Icon><path d="M4 10v4h3l4 3V7L7 10z" /><path d="M16 9.5l5 5M21 9.5l-5 5" /></Icon>;

const KIND_ICON = { paid: IcoCheck, wait: IcoClock, due: IcoRing, bad: IcoAlert };

export function Status({ kind, children }: { kind: Kind; children: ReactNode }) {
  const Mark = KIND_ICON[kind];
  return <span className={`st st-${kind}`}><Mark /><span>{children}</span></span>;
}

export function Choice({
  primary, danger, attention, icon, mark, label, hint, onClick, type = 'button',
}: {
  primary?: boolean;
  danger?: boolean;
  /** Something is waiting for the collector: gold fill, dashed border and a bell, never color alone. */
  attention?: boolean;
  icon?: ReactNode;
  /** One familiar emoji for a key action. Replaces the line icon so the button does not show both. Hidden from screen readers. */
  mark?: string;
  label: string;
  hint?: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  const cls = primary ? 'choice primary' : danger ? 'choice danger' : attention ? 'choice attention' : 'choice';
  return (
    <button type={type} className={cls} onClick={onClick}>
      {mark ? <span className="ico-emoji" aria-hidden="true">{mark}</span> : icon}
      <span className="choice-text">
        <span className="choice-label">{label}</span>
        {hint ? <small>{hint}</small> : null}
      </span>
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

export function Alert({ children }: { children: ReactNode }) {
  return <div className="alert" role="alert"><IcoAlert /><span>{children}</span></div>;
}

export function Shell({ canBack, onBack, note, children }: { canBack: boolean; onBack: () => void; note?: string; children: ReactNode }) {
  const voiceOn = useA11y().voice;
  const [spoken, setSpoken] = useState('');
  const screenLast = useRef('');
  const say = (text: string) => {
    if (!text) return;
    setSpoken(text);
    speak(text);
  };
  // The bottom button is the switch: it is on every screen, so the voice can be turned off without looking for the setting.
  const toggleVoice = () => {
    if (voiceOn) {
      updateA11y({ voice: false });
      stopSpeak();
      return;
    }
    updateA11y({ voice: true });
    const active = document.activeElement;
    const text = active instanceof HTMLSelectElement && active.closest('main') ? selectHelp(active) : helpLine();
    screenLast.current = text;
    say(text);
  };
  useEffect(() => {
    const t = window.setTimeout(() => {
      const text = helpLine();
      if (!text || text === screenLast.current) return;
      screenLast.current = text;
      if (!getA11y().voice) { setSpoken(''); return; }
      say(text);
    }, 180);
    return () => window.clearTimeout(t);
  });
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target;
      if (!(el instanceof HTMLSelectElement) || !el.closest('main') || !getA11y().voice) return;
      const text = selectHelp(el);
      setSpoken(text);
      speak(text);
    };
    document.addEventListener('focusin', onFocus);
    const main = document.querySelector('main');
    const seen = new Set<Element>();
    main?.querySelectorAll('select').forEach((el) => seen.add(el));
    const obs = new MutationObserver(() => {
      if (!getA11y().voice || !main) return;
      const fresh = [...main.querySelectorAll('select')].filter((el) => !seen.has(el));
      fresh.forEach((el) => seen.add(el));
      const el = fresh[fresh.length - 1];
      if (!el) return;
      // The screen line, if it changed, speaks a moment later and replaces this.
      const text = selectHelp(el);
      setSpoken(text);
      speak(text);
    });
    if (main) obs.observe(main, { childList: true, subtree: true });
    return () => {
      document.removeEventListener('focusin', onFocus);
      obs.disconnect();
    };
  }, []);
  return (
    <div className="app">
      <header className="top">
        <img src={logo} alt="Cuentas conmigo" width="498" height="96" />
      </header>
      <main className="panel">
        {note ? <p className="note" role="status"><IcoCheck /><span>{note}</span></p> : null}
        {children}
        {spoken ? <p className="spoken" aria-live="polite">«{spoken}»</p> : null}
      </main>
      <div className="dock">
        {canBack ? (
          <button type="button" className="back" onClick={onBack}>
            <IcoBack />
            <span>Atrás</span>
          </button>
        ) : null}
        <button type="button" className={canBack ? 'listen' : 'listen only'} role="switch" aria-checked={voiceOn} onClick={toggleVoice}>
          <span className="ico-emoji" aria-hidden="true">{voiceOn ? '🔇' : '🔊'}</span>
          <span>{voiceOn ? 'Apagar voz' : 'Prender voz'}</span>
        </button>
      </div>
    </div>
  );
}

export function Result({ kind, title, text, tech }: { kind: 'paid' | 'bad'; title: string; text: string; tech?: string }) {
  return (
    <div className="result">
      <div className={kind === 'paid' ? 'seal ok' : 'seal bad'}>{kind === 'paid' ? <IcoCheck /> : <IcoAlert />}</div>
      <h1>{title}</h1>
      <p>{text}</p>
      {tech ? <p className="tech">Detalle para quien te ayuda: {tech}</p> : null}
    </div>
  );
}

/** The picture that identifies a person: their photo (with consent), else their chosen picture, else the initial. */
export function Avatar({ person, name }: { person?: { name?: string; emblem?: string | null; photo?: string | null }; name?: string }) {
  const label = person?.name ?? name ?? '';
  if (person?.photo) return <img className="avatar" alt="" src={person.photo} />;
  const e = emblemOf(person?.emblem);
  if (e) return <span className="avatar" aria-hidden="true">{e.glyph}</span>;
  return <span className="avatar initial" aria-hidden="true">{label.trim().charAt(0).toUpperCase()}</span>;
}

/** Big name line with the picture beside it. */
export function WhoLine({ name, person }: { name: string; person?: { emblem?: string | null; photo?: string | null } }) {
  return (
    <p className="who-line who-with">
      <Avatar person={{ ...person, name }} />
      <span>{name}</span>
    </p>
  );
}
