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

/** What the screen says: title, notes and the name of each button. Input values are left out. */
export function readScreen(): string {
  const main = document.querySelector('main');
  if (!main) return '';
  const parts: string[] = [];
  const add = (t: string | null | undefined) => {
    const s = (t || '').replace(/\s+/g, ' ').trim().replace(/\.+$/, '');
    if (s) parts.push(s);
  };
  const textOf = (el: Element): string =>
    [...el.childNodes].map((n) => (n.nodeType === 1 ? textOf(n as Element) : n.textContent || '')).join(' ');
  add(main.querySelector('h1')?.textContent);
  main.querySelectorAll('.lead, .who-line, .amount, .stat p, .hint, .alert span, .note span, .result p, .steps-text').forEach((n) => add(n.textContent));
  main.querySelectorAll('button.choice, button.person, a.choice').forEach((n) => add(n.getAttribute('aria-label') || textOf(n)));
  return parts.join('. ');
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
