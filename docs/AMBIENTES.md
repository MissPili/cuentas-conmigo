# Ambientes: desarrollo, QA y producción

## La idea en una frase

Hoy hay **una sola copia** de la app, y es la que usan las personas de verdad. Un ambiente es **otra copia completa y separada** (su propia dirección web, sus propios usuarios y su propia base de datos) para poder probar sin riesgo de romper ni ensuciar la real.

| Ambiente | Rama de Git | Para qué sirve | Quién lo usa | Datos |
|---|---|---|---|---|
| **Desarrollo** | `dev` | Probar rápido una función nueva, aunque falle | Quien programa | De mentira; se pueden borrar |
| **QA** (pruebas) | `qa` | Revisar con calma que lo nuevo funciona **antes** de publicarlo | Quien prueba (tú, con un celular) | De mentira, parecidos a los reales |
| **Producción** | `main` | La app real | Las personas | Reales. **No se toca para probar** |

La regla de oro: **los cambios solo avanzan en un sentido** y cada paso es una prueba.

```
rama de trabajo ──▶ dev ──▶ qa ──▶ main
 (feature/lo-nuevo)  prueba   prueba   los usan
                     rápida   a fondo  de verdad
```

## Cómo funciona (por qué no hay que construir nada raro)

La app está en **AWS Amplify Gen 2**, que ya trae esto resuelto: **cada rama de Git que conectas a Amplify recibe su propio "backend" completo** (acceso con Cognito, datos en DynamoDB, las cuatro funciones, el almacén de fotos). El archivo `amplify.yml` ya lo dice:

```
npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
```

`$AWS_BRANCH` es el nombre de la rama que se está desplegando. Si es `main`, actualiza producción; si es `dev`, crea/actualiza **otro** backend distinto. Es decir: **no hay que cambiar la forma de desplegar; solo conectar las ramas.** Amplify le da a cada una su dirección:

- producción: `https://main.dj3nitc67fx2s.amplifyapp.com` (y `cuentasconmigo.misspili.com.mx`)
- desarrollo: `https://dev.dj3nitc67fx2s.amplifyapp.com`
- QA: `https://qa.dj3nitc67fx2s.amplifyapp.com`

Qué quedó **separado** entre ambientes: usuarios que inician sesión, personas, cobros, fotos, funciones y sus direcciones públicas.
Qué **se comparte** (cuidado): la configuración de la app en la consola de Amplify, como las reglas de reenvío y, si no se separan, los secretos de Pey.

## Qué se cambió en el código (y por qué)

1. **`amplify/backend.ts` – CORS por rama.** La función de inscripción solo aceptaba peticiones desde las direcciones de producción, así que la inscripción por QR **habría fallado** en dev y qa. Ahora cada rama permite su propia dirección `https://<rama>.<appId>.amplifyapp.com`. Producción queda **exactamente igual** que antes. Si algún día dev/qa tienen dominio propio, se agrega en la variable `CORS_EXTRA_ORIGINS` (separadas por coma).
2. **Cinta de color en dev/qa** (`src/entorno.ts`, `vite.config.ts`). En cualquier ambiente que no sea producción aparece una cinta naranja arriba ("DESARROLLO — no es la app real"), el título de la pestaña lleva el nombre y *Más opciones* muestra la versión con el ambiente. Es para que nadie cobre por error en una copia de prueba. Producción no cambia en nada.
3. **Enlaces largos en dev/qa** (`src/App.tsx`). La regla `/p/<*>` de Amplify es de **toda la app**, no por rama, y apunta a la función de **producción**. Sin este cambio, dev y qa habrían mandado enlaces cortos que terminan en producción y "ya no sirven". Ahora usan siempre el enlace largo de su propia función.
4. **`.github/workflows/ci.yml` – revisión automática.** En cada *pull request* hacia `dev`, `qa` o `main` (y en cada subida a dev/qa) GitHub corre `npm test` y `npm run build`. Si algo se rompe, se ve en rojo **antes** de mezclar. No usa AWS ni secretos; el que despliega sigue siendo Amplify.

## Lo que hay que hacer en la consola de AWS (una sola vez)

Esto lo hace quien tiene acceso a la cuenta de AWS (el asistente no pudo: las credenciales del entorno no son válidas). Son unos 15 minutos de trabajo y ~10 minutos de espera por ambiente.

**Paso 0 – Las ramas.** `dev` y `qa` deben existir en GitHub (nacen de `main`). Con ellas ya creadas:

