// Payment receipt: one tall picture (1080x1350) that is easy to read and easy to send.
// Pure functions only, so the screen that shows it can be restyled without touching this.

export interface ReceiptData {
  folio: string;
  payerName: string;
  concept: string;
  amount: number;
  via: 'CASH' | 'CODI';
  recipient: string; // who receives the money
  paidAt: string; // ISO date
}

const INK = '#4E1A6E';
const SOFT = '#5A3E66';
const PAID = '#0F5F28';
const GOLD = '#EDB438';

export const money = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n);

export const viaName = (v: ReceiptData['via']) => (v === 'CASH' ? 'Efectivo' : 'CoDi');

export const folioOf = (chargeId: string) => 'CC-' + chargeId.replace(/-/g, '').slice(0, 6).toUpperCase();

export const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

export function receiptSvg(d: ReceiptData): string {
  const t = (x: number, y: number, size: number, txt: string, o: { w?: number; fill?: string; anchor?: string } = {}) =>
    `<text x="${x}" y="${y}" font-size="${size}"${o.w ? ` font-weight="${o.w}"` : ''}${o.fill ? ` fill="${o.fill}"` : ''}${
      o.anchor ? ` text-anchor="${o.anchor}"` : ''
    }>${esc(txt)}</text>`;

  let s = `<svg viewBox="0 0 1080 1350" width="1080" height="1350" xmlns="http://www.w3.org/2000/svg" font-family="Nunito, Segoe UI, Arial, Helvetica, sans-serif" fill="${INK}">`;
  s += `<rect width="1080" height="1350" fill="#fff"/><rect width="1080" height="230" fill="${PAID}"/><rect y="230" width="1080" height="14" fill="${GOLD}"/>`;
  s += `<circle cx="150" cy="115" r="64" fill="#fff"/><path d="M118 116l24 24 46-52" fill="none" stroke="${PAID}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += t(260, 128, 100, 'PAGADO', { w: 800, fill: '#fff' }) + t(262, 196, 50, viaName(d.via), { w: 700, fill: '#fff' });
  s += t(60, 340, 60, clip(d.payerName, 26), { w: 800 });
  s += t(60, 540, 190, money(d.amount), { w: 800 });
  s += `<rect x="60" y="580" width="960" height="6" fill="${INK}"/>`;
  const rows: [string, string][] = [
    ['Concepto', clip(d.concept, 30)],
    ['Recibe', clip(d.via === 'CASH' ? 'En mano · ' + d.recipient : d.recipient, 30)],
    ['Cómo pagó', viaName(d.via)],
    ['Fecha', dateLabel(d.paidAt)],
    ['Folio', d.folio],
  ];
  rows.forEach((r, i) => {
    const y = 670 + i * 90;
    s += t(60, y, 44, r[0], { fill: SOFT }) + t(1020, y, 52, r[1], { w: 800, anchor: 'end' });
  });
  s += t(540, 1330, 38, 'Comprobante de pago · no es factura', { fill: SOFT, anchor: 'middle' });
  return s + '</svg>';
}

export const svgDataUrl = (svg: string) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

export function receiptText(d: ReceiptData) {
  return `Hola. Comprobante de pago de ${d.payerName}: ${money(d.amount)} · ${d.concept}. Pagó con ${viaName(d.via)} el ${dateLabel(d.paidAt)}. Folio ${d.folio}.`;
}

// Option A: WhatsApp opens with the message ready; the person still taps Send. We cannot know it arrived.
export const whatsappUrl = (tel10: string, text: string) => `https://wa.me/52${tel10}?text=${encodeURIComponent(text)}`;

export function svgToPng(svg: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 1080;
      c.height = 1350;
      c.getContext('2d')!.drawImage(img, 0, 0);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png');
    };
    img.onerror = () => reject(new Error('image'));
    img.src = svgDataUrl(svg);
  });
}

// Share sheet with the picture (iPhone: needs a tap, https and a recent iOS). Returns false when unavailable.
export async function shareImage(d: ReceiptData): Promise<boolean> {
  const file = new File([await svgToPng(receiptSvg(d))], `comprobante-${d.folio}.png`, { type: 'image/png' });
  if (!navigator.canShare || !navigator.canShare({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], text: receiptText(d) });
  } catch {
    /* cancelled by the person */
  }
  return true;
}
