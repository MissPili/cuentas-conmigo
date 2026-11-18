# Auditoría de «Cuentas conmigo»

14 de noviembre de 2026. Revisión de solo lectura del prototipo. No se cambió el comportamiento de la maqueta para «arreglar» estos puntos: el nombre visible, el enlace de ejemplo y esta nota sí se actualizaron al preparar el repositorio público.

Los datos del prototipo son de ejemplo. No hay llave de Pey ni archivo `.env`. Las caras son dibujos. La arquitectura prevista está en `docs/ARQUITECTURA.md`.

## Cómo salieron las pruebas

Corrieron en esta máquina, con Node y Chrome, después del cambio de nombre.

- `npm run smoke` (en `prototype/tests/`): **182 comprobaciones, ninguna falló.**
- `npm run layout`: **ningún problema de tamaño.** Letra del modo sencillo de 20 px o más, botones de 48 px o más y bloques de a lo más dos líneas, en 390×844, 375×667 y letra extra grande.
- `python prototype/source/build.py` regenera `prototype/paga-con-tu-foto.html` desde `prototype/source/`.

Esas pruebas no llaman a Pey ni abren un iPhone.

## Prioridad alta

### 1. El botón «Ya pagó» da por bueno un cobro que el banco no confirmó

**Dónde.** `prototype/source/parts/views.js`, en la pantalla de espera del QR y de la solicitud al familiar. El botón principal se llama «Ya pagó». Al tocarlo, el prototipo marca el pago como hecho. Si es la mensualidad, también confirma el lugar (`prototype/source/parts/v7.js`).

**Por qué importa.** En la app real, un «ya pagó» a mano en un cobro CoDi debe quedar como «sin confirmar por el banco» y no debe confirmar el lugar. Solo el aviso firmado de Pey marca ese pago. En la maqueta el botón hace las veces de ese aviso. Si se copia tal cual, un pago que nunca llegó contaría como dinero recibido y como lugar ocupado. El aviso de que es una simulación está en el panel de al lado, no en la pantalla grande.

**Recomendación.** En la app real, solo el aviso de Pey marca un pago CoDi. En la maqueta, el botón puede decir «Simular que ya pagó» para que una demo no se confunda.

### 2. La página del código y la de quien cobra son el mismo archivo

**Dónde.** `prototype/source/parts/phone_b.html` (botón «Ver como quien se inscribe», que cambia a «Volver a quien cobra»). El código de ejemplo está en `prototype/source/parts/v7.js`: `ej-tal4k2`, y se muestra como `cuentasconmigo.example/i/ej-tal4k2`. El freno de «muchos intentos» es un contador de esa pestaña (`S.regCount`); al recargar, vuelve a cero. `window.PCF` deja ver los datos del grupo.

**Por qué importa.** En la maqueta es un atajo para enseñar las dos pantallas. Este archivo no puede ser la página pública del código: cualquiera podría volver a los cobros. El código de ejemplo se adivina. El límite de intentos no mira la dirección de internet y se borra al refrescar.

Lo que sí está bien: inscribirse no crea un cobro ni abre WhatsApp. La persona queda por aprobar o en lista de espera. Quien cobra tiene que aprobar antes de cobrarle. La foto no se pide en ese formulario.

**Recomendación.** Página pública aparte, sin botón para ver los cobros, con un código largo que se pueda cambiar, y con el límite de intentos en el servidor. Hasta la aprobación, no sale ningún cobro ni ningún mensaje. Así está descrito en `docs/ARQUITECTURA.md`.

### 3. El comprobante no se manda solo, pero el enlace futuro es fácil de adivinar

**Dónde.** `prototype/source/parts/v7.js`, el texto de WhatsApp y el folio del comprobante.

**Por qué importa.** Nada se envía solo. Hay que tocar «Enviar a…». Eso abre `wa.me` con el mensaje escrito, y WhatsApp pide su propio envío. La pantalla dice «WhatsApp abierto», nunca «enviado».

El mensaje lleva el nombre, el monto y un enlace `cuentasconmigo.example/c/` con un folio `EJ-` calculado a partir del número de la persona. Hoy ese enlace no existe. Cuando exista, alguien podría probar folios y ver nombres y montos.

**Recomendación.** El enlace público del comprobante debe ser un código largo, distinto del folio que se lee en la imagen, y debe caducar.

## Prioridad media

### 4. El modo sencillo cuida la letra y los pasos; varias pantallas no caben y no se ha probado con personas mayores

**Dónde.** `prototype/source/parts/simple.css`, `prototype/source/parts/tokens.css`, `prototype/source/parts/v7.css` y la pestaña de identidad del prototipo. Medición en `npm run layout`.

**Por qué importa.** En el modo sencillo hay un paso de 4, un botón principal, como mucho cuatro opciones, y la barra de Atrás, Escuchar y Cancelar. La letra es de 20 px o más, los botones de al menos 56 px y cada estado lleva ícono, palabras y un borde, no solo color. El contraste de los textos principales pasa de 7 a 1. Sin permiso de foto se muestra un dibujo con la inicial.

