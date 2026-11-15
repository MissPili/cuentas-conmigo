# Cuentas conmigo

Cobros y control de cobros sencillos para adultos mayores, con pagos CoDi a través del API de Pey. Proyecto para el Hackatón México 2026.

La app es de pocos pasos, con letra grande y alto contraste, pensada para personas con poca experiencia tecnológica o problemas de visión. La primera usuaria es una tallerista del DIF que cobra una mensualidad a unas 12 personas desde un iPhone. La misma idea sirve para quien organiza una tanda o para una tienda que fía.

**App en vivo:** https://cuentasconmigo.misspili.com.mx/ (pide crear una cuenta con correo).

## Estado

| Parte | Estado |
| --- | --- |
| Prototipo completo del front (modo sencillo y capa avanzada) | Hecho, en `prototype/` |
| App real: Vite + React + TypeScript | En marcha, en `src/` |
| Servidor en AWS Amplify Gen 2 (acceso, datos, funciones) | Desplegado en us-east-2 |
| Registro de la cuenta que recibe en Pey | Funciona |
| Cobro por **código QR de CoDi** | Funciona: un pago real se marcó como Pagado en la app |
| Cobro por solicitud CoDi al celular | Se crea en Pey, pero la notificación no llega a todos los bancos; por eso el QR es la vía principal |
| Aviso de pago de Pey (webhook firmado) | Registrado y funcionando |
| Revisar si ya pagó (consulta a Pey) | Hecho, por si un aviso se pierde |
| Mandar el código QR como imagen a quien ayuda a pagar | Hecho (menú de compartir del celular) |
| Comprobante grande, con nombre del taller e íconos | Hecho (compartir imagen o guardarla) |
| Reporte mensual (por persona, CoDi y efectivo, hoja de cálculo) | Hecho |
| Lugares (cupo), inscripción por QR con aprobación, lista de espera y vencimiento | Hecho |
| Identificador visual: dibujo único o foto con consentimiento | Hecho; falta probarlo desplegado |
| Mensualidad predefinida y cobro rápido tras aprobar | Hecho; falta probarlo desplegado |
| Dar de baja (queda "Nombre (baja)" con sus cobros) | Hecho; falta probarlo desplegado |
| Zona de peligro: borrar personas y cobros con código al correo | Hecho (probado el borrado) |
| Instalable como app (PWA) y fuentes sin internet | Pendiente |

Lo que ya está probado con el servidor real: crear una cuenta, registrarla en Pey, crear un cobro, pagarlo con el QR de CoDi y ver **Pagado** en la app; un aviso con firma falsa se rechaza y repetir el mismo aviso no lo duplica. Lo que no está probado: compartir imágenes desde un iPhone, la inscripción por QR de punta a punta con el servidor desplegado, y personas mayores usando la app. Todavía no están en la app real la tanda (turnos), el fiado ni la instalación como PWA; solo existen en el prototipo.

## Pantallas de la app real

Capturas hechas con el modo de demostración (datos inventados, sin servidor), a 390×844 como un iPhone. Están en el orden en que se usan.

### Cobrar

| | | |
| --- | --- | --- |
| ![Inicio](docs/pantallas/01-inicio.png)<br>**1. Inicio** | ![Quién paga](docs/pantallas/02-quien-paga.png)<br>**2. A quién cobrar** (con su imagen) | ![Cobros de una persona](docs/pantallas/03-cobros-de-una-persona.png)<br>**3. Cobros de una persona** |
| ![Cómo cobrar](docs/pantallas/04-como-cobrar.png)<br>**4. Cómo cobrar** | ![Código QR](docs/pantallas/05-codigo-qr.png)<br>**5. Código QR de CoDi** | ![Mandar el código](docs/pantallas/06-mandar-el-codigo.png)<br>**6. Mandar el código como imagen** |
| ![Esperando el pago](docs/pantallas/07-esperando-el-pago.png)<br>**7. Esperando el pago** | ![Ya pagó](docs/pantallas/08-ya-pago.png)<br>**8. Ya pagó** | ![Comprobante](docs/pantallas/09-comprobante.png)<br>**9. Comprobante** |
| ![Nuevo cobro](docs/pantallas/10-nuevo-cobro.png)<br>**10. Nuevo cobro** | | |

