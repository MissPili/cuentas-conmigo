import type { Helper } from './model';

// Payment receipt and "code to pay" card: tall pictures (1080x1350) that are easy to read and easy to send.
// Big letters, one idea per row, an icon beside each idea, and the name of the workshop at the top, for people
// who read little. Pure functions only, so the screens can be restyled without touching this.

export interface ReceiptData {
  folio: string;
  projectName: string; // the workshop or project the charge belongs to
  payerName: string;
  concept: string;
  amount: number;
  via: 'CASH' | 'CODI';
  recipient: string; // who receives the money
  paidAt: string; // ISO date
}

const INK = '#4E1A6E';
const SOFT = '#4A3358';
const PAID = '#0F5F28';
const GOLD = '#EDB438';

export const money = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

export const viaName = (v: ReceiptData['via']) => (v === 'CASH' ? 'Efectivo' : 'Por celular');

export const folioOf = (chargeId: string) => 'CC-' + chargeId.replace(/-/g, '').slice(0, 6).toUpperCase();

export const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

/** Breaks a text into at most `lines` lines of about `n` characters, cutting on spaces. */
export function wrap(text: string, n: number, lines = 2): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > n) {
      out.push(cur);
      cur = w;
    } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) out.push(cur);
  if (out.length > lines) {
    const rest = out.slice(lines - 1).join(' ');
    return [...out.slice(0, lines - 1), clip(rest, n)];
  }
  return out.map((l) => clip(l, n));
}

type TextOpts = { w?: number; fill?: string; anchor?: string };
const text = (x: number, y: number, size: number, txt: string, o: TextOpts = {}) =>
  `<text x="${x}" y="${y}" font-size="${size}"${o.w ? ` font-weight="${o.w}"` : ''}${o.fill ? ` fill="${o.fill}"` : ''}${
    o.anchor ? ` text-anchor="${o.anchor}"` : ''
  }>${esc(txt)}</text>`;

// Simple pictures on a 48 x 48 grid, drawn in white inside a purple circle.
const GLYPH = {
  doc: '<path d="M13 6h16l8 8v28H13z M29 6v8h8 M19 24h14 M19 31h14"/>',
  bank: '<path d="M6 19L24 8l18 11M10 19v18M20 19v18M28 19v18M38 19v18M6 40h36"/>',
  phone: '<rect x="14" y="5" width="20" height="38" rx="4"/><path d="M21 37h6"/>',
  cash: '<rect x="4" y="12" width="40" height="24" rx="4"/><circle cx="24" cy="24" r="6"/>',
  calendar: '<rect x="6" y="9" width="36" height="32" rx="4"/><path d="M6 19h36M15 5v8M33 5v8"/>',
} as const;

function badge(glyph: keyof typeof GLYPH, cx: number, cy: number): string {
  return (
    `<circle cx="${cx}" cy="${cy}" r="48" fill="${INK}"/>` +
    `<g transform="translate(${cx - 30} ${cy - 30}) scale(1.25)" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round">${GLYPH[glyph]}</g>`
  );
}

const open = () =>
  `<svg viewBox="0 0 1080 1350" width="1080" height="1350" xmlns="http://www.w3.org/2000/svg" font-family="Nunito, Segoe UI, Arial, Helvetica, sans-serif" fill="${INK}">` +
  '<rect width="1080" height="1350" fill="#fff"/>';

