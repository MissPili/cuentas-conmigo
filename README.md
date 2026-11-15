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
| Varios proyectos de cobro (talleres) por usuaria, cada uno con su código de inscripción | Hecho; falta probarlo desplegado |
| Inicio sencillo por proyecto: cuánto se ha cobrado, aprobar inscripciones y cobrar | Hecho; falta probarlo desplegado |
| Quien ayuda a pagar con nombre y relación; la persona elige a quién mandarle códigos y comprobantes | Hecho; falta probarlo desplegado |
| Lugares (cupo), inscripción por QR con aprobación, lista de espera y vencimiento | Hecho |
| Identificador visual: dibujo único o foto con consentimiento | Hecho; falta probarlo desplegado |
| Cobros del proyecto: hasta 2, cada uno **una sola vez** (inscripción $40) o **cada mes** por N meses desde un mes (mensualidad $130, 10 meses desde agosto); cobro rápido tras aprobar | Hecho; falta probarlo desplegado |
| Dar de baja (queda "Nombre (baja)" con sus cobros) | Hecho; falta probarlo desplegado |
| Zona de peligro: borrar personas y cobros con código al correo | Hecho (probado el borrado) |
| Imágenes de las personas activas para imprimir (PNG) y llaveros NFC: código aleatorio por persona, activar, desactivar si se pierde, código nuevo | Hecho; falta probar con un chip y un iPhone reales |
| Instalable como app (PWA) y fuentes sin internet | Pendiente |

Lo que ya está probado con el servidor real: crear una cuenta, registrarla en Pey, crear un cobro, pagarlo con el QR de CoDi y ver **Pagado** en la app; un aviso con firma falsa se rechaza y repetir el mismo aviso no lo duplica. Lo que no está probado: compartir imágenes desde un iPhone, la inscripción por QR de punta a punta con el servidor desplegado, y personas mayores usando la app. Todavía no están en la app real la tanda (turnos), el fiado ni la instalación como PWA; solo existen en el prototipo.

## Pantallas de la app real

Capturas hechas con el modo de demostración (datos inventados, sin servidor), a 390×844 como un iPhone. Están en el orden en que se usan.

### Entrar y cobrar

| | | |
| --- | --- | --- |
| ![](docs/pantallas/01-proyectos.png)<br>**1. Tus proyectos** | ![](docs/pantallas/02-inicio-del-proyecto.png)<br>**2. Inicio de un proyecto** | ![](docs/pantallas/03-quien-paga.png)<br>**3. A quién cobrar** |
| ![](docs/pantallas/04-cobros-de-una-persona.png)<br>**4. Cobros de una persona** | ![](docs/pantallas/05-como-cobrar.png)<br>**5. Cómo cobrar** | ![](docs/pantallas/06-codigo-qr.png)<br>**6. Código QR de CoDi** |
| ![](docs/pantallas/07-mandar-el-codigo.png)<br>**7. Mandar el código como imagen** | ![](docs/pantallas/08-esperando-el-pago.png)<br>**8. Esperando el pago** | ![](docs/pantallas/09-ya-pago.png)<br>**9. Ya pagó** |
| ![](docs/pantallas/10-comprobante.png)<br>**10. Comprobante** | ![](docs/pantallas/11-nuevo-cobro.png)<br>**11. Cobro extraordinario** | ![](docs/pantallas/12-agregar-persona.png)<br>**12. Agregar persona** |

### Más opciones, personas y reporte

| | | |
| --- | --- | --- |
| ![](docs/pantallas/13-mas-opciones.png)<br>**13. Más opciones** | ![](docs/pantallas/14-mas-opciones-2.png)<br>**14. Más opciones (2)** | ![](docs/pantallas/15-personas.png)<br>**15. Personas** |
| ![](docs/pantallas/16-reporte-del-mes.png)<br>**16. Reporte del mes** | ![](docs/pantallas/17-cuentas-que-reciben.png)<br>**17. Cuentas que reciben** | ![](docs/pantallas/18-cuenta-en-espera-de-pey.png)<br>**18. Cuenta en espera de Pey** |