### Personas, cuentas y reporte

| | | |
| --- | --- | --- |
| ![Agregar persona](docs/pantallas/11-agregar-persona.png)<br>**11. Agregar persona** | ![Cuentas que reciben](docs/pantallas/12-cuentas-que-reciben.png)<br>**12. Cuentas que reciben** | ![Cuenta en espera](docs/pantallas/13-cuenta-en-espera-de-pey.png)<br>**13. Cuenta en espera de Pey** |
| ![Más opciones](docs/pantallas/14-mas-opciones.png)<br>**14. Más opciones** | ![Reporte](docs/pantallas/15-reporte-del-mes.png)<br>**15. Reporte del mes** | |

### Lugares e inscripciones (quien cobra)

| | | |
| --- | --- | --- |
| ![Lugares](docs/pantallas/16-lugares.png)<br>**16. Lugares** | ![Ajustes](docs/pantallas/17-ajustes-de-lugares.png)<br>**17. Ajustes: lugares y mensualidad** | ![Código para inscribir](docs/pantallas/18-codigo-para-inscribir.png)<br>**18. Código para inscribir** |
| ![Inscripciones](docs/pantallas/19-inscripciones-por-revisar.png)<br>**19. Inscripciones por revisar** | ![Aprobar](docs/pantallas/20-aprobar-una-inscripcion.png)<br>**20. Aprobar una inscripción** | ![Apartado vencido](docs/pantallas/21-apartado-vencido-y-cobro-rapido.png)<br>**21. Apartado vencido y cobro rápido** |
| ![Dar de baja](docs/pantallas/22-dar-de-baja.png)<br>**22. Dar de baja** | ![Zona de peligro](docs/pantallas/23-zona-de-peligro.png)<br>**23. Zona de peligro** | |

### Inscripción pública (la persona, desde el código QR, sin cuenta)

| | | |
| --- | --- | --- |
| ![Paso 1](docs/pantallas/24-inscripcion-paso-1.png)<br>**24. Paso 1: nombre** | ![Paso 2](docs/pantallas/25-inscripcion-paso-2-imagen.png)<br>**25. Paso 2: su imagen** | ![Elegir dibujo](docs/pantallas/26-inscripcion-elegir-dibujo.png)<br>**26. Elegir un dibujo** |
| ![Paso 3](docs/pantallas/27-inscripcion-paso-3.png)<br>**27. Paso 3: WhatsApp** | ![Paso 4](docs/pantallas/28-inscripcion-paso-4.png)<br>**28. Paso 4: revisar** | ![Enviada](docs/pantallas/29-inscripcion-enviada.png)<br>**29. Inscripción enviada** |

Cada pantalla tiene un solo botón principal, máximo 4 opciones, texto grande y el estado siempre con ícono, palabras y borde (nada se dice solo con color).

## Cómo funciona un cobro

1. Quien cobra registra la **cuenta que recibe** (nombre legal del titular y CLABE). Pey la activa con Banxico en hasta 5 días hábiles; mientras tanto solo se puede cobrar en efectivo.
2. Elige a la persona (se reconoce por su foto o dibujo) y crea el cobro (monto libre y concepto).
3. Cobra por **código QR de CoDi** (la vía principal), por **solicitud CoDi** al celular o en **efectivo**.
4. Si quien paga necesita ayuda, **"Mandar el código por WhatsApp"** arma una imagen con el nombre del taller, quién paga, el monto, el QR grande y tres pasos. Se comparte desde el menú del celular. El mensaje que acompaña dice a quién está ayudando, cuánto y de qué, y pide que le pregunte a esa persona antes de pagar si tiene dudas.
5. Cuando la persona paga, Pey avisa al servidor con un mensaje firmado. El servidor verifica la firma, marca el cobro como **Pagado** una sola vez y la pantalla se actualiza sola. Si un aviso se pierde, **"Revisar si ya pagó"** consulta a Pey.
6. Quien cobra manda el **comprobante** (imagen con **PAGADO**, el nombre del taller, quién pagó, monto, concepto, quién recibió, cómo pagó, fecha y folio, con letra grande e íconos) o lo guarda como imagen.

