# Cuentas conmigo

Cobros y control de cobros sencillos para adultos mayores, con pagos CoDi a través del API de Pey. Proyecto para el Hackatón México 2026.

La pantalla principal es una app de pocos pasos, letra grande y alto contraste, pensada para personas con poca experiencia tecnológica o problemas de visión. Es una sola plantilla configurable, así que sirve para un taller con cuotas, una tanda o una tienda que fía:

- **Cobros por calendario:** monto, frecuencia, primera fecha y número de pagos.
- **Cobro extra** aparte del principal.
- **Turnos** para tandas.
- **Fiado** con saldo por persona y montos libres, nunca fijos.
- **Foto de cada persona**, solo con su consentimiento marcado.
- **Pagadores a distancia:** familiares que pagan por la persona.
- **Cuentas de cobro:** cada cobro elige qué cuenta lo recibe.
- **Lugares (cupo):** el taller tiene un número de lugares; pagar la mensualidad confirma el lugar y hay lista de espera cuando se llena.
- **Inscripción por QR:** quien llega al código deja nombre, WhatsApp y hasta 3 números de quien le ayuda a pagar; quien cobra aprueba antes de cobrar.
- **Comprobante** como imagen, que se manda por WhatsApp (`wa.me`), y **reporte mensual** de pagos en "Ayuda de un familiar".

## Estado

| Parte | Estado |
| --- | --- |
| Prototipo del front (modo sencillo y capa avanzada) | Hecho, en `prototype/` |
| App real (Vite + React + TypeScript, PWA) | Sin iniciar |
| Backend (AWS Amplify Gen 2) | Sin iniciar |
| Integración con Pey / CoDi | Sin iniciar |

Los datos del prototipo (personas, teléfonos, fotos) son inventados. El prototipo no genera cobros reales y su QR no es un código CoDi; el botón "Ya pagó" simula el aviso de pago. Tampoco son reales el QR de inscripción, los avisos a quien cobra ni el envío por WhatsApp (solo abre `wa.me` con el mensaje listo).

## Ver el prototipo

Abre `prototype/paga-con-tu-foto.html` en el navegador. Es un solo archivo; pide Nunito a Google Fonts, y sin internet usa Segoe UI o la letra del sistema. El logo, el favicon y el ícono de inicio están en `prototype/assets/`.

## Reconstruirlo y probarlo

El archivo del prototipo se arma desde `prototype/source/` (necesita Python 3):

```
python prototype/source/build.py
```

Las pruebas están en `prototype/tests/` (necesitan Node.js y Google Chrome; `CHROME_PATH` cambia la ubicación de Chrome):

```
cd prototype/tests
npm ci
npm run smoke    # 182 comprobaciones: recorre las pantallas, reglas de accesibilidad y modelo de datos
npm run layout   # mide tamaños, espacios y líneas en Chrome (390×844, 375×667 y letra extra grande)
```

`prototype/tools/` calcula los contrastes de color y `prototype/archive/` guarda versiones y scripts anteriores (se puede borrar).

## Estructura

```
prototype/
  paga-con-tu-foto.html   prototipo terminado (resultado de build.py)
  assets/                 logo, favicon e ícono de inicio
  source/                 piezas y script para armarlo
  tests/                  pruebas con jsdom y puppeteer-core (solo desarrollo)
  tools/                  cálculo de contraste
  archive/                historia
docs/
  ARQUITECTURA.md         plan de Pey, CoDi, Amplify y reglas de privacidad
  AUDITORIA.md            revisión del prototipo
  brochure/               folleto (brochure.html se arma con build.py)
```

El folleto incrusta capturas del prototipo. Para rehacerlo: genera las capturas con `node render5.js ../paga-con-tu-foto.html shots` y `node themeshots.js` (ver `docs/brochure/build.py`) y corre `python docs/brochure/build.py`.

## Qué falta probar

No se ha probado en un iPhone real (texto ajustable del sistema, voz, vibración) ni con personas mayores ni con simuladores de baja visión o daltonismo. La arquitectura prevista (Pey, CoDi, Amplify y las reglas de aprobación) está en `docs/ARQUITECTURA.md`.

## Siguientes pasos

1. Crear el proyecto real (Vite + React + TypeScript, PWA) y el backend en AWS Amplify Gen 2.
2. Conectar Pey: crear cobros CoDi y recibir el aviso de pago por webhook.
3. Alojar las tipografías y probar en un iPhone.
