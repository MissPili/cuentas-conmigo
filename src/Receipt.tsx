import { useState } from 'react';
import {
  type ReceiptData,
  receiptSvg,
  svgDataUrl,
  receiptText,
  whatsappUrl,
  shareImage,
  svgToPng,
} from './comprobante';
import { Alert, Choice, IcoPhone } from './ui';

export default function Receipt({ data, tel }: { data: ReceiptData; tel: string }) {
  const [note, setNote] = useState('');
  const svg = receiptSvg(data);

  const share = async () => {
    try {
      const ok = await shareImage(data);
      if (!ok) setNote('Este celular no permite compartir la imagen. Usa Guardar imagen y mándala por WhatsApp.');
    } catch {
      setNote('No se pudo compartir. Intenta de nuevo.');
    }
  };

  const save = async () => {
    try {
      const url = URL.createObjectURL(await svgToPng(svg));
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobante-${data.folio}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setNote('No se pudo guardar la imagen. Intenta de nuevo.');
    }
  };

  return (
    <section className="stack">
      <h1>Comprobante</h1>
      <img className="shot" alt={`Comprobante de pago de ${data.payerName} por ${data.concept}`} src={svgDataUrl(svg)} />
      {note ? <Alert>{note}</Alert> : null}
      <a className="choice primary" href={whatsappUrl(tel, receiptText(data))} target="_blank" rel="noopener noreferrer">
        <IcoPhone />
        <span className="choice-text"><span className="choice-label">Enviar por WhatsApp</span></span>
      </a>
      <Choice label="Compartir imagen" onClick={() => { void share(); }} />
      <Choice label="Guardar imagen" onClick={() => { void save(); }} />
    </section>
  );
}
