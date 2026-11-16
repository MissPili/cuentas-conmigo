// The voice guide: one short script per screen, easy to edit in src/guion.ts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { GUION } from '../src/guion.ts';

const frases = (s: string) => s.split(/(?<=[.!?])\s+/).filter(Boolean);

function decir(id: string): string {
  const g = GUION[id];
  assert.ok(g, id);
  if (typeof g === 'string') return g;
  return g({
    querySelector(sel: string) {
      if (sel === '.choice.attention') return id === 'inicio' ? { textContent: 'esperan' } : null;
      if (sel === '.amount') return { textContent: '$130.00' };
      if (sel === 'h1') return { textContent: 'Taller' };
      return { textContent: 'Elena Ruiz' };
    },
  });
}

test('cada guion cabe en una, dos o tres frases y habla de tú', () => {
  for (const id of Object.keys(GUION)) {
    const text = decir(id);
    const n = frases(text).length;
    assert.ok(n >= 1 && n <= 3, `${id} tiene ${n} frases: ${text}`);
    assert.equal(/\busted\b/i.test(text), false, id);
    assert.equal(/API|endpoint|token|payload/i.test(text), false, id);
  }
});

test('cada pantalla apunta a un guion que existe', () => {
  const root = path.join(import.meta.dirname, '..', 'src');
  const ids = new Set<string>();
  for (const file of fs.readdirSync(root)) {
    if (!file.endsWith('.tsx')) continue;
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    for (const m of src.matchAll(/data-guion="([^"]+)"/g)) ids.add(m[1]);
  }
  ids.add('peligro-1');
  ids.add('peligro-2');
  ids.add('peligro-3');
  for (const id of ids) assert.ok(id in GUION, `falta el guion ${id}`);
});
