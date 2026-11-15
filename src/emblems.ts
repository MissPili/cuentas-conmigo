// A bank of simple pictures so each person has an identifier the collector can tell apart at a glance.
// Rule: no two people who hold a place share one. Each has a word too, so nothing depends on seeing the picture well.

export interface Emblem {
  id: string;
  glyph: string;
  name: string;
}

export const EMBLEMS: Emblem[] = [
  { id: 'gato', glyph: '🐱', name: 'Gato' },
  { id: 'perro', glyph: '🐶', name: 'Perro' },
  { id: 'pajaro', glyph: '🐦', name: 'Pájaro' },
  { id: 'tortuga', glyph: '🐢', name: 'Tortuga' },
  { id: 'pez', glyph: '🐟', name: 'Pez' },
  { id: 'mariposa', glyph: '🦋', name: 'Mariposa' },
  { id: 'abeja', glyph: '🐝', name: 'Abeja' },
  { id: 'elefante', glyph: '🐘', name: 'Elefante' },
  { id: 'manzana', glyph: '🍎', name: 'Manzana' },
  { id: 'limon', glyph: '🍋', name: 'Limón' },
  { id: 'sandia', glyph: '🍉', name: 'Sandía' },
  { id: 'uvas', glyph: '🍇', name: 'Uvas' },
  { id: 'platano', glyph: '🍌', name: 'Plátano' },
  { id: 'elote', glyph: '🌽', name: 'Elote' },
  { id: 'nopal', glyph: '🌵', name: 'Nopal' },
  { id: 'girasol', glyph: '🌻', name: 'Girasol' },
  { id: 'rosa', glyph: '🌹', name: 'Rosa' },
  { id: 'estrella', glyph: '⭐', name: 'Estrella' },
  { id: 'luna', glyph: '🌙', name: 'Luna' },
  { id: 'sol', glyph: '☀️', name: 'Sol' },
  { id: 'casa', glyph: '🏠', name: 'Casa' },
  { id: 'bicicleta', glyph: '🚲', name: 'Bicicleta' },
  { id: 'balon', glyph: '⚽', name: 'Balón' },
  { id: 'guitarra', glyph: '🎸', name: 'Guitarra' },
  { id: 'campana', glyph: '🔔', name: 'Campana' },
  { id: 'pan', glyph: '🍞', name: 'Pan' },
  { id: 'cafe', glyph: '☕', name: 'Café' },
  { id: 'paraguas', glyph: '☂️', name: 'Paraguas' },
];

export const emblemOf = (id?: string | null): Emblem | undefined => EMBLEMS.find((e) => e.id === id);
export const isEmblemId = (id: unknown): id is string => typeof id === 'string' && EMBLEMS.some((e) => e.id === id);

export const freeEmblems = (taken: Iterable<string>): Emblem[] => {
  const used = new Set(taken);
  return EMBLEMS.filter((e) => !used.has(e.id));
};

/** `n` different free pictures, in random order. `rnd` is injectable for tests. */
export function pickEmblems(taken: Iterable<string>, n: number, rnd: () => number = Math.random): Emblem[] {
  const pool = freeEmblems(taken);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}