Cada cobro manda a Pey el `bankAccountId` de su cuenta, así una sola llave de Pey sirve para varios cobradores (por ejemplo el taller y el DIF).

**Sobre WhatsApp:** un enlace `wa.me` solo puede llevar texto, nunca una imagen. Por eso las imágenes se mandan con el menú de compartir del celular (se elige WhatsApp y el contacto) o se guardan para mandarlas desde la galería. Nada se envía solo.

## Lugares e inscripción por QR

1. En **Lugares → Ajustes** quien cobra pone el nombre del taller, cuántos lugares hay, cuántos días se aparta uno (5 por defecto) y, si quiere, la **mensualidad** (monto, nombre del cobro y cuenta que recibe).
2. **Código para inscribir** muestra un QR que abre una página pública (sin cuenta) en 4 pasos: nombre, **imagen que la identifica**, WhatsApp propio y de quien le ayuda a pagar (1 a 3), y confirmar con consentimiento.
3. **Imagen que la identifica:** un **dibujo** de un banco de 28 (con su nombre escrito, y nunca uno que ya tenga otra persona con lugar) o **su foto**, con casilla de autorización obligatoria. La foto se reduce a unos 320 px y se guarda en su registro.
4. La inscripción **solo registra**. No se manda ningún cobro ni mensaje hasta que quien cobra **apruebe**. Si el taller está lleno, la persona queda en lista de espera.
5. Tras aprobar, la ficha ofrece **"Cobrarle $130"** con un solo botón (usa la mensualidad predefinida).
6. Solo la mensualidad confirma el lugar. El cobro anual del DIF no.
7. El apartado vence **solo** para quien se inscribió por QR, ya fue aprobado y todavía no paga. Quien cobra decide dejarlo más días o darlo de baja. Quien ya pagó, o fue agregado a mano, no vence.
8. El servidor limita los intentos por dirección y por código. Si dos personas se inscriben a la vez por el último lugar, o eligen el mismo dibujo, gana quien llegó primero (se ordena por hora de llegada después de guardar, no con una escritura condicional).

**Dar de baja:** desde la ficha, con confirmación. Si la persona tiene cobros, queda solo como **"Juana (baja)"** con sus cobros (para el reporte) y se borran su foto, dibujo, teléfonos y notas; si regresa, se inscribe de nuevo. Si no tiene cobros, se borra por completo.

**Zona de peligro** (Más opciones, al final y discreta): borra todas las personas y todos los cobros, para limpiar datos de prueba. Pide leer el aviso, escribir BORRAR y escribir un código que llega al correo con el que se entra. No borra cuentas ni ajustes ni cancela cobros ya hechos en Pey.

## Estructura

```
src/                  app real (pantallas, comprobante, banco de dibujos, modelo de datos)
amplify/              servidor: acceso (Cognito), datos (DynamoDB) y tres funciones
  functions/pey/        llama a Pey: registrar cuenta, solicitud CoDi, QR, revisar pago
  functions/pey-webhook/  recibe el aviso de pago de Pey y verifica la firma
  functions/register/     inscripción pública por QR (solo registra, con límite de intentos)
tests/                pruebas de la lógica de lugares, reporte y dibujos (npm test)
demo/                 modo de demostración con datos inventados (para capturas y diseño)
scripts/              prueba firmada del webhook y capturas de pantalla
prototype/            prototipo completo (modo sencillo y capa avanzada) con sus pruebas
docs/                 arquitectura, auditoría, folleto y capturas
amplify.yml           cómo construye y despliega Amplify
```

