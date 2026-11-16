import { useEffect, useState, type ReactNode } from 'react';
import {
  type Dest,
  type ReceiptData,
  money,
  receiptSvg,
  receiptText,
  saveSvg,
  shareSvg,
  svgDataUrl,
  svgToSmallDataUrl,
  whatsappUrl,
} from './comprobante';
import { Alert, Choice, IcoPhone } from './ui';

type ShareLink = {
  kind: 'PAY' | 'RECEIPT';
  title: string;
  description: string;
  /** Stores the picture behind a link and returns the link. */
  onShareLink: (input: { kind: 'PAY' | 'RECEIPT'; title: string; description: string; image: string }) => Promise<string>;
};

/**
 * A picture plus the ways to send it. The main way opens the WhatsApp chat OF THE CHOSEN NUMBER (no need to have it
 * in the contacts) with the message and a link: the link shows the picture, and WhatsApp previews it in the chat.
 * An image itself cannot travel inside a wa.me link, hence the link. The phone's share sheet and saving stay as backups.
 */
export function PictureSend({
  title, alt, svg, filename, msg, dests, link, children,
}: {
  title: string;
  alt: string;
  svg: string;
  filename: string;
  msg: string;
  dests: Dest[];
  link?: ShareLink;
  children?: ReactNode;
}) {
  const [note, setNote] = useState('');
  const [url, setUrl] = useState('');
  const [state, setState] = useState<'idle' | 'preparing' | 'ready' | 'failed'>(link ? 'preparing' : 'idle');

  // Prepare the link as soon as the picture is on screen, so sending is ONE tap (a tap that opens WhatsApp).
  useEffect(() => {
    if (!link) return;
    let alive = true;
    setState('preparing');
    (async () => {
      try {
        const image = await svgToSmallDataUrl(svg);
        const made = await link.onShareLink({ kind: link.kind, title: link.title, description: link.description, image });
        if (alive) { setUrl(made); setState('ready'); }
      } catch {
        if (alive) setState('failed');
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg]);

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

  const text = url ? `${msg}\n\n${url}` : msg;

  return (
    <section className="stack">
      <h1>{title}</h1>
      <img className="shot" alt={alt} src={svgDataUrl(svg)} />
      {note ? <Alert>{note}</Alert> : null}
      {link && state === 'failed' ? <Alert>No se pudo preparar el enlace. Usa Compartir imagen o Guardar imagen.</Alert> : null}
      {link && state === 'preparing' ? <p className="lead" role="status">Preparando el envío…</p> : null}
      {link && state === 'ready'
        ? dests.slice(0, 2).map((d, i) => (
          <a key={d.tel} className={i === 0 ? 'choice primary' : 'choice'} href={whatsappUrl(d.tel, text)} target="_blank" rel="noopener noreferrer">
            {i === 0 ? <span className="ico-emoji" aria-hidden="true">💬</span> : <IcoPhone />}
            <span className="choice-text">
              <span className="choice-label">WhatsApp a {d.label === 'Su celular' ? 'su celular' : d.label}</span>
              <small>{d.sub}{d.chosen ? ' · el que pidió' : ''}. Abre su chat sin guardar el contacto.</small>
            </span>
          </a>
        ))
        : null}
      <Choice primary={!link} mark={!link ? '💬' : undefined} icon={<IcoPhone />} label="Compartir imagen" hint="Eliges el contacto en WhatsApp" onClick={() => { void share(); }} />
      <Choice label="Guardar imagen" hint="Para mandarla después" onClick={() => { void save(); }} />
      {children}
    </section>
  );
}

export default function Receipt({
  data, dests, onShareLink,
}: {
  data: ReceiptData;
  dests: Dest[];
  onShareLink: ShareLink['onShareLink'];
}) {
  return (
    <PictureSend
      title="Comprobante"
      alt={`Comprobante de pago de ${data.payerName} por ${data.concept}`}
      svg={receiptSvg(data)}
      filename={`comprobante-${data.folio}.png`}
      msg={receiptText(data)}
      dests={dests}
      link={{
        kind: 'RECEIPT',
        title: `Comprobante de pago · ${data.projectName}`,
        description: `${data.payerName} pagó ${money(data.amount)} por ${data.concept}. Folio ${data.folio}.`,
        onShareLink,
      }}
    />
  );
}