### Lugares, inscripciones y proyectos (quien cobra)

| | | |
| --- | --- | --- |
| ![](docs/pantallas/19-lugares.png)<br>**19. Lugares** | ![](docs/pantallas/20-ajustes-de-lugares.png)<br>**20. Ajustes: lugares y cobros (único o mensual)** | ![](docs/pantallas/21-codigo-para-inscribir.png)<br>**21. Código para inscribir** |
| ![](docs/pantallas/22-inscripciones-por-revisar.png)<br>**22. Inscripciones por revisar** | ![](docs/pantallas/23-aprobar-una-inscripcion.png)<br>**23. Aprobar una inscripción** | ![](docs/pantallas/24-apartado-vencido-y-cobro-rapido.png)<br>**24. Apartado vencido y cobro rápido** |
| ![](docs/pantallas/25-dar-de-baja.png)<br>**25. Dar de baja** | ![](docs/pantallas/26-zona-de-peligro.png)<br>**26. Zona de peligro** | ![](docs/pantallas/27-nuevo-proyecto.png)<br>**27. Nuevo proyecto** |

### Inscripción pública (la persona, desde el código QR, sin cuenta)

| | | |
| --- | --- | --- |
| ![](docs/pantallas/28-inscripcion-paso-1.png)<br>**28. Inscripción, paso 1: nombre** | ![](docs/pantallas/29-inscripcion-paso-2-imagen.png)<br>**29. Paso 2: su imagen** | ![](docs/pantallas/30-inscripcion-elegir-dibujo.png)<br>**30. Elegir un dibujo** |
| ![](docs/pantallas/31-inscripcion-paso-3-como-pagas.png)<br>**31. Paso 3: WhatsApp, costos y cómo paga** | ![](docs/pantallas/32-inscripcion-paso-3.png)<br>**32. Paso 3: con ayuda de un familiar** | ![](docs/pantallas/33-inscripcion-paso-4.png)<br>**33. Paso 4: revisar y a quién mandar** |
| ![](docs/pantallas/34-inscripcion-enviada.png)<br>**34. Inscripción enviada** | ![](docs/pantallas/35-no-se-pudo-pedir-el-pago.png)<br>**35. Cuando algo falla: el motivo en palabras claras** |  |

### Agregar una persona a mano (Personas → Agregar, o Cobrar → Agregar)

Son los mismos 4 pasos de la inscripción, escritos por quien cobra y en tercera persona ("su imagen", "le ayuda un familiar"). Comparten el código con la inscripción (`src/pickers.tsx`, `src/payers.ts`), así las dos preguntan lo mismo y de la misma forma. El paso 1 (nombre y WhatsApp) es la captura 12.

| | | |
| --- | --- | --- |
| ![](docs/pantallas/36-agregar-persona-su-imagen.png)<br>**36. Paso 2: su imagen** (dibujo, foto con permiso, o que la app elija uno) | ![](docs/pantallas/37-agregar-persona-elegir-dibujo.png)<br>**37. Elegir su dibujo** | ![](docs/pantallas/38-agregar-persona-como-paga.png)<br>**38. Paso 3: cómo paga**, con Persona 1 y Persona 2 opcional |
| ![](docs/pantallas/39-agregar-persona-revisar.png)<br>**39. Paso 4: revisar y guardar** |  |  |

**Ayuda para pagar (en la inscripción y al agregar a mano):** si elige que le ayuda un familiar, solo se abre **Persona 1**, que es obligatoria (nombre, qué es suya y WhatsApp de 10 números). **Persona 2 y Persona 3 son opcionales**: aparecen solo si se toca "Agregar a otra persona" (con "Es opcional"), se pueden quitar, y si se dejan vacías se ignoran; si se llenan a medias se pide completarlas o quitarlas.

Cada pantalla tiene un solo botón principal, máximo 4 opciones, texto grande y el estado siempre con ícono, palabras y borde (nada se dice solo con color).

### Imágenes y llaveros (Más opciones → Imágenes y llaveros)