## Ejecutar y probar

Necesitas Node.js 22 o más.

```
npm install
npm run dev
```

- **Modo de demostración** (sin servidor ni cuenta): abre `http://localhost:5173/demo/index.html?v=home`. Otras pantallas: `who`, `person`, `charge`, `qr`, `send-qr`, `wait`, `paid`, `receipt`, `new-charge`, `add-person`, `accounts`, `account`, `more`, `report`, `places`, `places-settings`, `reg-qr`, `review`, `seat`, `seat-late`, `seat-leave`, `danger`, y la inscripción: `signup1`, `signup2`, `signup2-pick`, `signup3`, `signup4`, `signup-done`.
- **Pruebas de lógica** (lugares, vencimientos, reporte, dibujos): `npm test` (14 pruebas).
- **Capturas del README:** con `npm run dev` corriendo, `node scripts/screens.cjs` (necesita Google Chrome; `CHROME_PATH` cambia su ubicación). Borra las capturas con numeración vieja.
- **App completa:** necesita `amplify_outputs.json` en la raíz, que Amplify genera al desplegar (descárgalo en la consola de Amplify). No se sube al repositorio.
- **Prueba del webhook sin dinero:** `WEBHOOK_URL=… WEBHOOK_SECRET=… CHARGE_ID=… node scripts/test-webhook.cjs`.
- **Prototipo:** abre `prototype/paga-con-tu-foto.html`; se reconstruye con `python prototype/source/build.py` y se prueba con `npm run smoke` y `npm run layout` dentro de `prototype/tests` (182 comprobaciones).

## Despliegue

Amplify Hosting construye y despliega solo cada vez que se sube un cambio a `main` (`amplify.yml`); tarda unos 10 minutos. El servidor necesita dos secretos en **Hosting → Secret management** de la app de Amplify:

- `PEY_API_KEY`: la llave de la API de Pey.
- `PEY_WEBHOOK_SECRET`: el secreto `whsec_…` que Pey entrega al registrar la URL del webhook (portal.mipey.mx → Developers).

Las llaves nunca van en el repositorio ni en el código. Hay un aviso de presupuesto mensual en la cuenta de AWS.

## Seguridad y privacidad

- El webhook rechaza cualquier aviso sin firma válida (Standard Webhooks) y registra cada pago una sola vez.
- No se envía una solicitud CoDi a una cuenta que Pey todavía no activó.
- El dinero de CoDi no se puede deshacer; solo los pagos en efectivo.
- La inscripción pública no manda cobros ni mensajes; solo registra, y limita los intentos.
- La foto solo se guarda con autorización explícita; sin foto se usa un dibujo. Al dar de baja se borra.
- Borrar datos pide una confirmación por correo, para que no se haga por error.
- Los datos de este repositorio (personas, teléfonos, CLABEs) son inventados o son la CLABE de prueba que Pey publica.

## Qué falta

1. Probar con un teléfono la inscripción por QR completa (dibujo y foto), el cobro rápido, el envío del código y del comprobante desde un iPhone, y la baja.
2. Pasar a la app real la tanda, el fiado y la foto tomada por quien cobra, que hoy solo están en el prototipo.
3. Hacerla instalable (PWA), alojar las tipografías y probarla con la primera usuaria.
4. Dibujos propios en lugar de emojis (se ven distinto en Android y iPhone).
5. Confirmar con Pey cuántas cuentas admite una llave y si el titular de una cuenta puede ser distinto del dueño de la llave (necesario para la cuenta del DIF).

La arquitectura prevista (Pey, CoDi, Amplify y las reglas de aprobación) está en `docs/ARQUITECTURA.md`.
