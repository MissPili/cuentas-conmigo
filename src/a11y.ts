import { useSyncExternalStore } from 'react';

export type A11y = { voice: boolean; sound: boolean; hc: boolean; xl: boolean };

const KEY = 'ccm-a11y';
const DEFAULTS: A11y = { voice: true, sound: true, hc: false, xl: false };

function load(): A11y {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<A11y> | null;
    if (j && typeof j === 'object') return { ...DEFAULTS, ...j };
  } catch { /* storage can be blocked */ }
  const hc = typeof window !== 'undefined' && window.matchMedia?.('(prefers-contrast: more)').matches;
  return { ...DEFAULTS, hc: !!hc };
}

let state = load();
const listeners = new Set<() => void>();

export function getA11y(): A11y {
  return state;
}

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeA11y(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useA11y(): A11y {
  return useSyncExternalStore(subscribeA11y, getA11y, getA11y);
}

export function applyA11y(s: A11y = state) {
  const root = document.documentElement;
  root.setAttribute('data-contrast', s.hc ? 'high' : 'normal');
  if (s.xl) root.setAttribute('data-text', 'xl');
  else root.removeAttribute('data-text');
}

export function updateA11y(patch: Partial<A11y>) {
  state = { ...state, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* optional */ }
  applyA11y();
  emit();
}

export function speak(text: string) {
  try {
    if (!text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-MX';
    u.rate = 0.9;
    const voices = window.speechSynthesis.getVoices() || [];
    const voice = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === 'es-mx')
      || voices.find((v) => v.lang.toLowerCase().startsWith('es'));
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
  } catch { /* voice is optional */ }
}

export function stopSpeak() {
  try { window.speechSynthesis?.cancel(); } catch { /* optional */ }
}

function clean(t: string | null | undefined): string {
  return (t || '').replace(/\s+/g, ' ').trim().replace(/\.+$/, '');
}

function labelOf(el: Element | null): string {
  if (!el) return '';
  return clean(el.querySelector('.choice-label')?.textContent || el.getAttribute('aria-label') || el.textContent);
}

/** One short call to action for what is on screen. A later `data-ayuda` wins, so a step that just opened speaks instead of the page behind it. */
export function helpLine(): string {
  const main = document.querySelector('main');
  if (!main) return '';
  const marked = [...main.querySelectorAll('[data-ayuda]')].filter((el) => !el.matches('select, option, input, textarea'));
  for (let i = marked.length - 1; i >= 0; i--) {
    const el = marked[i];
    if ((el as HTMLElement).hidden || el.closest('[hidden]')) continue;
    const t = clean(el.getAttribute('data-ayuda'));
    if (t) return t.endsWith('.') || t.endsWith('?') || t.endsWith('!') ? t : `${t}.`;
  }
  const h1 = clean(main.querySelector('h1')?.textContent);
  const primary = labelOf(main.querySelector('button.choice.primary, a.choice.primary'));
  const writing = !!main.querySelector('input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), textarea');
  if (h1 && primary && writing) return `${h1}. Escribe los datos y toca ${primary}.`;
  if (h1 && primary) return `${h1}. Toca ${primary}.`;
  if (main.querySelector('button.person')) {
    const what = /cuenta/i.test(h1) ? 'una cuenta' : /cobro/i.test(h1) ? 'un cobro' : 'un nombre';
    return h1 ? `${h1}. Toca ${what}.` : `Toca ${what}.`;
  }
  if (main.querySelector('button.emblem-btn')) return h1 ? `${h1}. Toca una.` : 'Toca una.';
  const extra = clean(main.querySelector('.result p, .lead')?.textContent);
  if (h1 && extra) return `${h1}. ${extra}.`;
  if (h1) return `${h1}.`;
  return '';
}

/** What to say when a list (a desplegable) is shown or opened. */
export function selectHelp(el: HTMLSelectElement): string {
  const custom = clean(el.getAttribute('data-ayuda'));
  if (custom) return custom.endsWith('.') ? custom : `${custom}.`;
  const field = el.closest('label');
  const name = clean(field?.querySelector(':scope > span')?.textContent || el.getAttribute('aria-label'));
  const current = el.value ? clean(el.selectedOptions[0]?.textContent) : '';
  if (name && current) return `${name}. Ahora dice ${current}. Toca para cambiar.`;
  if (name) return `${name}. Toca y elige una.`;
  return 'Hay una lista. Toca y elige una.';
}

let audio: AudioContext | null = null;

/** Sound and vibration are extras. The screen must still make sense with both off. */
export function feedback(kind: 'ok' | 'error') {
  if (!state.sound) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AC) {
      audio = audio || new AC();
      if (audio.state === 'suspended') void audio.resume();
      const seq = kind === 'ok' ? [[660, 0, 0.12], [880, 0.14, 0.22]] : [[220, 0, 0.3]];
      seq.forEach(([freq, start, dur]) => {
        const o = audio!.createOscillator();
        const g = audio!.createGain();
        o.type = kind === 'ok' ? 'sine' : 'square';
        o.frequency.value = freq;
        g.gain.value = 0.12;
        o.connect(g);
        g.connect(audio!.destination);
        o.start(audio!.currentTime + start);
        o.stop(audio!.currentTime + start + dur);
      });
    }
  } catch { /* optional */ }
  try {
    navigator.vibrate?.(kind === 'ok' ? [80, 50, 80] : [250]);
  } catch { /* Safari on iPhone has no vibrate */ }
}

applyA11y();
try { window.speechSynthesis?.getVoices(); } catch { /* optional */ }
