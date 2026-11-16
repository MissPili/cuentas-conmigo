// Voz guía. Un texto por pantalla, en español de México, de tú a tú.
// Para cambiar lo que se escucha, edita solo este archivo.
// En la pantalla, el atributo data-guion indica cuál texto usar. Si hay uno dentro de otro, gana el de adentro.

type Trozo = { querySelector(sel: string): { textContent: string | null } | null };

function limpio(t: string | null | undefined): string {
  return (t || '').replace(/\s+/g, ' ').trim();
}

function leer(el: Trozo, sel: string): string {
  return limpio(el.querySelector(sel)?.textContent);
}

function nombre(el: Trozo): string {
  return leer(el, '.who-line span:not(.avatar)') || 'esta persona';
}

function monto(el: Trozo): string {
  return leer(el, '.amount');
}

type Guion = string | ((el: Trozo) => string);

export const GUION: Record<string, Guion> = {
  cargando: 'Un momento. Estamos abriendo tus cobros.',
  error: 'Algo no salió bien. Lee el recuadro de arriba. Puedes tocar Intentar de nuevo, o Volver para cobrar de otra forma.',
  bienvenida: 'Bienvenida. Para empezar tu taller, toca Crear mi primer proyecto.',
  proyectos: 'Estos son tus talleres. Toca el nombre del que quieres abrir.',
  'proyecto-nuevo': 'Escribe el nombre de tu taller. Después toca Crear.',

  inicio: (el) => el.querySelector('.choice.attention')
    ? 'Este es tu taller. Para cobrar, toca Cobrar. Si hay gente esperando, toca Aprobar inscripciones.'
    : 'Este es tu taller. Aquí ves cuánto llevas cobrado este mes. Para cobrar, toca el botón que dice Cobrar.',
  'inicio-cuenta': 'Todavía falta la cuenta donde llega el dinero. Toca Agregar cuenta.',
  'inicio-persona': 'Ya puedes agregar a tu primera persona. Toca Agregar persona.',

  quien: 'Elige a quién le vas a cobrar. Toca un nombre. Arriba están quienes todavía deben.',
  cobros: (el) => `Estos son los cobros de ${nombre(el)} en este mes. Toca el botón morado para cobrar lo de siempre, o elige un cobro de la lista.`,
  cobrar: (el) => `Ahora puedes elegir cómo cobra ${nombre(el)}${monto(el) ? `, ${monto(el)}` : ''}. Si tiene CoDi en su celular, toca Mostrar código para pagar. Si ya te dio el dinero en la mano, toca Ya lo recibí en efectivo.`,
  'cobrar-efectivo': (el) => `Por ahora ${nombre(el)} solo puede pagar en efectivo. Si ya tienes el dinero, toca Ya lo recibí en efectivo.`,
  confirmar: 'Cuenta el dinero antes de seguir. Si ya lo recibiste, toca Sí, ya lo recibí.',
  esperando: (el) => `Estamos esperando a que ${nombre(el)} pague. Cuando pague, aquí se marca solo. Si quieres saber ya, toca Revisar si ya pagó.`,
  pagado: (el) => `${nombre(el)} ya pagó. Si quieres avisarle, toca Enviar comprobante. Para cobrar a otra persona, toca Siguiente persona.`,
  codigo: (el) => `Enséñale este código a ${nombre(el)} para que lo escanee con su banco. Cuando pague, aquí se marca solo. Si se lo quieres mandar, toca Mandar el código por WhatsApp.`,
  mandar: 'Elige a quién le mandas el código por WhatsApp. Toca el primer botón, el que tiene el nombre.',
  comprobante: 'Elige a quién le mandas el comprobante por WhatsApp. Toca el primer botón.',
  'pedir-a': 'Elige a quién le llega el aviso de pago en el celular. Toca un nombre.',

  personas: 'Esta es tu lista de personas. Toca un nombre para ver sus datos, o toca Agregar persona.',
  persona: (el) => `Estos son los datos de ${nombre(el)}. Para cobrarle, toca Cobrarle. Para corregir algo, elige la otra opción.`,
  'persona-corregir': 'Corrige el nombre o el WhatsApp. Cuando esté bien, toca Guardar.',
  'persona-ayuda': 'Aquí ves quién le ayuda a pagar. Completa los datos y toca Guardar.',
  'persona-nueva': 'Vas a anotar a una persona nueva. Escribe su nombre y su WhatsApp, y toca Siguiente.',
  'persona-revisar': 'Revisa que los datos estén bien. Si sí, toca Guardar persona.',

  cuentas: 'Estas son las cuentas donde llega el dinero. Toca una para verla, o toca Agregar cuenta.',
  cuenta: (el) => `Esta es la cuenta ${leer(el, 'h1') || ''}. Lee el recuadro de color para saber si ya sirve. El botón morado es lo que puedes hacer ahora.`.replace('  ', ' '),
  'cuenta-otra': 'Esto la manda otra vez al banco. Hazlo solo si cambiaste la llave. Si sí, toca Sí, registrarla otra vez.',
  'cuenta-borrar': 'Esto quita la cuenta de esta app. Si estás segura, toca Sí, eliminar. Si no, toca No, volver.',
  'cuenta-nueva': 'Escribe cómo le dices a la cuenta y los 18 números. Después toca Guardar.',
  'falta-cuenta': 'Primero necesitas la cuenta donde llega el dinero. Toca Agregar cuenta.',
  'cobro-extra': (el) => `Este cobro de ${nombre(el)} es para algo especial, no el de siempre. Escribe para qué es y cuánto, y toca Crear cobro.`,
  'ya-no-esta': 'Ese dato ya no está en la lista. Toca Volver al inicio.',

  mas: 'Aquí hay más cosas de tu taller. Para ver quién pagó, toca Reporte del mes.',
  'mas-2': 'Desde aquí puedes cambiar la letra, la voz y los colores. También ves la cuenta y los llaveros.',
  'mas-3': 'Desde aquí cambias de taller o sales. La zona de peligro borra datos: no la toques si no te ayudan.',
  reporte: 'Este es el reporte del mes: cuánto esperabas, cuánto llegó y cuánto falta. Si lo quieres guardar, toca Guardar como hoja de cálculo.',
  'ver-mejor': 'Aquí prendes o apagas la voz, la letra grande, los colores fuertes y el sonido. Toca el renglón que quieras cambiar.',

  'peligro-1': 'Cuidado. Esto borra a todas las personas y todos los cobros, y no se puede deshacer. Toca Entiendo solo si estás segura.',
  'peligro-2': 'Para seguir, escribe la palabra BORRAR tal como se ve. Luego toca Mandar código.',
  'peligro-3': 'Te llegó un código al correo. Escríbelo y toca Borrar solo si de verdad quieres borrar. Si no, toca No borrar nada.',

  'lugares-off': 'Aquí puedes poner cuántos lugares tiene el taller y dejar que la gente se anote con un código. Toca Activar lugares.',
  lugares: 'Aquí ves cuántos lugares hay y quién espera tu respuesta. Toca el botón morado para seguir.',
  'lugares-lista': 'Esta es la lista de lugares. Toca un nombre para ver a esa persona.',
  lugar: (el) => `Esta es la ficha de ${nombre(el)}. El recuadro de color dice cómo está. El botón morado es lo que puedes hacer ahora.`,
  'lugar-no': 'Esa persona ya no está en la lista. Toca Volver a lugares.',
  'inscribir-codigo': 'Este código sirve para que la gente se anote sola. Tú apruebas antes de cobrar. Para mandarlo, toca Mandar el enlace por WhatsApp.',
  'lugares-ajustes': 'Aquí pones el nombre del taller, cuántos lugares hay y qué se cobra. Cuando termines, toca Guardar.',
  'lugares-mes': 'Este cobro es de cada mes. Elige desde qué mes en la lista.',

  llaveros: 'Aquí están las imágenes para imprimir los llaveros. Toca Ver las imágenes para verlas una por una.',
  'llaveros-lista': 'Estas son las personas activas y su llavero. Toca un nombre para ver el suyo.',
  llavero: (el) => `Esta es la imagen y el llavero de ${nombre(el)}. El recuadro de color dice si está activo. El botón morado es el siguiente paso.`,
  'llavero-nuevo': 'Un código nuevo deja de servir el llavero viejo. Hazlo solo si se perdió. Si sí, toca Sí, hacer un código nuevo.',
  'llavero-ayuda': 'Estas son las instrucciones para grabar el llavero. Léelas con calma, de arriba hacia abajo. No bloquees el chip hasta probarlo.',
  'llavero-toque': 'Este llavero no abre un cobro. Lee el recuadro. Para volver, toca Ir al inicio.',

  'inscripcion-abre': 'Un momento. Estamos abriendo la inscripción.',
  'inscripcion-cerrada': 'Por ahora no hay inscripciones. Pregunta a quien da el taller.',
  'inscripcion-luego': 'Hubo muchos intentos. Espera un rato y vuelve a probar.',
  'inscripcion-lista': 'Ya quedó tu inscripción. Quien da el taller la va a revisar. Todavía no te cobran.',
  'inscripcion-error': 'No se pudo anotar. Revisa tus datos y toca Intentar de nuevo.',
  'inscripcion-nombre': 'Escribe tu nombre completo. Después toca Siguiente.',
  'inscripcion-whats': 'Escribe tu WhatsApp, de 10 números. También elige si pagas tú o te ayuda un familiar. Luego toca Siguiente.',
  'inscripcion-revisar': 'Revisa que tu nombre y tu WhatsApp estén bien. Marca la casilla si hace falta, y toca Enviar inscripción.',

  imagen: 'Elige cómo se va a reconocer a la persona. Puedes tocar Elegir un dibujo o Usar su foto.',
  'imagen-tu': 'Elige cómo te van a reconocer. Puedes tocar Elegir un dibujo o Usar mi foto.',
  dibujo: 'Toca el dibujo que quieres. Si no te gusta ninguno, toca Ver otros.',
  'dibujo-tu': 'Toca el dibujo que más te guste. Si no te gusta ninguno, toca Ver otros.',
  foto: 'Si la persona está de acuerdo, toca Tomar su foto. Sin su permiso no se guarda.',
  'foto-tu': 'Si quieres, toca Tomar mi foto. Marca la casilla para dejar que la guarden.',
  pago: 'Elige cómo va a pagar: desde su celular o con ayuda de un familiar. Luego toca Siguiente.',
  'pago-ayuda': 'Escribe el nombre de quien ayuda, qué es de la persona y su WhatsApp. La primera persona es obligatoria.',

  'lista-mes': 'Se abrió la lista de meses. Elige desde qué mes se cobra.',
  'lista-cuenta': 'Se abrió la lista de cuentas. Elige a cuál llega el dinero.',
  'lista-de-quien': 'Se abrió la lista. Elige si la cuenta es de una persona o de un negocio.',
};

