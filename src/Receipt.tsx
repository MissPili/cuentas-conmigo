import { useState, type ReactNode } from 'react';
import {
  type Dest,
  type ReceiptData,
  receiptSvg,
  svgDataUrl,
  receiptText,
  shareSvg,
  saveSvg,
} from './comprobante';
import { Alert, Choice, IcoPhone } from './ui';

/** A picture plus the ways to send it: WhatsApp to a number, the phone's share sheet, or save it. */
export function PictureSend({
  title, alt, svg, filename, msg, dests, children,
}: {
  title: string;
  alt: string;
  svg: string;
  filename: string;
  msg: string;
  dests: Dest[];
  children?: ReactNode;
}) {
  const [note, setNote] = useState('');

  const share = async () => {
    try {
      const ok = await shareSvg(svg, filename, msg);
      setNote(ok ? '' : 'Este celular no permite compartir la imagen. Usa Guardar imagen y mándala desde tu galería en WhatsApp.');
    } catch {
      setNote('No se pudo compartir. Intenta de nuevo.');
    }
  };

  const save = async () => {
    try {
      await saveSvg(svg, filename);
      setNote('');
    } catch {
      setNote('No se pudo guardar la imagen. Intenta de nuevo.');
    }
  };

  return (
    <section className="stack">
      <h1>{title}</h1>
      <img className="shot" alt={alt} src={svgDataUrl(svg)} />
      {note ? <Alert>{note}</Alert> : null}
      {dests.length ? <p className="hint">Elige WhatsApp y después a: {dests.map((d) => `${d.label.toLowerCase()} (${d.sub})`).join(', ')}.</p> : null}
      <Choice primary icon={<IcoPhone />} label="Compartir imagen" hint="Se abre WhatsApp con la imagen" onClick={() => { void share(); }} />
      <Choice label="Guardar imagen" hint="Para mandarla después" onClick={() => { void save(); }} />
      {children}
    </section>
  );
}

export default function Receipt({ data, dests }: { data: ReceiptData; dests: Dest[] }) {
  return (
    <PictureSend
      title="Comprobante"
      alt={`Comprobante de pago de ${data.payerName} por ${data.concept}`}
      svg={receiptSvg(data)}
      filename={`comprobante-${data.folio}.png`}
      msg={receiptText(data)}
      dests={dests}
    />
  );
}
