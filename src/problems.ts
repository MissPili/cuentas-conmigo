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
  // The server could not read its own data (not the person's session): keep the reason visible.
  if (/^data error/i.test(text)) {
    return { title: 'No se pudieron leer los datos', detail: 'Inténtalo de nuevo. Si sigue igual, avísale a quien te ayuda con la app.', tech };
  }
  if (/not signed in|not ?authorized|unauthorized/i.test(text)) {
    return { title: 'Tu sesión terminó', detail: 'Sal de la app y vuelve a entrar.' };
  }

  // Pey's own answers come first: "Pey 404: ... Bank account not found" must not be taken for our own "Account not found".
  const pey = /Pey (\d{3})/.exec(text);
  if (pey) {
    const code = Number(pey[1]);
    if (code === 401 || code === 403) {
      return { title: 'La llave de Pey no funciona', detail: 'Avísale a quien configuró la app.', tech };
    }
    if (code === 503) {
      return { title: 'Pey no está disponible ahora', detail: topic === 'charge' ? 'Espera unos minutos, o muestra el código para pagar.' : 'Espera unos minutos e inténtalo de nuevo.', tech };
    }
    // The account was registered with another Pey key (the key was changed): this key does not know it.
    if (/bank.?account|cuenta/i.test(text) && (code === 404 || /not found|does not exist|no existe/i.test(text))) {
      return { title: 'Pey no encuentra la cuenta que recibe', detail: 'Si cambiaste la llave de Pey, entra a la cuenta y regístrala otra vez.', tech };
    }
    return topic === 'charge'
      ? { title: 'Pey no pudo pedir el pago', detail: 'Puede que ese celular o su banco no reciban solicitudes. Prueba con el código para pagar.', tech }
      : { title: 'Pey no aceptó la cuenta', detail: 'Revisa que el nombre y la CLABE estén bien escritos.', tech };
  }

  // Our own server's answer: the charge or account is not there, or belongs to someone else.
  if (/(charge|account) not found/i.test(text)) {
    return { title: 'No encontramos ese registro', detail: 'Vuelve al inicio y elígelo otra vez.', tech };
  }

  if (CONNECTION.test(text) || text === '') {
    return { title: 'No se pudo completar', detail: 'Revisa tu conexión e inténtalo de nuevo.' };
  }
  return { title: 'No se pudo completar', detail: 'Inténtalo de nuevo. Si sigue igual, avísale a quien te ayuda con la app.', tech };
}