export function receiptSvg(d: ReceiptData): string {
  let s = open();
  // Green top: the one word that matters.
  s += `<rect width="1080" height="250" fill="${PAID}"/><rect y="250" width="1080" height="14" fill="${GOLD}"/>`;
  s += `<circle cx="150" cy="125" r="78" fill="#fff"/><path d="M110 126l30 30 58-66" fill="none" stroke="${PAID}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += text(270, 150, 128, 'PAGADO', { w: 800, fill: '#fff' }) + text(274, 214, 56, viaName(d.via), { w: 700, fill: '#fff' });
  // Which workshop or project.
  s += `<rect y="264" width="1080" height="116" fill="${INK}"/>`;
  s += text(540, 342, 66, clip(d.projectName, 26), { w: 800, fill: '#fff', anchor: 'middle' });
  // Who paid and how much, big.
  let y = 460;
  s += text(60, y, 40, 'PAGÓ', { w: 700, fill: SOFT });
  const nameLines = wrap(d.payerName, 24, 2);
  y += 76;
  nameLines.forEach((l, i) => {
    s += text(60, y + i * 76, 68, l, { w: 800 });
  });
  y += (nameLines.length - 1) * 76 + 160;
  const amount = money(d.amount);
  s += text(60, y, amount.length > 9 ? 140 : 170, amount, { w: 800 });
  y += 30;
  s += `<rect x="60" y="${y}" width="960" height="8" fill="${INK}"/>`;
  // What it is, one idea per row with a picture.
  const rows: [keyof typeof GLYPH, string, string][] = [
    ['doc', 'Por qué', d.concept],
    ['bank', 'Quién recibe', d.via === 'CASH' ? 'En mano · ' + d.recipient : d.recipient],
    [d.via === 'CASH' ? 'cash' : 'phone', 'Cómo pagó', viaName(d.via)],
    ['calendar', 'Cuándo', dateLabel(d.paidAt)],
  ];
  y += 24;
  rows.forEach(([g, label, value], i) => {
    const top = y + i * 108;
    s += badge(g, 108, top + 46);
    s += text(190, top + 32, 40, label, { fill: SOFT });
    s += text(190, top + 92, 60, clip(value, 26), { w: 800 });
  });
  s += text(540, 1296, 42, `Folio ${d.folio}`, { w: 700, anchor: 'middle' });
  s += text(540, 1338, 36, 'Comprobante de pago · no es factura', { fill: SOFT, anchor: 'middle' });
  return s + '</svg>';
}

export interface PayCardData {
  projectName: string;
  payerName: string;
  concept: string;
  amount: number;
  qrPng: string; // base64 PNG from Pey
}

/** The CoDi code as a picture, ready to send to whoever helps pay. */
export function payCardSvg(d: PayCardData): string {
  let s = open();
  s += `<rect width="1080" height="210" fill="${INK}"/><rect y="210" width="1080" height="14" fill="${GOLD}"/>`;
  s += text(540, 108, 64, clip(d.projectName, 28), { w: 800, fill: '#fff', anchor: 'middle' });
  s += text(540, 178, 48, 'Código para pagar', { w: 700, fill: GOLD, anchor: 'middle' });
  s += text(540, 300, 40, 'PARA PAGAR POR', { w: 700, fill: SOFT, anchor: 'middle' });
  s += text(540, 372, 64, clip(d.payerName, 24), { w: 800, anchor: 'middle' });
  s += text(540, 540, d.amount >= 10000 ? 150 : 180, money(d.amount), { w: 800, anchor: 'middle' });
  s += text(540, 600, 48, clip(d.concept, 30), { fill: SOFT, anchor: 'middle' });
  s += `<rect x="270" y="632" width="540" height="540" rx="28" fill="#fff" stroke="${INK}" stroke-width="10"/>`;
  s += `<image x="290" y="652" width="500" height="500" style="image-rendering:pixelated" href="data:image/png;base64,${d.qrPng}"/>`;
  const steps = ['Abre la app de tu banco', 'Elige CoDi y escanea el código', 'Confirma el pago'];
  steps.forEach((t, i) => {
    const yy = 1224 + i * 52;
    s += `<circle cx="150" cy="${yy - 14}" r="22" fill="${INK}"/>` + text(150, yy - 2, 30, String(i + 1), { w: 800, fill: '#fff', anchor: 'middle' });
    s += text(194, yy, 40, t, { w: 700 });
  });
  return s + '</svg>';
}

export const svgDataUrl = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

export function receiptText(d: ReceiptData) {
  return `Hola. Comprobante de pago de ${d.projectName}: ${d.payerName} pagó ${money(d.amount)} por ${d.concept}, ${viaName(d.via).toLowerCase()}, el ${dateLabel(d.paidAt)}. Folio ${d.folio}. Gracias por ayudar a pagar. Si tienes dudas, comunícate con ${d.payerName}.`;
}

/** Message sent with the code to whoever helps pay: says who they are helping, what for, and to ask first if in doubt. */
export function payText(d: PayCardData, helperName = '') {
  const hi = helperName ? `Hola ${helperName}.` : 'Hola.';
  return (
    `${hi} Estás ayudando a ${d.payerName} a pagar ${money(d.amount)} de ${d.concept} en ${d.projectName}.\n\n` +
    'Para pagar: abre la app de tu banco, elige CoDi y escanea el código de la imagen.\n\n' +
    `Si tienes dudas, comunícate con ${d.payerName} antes de aprobar o hacer el pago.`
  );
}

// Option A: WhatsApp opens with the message ready; the person still taps Send. We cannot know it arrived.
export const whatsappUrl = (tel10: string, msg: string) => `https://wa.me/52${tel10}?text=${encodeURIComponent(msg)}`;

export interface Dest {
  tel: string;
  label: string; // who it is: "María (hija)", or "Su celular"
  sub: string; // the number, partly hidden
  name: string; // first name to greet, empty when unknown
  chosen: boolean; // the person asked that codes and receipts go here
}

const maskTel = (t: string) => `•••• ${t.slice(-4)}`;

/** Who can receive a picture: the one the person chose first, then the other helpers, then the person. */
export function destinations(personTel: string, helpers: Helper[] = [], sendTo?: string | null): Dest[] {
  const seen = new Set<string>();
  const out: Dest[] = [];
  for (const h of helpers) {
    if (!/^[0-9]{10}$/.test(h.tel) || seen.has(h.tel)) continue;
    seen.add(h.tel);
    const who = h.name ? (h.rel ? `${h.name} (${h.rel})` : h.name) : 'Quien ayuda a pagar';
    out.push({ tel: h.tel, label: who, sub: maskTel(h.tel), name: h.name.trim().split(/\s+/)[0] ?? '', chosen: h.tel === sendTo });
  }
  if (!seen.has(personTel)) out.push({ tel: personTel, label: 'Su celular', sub: maskTel(personTel), name: '', chosen: personTel === sendTo });
  out.sort((x, y) => Number(y.chosen) - Number(x.chosen));
  return out.slice(0, 3);
}

export function svgToPng(svg: string, width = 1080, height = 1350): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      c.getContext('2d')!.drawImage(img, 0, 0, width, height);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png');
    };
    img.onerror = () => reject(new Error('image'));
    img.src = svgDataUrl(svg);
  });
}

/** A small PNG (720x900) as a data URL, light enough to store behind a link. */
export async function svgToSmallDataUrl(svg: string): Promise<string> {
  const blob = await svgToPng(svg, 720, 900);
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error('read'));
    r.readAsDataURL(blob);
  });
}

/** Share sheet with the picture (iPhone: needs a tap, https and a recent iOS). Returns false when unavailable. */
export async function shareSvg(svg: string, filename: string, msg: string): Promise<boolean> {
  const file = new File([await svgToPng(svg)], filename, { type: 'image/png' });
  if (!navigator.canShare || !navigator.canShare({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], text: msg });
  } catch {
    /* cancelled by the person */
  }
  return true;
}

export async function saveSvg(svg: string, filename: string): Promise<void> {
  const url = URL.createObjectURL(await svgToPng(svg));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const shareImage = (d: ReceiptData) => shareSvg(receiptSvg(d), `comprobante-${d.folio}.png`, receiptText(d));
