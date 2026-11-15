import type { LambdaFunctionURLHandler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/share';
import type { Schema } from '../../data/resource';

// Public page for a payment code or a receipt that was sent by WhatsApp as a link.
// The link carries a long random token; the page shows the picture and, in WhatsApp, a preview of it.
// It never reveals the account that receives the money: only what is already printed in the picture.

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const html = (statusCode: number, body: string) => ({
  statusCode,
  headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  body,
});

const STYLE =
  'body{margin:0;padding:16px;background:#F7F3FA;color:#4E1A6E;font:20px/1.5 system-ui,Segoe UI,Arial,sans-serif}' +
  'main{max-width:560px;margin:0 auto;display:grid;gap:16px}h1{margin:0;font-size:28px;line-height:1.3}' +
  'p{margin:0}img{width:100%;height:auto;border:4px solid #4E1A6E;border-radius:20px;background:#fff}.soft{color:#4A3358}';

const gone = () =>
  html(
    404,
    `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Enlace vencido</title><style>${STYLE}</style></head><body><main><h1>Este enlace ya no sirve</h1><p class="soft">Pídele a quien te lo mandó que te lo envíe otra vez.</p></main></body></html>`,
  );

export const handler: LambdaFunctionURLHandler = async (event) => {
  const token = event.queryStringParameters?.t ?? '';
  if (event.requestContext.http.method !== 'GET' || token.length < 20 || token.length > 100) return gone();

  try {
    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
    Amplify.configure(resourceConfig, libraryOptions);
    const client = generateClient<Schema>({ authMode: 'iam' });
    const found = await client.models.Share.listShareByToken({ token });
    const row = found.data?.[0];
    if (!row || (row.expiresAt && row.expiresAt < new Date().toISOString())) return gone();

    if (event.queryStringParameters?.img === '1') {
      return {
        statusCode: 200,
        headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600', 'x-robots-tag': 'noindex' },
        isBase64Encoded: true,
        body: row.image.replace(/^data:image\/png;base64,/, ''),
      };
    }

    const self = `https://${event.requestContext.domainName}${event.rawPath}`;
    const image = `${self}?t=${encodeURIComponent(token)}&img=1`;
    return html(
      200,
      `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">` +
        `<title>${esc(row.title)}</title>` +
        `<meta property="og:type" content="website"><meta property="og:title" content="${esc(row.title)}"><meta property="og:description" content="${esc(row.description)}">` +
        `<meta property="og:image" content="${esc(image)}"><meta property="og:image:width" content="720"><meta property="og:image:height" content="900">` +
        `<meta name="twitter:card" content="summary_large_image"><style>${STYLE}</style></head>` +
        `<body><main><h1>${esc(row.title)}</h1><img src="${esc(image)}" alt="${esc(row.title)}"><p>${esc(row.description)}</p></main></body></html>`,
    );
  } catch (e) {
    console.error('share failed', (e as Error).message.slice(0, 200));
    return gone();
  }
};
