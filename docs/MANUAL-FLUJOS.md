# Manual de flujos de «Cuentas conmigo»

Este manual dibuja **cada tarea de principio a fin**, con los nombres que de verdad tienen las pantallas y los botones de la app. Está hecho leyendo el código (`src/`), no de memoria. Los diagramas se ven directamente en GitHub.

**Cómo está organizado**

1. [Quién usa qué](#1-quién-usa-qué): hay dos mundos y conviene no mezclarlos.
2. [Flujos de la persona mayor](#2-flujos-de-la-persona-mayor) (mínimos, con y sin llavero).
3. [Flujos de quien asiste](#3-flujos-de-quien-asiste): cobrar, dar de alta, aprobar inscripciones, editar y corregir, llaveros, baja, cuentas.
4. [Índice «quiero hacer…»](#4-índice-quiero-hacer) para encontrar cualquier tarea en un vistazo.
5. [Dónde alguien se puede perder](#5-dónde-alguien-se-puede-perder): lo que encontré al mapear, con propuestas.

**Cómo leer los diagramas:** los rectángulos son pantallas (el texto es el título que se ve); los óvalos son acciones de una persona; los rombos son decisiones; el color verde es el final bueno y el rojo es un aviso o un callejón con salida.

---

## 1. Quién usa qué

Hay **dos tipos de persona** y la app los trata distinto:

| | **Persona mayor** (quien paga) | **Quien asiste** (quien cobra y configura) |
|---|---|---|
| ¿Tiene cuenta en la app? | **No.** Nunca inicia sesión. | **Sí**: correo y contraseña. |
| ¿Qué toca en la app? | Casi nada: una página pública solo si se inscribe o recibe un enlace. | Todo: cobrar, dar de alta, aprobar, corregir. |
| ¿Cómo paga? | Con su banco (escanea el código QR de CoDi) o en efectivo. Si alguien le ayuda, esa persona recibe el código. | — |
| ¿Qué lleva consigo? | Su **llavero NFC** (opcional). | Su celular con la app. |

**Idea central:** el llavero lo acerca **quien asiste**, con *su* celular, no la persona mayor. Así la persona mayor no necesita saber usar ninguna app.

```mermaid
flowchart LR
  P(["Persona mayor<br>sin cuenta"])
  A(["Quien asiste<br>con cuenta"])
  P -->|"lleva su llavero"| K["Llavero NFC"]
  K -->|"lo acerca al celular"| A
  P -->|"se inscribe con un QR o enlace"| I["Página pública de inscripción"]
  I -->|"queda en espera de aprobación"| A
  A -->|"manda código o comprobante por WhatsApp"| L["Página del enlace<br>imagen del código o comprobante"]
  L -->|"lo ve"| P
  P -->|"escanea el código con su banco"| B[("Banco<br>CoDi")]
  B -->|"aviso de pago"| A
```

---

## 2. Flujos de la persona mayor

Lo que hace la persona mayor es **mínimo**: mostrar el llavero (o decir su nombre) y pagar. Todo lo demás lo hace quien asiste.

### 2.1 Pagar su mensualidad, **con llavero NFC**

```mermaid
flowchart TD
  S(["Llega al taller"]) --> L["Entrega o muestra su llavero"]
  L --> T["Quien asiste lo acerca<br>a la parte de atrás de su celular"]
  T --> D{"¿La app reconoce<br>el llavero?"}
  D -->|"sí"| P["Se abre sola la pantalla<br>de cobros de esa persona"]
  D -->|"no"| E["Aviso: el llavero no abre un cobro<br>ver 2.4"]
  P --> C["Quien asiste toca el cobro del mes<br>y luego Mostrar código para pagar"]
  C --> Q["Aparece el código QR de CoDi"]
  Q --> B(["La persona lo escanea con su banco<br>o su familiar lo paga desde su celular"])
  B --> OK["La app muestra Ya pagó<br>se actualiza sola en unos segundos"]
  OK --> R(["Recibe su comprobante por WhatsApp<br>opcional"])
  style OK fill:#d7f5dc,stroke:#2e7d32
  style E fill:#fde0e0,stroke:#c62828
```

Lo que hace la persona mayor: **1)** muestra el llavero, **2)** paga con su banco o en efectivo. Nada más.

### 2.2 Pagar su mensualidad, **sin llavero**

```mermaid
flowchart TD
  S(["Llega al taller"]) --> N["Dice su nombre<br>o quien asiste reconoce su dibujo o foto"]
  N --> W["Quien asiste toca Cobrar<br>pantalla A quién cobrar"]
  W --> P["Toca el nombre de la persona<br>se abre su pantalla de cobros"]
  P --> C["Toca el cobro del mes<br>y luego Mostrar código para pagar"]
  C --> Q["Aparece el código QR de CoDi"]
  Q --> B(["La persona lo escanea con su banco"])
  B --> OK["Ya pagó"]
  style OK fill:#d7f5dc,stroke:#2e7d32
```

Desde el punto de la pantalla *Cobros de una persona*, **los dos caminos son idénticos**: el llavero solo se ahorra los dos primeros toques de quien asiste.

### 2.3 Inscribirse sola, con un código QR o un enlace

La persona (o quien le ayuda) abre el QR o el enlace que quien asiste le dio. No necesita cuenta.

```mermaid
flowchart TD
  S(["Escanea el QR o abre el enlace<br>de inscripción"]) --> A{"¿Está abierta la<br>inscripción?"}
  A -->|"no"| X["Inscripciones cerradas<br>Pregunta a quien da el taller"]
  A -->|"sí"| N["¿Cómo te llamas?<br>nombre completo"]
  N --> I["Su imagen<br>elige un dibujo o se toma una foto<br>la foto pide permiso"]
  I --> T["Tu WhatsApp<br>10 números"]
  T --> H["Quién le ayuda a pagar<br>y a quién se le mandan los códigos"]
  H --> R["Revisa y confirma<br>Enviar inscripción"]
  R --> F{"¿Hay lugar?"}
  F -->|"sí"| OK["Ya quedó tu inscripción<br>quien da el taller la va a revisar<br>todavía no te cobran"]
  F -->|"no"| W["Te anotamos en lista de espera"]
  R -.->|"muchos intentos"| M["Intenta más tarde"]
  style OK fill:#d7f5dc,stroke:#2e7d32
  style W fill:#fff3cd,stroke:#b58900
  style X fill:#fde0e0,stroke:#c62828
  style M fill:#fde0e0,stroke:#c62828
```

La inscripción **solo registra**: no manda cobros ni mensajes. Nada pasa hasta que quien asiste la aprueba (ver 3.3).

### 2.4 Cuando el llavero no abre un cobro

El aviso lo ve **quien asiste** (no la persona mayor), y siempre tiene una salida clara.

```mermaid
flowchart TD
  T(["Se acerca un llavero al celular"]) --> S{"¿Quien asiste<br>ya inició sesión?"}
  S -->|"no"| LG["Pide correo y contraseña<br>y después abre la persona"]
  LG --> D
  S -->|"sí"| D{"¿Qué pasa con ese código?"}
  D -->|"es de alguien activo"| OK["Se abre su pantalla de cobros"]
  D -->|"llavero desactivado"| A1["Este llavero está desactivado<br>Se marcó como perdido"]
  D -->|"la persona se dio de baja"| A2["Esa persona ya no está activa"]
  D -->|"nadie tiene ese código"| A3["No reconocemos este llavero<br>otro taller, o se cambió por uno nuevo"]
  A1 --> V["Botón Ver el llavero de la persona<br>ahí se puede activar de nuevo"]
  A1 --> H1["Botón Ir al inicio"]
  A2 --> H1
  A3 --> H1
  style OK fill:#d7f5dc,stroke:#2e7d32
  style A1 fill:#fde0e0,stroke:#c62828
  style A2 fill:#fde0e0,stroke:#c62828
  style A3 fill:#fde0e0,stroke:#c62828
```

> Por probar en un teléfono real: el paso «pide correo y contraseña y después abre la persona» se deduce del código (la dirección del llavero se conserva durante el inicio de sesión), pero no se ha visto funcionar.

### 2.5 Si quien paga es un familiar (quien ayuda)

Algunas personas no pagan ellas mismas: les ayuda otra persona. La app lo guarda al dar de alta (hasta 3 personas, con nombre y relación) y la persona elige **a quién** se le manda todo.

```mermaid
flowchart TD
  C["Quien asiste muestra el código<br>Mostrar código para pagar"] --> W["Mandar el código por WhatsApp<br>imagen del código"]
  W --> E["WhatsApp abre el chat del número elegido<br>quien asiste toca Enviar<br>nada se manda solo"]
  E --> F["El familiar toca el enlace<br>y ve el código completo"]
  F --> G{"¿Lo abrió en el mismo celular<br>con el que va a pagar?"}
  G -->|"no"| P(["Escanea el código con su banco"])
  G -->|"sí"| H["La página explica tres salidas:<br>1 abrirlo en otra pantalla<br>2 guardar la imagen en fotos y usarla desde el banco<br>3 pedir a quien cobra la solicitud al celular"]
  H --> P
  P --> OK["Ya pagó"]
  style OK fill:#d7f5dc,stroke:#2e7d32
```

---

## 3. Flujos de quien asiste

### 3.0 Mapa de la app: de dónde sale cada cosa

Todo parte de **Inicio** (el de cada proyecto). Hay solo **cuatro entradas** y una cuenta aparte.

```mermaid
flowchart TD
  L(["Inicia sesión"]) --> PR["Tus proyectos"]
  PR -->|"elige uno"| H["INICIO del proyecto"]
  PR -->|"Crear mi primer proyecto<br>o Nuevo proyecto"| NP["Nuevo proyecto"]
  H -->|"Cobrar"| W["A quién cobrar"]
  H -->|"Agregar persona"| AP["Nueva persona<br>4 pasos"]
  H -->|"Aprobar inscripciones"| SE["Quién tiene lugar<br>solo lo que espera respuesta"]
  H -->|"Más opciones"| M["Más opciones<br>3 páginas: Ver más"]
  H -->|"Agregar cuenta<br>solo si no hay ninguna"| AC["Nueva cuenta"]
  M -->|"página 1"| R["Reporte del mes"]
  M -->|"página 1"| PE["Personas"]
  M -->|"página 1"| PL["Lugares e inscripciones"]
  M -->|"página 1"| LL["Imágenes y llaveros"]
  M -->|"página 2"| VM["Ver mejor<br>voz, letra y colores"]
  M -->|"página 2"| CU["Cuenta que recibe"]
  M -->|"página 3"| CP["Cambiar de proyecto o Nuevo proyecto"]
  M -->|"página 3"| SA["Salir"]
  M -->|"página 3"| ZP["Zona de peligro<br>al final y discreta"]
  T(["Se acerca un llavero"]) -.->|"abre directo"| PC["Cobros de la persona"]
  W --> PC
  PE -->|"persona"| PD["Sus datos"]
  PC -->|"Sus datos"| PD
  PD -->|"Cobrarle"| PC
```

**Cobros y datos de una persona están conectados en los dos sentidos:** desde *Cobros de la persona* hay un botón **Sus datos**, y desde *Sus datos* hay un botón **Cobrarle**. No hace falta salir a *Más opciones* para corregir algo en medio de un cobro.

**Regla del mapa:** *cobrar a alguien* tiene tres entradas (Cobrar, Sus datos → Cobrarle, o el llavero), pero **las tres llegan a la misma pantalla** (*Cobros de la persona*) y de ahí el camino es uno solo.

### 3.1 Primera vez: dejar la app lista para cobrar

Se hace **una sola vez**. Sin cuenta que reciba, solo se puede anotar efectivo.

```mermaid
flowchart TD
  S(["Crea su cuenta de la app<br>correo y contraseña"]) --> P["Crear mi primer proyecto<br>nombre del taller"]
  P --> H["Inicio"]
  H --> A["Agregar cuenta<br>nombre corto, titular, CLABE de 18 números"]
  A --> R["Registrar para cobrar<br>se manda a revisar en Pey"]
  R --> D{"¿Pey ya la activó?"}
  D -->|"todavía no"| E["Cuenta en espera de Pey<br>botón Revisar si ya está lista<br>mientras tanto solo efectivo<br>una CLABE real tarda hasta 5 días hábiles"]
  E --> D
  D -->|"sí"| OK["Cuenta lista<br>ya se puede cobrar por CoDi"]
  OK --> L["Más opciones, Lugares e inscripciones<br>Activar lugares: cupo y cobros<br>inscripción única, mensualidad"]
  L --> Q["Código para inscribir<br>QR y enlace para compartir"]
  Q --> G(["Ya puede dar de alta o recibir inscripciones"])
  style OK fill:#d7f5dc,stroke:#2e7d32
  style E fill:#fff3cd,stroke:#b58900
```

### 3.2 Realizar un cobro (el flujo principal)

```mermaid
flowchart TD
  H["INICIO"] -->|"Cobrar"| W["A quién cobrar<br>lista de personas con su dibujo o foto"]
  LL(["Se acerca el llavero"]) -.-> PC
  W -->|"toca a la persona"| PC["Cobros de la persona<br>cada cobro con su estado"]
  PC -->|"toca un cobro pendiente"| CH["¿Cómo paga?"]
  PC -->|"Cobro extraordinario"| NC["Nuevo cobro<br>concepto, monto, cuenta"]
  NC --> CH
  CH --> CAN{"¿La cuenta que recibe<br>está lista?"}
  CAN -->|"no"| AV["Aviso: aún no está lista<br>solo se puede anotar efectivo"]
  AV --> EF
  CAN -->|"sí"| M{"¿Cómo va a pagar?"}
  M -->|"Mostrar código para pagar"| QR["Muestra el código<br>QR de CoDi"]
  M -->|"Pedir el pago a su celular"| SOL{"¿Tiene varias personas<br>que le ayudan?"}
  M -->|"Ya lo recibí en efectivo"| EF["¿Recibiste el monto?<br>cuéntalos antes de confirmar"]
  SOL -->|"sí"| CT["A quién le pedimos el pago"]
  SOL -->|"no"| WA
  CT --> WA["Esperando el pago"]
  QR -->|"Mandar el código por WhatsApp"| SQ["Mandar el código como imagen"]
  SQ -->|"Volver al código"| QR
  QR -->|"Revisar si ya pagó<br>también se revisa solo"| PA
  WA -->|"Revisar si ya pagó"| PA
  WA -->|"Pedirlo a otra persona"| CT
  WA -->|"Mostrar el código otra vez"| QR
  WA -->|"Ya lo recibí en efectivo"| EF
  QR -->|"Ya lo recibí en efectivo"| EF
  EF -->|"Sí, ya lo recibí"| PA["YA PAGÓ"]
  PA -->|"Enviar comprobante"| RC["Comprobante<br>Compartir imagen o Guardar imagen"]
  PA -->|"Siguiente persona"| W
  RC --> W
  style PA fill:#d7f5dc,stroke:#2e7d32
  style AV fill:#fff3cd,stroke:#b58900
```

#### Corregir un cobro

Un cobro se puede corregir (el monto y para qué es) **mientras no se haya mandado a pagar**. Una vez mandado, el código **caduca a las 24 horas** (lo que dura el QR en Pey) y solo entonces se puede volver a corregir.

```mermaid
stateDiagram-v2
  [*] --> SinMandar: se crea el cobro
  SinMandar --> SinMandar: Corregir este cobro
  SinMandar --> Mandado: Mostrar código o Pedir el pago
  Mandado --> Pagado: la persona paga
  Mandado --> Caducado: pasan 24 horas sin pagar
  Caducado --> SinMandar: Corregir este cobro, se desliga el código viejo
  Caducado --> Mandado: mandar un código nuevo, mismo monto
  SinMandar --> Pagado: Ya lo recibí en efectivo
  Pagado --> [*]
```

- **Dónde:** *¿Cómo paga?* → **Corregir este cobro** (el botón solo aparece cuando se puede). Si ya se mandó, la pantalla dice hasta qué hora sirve el código.
- **Los cobros que vienen del plan del proyecto** (inscripción, mensualidad) solo permiten cambiar el **monto**: la app los reconoce por su nombre y, si se cambiara, volvería a ofrecer el cobro del mes como pendiente.
- **Protección del dinero:** si alguien paga un código viejo después de que el cobro se corrigió con otro monto, el aviso de Pey **no lo marca como pagado** (queda registrado en el servidor para revisarlo en Pey). Así el monto que figura nunca difiere del que se pagó.
- La cuenta que recibe no se cambia en un cobro ya creado.

**Qué hay que saber:**
- **El código QR es la vía principal.** La solicitud al celular a veces no llega a todos los bancos (lo dice la propia pantalla).
- El pago **se detecta solo**: la app revisa cada pocos segundos y pasa sola a *Ya pagó* cuando Pey avisa. El botón *Revisar si ya pagó* es por si el aviso se perdió.
- El **efectivo** siempre está disponible y pide confirmar el monto antes de guardarlo. El dinero de CoDi no se puede deshacer; el efectivo sí.
- Si algo falla, aparece un cuadro rojo con el motivo en palabras claras y tres salidas: *Intentar de nuevo*, *Volver* o *Ir al inicio*.

### 3.3 Dar de alta una persona nueva

Hay **dos formas** de que una persona entre a la lista. Ambas terminan en lo mismo: una persona activa con su imagen.

```mermaid
flowchart TD
  subgraph MANUAL["Forma 1: la da de alta quien asiste, con la persona presente"]
    H1["INICIO o A quién cobrar<br>Agregar persona"] --> A1["Paso 1 Nueva persona<br>nombre completo y WhatsApp"]
    A1 --> A2["Paso 2 Su imagen<br>dibujo o foto con permiso"]
    A2 --> A3["Paso 3 Cómo paga<br>desde su celular o con ayuda<br>hasta 3 personas y a quién se manda"]
    A3 --> A4["Paso 4 Revisa y guarda"]
    A4 --> OKM["Persona guardada<br>aparece en Personas"]
  end
  subgraph QRF["Forma 2: se inscribe sola con el QR"]
    Q1["La persona llena la inscripción<br>ver 2.3"] --> Q2["Llega a Aprobar inscripciones"]
    Q2 --> Q3{"Quien asiste decide"}
    Q3 -->|"Aprobar"| OKQ["Lugar apartado<br>y se ofrece el cobro rápido de inscripción"]
    Q3 -->|"No aceptar"| NO["Se quita la inscripción"]
    Q3 -->|"lista llena"| WL["Lista de espera<br>botón Darle lugar cuando hay"]
    WL --> OKQ
  end
  OKM --> FIN(["Ya se le puede cobrar y activar su llavero"])
  OKQ --> FIN
  style FIN fill:#d7f5dc,stroke:#2e7d32
  style NO fill:#fde0e0,stroke:#c62828
```

Tras **aprobar**, el lugar queda apartado un número de días. Mientras no pague, el cobro sigue pendiente; cuando pasa el plazo, quien asiste decide entre **Dejar N días más** y **Dar de baja**:

```mermaid
flowchart TD
  P["Inscrita, en espera de aprobar"] -->|"Aprobar"| H["Lugar apartado<br>por N días"]
  P -->|"No aceptar"| X["Se quita la inscripción"]
  L["En lista de espera"] -->|"Darle lugar"| H
  L -->|"Quitar de la lista"| X
  H -->|"paga el cobro"| E["Con lugar confirmado"]
  H -->|"vence el plazo"| V["Apartado vencido"]
  V -->|"Dejar N días más"| H
  V -->|"Dar de baja"| B["Dada de baja"]
  E -->|"Dar de baja"| B
  style E fill:#d7f5dc,stroke:#2e7d32
  style B fill:#fde0e0,stroke:#c62828
  style X fill:#fde0e0,stroke:#c62828
```

### 3.4 Editar a una persona y corregir datos

**Una sola pantalla de correcciones: *Sus datos*.** Se llega desde *Más opciones → Personas → (la persona)* o con el botón **Sus datos** dentro de los cobros de la persona. De ahí salen todas las correcciones y también **Dar de baja**.

```mermaid
flowchart TD
  M["Más opciones"] --> PE["Personas<br>lista"]
  PE -->|"toca a la persona"| PD["Sus datos<br>muestra qué le falta"]
  PD -->|"Corregir su nombre o WhatsApp"| E1["Corregir sus datos<br>nombre completo y WhatsApp de 10 números"]
  PD -->|"Corregir quién le ayuda<br>o Agregar quién le ayuda"| E2["Quién le ayuda<br>cambiar, completar o quitar<br>y a quién se mandan los códigos"]
  PD -->|"Cobrarle"| PC["Cobros de la persona"]
  PC -->|"Sus datos"| PD
  PD -->|"Dar de baja"| BJ["Advertencia y confirmación<br>ver 3.6"]
  E1 -->|"Guardar"| OK["Listo, se guardaron sus datos<br>vuelve a Sus datos"]
  E2 -->|"Guardar"| OK
  OK --> PD
  style OK fill:#d7f5dc,stroke:#2e7d32
```

**Qué se puede y qué no se puede corregir hoy:**

| Dato | ¿Se puede corregir? | Dónde |
|---|---|---|
| Nombre y WhatsApp de la persona | Sí | *Cobros de la persona* o *Más opciones → Personas* → **Sus datos** → *Corregir su nombre o WhatsApp* |
| Quién le ayuda, su relación y a quién se mandan los códigos | Sí | Sus datos → *Corregir quién le ayuda* |
| A quién se le pide el pago de **un cobro** | Sí | En el cobro → *Pedir el pago por CoDi* → *A quién le pedimos el pago* |
| Su dibujo o foto | **No** (solo se elige un dibujo si aún no tiene) | Imágenes y llaveros → la persona → *Elegir un dibujo* |
| Monto y concepto de un cobro (en los del plan, solo el monto) | **Sí**, si no se ha mandado a pagar o si su código ya caducó (24 h) | En el cobro → *Corregir este cobro* (ver 3.2) |
| La cuenta que recibe | Se puede registrar de nuevo en Pey o eliminar | Más opciones → *Cuenta que recibe* |

### 3.5 Llaveros NFC: activar, programar, perder, reemplazar

```mermaid
flowchart TD
  M["Más opciones<br>Imágenes y llaveros"] --> HUB["Imágenes y llaveros"]
  HUB -->|"Ver las imágenes"| LS["Lista de personas activas"]
  HUB -->|"Cómo programar los llaveros"| GU["Guía paso a paso<br>NFC Tools u otra app"]
  LS -->|"toca a la persona"| DT["Imagen del llavero"]
  DT --> S{"¿Qué estado tiene?"}
  S -->|"Sin llavero"| A["Activar llavero<br>crea su código"]
  S -->|"Llavero activo"| ON["Escribir en el chip<br>solo Chrome en Android"]
  S -->|"Llavero desactivado"| OFF["Activar de nuevo<br>si lo encontraste"]
  A --> ON
  ON --> ESC["Se lee primero el chip<br>vacío o de la misma persona: se graba<br>de otra persona o ajeno: pide confirmar"]
  ESC --> CH["Comprobar el chip<br>se vuelve a acercar y debe ser el suyo"]
  CH --> LISTO(["Chip listo: se entrega"])
  ON -->|"Desactivar: se perdió"| OFF
  ON -->|"Hacer un código nuevo"| NEW["El llavero viejo deja de funcionar<br>para siempre<br>para un llavero de reemplazo"]
  NEW --> ON
  DT -->|"Descargar imagen"| IMG["Imagen para imprimir<br>dibujo o foto"]
  DT -->|"Borrar un chip<br>solo Android"| BO["Deja el chip vacío<br>para usarlo otra vez"]
  style LISTO fill:#d7f5dc,stroke:#2e7d32
```

**Si el celular no puede escribir NFC** (iPhone): la pantalla lo dice y manda a la guía manual. La opción práctica es programar los chips una sola vez con un Android; **leerlos** en iPhone funciona normal.

### 3.6 Dar de baja a una persona

```mermaid
flowchart TD
  M["Más opciones<br>Lugares e inscripciones"] --> Q["Quién tiene lugar"]
  Q -->|"toca a la persona"| SD["Detalle de su lugar"]
  PD["Sus datos<br>desde Personas o Cobros"] -->|"Dar de baja"| C
  SD -->|"Dar de baja"| C["Advertencia<br>se borran su foto, teléfonos y notas<br>queda Nombre (baja) con sus cobros<br>si regresa, debe inscribirse de nuevo"]
  C -->|"Sí, dar de baja"| B(["Dada de baja<br>su lugar queda libre<br>su llavero deja de abrir"])
  C -->|"No, volver"| SD
  style B fill:#fde0e0,stroke:#c62828
```

> **Borrar de verdad** (todas las personas y cobros) existe, pero está lejos y escondido a propósito: *Más opciones → Zona de peligro*, con código que llega al correo.

### 3.7 Reporte del mes

*Más opciones → Reporte del mes* → ver el mes → **Mes anterior / Mes siguiente** → **Guardar como hoja de cálculo**. Muestra cada persona con lo pagado por CoDi y en efectivo.

---

## 4. Índice «quiero hacer…»

Cada tarea **empieza en un solo lugar**. Si hay otro camino, termina en la misma pantalla.

| Quiero… | Empiezo en… | Pasos | Diagrama |
|---|---|---|---|
| **Cobrarle a alguien** | Inicio → **Cobrar** (o acercar su llavero) | Persona → cobro → ¿Cómo paga? → código / celular / efectivo → Ya pagó | 3.2 |
| **Cobrar algo extra** (cooperación) | Cobros de la persona → **Cobro extraordinario** | Concepto y monto → ¿Cómo paga? | 3.2 |
| **Mandar el código o el comprobante** | En el cobro: **Mandar el código por WhatsApp** / **Enviar comprobante** | WhatsApp abre el chat; tú tocas Enviar | 2.5 |
| **Dar de alta a alguien presente** | Inicio → **Agregar persona** | 4 pasos | 3.3 |
| **Que alguien se inscriba solo** | Más opciones → Lugares e inscripciones → **Código para inscribir** | Mandar el enlace; esperar; aprobar | 2.3, 3.3 |
| **Aprobar una inscripción** | Inicio → **Aprobar inscripciones** (aparece con 🔔) | Aprobar / No aceptar | 3.3 |
| **Corregir nombre o teléfono** | **Sus datos** (botón en los cobros de la persona, o Más opciones → Personas → persona) → **Corregir su nombre o WhatsApp** | Guardar | 3.4 |
| **Corregir un cobro** (monto o para qué es) | En el cobro → **Corregir este cobro** | Solo si no se mandó a pagar o ya caducó (24 h) | 3.2 |
| **Cambiar quién le ayuda a pagar** | Más opciones → Personas → persona → **Corregir quién le ayuda** | Guardar | 3.4 |
| **Pedir el pago a otra persona de la familia** | En el cobro → **Pedir el pago por CoDi** → **A quién le pedimos** | Elegir | 3.2 |
| **Activar o programar un llavero** | Más opciones (página 1) → **Imágenes y llaveros** → persona | Activar → Escribir en el chip → Comprobar | 3.5 |
| **Reportar un llavero perdido** | Imágenes y llaveros → persona → **Desactivar: se perdió** | Después, **Hacer un código nuevo** para el reemplazo | 3.5 |
| **Dar de baja** | **Sus datos** → **Dar de baja** (o Lugares e inscripciones → Quién tiene lugar → persona) | Confirmar | 3.6 |
| **Registrar o cambiar la cuenta que recibe** | Más opciones → **Cuenta que recibe** | Registrar para cobrar → Revisar si ya está lista | 3.1 |
| **Ver cuánto se cobró** | Inicio (arriba) o Más opciones → **Reporte del mes** | Guardar como hoja de cálculo | 3.7 |
| **Cambiar de taller** | Más opciones → **Cambiar de proyecto** | Elegir | 3.0 |

---

## 5. Dónde alguien se puede perder

Al mapear todo encontré estos puntos. **Son hallazgos de lectura del código; ninguno está probado en un celular.** Los marcados ✅ ya se arreglaron en la app.

| # | Dónde | Qué pasaba | Estado |
|---|---|---|---|
| 1 | *Cobros de la persona* → corregir su teléfono | No había camino directo a *Sus datos*. | ✅ Botón **Sus datos** en los cobros de la persona. |
| 2 | *Sus datos* → imagen | No se puede cambiar el dibujo ni la foto de una persona ya creada. | Pendiente: agregar **«Cambiar su imagen»** (reusa el selector que ya existe). |
| 3 | Cobros | No se podía corregir el monto o el concepto de un cobro. | ✅ **Corregir este cobro**, con la regla de las 24 horas (ver 3.2). |
| 4 | Dar de baja | *Personas* decía «bajas» pero la baja no estaba ahí. | ✅ **Dar de baja** dentro de *Sus datos*, con la misma advertencia. |
| 5 | *Más opciones* | Los llaveros estaban en la segunda página. | ✅ *Imágenes y llaveros* ahora está en la página 1; la 2 queda con *Ver mejor* y *Cuenta que recibe*. |
| 6 | Llavero desactivado | El aviso ofrece **Ver el llavero**, pero no explica que ahí se activa de nuevo. | Pendiente: cambiar el texto del botón a **«Ver el llavero y activarlo de nuevo»**. |
| 7 | iPhone | Escribir chips no funciona desde la web; la pantalla lo dice pero no menciona el camino alterno. | Ya se avisa; si se decide app nativa para iPhone, este flujo se reemplaza. |

**Lo que sí está bien resuelto** (conviene no tocarlo): todos los caminos de cobro convergen en *Cobros de la persona*; el efectivo siempre está a un toque; el pago se detecta solo; los errores dicen el motivo y dan tres salidas; el borrado definitivo es difícil de tocar por error; la inscripción pública no puede cobrar.

---

## Cómo mantener este manual

Los diagramas son texto (Mermaid) en este mismo archivo, así que se versionan con el código. **Cuando cambie una pantalla o un botón, se actualiza aquí en el mismo pull request.** Si algo de este manual no coincide con la app, la app manda: avísame y se corrige.
