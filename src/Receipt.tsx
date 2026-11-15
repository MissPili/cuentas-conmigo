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

// Shows the receipt picture and the ways to send it. Styling is deliberately minimal.
export default function Receipt({ data, tel, onClose }: { data: ReceiptData; tel: string; onClose: () => void }) {
  const [note, setNote] = useState('');
  const svg = receiptSvg(data);

  const share = async () => {
    try {
      const ok = await shareImage(data);
      if (!ok) setNote('Este teléfono no permite compartir la imagen. Usa "Guardar imagen" y mándala por WhatsApp.');
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
    <div className="card">
      <img alt={`Comprobante de pago de ${data.payerName}`} src={svgDataUrl(svg)} style={{ width: '100%', height: 'auto' }} />
      {note && <p className="msg" role="status">{note}</p>}
      <a className="btn" href={whatsappUrl(tel, receiptText(data))} target="_blank" rel="noopener noreferrer">
        Enviar por WhatsApp a {data.payerName}
      </a>
      <button onClick={share}>Compartir imagen</button>
      <button className="alt" onClick={save}>Guardar imagen</button>
      <button className="alt" onClick={onClose}>Cerrar</button>
    </div>
  );
}