| | | |
| --- | --- | --- |
| ![](docs/pantallas/40-imagenes-y-llaveros.png)<br>**40. Imágenes y llaveros** | ![](docs/pantallas/41-personas-activas-con-llavero.png)<br>**41. Personas activas** (cada una con el estado de su llavero) | ![](docs/pantallas/42-imagen-y-llavero-activo.png)<br>**42. Imagen para descargar y llavero activo** |
| ![](docs/pantallas/43-imagen-sin-llavero.png)<br>**43. Todavía sin llavero** | ![](docs/pantallas/44-llavero-desactivado.png)<br>**44. Llavero desactivado (se perdió)** | ![](docs/pantallas/45-como-programar-un-llavero.png)<br>**45. Cómo programar un llavero** |
| ![](docs/pantallas/46-al-acercar-un-llavero-desactivado.png)<br>**46. Lo que se ve al acercar un llavero desactivado** |  |  |

## Proyectos y pantalla de inicio

Quien cobra puede llevar varios talleres o proyectos de cobro. Después de entrar ve **Tus proyectos** (con lo cobrado en el mes en cada uno); si solo tiene uno, entra directo. Cada proyecto tiene sus propias personas, cobros, lugares, mensualidad y **código QR de inscripción**, así que el mensaje a quien ayuda a pagar siempre nombra el taller correcto. Se cambia de proyecto o se crea otro en **Más opciones → Ver más**.

El inicio de un proyecto es deliberadamente corto: el dato de **cuánto se ha cobrado** este mes, el botón **Cobrar** (ahí se ve a quién se puede cobrar y se agrega gente a mano), **Aprobar inscripciones (N)** solo si hay alguien esperando (con campana 🔔, fondo dorado y borde punteado para que no se confunda con Más opciones), y **Más opciones**. Personas, lugares (cupos e inscripciones), reporte y cuentas son configuración y viven en Más opciones.

## Cómo funciona un cobro

1. Quien cobra registra la **cuenta que recibe** (nombre legal del titular y CLABE). Pey la activa con Banxico en hasta 5 días hábiles; mientras tanto solo se puede cobrar en efectivo.
2. Elige a la persona (se reconoce por su foto o dibujo). Su página ofrece lo que ya está esperando pago, **los cobros que configuraste** (por ejemplo "Cobrar $130, Mensualidad, mes 4 de 10") y **"Cobro extraordinario"** para algo fuera de lo normal, como la cooperación para el cumpleaños de una alumna: nombre y monto libres, y nunca confirma lugar.
3. Cobra por **código QR de CoDi** (la vía principal), por **solicitud CoDi** al celular o en **efectivo**.
4. Si quien paga necesita ayuda, **"Mandar el código por WhatsApp"** arma una imagen con el nombre del taller, quién paga, el monto, el QR grande y tres pasos. Se comparte desde el menú del celular. El mensaje que acompaña dice a quién está ayudando, cuánto y de qué, y pide que le pregunte a esa persona antes de pagar si tiene dudas.
5. Cuando la persona paga, Pey avisa al servidor con un mensaje firmado. El servidor verifica la firma, marca el cobro como **Pagado** una sola vez y la pantalla se actualiza sola. Si un aviso se pierde, **"Revisar si ya pagó"** consulta a Pey.
6. Quien cobra manda el **comprobante** (imagen con **PAGADO**, el nombre del taller, quién pagó, monto, concepto, quién recibió, cómo pagó, fecha y folio, con letra grande e íconos) o lo guarda como imagen.

Cada cobro manda a Pey el `bankAccountId` de su cuenta, así una sola llave de Pey sirve para varios cobradores (por ejemplo el taller y el DIF).

**Sobre WhatsApp:** un enlace `wa.me` abre el chat de un número aunque no esté en los contactos, pero solo puede llevar texto, nunca una imagen. Por eso el botón principal de **Mandar el código** y de **Comprobante** guarda la imagen detrás de un **enlace con una clave larga y aleatoria** (la clave es el único secreto; el código dura 7 días y el comprobante 180) y abre el chat del número elegido por la persona con el mensaje y ese enlace; WhatsApp muestra la imagen como vista previa y al tocar el enlace se ve completa. La página del enlace no muestra la cuenta que recibe. Como respaldo siguen **Compartir imagen** (menú del celular, hay que elegir el contacto) y **Guardar imagen**. Nada se envía solo: quien cobra toca Enviar en WhatsApp.

