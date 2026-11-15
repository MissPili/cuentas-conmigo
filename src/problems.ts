/** What the person sees when something fails: plain words, plus the technical text (if any) for whoever helps with the app. */
export type Problem = { title: string; detail: string; tech?: string };

/** Which part of the app failed; changes the advice ("use the QR code" only makes sense for charges). */
export type Topic = 'charge' | 'account';

const CONNECTION = /network|failed to fetch|load failed|timeout|timed out/i;

/**
 * Turns a thrown error message into something readable.
 * Backend errors arrive as "Pey 500: <type>: <message>" (see amplify/functions/pey/handler.ts) or as one of its short messages.
 */
export function explainProblem(raw: string, topic: Topic = 'charge'): Problem {
  const text = (raw || '').trim();
  const tech = /\s/.test(text) ? text.slice(0, 200) : undefined; // one-word messages are internal markers, not useful

  if (/not active yet/i.test(text)) {
    return { title: 'La cuenta todavía no está lista', detail: 'Pey aún no la activa. Mientras tanto, anota el pago en efectivo.' };
  }
  if (/already paid/i.test(text)) {
    return { title: 'Este cobro ya está pagado', detail: 'No hace falta cobrarlo otra vez.' };
  }
  if (/(charge|account) not found/i.test(text)) {
    return { title: 'No encontramos ese registro', detail: 'Vuelve al inicio y elígelo otra vez.' };
  }
  if (/not signed in|not ?authorized|unauthorized/i.test(text)) {
    return { title: 'Tu sesión terminó', detail: 'Sal de la app y vuelve a entrar.' };
  }

  const pey = /Pey (\d{3})/.exec(text);
  if (pey) {
    const code = Number(pey[1]);
    if (code === 401 || code === 403) {
      return { title: 'La llave de Pey no funciona', detail: 'Avísale a quien configuró la app.', tech };
    }
    if (code === 503) {
      return { title: 'Pey no está disponible ahora', detail: topic === 'charge' ? 'Espera unos minutos, o muestra el código para pagar.' : 'Espera unos minutos e inténtalo de nuevo.', tech };
    }
    return topic === 'charge'
      ? { title: 'Pey no pudo pedir el pago', detail: 'Puede que ese celular o su banco no reciban solicitudes. Prueba con el código para pagar.', tech }
      : { title: 'Pey no aceptó la cuenta', detail: 'Revisa que el nombre y la CLABE estén bien escritos.', tech };
  }

  if (CONNECTION.test(text) || text === '') {
    return { title: 'No se pudo completar', detail: 'Revisa tu conexión e inténtalo de nuevo.' };
  }
  return { title: 'No se pudo completar', detail: 'Inténtalo de nuevo. Si sigue igual, avísale a quien te ayuda con la app.', tech };
}