**Paso 1 – Secretos, ANTES de conectar la rama (el paso más importante).** Amplify → la app → **Hosting → Secret management → Manage secrets**. Un secreto puede ser de **una rama** o de **todas las ramas**, y una rama sin valor propio **hereda el de todas las ramas**.

- **Revisa primero el alcance de `PEY_API_KEY` y `PEY_WEBHOOK_SECRET`.** Si hoy están como *All branches*, dev y qa **heredarían la llave real de Pey y podrían cobrar dinero de verdad**, y además el despliegue no fallaría ni avisaría. En ese caso: deja el valor real solo para la rama `main`, y crea valores propios para `dev` y `qa` **antes** de conectarlas.
- **dev y qa:** un texto cualquiera, por ejemplo `sin-pey`. La app funciona entera menos pedir cobros por CoDi (muestra el error claro de siempre). Así **es imposible mover dinero** desde ahí. (Si el secreto no existiera para la rama, entonces sí falla el primer despliegue.)
- **Pey no tiene entorno de pruebas aparte** (ver `docs/ARQUITECTURA.md`): cualquier llave real, aunque se use con la CLABE de prueba, sale de la **misma cuenta de Pey de producción** y mueve dinero real que CoDi no deshace. Por eso lo recomendado es dejar qa también sin Pey real.

**Paso 2 – Conectar la rama.** Amplify → la app → **Hosting → Branches → Add branch** (o *Connect branch*) → elegir `dev` → *Save and deploy*. Repetir con `qa`. Tardan ~10 minutos cada una. Al terminar, cada rama muestra su dirección.

**Paso 3 – Protegerlas.** **Hosting → Access control**: poner usuario y contraseña a `dev` y `qa` (que no las vea cualquiera, y que Google no las indexe). Ojo: la página pública de inscripción por QR (`/?i=`) también pedirá esa contraseña a quien pruebe desde otro celular; las funciones públicas (webhook, enlaces de compartir) no se ven afectadas.

**Paso 4 – Usuarios.** Cada ambiente empieza **vacío**. Entrar a su dirección y crear una cuenta nueva (correo y contraseña) en cada una; las de producción no existen ahí.

**Paso 5 – Pey en qa (opcional, no recomendado todavía).** Antes de hacer nada, **confirma con Pey que una cuenta admite varios webhooks**: si solo admite una URL, registrar la de qa **reemplaza la de producción** y `main` deja de recibir los avisos de pago. Si admite varios, registra la URL de ese ambiente (sale en su `amplify_outputs.json` como `custom.peyWebhookUrl`), guarda el `whsec_…` nuevo en el secreto de la rama qa y haz *Redeploy this version*. Mientras no esté confirmado, deja qa con el valor de mentira.

**Recomendado en GitHub** (Settings → Branches): proteger `main` para que solo reciba cambios por *pull request* con el CI en verde.

## Cómo se trabaja a diario

1. Crear una rama de trabajo desde `dev`: `git checkout dev && git checkout -b feature/lo-nuevo`.
2. Abrir *pull request* hacia `dev`. Con el CI en verde, mezclar. En ~10 min se ve en la dirección de dev.
3. Cuando esté bien, *pull request* de `dev` a `qa`. Probar en un celular, de principio a fin (inscripción por QR, cobro, comprobante, baja).
4. Si QA pasa, *pull request* de `qa` a `main`. Producción se actualiza sola.
5. Si algo sale mal en producción: en Amplify → rama `main` → versión anterior → **Redeploy this version**.

## Qué no cubre esto (para que no haya sorpresas)

- **Los datos no se copian** de producción a dev/qa, a propósito (hay teléfonos y CLABEs reales).
- **Una migración de datos** nueva se prueba primero en dev/qa; los datos de ahí son de mentira, así que es seguro experimentar.
- **Costo:** cada ambiente agrega Lambda, DynamoDB y Cognito, que cobran por uso; sin tráfico el costo es casi cero. El aviso de presupuesto mensual de la cuenta sigue cubriendo todo.
- **Dominio propio** para dev/qa: no está configurado; usan `*.amplifyapp.com`. Si algún día lo agregas (por ejemplo `dev.cuentasconmigo…`), pon esa dirección en la variable de entorno `CORS_EXTRA_ORIGINS` de esa rama (Hosting → Environment variables) y vuelve a desplegar, o la inscripción por QR fallará por CORS.