**Si abren el código en el mismo celular con el que van a pagar:** un celular no puede escanear su propia pantalla. La página del enlace del código explica tres salidas, en orden: abrirla en **otra pantalla** (otro celular, tableta o computadora), **guardar la imagen en las fotos** y usarla desde la galería de la app del banco (solo si el banco lo permite; no está verificado cuáles sí), o **pedir a quien cobra la solicitud de pago al celular** (la manda quien cobra desde la app; la página pública nunca manda cobros). Los enlaces ya enviados muestran el texto nuevo sin hacer nada.

### Enlace corto (con el dominio de la app)

El enlace que recibe la persona nace con la dirección de la función de AWS (`...lambda-url...on.aws`), que se ve rara. Para que salga con el dominio de la app (`https://<tu dominio>/p/<clave>`, clave de 22 caracteres con 128 bits) hay que agregar **una regla** en Amplify. Las reglas no viven en el repositorio, se ponen una vez en la consola:

1. Amplify → la app → **Hosting → Rewrites and redirects → Manage redirects → Open text editor**.
2. Agregar este objeto **al principio** de la lista (las reglas se leen de arriba abajo), con la dirección de la función de compartir (sale en `amplify_outputs.json` como `custom.shareUrl`):

```json
{ "source": "/p/<*>", "target": "https://<dirección de la función>/<*>", "status": "200", "condition": null }
```

3. Probar: abrir `https://<tu dominio>/p/probe`; debe verse una página en blanco con "ok" (no la app ni un error). La app hace esa misma prueba sola al preparar un enlace: **si la regla existe usa el enlace corto; si no, sigue con el largo**, así nada se rompe mientras tanto. Un enlace corto vencido o inventado muestra "Este enlace ya no sirve".

Sin verificar: que Amplify reenvíe bien la ruta y la imagen por esta regla, y la vista previa en WhatsApp con el enlace corto. Sale en la primera prueba real.

## Lugares e inscripción por QR

1. En **Lugares → Ajustes** quien cobra pone el nombre del taller, cuántos lugares hay, cuántos días se aparta uno (5 por defecto) y los **cobros** del proyecto (hasta 2). El **Cobro 1** es el inicial (al pagarlo, el lugar queda confirmado) y un botón **"Añadir otro cobro"** agrega el segundo. Cada cobro lleva nombre, monto, cuenta que recibe y se marca como **una sola vez** o **cada mes**; si es mensual se indica cuántos meses dura y desde qué mes. Ejemplo del caso de estudio: **Cobro 1: Inscripción $40, una sola vez**, y **Cobro 2: Mensualidad $130, cada mes, 10 meses desde agosto** (termina en mayo, el fin del ciclo escolar).
2. **Código para inscribir** muestra un QR que abre una página pública (sin cuenta) en 4 pasos: nombre, **imagen que la identifica**, WhatsApp propio (para todo lo del taller: avisos, cobros y comprobantes), **los costos** y **cómo va a pagar**. Antes de preguntar cómo paga, la página muestra **"Lo que se paga"** con lo configurado en el proyecto (por ejemplo Inscripción $40 una sola vez, Mensualidad $130 cada mes por 10 meses de agosto a mayo, y el total del ciclo); nunca muestra la cuenta que recibe. Las opciones son **"Yo, desde mi celular"** (con CoDi, en la app de su banco) o **"Me ayuda un familiar"**. La ayuda es opcional: solo si elige al familiar se despliegan los datos de quien ayuda (**nombre, qué es suya**, por ejemplo "mi hija", y WhatsApp; un botón permite agregar hasta 3), y revisar. En el último paso la persona **elige a quién quiere que le mandemos su código de pago y su comprobante** entre las que registró, y da su consentimiento.
   Debajo del QR, la pantalla muestra **el mismo enlace de inscripción** como texto, con **Mandar el enlace por WhatsApp** (abre la lista de chats; quien cobra elige y toca Enviar) y **Compartir o copiar el enlace** (menú del celular: mensajes, correo u otra app). Si las inscripciones están cerradas, la pantalla lo avisa antes de compartir. **Hacer un código nuevo** invalida el QR y el enlace anteriores.
