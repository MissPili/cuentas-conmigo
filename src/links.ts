// Links that are sent to other people: the short link of a picture (code to pay, receipt) and the signup link.
// Pure helpers (no React, no browser globals at import time) so the Lambda and the tests can use them too.

/** Marker the share page puts in its answer to /p/probe, so the app can tell the short link is wired up. */
export const SHARE_MARK = 'cuentas-share';

/** A token is base64url: letters, digits, "-" and "_". 22 characters hold 128 bits. */
const TOKEN = /^[A-Za-z0-9_-]{20,100}$/;

/**
 * Finds the token of a share request. Three shapes arrive:
 *  - /<token> and /<token>.png  (behind the app's own domain: /p/<*> is proxied to the function)
 *  - /p/<token> and /p/<token>.png  (in case the proxy keeps the prefix)
 *  - /?t=<token> and /?t=<token>&img=1  (the long link the first version sent; still valid)
 */
export function parseShareRequest(rawPath: string, query: Record<string, string | undefined> = {}): { token: string; image: boolean } | null {
  const parts = (rawPath || '/').split('/').filter(Boolean);
  if (parts[0] === 'p') parts.shift();
  if (parts.length > 1) return null;
  const last = parts[0] ?? '';
  if (last) {
    const image = last.endsWith('.png');
    const token = image ? last.slice(0, -4) : last;
    return TOKEN.test(token) ? { token, image } : null;
  }
  const t = query.t ?? '';
  return TOKEN.test(t) ? { token: t, image: query.img === '1' } : null;
}

/** True when the request is the app's check that the short link works. */
export const isProbe = (rawPath: string) => /^\/(p\/)?probe\/?$/.test(rawPath || '');

/** The link to send: short (on the app's own domain) when it works, else the function's own address. */
export function shareLink(opts: { short: boolean; origin: string; shareUrl: string; token: string }): string {
  return opts.short ? `${opts.origin}/p/${opts.token}` : `${opts.shareUrl}?t=${opts.token}`;
}

let probed: Promise<boolean> | undefined;

/**
 * Asks the app's own domain whether /p/... reaches the share page. Without the rewrite rule in Amplify the answer is
 * the app's 404 (no marker), so the long link keeps working. Checked once per visit.
 */
export function shortLinksWork(origin: string, doFetch: typeof fetch = fetch, fresh = false): Promise<boolean> {
  if (!probed || fresh) {
    probed = (async () => {
      try {
        const r = await doFetch(`${origin}/p/probe`, { cache: 'no-store' });
        return (await r.text()).includes(SHARE_MARK);
      } catch {
        return false;
      }
    })();
  }
  return probed;
}

/** Message that goes with the signup link (WhatsApp, share sheet, copy). */
export const signupMessage = (projectName: string) =>
  `Hola. Te comparto el enlace para inscribirte${projectName ? ` a ${projectName}` : ''}. Se hace desde tu celular en unos minutos.`;

/** WhatsApp without a number: it opens the list of chats so the collector picks who gets it. Nothing is sent by itself. */
export const whatsappShareUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
