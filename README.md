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
| Registro de la cuenta que recibe en Pey | Funciona (probado con la CLABE de prueba) |
| Cobro por solicitud CoDi y por QR de CoDi | Se crean en Pey; falta probar un pago real |
| Aviso de pago de Pey (webhook firmado) | Funciona con avisos simulados y firmados; falta registrarlo en Pey |
| Comprobante como imagen, por WhatsApp | Hecho (envío por `wa.me`, compartir imagen y guardar) |
| Reporte mensual (por persona, CoDi y efectivo, hoja de cálculo) | Hecho |
| Lugares (cupo), inscripción por QR con aprobación, lista de espera y vencimiento del apartado | Hecho; falta probarlo desplegado |
| Instalable como app (PWA) y fuentes sin internet | Pendiente |

Lo que ya está probado: un cobro creado en la app aparece como **Pagado** cuando llega un aviso con firma válida, un aviso con firma falsa se rechaza y repetir el mismo aviso no lo duplica. Lo que no está probado: un pago CoDi real de punta a punta, la inscripción por QR ya desplegada, un iPhone real y personas mayores usando la app. Todavía no están en la app real la tanda (turnos), el fiado, la foto con consentimiento ni la instalación como PWA; solo existen en el prototipo.

## Pantallas de la app real

Capturas hechas con el modo de demostración (datos inventados, sin servidor), a 390×844 como un iPhone.

| | | |
| --- | --- | --- |
| ![Inicio](docs/pantallas/01-inicio.png)<br>**1. Inicio** | ![Quién paga](docs/pantallas/02-quien-paga.png)<br>**2. A quién cobrar** | ![Cobros de una persona](docs/pantallas/03-cobros-de-una-persona.png)<br>**3. Cobros de una persona** |
| ![Cómo cobrar](docs/pantallas/04-como-cobrar.png)<br>**4. Cómo cobrar** | ![Código QR](docs/pantallas/05-codigo-qr.png)<br>**5. Código QR de CoDi** | ![Esperando el pago](docs/pantallas/06-esperando-el-pago.png)<br>**6. Esperando el pago** |
| ![Ya pagó](docs/pantallas/07-ya-pago.png)<br>**7. Ya pagó** | ![Comprobante](docs/pantallas/08-comprobante.png)<br>**8. Comprobante** | ![Cuentas que reciben](docs/pantallas/09-cuentas-que-reciben.png)<br>**9. Cuentas que reciben** |
| ![Cuenta en espera](docs/pantallas/10-cuenta-en-espera-de-pey.png)<br>**10. Cuenta en espera de Pey** | ![Agregar persona](docs/pantallas/11-agregar-persona.png)<br>**11. Agregar persona** | ![Nuevo cobro](docs/pantallas/12-nuevo-cobro.png)<br>**12. Nuevo cobro** |

Lugares, inscripciones y el reporte (pantallas 13 a 19), y la página pública de inscripción que se abre desde el código QR (pantallas 20 a 24):

| | | |
| --- | --- | --- |
| ![Reporte](docs/pantallas/13-reporte-del-mes.png)<br>**13. Reporte del mes** | ![Lugares](docs/pantallas/14-lugares.png)<br>**14. Lugares** | ![Inscripciones](docs/pantallas/15-inscripciones-por-revisar.png)<br>**15. Inscripciones por revisar** |
| ![Aprobar](docs/pantallas/16-aprobar-una-inscripcion.png)<br>**16. Aprobar una inscripción** | ![Apartado vencido](docs/pantallas/17-apartado-vencido.png)<br>**17. Apartado vencido** | ![Código para inscribir](docs/pantallas/18-codigo-para-inscribir.png)<br>**18. Código para inscribir** |
| ![Ajustes](docs/pantallas/19-ajustes-de-lugares.png)<br>**19. Ajustes de lugares** | ![Paso 1](docs/pantallas/20-inscripcion-paso-1.png)<br>**20. Inscripción, paso 1** | ![Paso 2](docs/pantallas/21-inscripcion-paso-2.png)<br>**21. Inscripción, paso 2** |
| ![Paso 3](docs/pantallas/22-inscripcion-paso-3.png)<br>**22. Inscripción, paso 3** | ![Paso 4](docs/pantallas/23-inscripcion-paso-4.png)<br>**23. Inscripción, paso 4** | ![Lista](docs/pantallas/24-inscripcion-lista.png)<br>**24. Inscripción enviada** |

Cada pantalla tiene un solo botón principal, máximo 4 opciones, texto grande y el estado siempre con ícono, palabras y borde (nada se dice solo con color). El comprobante es una imagen de 1080×1350 con **PAGADO**, el monto grande y los datos del pago.

## Cómo funciona un cobro

1. Quien cobra registra la **cuenta que recibe** (nombre legal del titular y CLABE). Pey la activa con Banxico en hasta 5 días hábiles; mientras tanto solo se puede cobrar en efectivo.
2. Elige a la persona y crea el cobro (monto libre y concepto).
3. Cobra por **solicitud CoDi** al celular de la persona, por **código QR de CoDi** o en **efectivo**.
4. Cuando la persona paga, Pey avisa al servidor con un mensaje firmado. El servidor verifica la firma, marca el cobro como **Pagado** una sola vez y la pantalla se actualiza sola.
5. Quien cobra manda el **comprobante** por WhatsApp o lo guarda como imagen.