3. **Imagen que la identifica:** un **dibujo** de un banco de 28 (con su nombre escrito, y nunca uno que ya tenga otra persona con lugar) o **su foto**, con casilla de autorización obligatoria. La foto se reduce a unos 320 px y se guarda en su registro.
4. La inscripción **solo registra**. No se manda ningún cobro ni mensaje hasta que quien cobra **apruebe**. Si el taller está lleno, la persona queda en lista de espera.
5. Tras aprobar, la ficha ofrece un botón por cada cobro que le toca: **"Cobrarle $40"** (la inscripción, una sola vez, y deja de ofrecerse cuando ya se cobró) y **"Cobrarle $130"** (la mensualidad, "mes 4 de 10"). Fuera del ciclo, por ejemplo antes de agosto o después de mayo, la mensualidad no se ofrece.
6. Solo el **cobro inicial** (el Cobro 1, normalmente la inscripción) confirma el lugar. La mensualidad, otros cobros y los extraordinarios no.
7. El apartado vence **solo** para quien se inscribió por QR, ya fue aprobado y todavía no paga. Quien cobra decide dejarlo más días o darlo de baja. Quien ya pagó, o fue agregado a mano, no vence.
8. El servidor limita los intentos por dirección y por código. Cada proyecto tiene sus propios lugares y dibujos. Si dos personas se inscriben a la vez por el último lugar, o eligen el mismo dibujo, gana quien llegó primero (se ordena por hora de llegada después de guardar, no con una escritura condicional).

**Dar de baja:** desde la ficha, con confirmación. Si la persona tiene cobros, queda solo como **"Juana (baja)"** con sus cobros (para el reporte) y se borran su foto, dibujo, teléfonos y notas; si regresa, se inscribe de nuevo. Si no tiene cobros, se borra por completo.

**Zona de peligro** (Más opciones, al final y discreta): borra todas las personas y todos los cobros, para limpiar datos de prueba. Pide leer el aviso, escribir BORRAR y escribir un código que llega al correo con el que se entra. No borra cuentas ni ajustes ni cancela cobros ya hechos en Pey.

## Llavero NFC

Idea de `nota-nfc-llavero.pdf` (no está en el repositorio): un llavero redondo con un chip NFC por persona. Al acercarlo al celular de quien cobra, se abre la pantalla de cobro de esa persona. Solo **acelera encontrar a la persona**: es en persona, necesita un celular con NFC y no sustituye a la foto ni al QR.

