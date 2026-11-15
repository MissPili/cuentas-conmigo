import { useState, type ReactNode } from 'react';
import {
  type Dest,
  type ReceiptData,
  receiptSvg,
  svgDataUrl,
  receiptText,
  whatsappUrl,
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
      setNote(ok ? '' : 'Este celular no permite compartir la imagen. Usa Guardar imagen y mándala por WhatsApp.');
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
      <Choice primary icon={<IcoPhone />} label="Compartir imagen" hint="Eliges WhatsApp y a quién" onClick={() => { void share(); }} />
      {dests.slice(0, 2).map((d) => (
        <a key={d.tel} className="choice" href={whatsappUrl(d.tel, msg)} target="_blank" rel="noopener noreferrer">
          <IcoPhone />
          <span className="choice-text">
            <span className="choice-label">WhatsApp a {d.label.toLowerCase()}</span>
            <small>{d.sub}. Solo abre el mensaje, sin la imagen.</small>
          </span>
        </a>
      ))}
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
