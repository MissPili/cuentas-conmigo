// NFC chips written from the app: what a chip holds, which records are written, and how a failure is named.
import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTag, emptyRecords, fitsSmallChip, nfcProblem, urlRecords, urlsOf } from '../src/nfc.ts';
import { keyringUrl } from '../src/keyring.ts';

const A = 'aaaaaaaaaaaaaaaaaaaaaa';
const B = 'bbbbbbbbbbbbbbbbbbbbbb';
const people = [
  { id: 'a', keyCode: A, status: 'ENROLLED' as const },
  { id: 'b', keyCode: B, status: 'ENROLLED' as const },
  { id: 'c', keyCode: 'cccccccccccccccccccccc', status: 'LEFT' as never },
];
const url = (code: string) => keyringUrl('https://cuentasconmigo.misspili.com.mx', code);

test('el chip vacío, el propio, el de otra persona, el desconocido y el ajeno se distinguen', () => {
  assert.deepEqual(classifyTag([], people, 'a'), { kind: 'empty' });
  assert.equal(classifyTag([url(A)], people, 'a').kind, 'same');
  assert.equal(classifyTag([url(B)], people, 'a').kind, 'other');
  assert.equal(classifyTag([url('zzzzzzzzzzzzzzzzzzzzzz')], people, 'a').kind, 'unknown');
  assert.equal(classifyTag(['https://example.com/hola'], people, 'a').kind, 'foreign');
  assert.equal(classifyTag(['no es una dirección'], people, 'a').kind, 'foreign');
});

test('el chip de una persona dada de baja no cuenta como de otra persona activa', () => {
  assert.equal(classifyTag([url('cccccccccccccccccccccc')], people, 'a').kind, 'unknown');
});

test('un chip de otro ambiente con el mismo código se reconoce por el código, no por el dominio', () => {
  assert.equal(classifyTag([keyringUrl('https://dev.dj3nitc67fx2s.amplifyapp.com', A)], people, 'a').kind, 'same');
});

test('qué se escribe y qué se borra', () => {
  assert.deepEqual(urlRecords('https://x.test/?l=1'), [{ recordType: 'url', data: 'https://x.test/?l=1' }]);
  assert.deepEqual(emptyRecords(), [{ recordType: 'empty' }]);
});

test('se leen solo las direcciones de lo que trae el chip', () => {
  const dv = (s: string) => new DataView(new TextEncoder().encode(s).buffer);
  assert.deepEqual(urlsOf([{ recordType: 'text', data: dv('hola') }, { recordType: 'url', data: dv('https://a.test/') }, { recordType: 'empty' }]), ['https://a.test/']);
});

test('la dirección cabe en un chip pequeño (NTAG213)', () => {
  assert.equal(fitsSmallChip(url(A)), true);
  assert.equal(fitsSmallChip(`https://${'x'.repeat(200)}.test/?l=${A}`), false);
});

test('los fallos del navegador se nombran', () => {
  const e = (name: string) => ({ name });
  assert.equal(nfcProblem(e('AbortError')), 'cancelled');
  assert.equal(nfcProblem(e('NotAllowedError')), 'denied');
  assert.equal(nfcProblem(e('NotSupportedError')), 'unsupported');
  assert.equal(nfcProblem(e('NotReadableError')), 'unreadable');
  assert.equal(nfcProblem(e('NetworkError')), 'write');
  assert.equal(nfcProblem(null), 'write');
});
