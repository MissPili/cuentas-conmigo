import type { LambdaFunctionURLHandler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/share';
import type { Schema } from '../../data/resource';
import { SHARE_MARK, isProbe, parseShareRequest } from '../../../src/links';

// Public page for a payment code or a receipt that was sent by WhatsApp as a link.
// The link carries a long random token; the page shows the picture and, in WhatsApp, a preview of it.
// It never reveals the account that receives the money: only what is already printed in the picture.
// It is reached on the app's own domain (/p/<token>, proxied by an Amplify rewrite) or on the function's own address.

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const html = (statusCode: number, body: string) => ({
  statusCode,
  headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  body,
});

const STYLE =
  'body{margin:0;padding:16px;background:#F7F3FA;color:#4E1A6E;font:20px/1.5 system-ui,Segoe UI,Arial,sans-serif}' +
  'main{max-width:560px;margin:0 auto;display:grid;gap:16px}h1{margin:0;font-size:28px;line-height:1.3}h2{margin:0;font-size:24px;line-height:1.3}' +
  'p{margin:0}img{width:100%;height:auto;border:4px solid #4E1A6E;border-radius:20px;background:#fff}.soft{color:#4A3358}' +
  '.help{display:grid;gap:8px;padding:16px;border:4px solid #4E1A6E;border-radius:20px;background:#fff}' +
  '.help ol{margin:0;padding-left:1.4em;display:grid;gap:12px}';

const MARK = `<meta name="${SHARE_MARK}" content="1">`;

const gone = () =>
  html(
    404,
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">${MARK}<title>Enlace vencido</title><style>${STYLE}</style></head><body><main><h1>Este enlace ya no sirve</h1><p class="soft">Pídele a quien te lo mandó que te lo envíe otra vez.</p></main></body></html>`,
  );

/** The code to pay is a picture scanned from another screen; this says what to do when the link was opened on the same phone. */
const SAME_PHONE_HELP =
  '<section class="help"><h2>¿Lo abriste en el mismo celular con el que vas a pagar?</h2>' +
  '<p>Un celular no puede escanear su propia pantalla. Tienes tres opciones:</p><ol>' +
  '<li><strong>Ábrelo en otra pantalla.</strong> Abre esta liga en otro celular, una tableta o una computadora, y escanea el código con tu celular.</li>' +
  '<li><strong>Guárdalo en tus fotos.</strong> Mantén el dedo sobre el código y elige guardar la imagen. Luego, en la app de tu banco, elige CoDi y busca usar una imagen de tu galería, si tu banco lo permite.</li>' +
  '<li><strong>Pide que te lo manden a tu banco.</strong> Avisa a quien te cobra para que te mande la solicitud de pago directo a tu celular.</li></ol></section>';

// Only the app's own address may be used as the public base of the picture (written by the signed-in collector).
const BASE = /^https:\/\/[a-z0-9.-]+(:\d{2,5})?$/i;

export const handler: LambdaFunctionURLHandler = async (event) => {
  const method = event.requestContext.http.method;
  if (method !== 'GET' && method !== 'HEAD') return gone();

  // The app asks this to know the short link is wired up (answers 200 so no proxy rewrites the answer).
  if (isProbe(event.rawPath)) {
    return html(200, `<!doctype html><html lang="es"><head>${MARK}</head><body>ok</body></html>`);
  }

  const asked = parseShareRequest(event.rawPath, event.queryStringParameters ?? {});
  if (!asked) return gone();
  const { token } = asked;

  try {
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
    Amplify.configure(resourceConfig, libraryOptions);
    const client = generateClient<Schema>({ authMode: 'iam' });
    const found = await client.models.Share.listShareByToken({ token });
    const row = found.data?.[0];
    if (!row || (row.expiresAt && row.expiresAt < new Date().toISOString())) return gone();

    if (asked.image) {
      return {
        statusCode: 200,
        headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600', 'x-robots-tag': 'noindex' },
        isBase64Encoded: true,
        body: row.image.replace(/^data:image\/png;base64,/, ''),
      };
    }

    // On the app's domain the picture is /p/<token>.png; on the function's own address it is /<token>.png.
    const image = row.base && BASE.test(row.base)
      ? `${row.base}/p/${token}.png`
      : `https://${event.requestContext.domainName}/${token}.png`;
    return html(
      200,
      `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">` +
        `<title>${esc(row.title)}</title>` +
        `<meta property="og:type" content="website"><meta property="og:title" content="${esc(row.title)}"><meta property="og:description" content="${esc(row.description)}">` +
        `<meta property="og:image" content="${esc(image)}"><meta property="og:image:width" content="720"><meta property="og:image:height" content="900">` +
        `<meta name="twitter:card" content="summary_large_image"><style>${STYLE}</style></head>` +
        `<body><main><h1>${esc(row.title)}</h1><img src="${esc(image)}" alt="${esc(row.title)}"><p>${esc(row.description)}</p>${row.kind === 'PAY' ? SAME_PHONE_HELP : ''}</main></body></html>`,
    );
  } catch (e) {
    console.error('share failed', (e as Error).message.slice(0, 200));
    return gone();
  }
};