- **Imágenes para imprimir.** En **Más opciones → Imágenes y llaveros** se ven las personas **activas** (con lugar aprobado, o agregadas a mano; no las que esperan, están en lista de espera o ya se dieron de baja). Cada una tiene un archivo PNG de 1200 × 1200 px: fondo morado hasta las orillas (sirve para cortar redondo o cuadrado sin borde blanco), aro dorado y, al centro, su dibujo o su foto (la foto solo si dio su consentimiento). **No lleva nombre ni teléfono.** El archivo se llama `llavero-<dibujo>.png` (o `llavero-<primer nombre>.png` con foto). **Descargar todas las imágenes** (sin ZIP, para no sumar dependencias): en una computadora baja un archivo por persona, uno tras otro (el navegador puede pedir permiso para varias descargas); en un celular o tableta primero prepara todas y un **segundo toque** abre el menú de compartir con los archivos (Guardar imágenes, AirDrop, WhatsApp), porque el iPhone solo deja abrir ese menú directamente desde un toque. Si algo falla, cada imagen se puede descargar sola desde la persona. La imagen se dibuja en el celular con el emoji del propio sistema, así que **se ve distinta en iPhone y en Android**: conviene descargarlas desde el iPhone con el que se van a imprimir.
- **Qué guarda el chip.** Una sola cosa: `https://<dominio de la app>/?l=<código>`. El código son 16 bytes aleatorios (22 caracteres, 128 bits) sin relación con el nombre, el teléfono ni el orden de inscripción. El chip no guarda nombre, monto ni datos del banco, y por sí solo no cobra nada: quien no haya entrado a la app solo ve la pantalla de entrada.
- **Qué pasa al acercarlo.** La app (con la sesión de quien cobra) busca el código **entre sus propias personas**. Si es de una persona activa y el llavero está activo, abre directo **su página de cobro** (la nota propone esto; es lo más rápido). Si el llavero se desactivó, la persona ya no está activa o el código no es de nadie, muestra un aviso en palabras claras y **nunca** abre otra persona (una persona dada de baja pierde su código, así que su llavero aparece como "no reconocido"). La dirección con el código se quita de la barra del navegador al leerla.
- **Por persona** (en su imagen): **Activar llavero** (crea el código), **Copiar la dirección** (para escribirla en el chip), **Desactivar: se perdió** (deja de funcionar al momento), **Activar de nuevo** y **Hacer un código nuevo** (para el llavero de reemplazo, pide confirmar; el anterior ya no sirve nunca). Al dar de baja a una persona se borran también su código y su estado.
- **Programar los chips** (pantalla *Cómo programar los llaveros*): con una app como NFC Tools, escribir un registro de tipo enlace con la dirección copiada, **probarlo con la app cerrada** (en iPhone puede aparecer un aviso arriba que hay que tocar; por confirmar) y solo entonces bloquearlo (NTAG213 o NTAG215; ya bloqueado no se puede cambiar).

**Por qué `/?l=<código>` y no `/llavero/<código>`:** en Amplify la ruta `/llavero/<código>` responde primero con una redirección y luego con el HTML de la app pero con estado HTTP 404; `/?l=<código>` responde 200 directo (igual que el QR de inscripción, `/?i=`). La app también entiende `/llavero/<código>`, por si algún día se prefiere esa forma (haría falta otra regla en Amplify).

**Cuidado antes de bloquear un chip:** la dirección grabada incluye el dominio. Copia la dirección desde el mismo dominio y navegador con los que cobras (la sesión es por dominio y navegador) y no bloquees ningún chip hasta estar segura de que seguirás usando ese dominio.

Sin verificar: tocar un chip real con un iPhone, que la imagen salga bien en otros celulares, "Descargar todas" en iPhone, y el costo/tiempo de un lote de 12 chips. No se agregó ningún servicio de AWS: son tres campos opcionales nuevos en Persona (`keyCode`, `keyOn`, `keyAt`).

## Estructura

```
src/                  app real (pantallas, comprobante, banco de dibujos, modelo de datos, llaveros)
amplify/              servidor: acceso (Cognito), datos (DynamoDB) y cuatro funciones
  functions/pey/        llama a Pey: registrar cuenta, solicitud CoDi, QR, revisar pago
  functions/pey-webhook/  recibe el aviso de pago de Pey y verifica la firma
  functions/register/     inscripción pública por QR (solo registra, con límite de intentos)
  functions/share/        página pública del enlace que se manda por WhatsApp (imagen del código o del comprobante)
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

- **Modo de demostración** (sin servidor ni cuenta): abre `http://localhost:5173/demo/index.html?v=home`. Otras pantallas: `who`, `person`, `charge`, `qr`, `send-qr`, `wait`, `paid`, `receipt`, `new-charge`, `add-person`, `accounts`, `account`, `projects`, `new-project`, `more`, `more2`, `people`, `report`, `places`, `places-settings`, `reg-qr`, `review`, `seat`, `seat-late`, `seat-leave`, `danger`, los llaveros (`keyring-hub`, `keyrings`, `keyring`, `keyring-none`, `keyring-off`, `keyring-help`, `key-tap-off`, `key-tap-unknown`), y la inscripción: `signup1`, `signup2`, `signup2-pick`, `signup3`, `signup4`, `signup-done`.
- **Pruebas de lógica** (lugares, vencimientos, reporte, dibujos): `npm test` (44 pruebas, incluidas las del llavero: códigos, lectura de la dirección y qué hace cada toque).
- **Capturas del README:** con `npm run dev` corriendo, `node scripts/screens.cjs` (necesita Google Chrome; `CHROME_PATH` cambia su ubicación). Borra las capturas con numeración vieja.
- **App completa:** necesita `amplify_outputs.json` en la raíz, que Amplify genera al desplegar (descárgalo en la consola de Amplify). No se sube al repositorio.
- **Prueba del webhook sin dinero:** `WEBHOOK_URL=… WEBHOOK_SECRET=… CHARGE_ID=… node scripts/test-webhook.cjs`.
- **Prototipo:** abre `prototype/paga-con-tu-foto.html`; se reconstruye con `python prototype/source/build.py` y se prueba con `npm run smoke` y `npm run layout` dentro de `prototype/tests` (182 comprobaciones).