Lo que no cabe en la regla:

- En 390×844 hay que desplazar el inicio cuando hay inscripciones nuevas, el comprobante, el código de inscripción y la pantalla de «pagado». En 375×667 y con letra extra grande, casi todo se desplaza.
- El título usa interlineado 1.25. La regla del proyecto pide 1.4 a 1.6. El texto corrido sí va en 1.5.
- El reporte mensual, en el modo avanzado, usa letra de unos 17–18 px (`1.1rem` en `v7.css`).
- Las tipografías se piden a Google. Sin internet se usa la del sistema.
- No hay prueba en un iPhone real ni con personas mayores.

**Recomendación.** Antes de una prueba con personas, acortar el inicio y el comprobante. Subir la letra del reporte a 20 px. Guardar las tipografías en el proyecto.

### 5. Pey y Amplify están descritos, no construidos

**Dónde.** `docs/ARQUITECTURA.md` y los estados de cuenta en `prototype/source/parts/v7.js` (por confirmar, en espera, lista). `README.md` marca la app real, Amplify y Pey como «sin iniciar».

**Por qué importa.** La maqueta no llama a Pey. No hay servidor, no hay firma del aviso de pago y no hay proyecto de Amplify. Lo que sí está pensado: cada cobro indica su cuenta, una cuenta nueva espera hasta 5 días hábiles y mientras tanto solo anota efectivo, el cobro aparte no confirma lugar, el efectivo se puede deshacer y el cobro CoDi no. El botón «Simular que Pey la activó» es solo de la maqueta.

**Recomendación.** No conectar una llave a este HTML. El siguiente paso es el proyecto con Vite, React, TypeScript y Amplify Gen 2, con la llamada a Pey en el servidor y la llave fuera del repo. Revisar el costo y poner una alerta de gasto antes de desplegar. Agregar `amplify_outputs.json` al `.gitignore` cuando ese archivo exista.

### 6. El armado funciona, pero es delicado, y hay copias viejas

**Dónde.** `prototype/source/build.py` arma el HTML desde `prototype/source/base/paga-con-tu-foto.v5.bak.html` y las piezas de `prototype/source/parts/`. Busca líneas concretas de ese respaldo.

**Por qué importa.** Hoy el armado reproduce el HTML. Un cambio pequeño en el respaldo puede romperlo, porque el script cuenta líneas. El archivo de la versión 5 no se puede borrar: sin él, `build.py` no arma nada. Las copias viejas (versiones 2 a 4 y sus parches) ya se quitaron del repositorio.

**Recomendación.** No borrar `source/base` hasta cambiar la forma de armar el archivo. Cuando empiece la app en React, no seguir parchando este HTML.

### 7. La foto y el permiso están cuidados en la maqueta; el texto del permiso sigue abierto

**Dónde.** El aviso de la pantalla Personas dice que los cambios se quedan mientras la página está abierta y que las fotos no salen del teléfono. La casilla de permiso está en el editor de personas. La inscripción no pide foto. La pestaña de identidad deja pendiente redactar el permiso en lenguaje simple.

**Por qué importa.** Las personas de ejemplo tienen un dibujo, no una fotografía. Si alguien carga una foto real en una demo, esa foto vive en la memoria de esa pestaña. Una grabación de pantalla la publicaría igual. El folleto (`docs/brochure/brochure.html`) lleva capturas del prototipo, con las caras dibujadas.

**Recomendación.** No usar fotos de personas reales en la demo ni en el folleto hasta tener el texto del permiso y un almacén privado. En la app real, la foto no va en la página del código.

## Prioridad baja

### 8. El color del foco y una franja de «en espera» se quedan un poco debajo de 7 a 1

**Dónde.** `prototype/tools/contrast3.py`. El foco claro sobre blanco da 6.77. Una franja del amarillo de «en espera» da 6.73. Los textos principales sí pasan de 7.

**Por qué importa.** La meta es 7 a 1 en el texto. Estos dos no son el texto corrido. No rompen la prueba automática.

**Recomendación.** Si se quiere la meta de 7 en todo, oscurecer un poco el foco y la franja. No es lo primero.

### 9. Lo que las pruebas no cubren

**Dónde.** `prototype/tests/` y `.gitignore`.

**Por qué importa.** Las 182 comprobaciones y la medición en Chrome dan confianza sobre la maqueta. No prueban un iPhone, no hablan con Pey y no miran si una persona mayor entiende la pantalla en cinco segundos. `node_modules/` y `prototype/tests/out/` quedan fuera de git.

**Recomendación.** Conservar `smoke` y `layout` al pasar a la app real. Cuando exista el servidor, probar que un aviso repetido de Pey no cobra dos veces ni confirma el lugar dos veces.