const RESPALDO = 'Mira esta pantalla. El botón morado es el que sigue.';

function frase(id: string, el: Trozo): string {
  const g = GUION[id];
  if (!g) return '';
  const text = typeof g === 'function' ? g(el) : g;
  return limpio(text);
}

/** The guide for what is on screen. A later data-guion wins, so a step that just opened speaks instead of the page behind it. Lists are not the page guide. */
export function guionActual(): string {
  const main = document.querySelector('main');
  if (!main) return '';
  const marks = [...main.querySelectorAll('[data-guion]')].filter((el) => !el.matches('select, option, input, textarea'));
  for (let i = marks.length - 1; i >= 0; i--) {
    const el = marks[i];
    if ((el as HTMLElement).hidden || el.closest('[hidden]')) continue;
    const text = frase(el.getAttribute('data-guion') || '', el);
    if (text) return text;
  }
  return RESPALDO;
}

/** What to say when a list is opened. Short, and only after the person taps it. */
export function guionLista(el: Element): string {
  const id = el.getAttribute('data-guion') || '';
  const propio = frase(id, el);
  if (propio) return propio;
  const campo = el.closest('label');
  const name = limpio(campo?.querySelector(':scope > span')?.textContent);
  return name ? `Se abrió la lista ${name}. Elige una.` : 'Se abrió una lista. Elige una.';
}