Cada cobro manda a Pey el `bankAccountId` de su cuenta, así una sola llave de Pey sirve para varios cobradores (por ejemplo el taller y el DIF).

## Lugares e inscripción por QR

1. En **Lugares** quien cobra pone cuántos lugares hay y cuántos días se aparta uno (5 por defecto).
2. **Código para inscribir** muestra un QR que abre una página pública (sin cuenta) en 4 pasos: nombre, su WhatsApp, WhatsApp de quien le ayuda a pagar (1 a 3) y confirmar con consentimiento.
3. La inscripción **solo registra**. No se manda ningún cobro ni mensaje hasta que quien cobra **apruebe**. Si el taller está lleno, la persona queda en lista de espera.
4. Solo la mensualidad confirma el lugar (al crear un cobro se marca si es la mensualidad). El cobro anual del DIF no.
5. El apartado vence **solo** para quien se inscribió por QR, ya fue aprobado y todavía no paga. Quien cobra decide dejarlo más días o liberarlo. Quien ya pagó, o fue agregado a mano, no vence.
6. El servidor limita los intentos por dirección y por código, y si dos personas se inscriben a la vez por el último lugar, gana quien llegó primero. Esto último se resuelve ordenando por hora de llegada después de guardar, no con una escritura condicional.

## Estructura

```
src/                  app real (pantallas, comprobante, modelo de datos)
amplify/              servidor: acceso (Cognito), datos (DynamoDB) y dos funciones
  functions/pey/        llama a Pey: registrar cuenta, solicitud CoDi, QR
  functions/pey-webhook/  recibe el aviso de pago de Pey y verifica la firma
  functions/register/     inscripción pública por QR (solo registra, con límite de intentos)
tests/                pruebas de la lógica de lugares y del reporte (npm test)
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

- **Modo de demostración** (sin servidor ni cuenta): abre `http://localhost:5173/demo/index.html?v=home`. Otras pantallas: `who`, `person`, `charge`, `qr`, `wait`, `paid`, `receipt`, `accounts`, `account`, `add-person`, `new-charge`, `report`, `places`, `review`, `seat`, `reg-qr`, `signup1` a `signup4`.
- **Pruebas de lógica** (lugares, vencimientos, reporte): `npm test`.
- **Capturas del README:** con `npm run dev` corriendo, `node scripts/screens.cjs` (necesita Google Chrome; `CHROME_PATH` cambia su ubicación).
- **App completa:** necesita `amplify_outputs.json` en la raíz, que Amplify genera al desplegar (descárgalo en la consola de Amplify). No se sube al repositorio.
- **Prueba del webhook sin dinero:** `WEBHOOK_URL=… WEBHOOK_SECRET=… CHARGE_ID=… node scripts/test-webhook.cjs`. Manda un aviso firmado y comprueba que se rechaza uno falso, que uno bueno marca **Pagado** y que repetirlo no duplica.
- **Prototipo:** abre `prototype/paga-con-tu-foto.html`; se reconstruye con `python prototype/source/build.py` y se prueba con `npm run smoke` y `npm run layout` dentro de `prototype/tests` (182 comprobaciones).

## Despliegue

Amplify Hosting construye y despliega solo cada vez que se sube un cambio a `main` (`amplify.yml`). El servidor necesita dos secretos en **Hosting → Secret management** de la app de Amplify:

- `PEY_API_KEY`: la llave de la API de Pey.
- `PEY_WEBHOOK_SECRET`: el secreto `whsec_…` que Pey entrega al registrar la URL del webhook (se registra en portal.mipey.mx → Developers).

Las llaves nunca van en el repositorio ni en el código; el servidor las lee de los secretos. Hay un aviso de presupuesto mensual en la cuenta de AWS.

## Seguridad y privacidad

- El webhook rechaza cualquier aviso sin firma válida (Standard Webhooks) y registra cada pago una sola vez.
- No se envía una solicitud CoDi a una cuenta que Pey todavía no activó.
- El dinero de CoDi no se puede deshacer; solo los pagos en efectivo.
- Los datos de este repositorio (personas, teléfonos, CLABEs) son inventados o son la CLABE de prueba que Pey publica.

## Qué falta

1. Registrar el webhook en Pey y probar un pago real de $0.01.
2. Probar la inscripción por QR desplegada con un teléfono, y pasar a la app real la tanda, el fiado y la foto con consentimiento, que hoy solo están en el prototipo.
3. Hacerla instalable (PWA), alojar las tipografías y probarla en un iPhone con la primera usuaria.
4. Confirmar con Pey cuántas cuentas admite una llave y si el titular de una cuenta puede ser distinto del dueño de la llave (necesario para la cuenta del DIF).

La arquitectura prevista (Pey, CoDi, Amplify y las reglas de aprobación) está en `docs/ARQUITECTURA.md`.
