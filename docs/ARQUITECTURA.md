# Arquitectura prevista

«Cuentas conmigo» es, hoy, un prototipo estático. Esta nota describe cómo se piensa la app real: qué no debe salir sin aprobación, cómo se conecta con Pey y CoDi, y qué piezas de AWS Amplify Gen 2 harían falta. Los datos del prototipo son de ejemplo.

## Qué hace la app

Una sola plantilla, con interruptores, para tres usos:

- cobros por calendario (monto, frecuencia, primera fecha y número de pagos) y un cobro aparte;
- turnos, para una tanda;
- fiado, con saldo por persona y montos libres (nunca fijos).

«Taller», «Tanda» y «Tienda» solo encienden esas funciones y cargan personas de ejemplo.

Cada proyecto tiene una lista de cuentas de cobro. Cada cobro (calendario, cobro aparte o abono de fiado) elige cuál lo recibe. Una cuenta puede estar por confirmar, en espera de activación o lista.

## Privacidad y aprobación

- La foto se pide aparte, con una casilla de consentimiento (quién lo dio y la fecha). Sin ese permiso se muestra un dibujo con la inicial, no la foto.
- La inscripción por código QR es una página pública, sin entrar a una cuenta. Pide nombre, WhatsApp de la persona y hasta tres WhatsApp de quien le ayuda a pagar, y una casilla de permiso para compartir esos números. No pide la foto.
- Inscribirse solo registra. No sale ningún cobro ni ningún mensaje hasta que quien cobra aprueba. Así un formulario público no puede cobrar ni escribir a números ajenos.
- El código del QR es por proyecto y se puede cambiar. La página pública lleva un límite de intentos.
- El lugar apartado vence solo para quien se inscribió por QR, ya fue aprobado y aún no hace su primer pago. Quien ya pagó alguna vez, o fue agregado a mano, no vence por esa regla. El número de días se ajusta en Ajustes.
- Solo la cuota principal confirma el lugar. El cobro aparte se registra por su lado.
- El comprobante es una imagen. Dice «comprobante de pago», no factura. La foto aparece solo si hay consentimiento. Se comparte con un toque que abre WhatsApp (`wa.me`) con el texto listo; WhatsApp pide su propio envío. No se sabe si el mensaje llegó. El enlace público del comprobante tiene que ser difícil de adivinar y distinto del folio corto.
- El dinero que entra por CoDi no se deshace desde la app. El efectivo anotado sí se puede deshacer.
- En la app real, un «ya pagó» a mano en un cobro CoDi queda como «sin confirmar por el banco» y no confirma el lugar. Solo el aviso de Pey marca ese pago. En el prototipo, el botón «Ya pagó» simula ese aviso y sí confirma: no hay que copiar ese comportamiento.

## Pey y CoDi

La documentación pública está en [docs.pey.mx](https://docs.pey.mx). Lo que sigue es el plan de integración, no código que ya llame a Pey.

- Una llave puede servir para varias cuentas. Cada cuenta se registra en Pey y recibe un identificador. Al crear un cobro se manda ese identificador (`bankAccountId`). Si se omite, el dinero va a la cuenta ligada a la llave. Hay que mandarlo siempre: el aviso de pago solo trae la cuenta si se envió al crear el cobro.
- Cobro con QR: `POST /codi/qr` (monto, concepto, vencimiento en segundos, referencia numérica, si se genera imagen, cuenta y datos extra).
- Cobro al celular: `POST /codi/pn`. El teléfono tiene exactamente 10 dígitos. El monto es mayor que 0.
- La referencia única de cada cobro puede ir en `metadata` además de la referencia numérica.
- Alta de cuenta: `POST /bank-account` con alias, nombre legal completo del titular, CLABE de 18 dígitos con dígito verificador y tipo `PERSON` o `BUSINESS`. El estado pasa por pendiente, en proceso, activa o error. Activar con el banco puede tardar hasta 5 días hábiles. Mientras no esté activa, esa cuenta solo anota efectivo: no se ofrece QR ni solicitud CoDi. El estado real sale de `GET /bank-account/{id}` y del aviso de Pey, no de un botón. La CLABE de prueba que publica Pey se activa al momento; sirve para ensayos pequeños. No es una cuenta de nadie del proyecto.
- Avisos de pago: `codi.qr.payment_received` y `codi.pn.payment_received`, uno por llave, firmados. Hay que guardarlos una sola vez, por el identificador de la transacción. Si el aviso se repite, no se cobra ni se confirma el lugar dos veces.
- Para conciliar si se pierde un aviso: `GET /transaction/codi/qr/{id}` y `GET /transaction/bank-account/{id}`. El botón manual es el último recurso.
- No hay un entorno de pruebas aparte. La llave no se guarda en el repositorio: va en el almacén de secretos del servidor, o en un `.env` que git ignora.

## Servidor previsto

Aún no está creado. La idea es:

- interfaz con Vite, React y TypeScript, instalable como aplicación web;
- AWS Amplify Gen 2: datos, almacén de fotos, cuentas de quien entra, y una función de servidor para llamar a Pey;
- otra función con dirección pública para recibir el aviso firmado de Pey;
- secretos fuera del código;
- antes de desplegar, revisar el costo y poner una alerta de gasto.

El modelo que hoy vive en el navegador, y que conviene pasar al servidor:

- proyecto: nombre, funciones encendidas, cobro principal, cobro aparte, atajos de monto, cuentas, a qué cuenta va cada tipo de cobro, inscripción (abierta, código, cupo, días de apartado) y personas;
- persona: nombre, teléfono, nota, foto, consentimiento, quienes ayudan a pagar, desde qué periodo entra, pagos, cobro aparte, saldo, movimientos de fiado, estado (por aprobar, inscrita, lista de espera o dada de baja) y si llegó por QR o a mano;
- comprobante: folio visible y un código largo para el enlace público.

`amplify_outputs.json` debe quedar en `.gitignore` cuando exista el proyecto de Amplify. Hoy no está, porque ese proyecto no existe.

## Diseño de la pantalla

El modo sencillo es el de siempre: un paso de cuatro, un botón principal, como mucho cuatro opciones, y la barra de Atrás, Escuchar y Cancelar aparte. Letra de 20 px o más, contraste alto, y ningún estado que dependa solo del color. El modo avanzado («Ayuda de un familiar») es para quien configura personas, cuentas y el reporte.

La marca visual usa morado `#4E1A6E` (tinta y botón principal) y dorado `#EDB438` (acento y estado «esperando pago»), con fondo claro y mucho blanco. La letra es Nunito, con Segoe UI o la del sistema si no carga. El logo del encabezado, el favicon y el ícono de inicio viven en `prototype/assets/`. Los tonos claros y oscuros, y el alto contraste, siguen en los tokens del prototipo.

Los colores y el cálculo de contraste están en `prototype/tools/contrast3.py`. Las reglas que la pantalla ya cumple, y lo que falta probar en un teléfono real, están en la pestaña de identidad del prototipo.