## Despliegue

Amplify Hosting construye y despliega solo cada vez que se sube un cambio a `main` (`amplify.yml`); tarda unos 10 minutos. El servidor necesita dos secretos en **Hosting → Secret management** de la app de Amplify:

- `PEY_API_KEY`: la llave de la API de Pey.
- `PEY_WEBHOOK_SECRET`: el secreto `whsec_…` que Pey entrega al registrar la URL del webhook (portal.mipey.mx → Developers).

Después de cambiar un secreto hay que volver a desplegar (Amplify → **Redeploy this version**). **Si cambias la llave de Pey por una de otra cuenta de Pey**, las cuentas que reciben y que se registraron con la llave anterior ya no existen para Pey (el cobro falla con "Pey no encuentra la cuenta que recibe"): en **Más opciones → Cuenta que recibe → la cuenta → Registrarla otra vez en Pey**. Una cuenta con CLABE real vuelve a tardar hasta 5 días hábiles en activarse; la CLABE de prueba de Pey queda lista al instante.

Las llaves nunca van en el repositorio ni en el código. Hay un aviso de presupuesto mensual en la cuenta de AWS.

## Seguridad y privacidad

- El webhook rechaza cualquier aviso sin firma válida (Standard Webhooks) y registra cada pago una sola vez.
- No se envía una solicitud CoDi a una cuenta que Pey todavía no activó.
- El dinero de CoDi no se puede deshacer; solo los pagos en efectivo.
- La inscripción pública no manda cobros ni mensajes; solo registra, y limita los intentos.
- La foto solo se guarda con autorización explícita; sin foto se usa un dibujo. Al dar de baja se borra.
- Borrar datos pide una confirmación por correo, para que no se haga por error.
- El chip del llavero solo guarda una dirección con un código aleatorio largo: sin nombre, monto ni datos del banco. Un llavero perdido se desactiva al momento; el de reemplazo recibe un código nuevo.
- Los datos de este repositorio (personas, teléfonos, CLABEs) son inventados o son la CLABE de prueba que Pey publica.

## Qué falta

1. Probar con un teléfono la inscripción por QR completa (dibujo y foto), el cobro rápido, el envío del código y del comprobante desde un iPhone, y la baja.
2. Pasar a la app real la tanda, el fiado y la foto tomada por quien cobra, que hoy solo están en el prototipo.
3. Hacerla instalable (PWA), alojar las tipografías y probarla con la primera usuaria.
4. Dibujos propios en lugar de emojis (se ven distinto en Android y iPhone).
5. Probar un llavero NFC real con un iPhone (escribir un chip, acercarlo con la app cerrada, ver que abre la pantalla de cobro) antes de bloquear ninguno.
6. Confirmar con Pey cuántas cuentas admite una llave y si el titular de una cuenta puede ser distinto del dueño de la llave (necesario para la cuenta del DIF).

La arquitectura prevista (Pey, CoDi, Amplify y las reglas de aprobación) está en `docs/ARQUITECTURA.md`.
