Cofradar es una web app responsive/PWA para seguir la Semana Santa de Sevilla desde la calle. Se usa de pie, andando, entre mucha gente, con **una mano**, a pleno sol de abril o de madrugada. Herramienta de campo + personalidad editorial sobria. No debe parecer app de transporte, logística ni web de hermandad.

Esta referencia contiene **solo fundamentos**. Los componentes (tarjeta de cofradía, botones, chips de alteración, navegación, bottom sheet) son el issue siguiente. Donde el documento de sistema no fija un valor, aquí pone **NO DEFINIDO** y no se rellena.

## Las cinco reglas

1. **Ningún significado depende solo del color.** Todo estado, confianza o relación usa al menos dos canales: color + texto + icono + forma.
2. **Lo que pasa en la calle va en colores semánticos** (`--cf-live`, `--cf-warn`, `--cf-alert`, `--cf-info`, `--cf-idle`). **Lo que has hecho tú va en granate** (`--cf-brand`). Inviolable.
3. **El granate es identidad, nunca información.** Nunca para estados, alertas ni botón primario. El primario es **tinta** (`--cf-text` de relleno, `--cf-text-inverse` encima).
4. **Si algo tiene sombra, está realmente por encima de otra cosa.** La elevación es información.
5. **El trazo discontinuo significa siempre provisionalidad o estimación.** Jamás decorativo.

**Prohibido:** morado, dorado, símbolos religiosos, ornamentación barroca, sepia, texturas envejecidas, rústico. Cálido no significa nada de eso.

**Personalidad visual — los cuatro ingredientes:** base funcional de herramienta de campo · personalidad editorial sobria · gamificación con lenguaje social y de juego, solo en sus momentos · modo oscuro trabajado a fondo, pero claro por defecto.

## Arquitectura de tokens

Tres capas. La forma canónica son variables CSS nativas: `components/bundle.css` (copiada íntegra en la sección *Capa de tokens · CSS*).

1. **Primitivos** — `--cf-neutral-200`, `--cf-granate-600`… Valores crudos. **Nunca** en un componente.
2. **Semánticos** — `--cf-bg`, `--cf-surface`, `--cf-live`… **Los componentes consumen exclusivamente esta capa.**
3. **De componente** — solo para un valor propio irreducible. Se evitan; no hay ninguno.

| Selector | Remapea |
| --- | --- |
| `:root` | primitivos + semánticos · tema claro · registro funcional |
| `[data-register="editorial"]` | superficies, bordes y espaciado |
| `[data-theme="dark"]` | todos los semánticos |
| `[data-contrast="max"]` | solo contraste, bordes y pesos |

Nombres: `--cf-<capa>-<rol>-<variante>-<estado>`. Los estados son atributos de datos, nunca clases: `data-fase="en_calle"`, `data-confianza="estimado"`, `data-relacion="dar-fe"`, `data-verificacion="no-verificable"`.

## Color

**Primitivos.** Neutro cálido (0–1000, `900` = TINTA) es la columna vertebral del registro funcional. Cera (50–400, 900, 950) es exclusiva del registro editorial. Granate (50–900) es identidad: `granate-600` marca en claro, `granate-300` marca en oscuro. Verde, ámbar, rojo y azul (50/100/300/400/500/600/700) son estados: en claro, el -600 es icono, borde y trazo, y el **texto sube al -700** (AAA); en oscuro, el -300 es estado y texto; el -400 es relleno vivo de mapa.

**Granate ≠ rojo.** Nunca adyacentes en el mismo componente; si una pantalla necesita marca y alerta a la vez, la marca se retira a tinta. El mecanismo de separación cambia con el tema:

- **Claro: tono + luminosidad.** `granate-600` (tono 346°, luminancia 4,4 %) frente a `rojo-600` (tono 5°, luminancia 8,1 %): el granate es más oscuro.
- **Oscuro: tono + saturación.** `granate-300` (tono 351°, saturación 54 %) frente a `rojo-300` (tono 5°, saturación 82 %): el granate es menos saturado. granate-300 es más oscuro que rojo-300 (31,5 % vs 32,8 %), pero el ratio entre ambos es 1,03:1: la diferencia existe y es imperceptible. **En oscuro no se puede confiar en que se distingan por claridad**; la separación la cargan tono, saturación y el canal de forma. `granate-300` no se oscurece: `granate-400` queda por debajo de AA sobre las superficies oscuras (3,74:1 sobre surface).

**Semánticos** — claro·funcional | claro·editorial | oscuro·funcional | oscuro·editorial:

| Token | Claro · func. | Claro · edit. | Oscuro · func. | Oscuro · edit. |
| --- | --- | --- | --- | --- |
| `--cf-bg` | neutral-50 | cera-100 | neutral-950 | cera-950 |
| `--cf-surface` | neutral-0 | cera-50 | neutral-900 | cera-900 |
| `--cf-surface-sunken` | neutral-100 | cera-200 | neutral-1000 | #15100B |
| `--cf-surface-raised` | neutral-0 | cera-50 | #262220 | #2E251C |
| `--cf-border` | neutral-200 | cera-300 | #332E29 | #3A2F24 |
| `--cf-border-strong` | neutral-300 | cera-400 | #4A443D | #55473A |
| `--cf-border-interactive` | neutral-600 | neutral-600 | neutral-500 | neutral-500 |
| `--cf-text` | neutral-900 | neutral-900 | #F5F1EA | #F7F0E4 |
| `--cf-text-secondary` | neutral-700 | neutral-700 | #C4BCB0 | #C9BFAE |
| `--cf-text-muted` | neutral-600 | neutral-600 | #9A9287 | #9E9385 |
| `--cf-text-inverse` | neutral-50 | neutral-50 | neutral-950 | neutral-950 |
| `--cf-brand` | granate-600 | granate-600 | granate-300 | granate-300 |
| `--cf-brand-strong` | granate-700 | granate-700 | granate-200 | granate-200 |
| `--cf-brand-soft` | granate-50 | granate-50 | granate-900 | granate-900 |
| `--cf-brand-border` | granate-100 | granate-100 | granate-500 | granate-500 |

**Bordes:** `--cf-border` y `--cf-border-strong` son **separadores de contenido** (tarjetas, filas, paneles que ya se distinguen por superficie y elevación); no se les exige 3:1 y no se tocan. Usa `--cf-border-interactive` **solo** cuando el borde es lo único que identifica un control (campos de formulario, chips de filtro, conmutadores). Se remapea por tema, medido contra el peor fondo de cada registro: claro `neutral-600` (5,17 funcional · 4,67 editorial), oscuro `neutral-500` (4,37 funcional · 4,16 editorial). `neutral-500` no sirve en claro editorial (2,91) ni `neutral-600` en oscuro (2,72 / 2,60). En contraste máximo, claro → `neutral-700`, oscuro → `neutral-400`: en claro se oscurece, en oscuro se aclara, el mismo principio que la elevación y el granate.

**Estados operativos** (idénticos en ambos registros). `--cf-<estado>` es el color del **icono, el borde y el trazo**; `--cf-<estado>-text` es el color del **texto** del estado, que es información crítica.

| Token | Claro (base / text / soft / border) | Oscuro (base / text / soft / border) | Significa |
| --- | --- | --- | --- |
| `--cf-live` | verde-600 / verde-700 / verde-50 / verde-100 | verde-300 / verde-300 / #13301F / verde-700 | en_calle y confirmaciones |
| `--cf-warn` | ambar-600 / ambar-700 / ambar-50 / ambar-100 | ambar-300 / ambar-300 / #3A2A08 / ambar-700 | retraso, adelanto, inminente, atención |
| `--cf-alert` | rojo-600 / rojo-700 / rojo-50 / rojo-100 | rojo-300 / rojo-300 / #3A1512 / rojo-700 | incidencia, cancelada, crítico |
| `--cf-info` | azul-600 / azul-700 / azul-50 / azul-100 | azul-300 / azul-300 / #0E2838 / azul-700 | información neutra, contexto de jornada |
| `--cf-idle` | neutral-600 / neutral-700 / neutral-100 / neutral-200 | #9A9287 / #C4BCB0 / #201C19 / #332E29 | prevista, finalizada, no_procesiona |

Texto de estado sobre su -soft en claro: live 8,84 · warn 9,18 · alert 9,11 · info 9,53 · idle 8,60:1 (AAA).

**Acciones** — claro | oscuro: `--cf-primary-bg` neutral-900 | #F5F1EA · `--cf-primary-bg-hover` neutral-800 | neutral-200 · `--cf-primary-bg-active` neutral-950 | neutral-300 · `--cf-danger-bg` rojo-600 | rojo-300 · `--cf-danger-bg-hover` y `-active` rojo-700 | rojo-100 · `--cf-surface-hover` surface-sunken | surface-raised · `--cf-overlay` rgb(29 26 22 / .55) | rgb(14 12 10 / .60). Texto sobre primario y peligro: `--cf-text-inverse`.

**Principio · la dirección del refuerzo se invierte con el tema.** En claro se oscurece, en oscuro se aclara. Pasa en tres sitios: la elevación, `--cf-border-interactive` y los fondos de acción (en oscuro el primario ES la superficie clara; el peligro sube a rojo-100 porque rojo-400 dejaría el texto en 3,92:1).

`--cf-live-vivid`, `--cf-warn-vivid`, `--cf-alert-vivid`, `--cf-info-vivid` (los -400): **solo** rellenos de marcador y trazos de mapa, donde el fondo es cartografía. Nunca texto.

## Los dos registros

No son temas: son dos modos del mismo tema, que se diferencian en **calor** y **aire**.

- **Funcional** (por defecto): Ahora, Jornada, mapa, horarios, tarjetas densas, estados, incidencias, controles, formularios. Casi blanco, contraste máximo, `--cf-space-1`…`--cf-space-4`, solo Inter, densidad alta.
- **Editorial**: ficha de hermandad, cabeceras de identidad, Mi tramo, celebración posterior a «Dar fe», portadas de jornada. Hacia cera y albero, contraste alto (nunca bajo AA), `--cf-space-6`…`--cf-space-16`, Inter + Newsreader en títulos y nombres, densidad baja.

Declara `data-register="editorial"` en el **contenedor** (pantalla o sección). Los componentes heredan y no lo declaran. Prohibido alternarlo componente a componente. En oscuro el registro se conserva: funcional en negro-tinta neutro, editorial en marrón-tinta. **No hay tokens de espaciado por registro, ni debe haberlos**: es una regla de uso sobre la misma escala.

## Tipografía

`--cf-font-sans` (Inter) para **todo dato**: horarios, distancias, estados, recorridos, botones, navegación, incidencias, formularios. En datos, `font-feature-settings: "tnum" 1, "cv05" 1` (`--cf-font-features-data`). `--cf-font-serif` (Newsreader) para nombres de hermandades, cabeceras editoriales, fichas, celebración y cifras de hito; **nunca para decorar**. Nunca una tercera familia. Ambas autoalojadas en `fonts/` (variables, subconjunto latino, `font-display: swap`).

| Token | px / interlineado | Uso |
| --- | --- | --- |
| `--cf-text-xs` | 12/16 | Metadatos, frescura, etiquetas cortas. Uso restringido |
| `--cf-text-sm` | 14/20 | Texto secundario, contenido de chips |
| `--cf-text-base` | 16/24 | Cuerpo. Mínimo para texto que haya que leer |
| `--cf-text-lg` | 18/26 | Nombre de hermandad, tarjeta compacta |
| `--cf-text-xl` | 20/28 | Nombre de hermandad, tarjeta estándar |
| `--cf-text-2xl` | 24/32 | Títulos de sección |
| `--cf-text-3xl` | 30/38 | Cabecera editorial · Newsreader |
| `--cf-text-4xl` | 36/44 | Ficha de hermandad, celebración · Newsreader |

Datos (tabulares, peso 600/700, nunca Newsreader salvo cifra de hito), tamaño/interlineado con `--cf-leading-data-*`: `--cf-data-sm` 14/20 horas en listas densas · `--cf-data-md` 18/24 hora protagonista · `--cf-data-lg` 24/30 dato principal del bottom sheet · `--cf-data-xl` 32/38 puntos y celebración. Solo la escala de datos tokeniza su interlineado: es la que cuadra en columnas y fija el ritmo de fila.

Pesos Inter: 400 cuerpo (`--cf-weight-body`), 500 énfasis (`--cf-weight-emphasis`), 600 datos/etiquetas de estado/botones (`--cf-weight-data`), 700 cifras críticas y títulos funcionales (`--cf-weight-critical`). Newsreader: 400 cuerpo editorial, 600 títulos, cursiva disponible.

Nada por debajo de 12px en ningún componente, tema o breakpoint. Toda la escala en rem. Mayúsculas sostenidas solo en etiquetas de una o dos palabras, con `--cf-tracking-caps` (0.04em). Los nombres de hermandad no se truncan a media palabra: hasta dos líneas antes de elipsis.

## Espaciado, radios, bordes y elevación

Espaciado base 4: `--cf-space-1` 4 (icono↔texto) · `-2` 8 (interior de chips) · `-3` 12 (entre líneas de tarjeta) · `-4` 16 (interior de tarjeta, margen lateral móvil) · `-5` 20 · `-6` 24 (entre tarjetas, interior de paneles) · `-8` 32 (entre bloques) · `-10` 40 · `-12` 48 (entre secciones y **altura táctil mínima**, `--cf-touch-min`) · `-16` 64 (aire editorial).

Radios contenidos: `--cf-radius-sm` 6 (botones, campos, **chips de estado y badges funcionales**) · `-md` 10 (tarjetas) · `-lg` 14 (paneles) · `-xl` 20 (bottom sheet arriba, modales) · `-full` 999 (avatares, insignias, pill). `radius-full` **no** va en badges de estado: la pill es gamificación o algo funcionalmente justificado (avatar, conmutador).

Bordes: `--cf-border-width` 1px · `--cf-border-width-strong` 1.5px (chips críticos, marcadores de mapa) · `--cf-border-width-max` 2px (solo contraste máximo) · `--cf-accent-bar` 3px (barra de acento izquierda de la banda de contexto y del aviso: «este bloque lleva un estado»).

Elevación con tinta cálida con alfa (`--cf-shadow-tint: 29 26 22`), nunca negro puro:

| Nivel | Claro | Oscuro | Uso |
| --- | --- | --- | --- |
| `--cf-elev-0` | solo borde | solo borde | todo lo que vive en el flujo |
| `--cf-elev-1` | sombra mínima + borde | surface-raised + borde | cabeceras fijas |
| `--cf-elev-2` | sombra media + borde | surface-raised + border-strong | controles y chips sobre el mapa, popovers |
| `--cf-elev-3` | sombra marcada + borde | surface-raised + border-strong + realce interior `--cf-elev-3-dark-edge` (`inset 0 1px 0 rgb(245 241 234 / .08)`) | bottom sheet, modales, celebración |

**En oscuro no hay sombras**: `--cf-elev-1` y `-2` valen `none`; `--cf-elev-3` es solo el realce interior, no una sombra. Superficies **opacas** siempre sobre el mapa: prohibidos desenfoque, translucidez y glassmorphism.

Escala Z: `--cf-z-base` 0 · `-sticky` 10 · `-action` 20 · `-nav` 30 · `-sheet` 40 · `-modal` 50 · `-toast` 60.

## Iconografía

Phosphor (thin, light, regular, bold, fill, duotone; rejilla 24). Peso y relleno son canales redundantes al color. `--cf-icon-sm` 16 (siempre **bold**) · `-md` 20 · `-lg` 24 · `-xl` 32. **fill** = activo, seleccionado o verificado; **regular** = inactivo o no verificable. **duotone** no se usa en la capa funcional. Un icono que comunique un estado importante va siempre con texto.

**Set propio de Cofradar — NO DEFINIDO, no se dibuja:** `cruz-de-guia`, `paso-de-misterio`, `palio`, `nazareno`, `banda`, `templo`, `recorrido`, `cola`. Los marcadores de mapa no son iconos (anatomía propia, icono dentro) y no se diseñan aquí. Fase `en_calle`: Phosphor `path` (alternativa `footprints`), **provisional**; nunca un pin, porque una cofradía ocupa calle y avanza. Desfase: Phosphor `clock-counter-clockwise`.

## Movimiento

`--cf-dur-instant` 80ms (pulsación) · `-fast` 140ms (chips, hover, foco) · `-base` 200ms (general) · `-sheet` 280ms (bottom sheet) · `-slow` 320ms (celebración media). Curvas: `--cf-ease-out` `cubic-bezier(.2,.8,.25,1)` es la **curva por defecto** de todo el sistema (empieza rápido y frena: se percibe como «llega»); el bottom sheet entre alturas usa ease-out con imanes. `--cf-ease-in-out` `cubic-bezier(.4,0,.2,1)` se reserva a lo que **va y vuelve por el mismo camino**: conmutadores, chips que alternan entre dos estados equivalentes y fundidos cruzados. En la capa funcional el movimiento confirma o explica; nunca entretiene. La gamificación tiene licencia plena. `prefers-reduced-motion: reduce` se respeta siempre y ninguna información desaparece: `--cf-dur-base`, `-sheet` y `-slow` pasan a 0ms; `instant` y `fast` se conservan (feedback de pulsación y de foco). Desaparecen `transform`, `scale` y los desplazamientos de panel, que se resuelven en su estado final.

## Breakpoints (valores candidatos)

`base` < 640 · `md` 640–1023 · `lg` 1024–1439 · `xl` ≥ 1440. Describen espacio disponible, no dispositivos. Ancho e interacción son ejes independientes: `@media (pointer: coarse)` → objetivos ≥ 48px y sin hover; `@media (hover: hover) and (pointer: fine)` → hover y atajos. Una tablet horizontal entra en paneles y **sigue** necesitando 48px. El responsive cambia presentación y prioridad, nunca capacidades; móvil es la referencia; no hay componentes exclusivos de escritorio; texto y listas con ancho máximo (`--cf-measure-max` 42rem para texto, `--cf-panel-max` 28rem para el panel de lista), el mapa aprovecha el resto; en grande, más información simultánea, nunca distinta.

## Confianza del dato · canal de TRAZO

| Nivel | Dato | Trazo |
| --- | --- | --- |
| confirmado | `21:40` | continuo |
| estimado (incluye *probable*) | `21:40 · según horario` | discontinuo (`--cf-dash-pattern` 6 4; mapa `--cf-dash-pattern-map` 10 6) |
| desactualizado | `21:40 · hace 23 min` | discontinuo + icono de desfase; antigüedad siempre visible |

La coletilla de confianza y frescura («· según horario», «· hace 23 min») es información crítica: va en `--cf-text-secondary`, **nunca** en `--cf-text-muted`, que queda para metadatos no críticos. La atenuación solo refuerza: un estimado puede ir algo menos pesado, nunca por debajo del contraste mínimo. Prohibido comunicar incertidumbre con opacidad, contraste o difuminado. Pasado su umbral, Cofradar deja de afirmar: muestra el último dato con su hora y dice que no hay información reciente. Umbrales de **posición en tiempo real** (candidatos): vigente < 10 min · desactualizado 10–30 min · deja de afirmarse > 30 min. Horario previsto, hitos e información operativa: **NO DEFINIDO**. Grosor de trazo: **NO DEFINIDO**; provisional, 2px en componentes y 4–6px en el segmento de mapa.

## Verificación de «Dar fe» · canal de RELLENO

Aportación verificada = marca **rellena**; no verificable = **la misma marca en contorno**. No comparte código con el trazo: trazo = estimación, relleno = verificación, independientes y combinables. Donde importe, añade texto «Verificado» / «No se pudo verificar».

## Sincronización ≠ frescura

La última sincronización de Cofradar va en un indicador global de cabecera. La frescura de un dato va junto al dato, cuando importe para decidir. Sincronizado hace un minuto no significa que la posición sea de hace un minuto.

## Tema y contraste

Dos ejes, cuatro combinaciones: `data-theme` (light · dark; por defecto, la preferencia del sistema; una elección manual prevalece y se recuerda) y `data-contrast` (normal · max; por defecto normal; elección manual persistente, nunca inferida). **No hay cambio automático por hora.**

`data-contrast="max"` solo toca legibilidad: `--cf-text-muted` → valor de `--cf-text-secondary`; `--cf-border-width` → 2px; `--cf-weight-emphasis` 500 → 600; `--cf-weight-data` 600 → 700; anillo de foco 2px → 3px; `--cf-border-interactive` → `neutral-700` en claro y `neutral-400` en oscuro; texto de estado: **solo cambia en oscuro**, al -100 de su familia (en claro ya está en AAA, 8,6–9,5:1, y el refuerzo lo dan grosor de borde, peso e icono); iconos regular → bold. Nunca cambia tamaños de forma general ni reorganiza: la memoria espacial se conserva.

**Invariancia semántica:** claro, oscuro y máximo contraste no cambian el significado de ningún código. Verde sigue siendo positivo, granate capa personal, discontinuo provisionalidad, relleno/contorno verificación.

El oscuro también es cálido: todo deriva de la tinta cálida, sin negros ni grises azulados. El granate tiene variante propia en oscuro (`granate-300`).

## Accesibilidad

AA (4.5:1) mínimo general; **AAA (7:1) objetivo para la información crítica**, definida por la función del dato: estado actual de una cofradía, hora protagonista, retrasos y adelantos relevantes, alteraciones e incidencias, avisos importantes, acciones primarias, lo que dice si un dato es estimado o desactualizado, y cualquier información cuya mala lectura lleve a una decisión equivocada en la calle. A pleno sol, 4.5:1 de laboratorio rinde mucho menos.

- Foco visible siempre: `--cf-focus-ring-width` 2px (3px en contraste máximo) en `--cf-focus-ring-color` (= `--cf-text`) con `--cf-focus-ring-offset` 2px.
- Teclado completo, tabulación lógica, foco atrapado en modales y liberado al cerrar.
- Objetivos táctiles de 48px cuando `pointer: coarse`, no por ancho.
- Nada bajo 12px; 16px para leer; todo en rem; zoom y texto del sistema no rompen nada.
- Fase, alteraciones, confianza y frescura se exponen como **texto** a lectores de pantalla. `aria-live="polite"` para refrescos, `assertive` solo para incidencias críticas.
- Vertical y horizontal; nada bloqueado a una orientación.

### Excepción documentada · texto de estado sobre -soft en oscuro

En oscuro, texto de estado sobre su -soft: warn 7,31 (AAA) · info 7,01 (AAA, por un margen mínimo: si algún valor de esa familia se mueve, hay que volver a medirlo) · idle 8,99 (AAA, con `--cf-idle-text` #C4BCB0) · **live 6,95 (AA)** · **alert 5,83 (AA)**.

La excepción queda **solo para live y alert**, que **no se fuerzan a AAA**: oscurecer la -soft le quita el tinte que comunica el estado, y aclarar el texto pierde la separación de tono frente al granate. Es una decisión tomada, no un defecto pendiente. Con contraste máximo, el texto sube al -100 de su familia (10,4–11,3:1).

## Biblioteca de componentes (B-03)

Los componentes viven en `components/<Nombre>/` (preview en claro y oscuro + guía) y sus estilos en `components/bundle.css`, después de la capa de tokens. **Consumen solo la capa semántica**: no definen tokens. Los estados van en atributos de datos (`data-fase`, `data-confianza`, `data-alteracion`, `data-relacion`, `data-verificacion`, `data-densidad`, `data-variant`, `data-size`, `data-tipo`, `data-estado`, `data-propia`). Las medidas propias de cada pieza (chip 24/28, botón 36/44/52, barra 56, rail 80/240, progreso 6, avatar 24–64, tirador 32×4, opción 56) son especificación local, no tokens. La barra de acento sí es token (`--cf-accent-bar`) porque dos componentes la comparten con el mismo significado.

- **Estado:** Chip de estado (15 combinaciones reales de fase × confianza), Chip de alteración.
- **Cofradía:** Tarjeta de cofradía (compacta, estándar, expandida), Marca de relación (dos ejes).
- **Acciones y formularios:** Botón, Campo de formulario, Chip de filtro y selector de día.
- **Avisos:** Banda de contexto de jornada, Aviso e incidencia, Toast.
- **Contenedores:** Tarjeta de información, Bottom sheet / panel de ficha, Modal.
- **Navegación:** Barra inferior y rail, Franja de acción contextual.
- **Datos y selección:** Barra de progreso, Avatar, Selector de elemento.
- **Gamificación:** Contador de puntos e indicador de nivel, Insignia de logro, Tarjeta de reto, Fila de clasificación.

Reglas que gobiernan todos: ningún significado solo por color; trazo = confianza del dato, relleno = verificación de dar fe (canales independientes); el granate es lo que has hecho tú, nunca información ni botón primario; se etiqueta lo bueno, nunca lo malo; táctil ≥48, nada bajo 12px, foco visible siempre.

**Decidido en B-03:** `proxima_entrada` → warn (igual que `inminente`); alteraciones: retraso, adelanto, cambio de recorrido → warn · incidencia, interrumpida, regreso anticipado → alert. Peligro: `--cf-danger-bg` con texto inverso, uso excepcional. Hover/active con tokens semánticos por tema (`--cf-primary-bg-*`, `--cf-danger-bg-*`, `--cf-surface-hover`), nunca filtros ni primitivos. «Dar fe» en `en_calle` y `proxima_entrada`; sin acción en `prevista`, `finalizada`, `cancelada`, `no_procesiona`. La marca de relación abre el bloque de identidad, delante del nombre. Chip: 24/28 son alturas base; si no cabe, la coletilla nunca se toca, se abrevia la fase («En calle») y, si aún no cabe, el chip crece a dos líneas sin moverse de sitio. Modal: `--cf-overlay`, sin desenfoque; en oscuro separa poco, limitación aceptada. Selector de día: fondo = selección, peso + marca = hay información. El relleno solo significa verificación dentro de «Dar fe». Progreso de recorrido: espacial (La Macarena 02:40: 1.396 de 2.172 m = 64 %, itinerario de ida). Cifras de gamificación: datos de ejemplo, sin canon.

**Pendiente (NO DEFINIDO):** acción de `inminente` (no se dibuja); abreviaturas de fase distintas de «En calle»; abreviaturas exactas de las alteraciones (se puede quitar la palabra genérica, nunca la cifra); cuándo es crítica una banda de contexto; caducidad del aviso de usuarios; grosor definitivo de trazo; cifras de la economía. **Provisional:** iconos Phosphor de fase, alteración, relación, navegación y selector; nombres de nivel, catálogo de logros y retos.

## Marco de la aplicación · armazón global (sustituye a B-04)

Fichas en «Marco · armazón global». El contenido es siempre relleno gris: el encargo es el chasis.

- **Cinco destinos**, en este orden y todo el año: Inicio · Mapa · Cofradías · Agenda · Mi Cofradar. Icono + etiqueta siempre visibles; columnas de 78 px a 390; «Mi Cofradar» cabe sin abreviar. Activo: icono relleno + texto principal + barra de 2 px. Sin hamburguesa ni menú lateral; la barra no se oculta.
- **«Dar fe» no es destino.** Vía rápida: la franja de acción, encima de la barra, botón en tinta abajo a la derecha (zona del pulgar). Solo aparece si el estado real de la jornada da algo de lo que dar fe (y el toque está disponible); sin ella no queda hueco. Descartados: botón flotante y botón central en la barra.
- **Cabecera**: zona del marco. Siempre sincronización (formato e icono NO DEFINIDOS) y búsqueda global con texto, a la derecha. Cada pantalla compone la izquierda y una segunda fila opcional (día, filtros, título).
- **Secundarias**: la barra se queda con el destino de origen activo; vuelta arriba a la izquierda con flecha + nombre de la pantalla anterior (además del atrás del sistema y el toque en el destino activo); título en segunda fila; sobreviven sincronización y búsqueda.
- **Sheet**: se apoya sobre la barra, tapa la franja, nunca la navegación. Modal con `--cf-overlay` bajo el sheet; no modal (mapa) sin capa. Se cierra con «Cerrar», arrastre, toque en la capa o atrás.
- Capas: cabecera `--cf-z-sticky`, contenido `--cf-z-base`, franja `--cf-z-action`, barra `--cf-z-nav`, sheet `--cf-z-sheet`. Áreas seguras `env(safe-area-inset-*)`; 47/34 px son fixture.
- Nada del chasis depende de ubicación ni de cuenta. En anchos grandes, rail con los mismos cinco destinos (composición en paneles: T-04).

**Pendiente de arrastre:** la cabecera del Mapa (R-02) todavía no lleva el selector de jornada de la composición 5c.

## Ruta Inicio (R-12 · BUL-161, integra Ahora)

Fichas en «Ruta · Inicio». Sustituyen a las de Ahora (BUL-125): se conserva todo salvo la jerarquía visual. Inicio contesta «¿qué puedo ver ahora?» con o sin ubicación; la proximidad enriquece sin sustituir.

- Orden por cuánto cambia cada cosa lo que harás en los próximos minutos: banda de contexto → **Incidencias** (un aviso crítico nunca queda por debajo de contenido que no lo es) → **Cerca** (solo con posición útil) → **En la calle** → **A punto de ocurrir** → «Mientras no estabas» (transitorio, sin estado vacío).
- **Un sujeto por pantalla**: tarjeta estándar con aire, nombre en Newsreader a `--cf-text-3xl` en su propia fila bajo el chip, cifras a `--cf-data-lg`, borde `--cf-border-strong`. El resto, filas compactas sin caja separadas por filete; encabezados de bloque como etiqueta pequeña. Sin sombra, sin estado seleccionada, sin granate, sin foto. Con ubicación, el sujeto es La Macarena; sin ella, la primera de «En la calle» (El Gran Poder).
- **Un solo «Dar fe»**: con la franja presente, la tarjeta sujeto no lleva acción.
- Una cofradía, una vez; `finalizada` no aparece (Agenda). Sin rejilla de accesos: el contenido lleva a su sitio. Sin destacados, retos, logros ni llamadas a contribuir. Sin invitación a la ubicación.
- Sin actividad: una línea y lo siguiente que ocurre, sin franja. Fuera de temporada (fecha de ejemplo 8/10/2026): 164 días al Domingo de Ramos, acceso a la programación y lo tuyo.
- NO DEFINIDO: formato e icono de sincronización; «Dar fe» en `inminente`; representación sin cobertura; margen útil del próximo punto; cifras de puntos.

## Ruta Mapa (R-02)

Fichas en «Ruta · Mapa». Siete estados de una misma pantalla (más fuera de temporada) y tres ampliaciones. Tema claro, registro funcional. El subsistema de mapa es lo único que R-02 crea: tokens de componente `--cf-map-*` en `bundle.css`.

- Una cofradía en la calle es un **segmento**: el tramo que ocupa el cortejo, contenedor de cruz de guía → paso de Cristo → palio → final. Siempre estimación. Se la puede alcanzar por la cola.
- **Marcador** propio: flecha con muesca (la dirección es la forma), centrado en la cabeza; 32 / 40 seleccionado / 40 agrupación; superficie opaca, halo, borde en color de estado 2px; continuo = confirmado, discontinuo = estimado o desactualizado (mismo código que chip y segmento). Desactualizado lleva su edad siempre. Relación granate arriba a la izquierda; alteración más grave arriba a la derecha. Sale pronto y finalizada: círculo, sin segmento.
- **Recorrido** (nivel 2): realizado continuo `--cf-live` 3px · pendiente discontinuo neutro 3px · segmento 8px (alma `-vivid` 4px, casing 2px). Las demás cofradías siguen visibles fuera de foco.
- **Agrupación**: cuántas + la alteración más grave. Cabezas en el mismo punto se agrupan a cualquier zoom.
- **Cabecera** de la ruta: filtros, sincronización y búsqueda. Único control flotante: centrar en mi ubicación.
- **Franja y sheet**: la acción contextual del sheet medio ocupa el sitio exacto del botón de la franja; nunca dos «Dar fe» a la vez.
- Sin desenfoque, translucidez ni degradados en el mapa; la incertidumbre va en el trazo, la marca textual y la frescura.
- PROPUESTA A VALIDAR: grosores, patrón fijo en px de pantalla a cualquier zoom, umbral de agrupación (40px), sheet asomado 64 / 168px, color del pendiente (`neutral-600` en lugar de `--cf-border-strong`).
- Cartografía y trazados esquemáticos: las cabezas cumplen las distancias del fixture; el callejero no es el real.

## Ruta Cofradías

Fichas en «Ruta · Cofradías». El directorio de hermandades, todo el año; no depende de la jornada y no pide ubicación ni cuenta.

- Cabecera: título «Cofradías» + sincronización + búsqueda global (armazón); segunda fila, **campo de búsqueda siempre presente** (nombre popular, por el comienzo de cualquier palabra); tercera fila, filtros «Todas» · «En la calle» · «Mis seguidas».
- Agrupación por jornada (DECISIÓN A VALIDAR): con jornada activa, la del día primero («Madrugá · hoy»); si no, orden de la semana. Rótulos iguales a los de Inicio, pegados al hacer scroll. Orden interno alfabético sin artículo (DECISIÓN A VALIDAR).
- Fila sin caja, separada por filete: marca de relación + nombre popular en Newsreader + chip a la derecha a la altura del nombre (§9.4); alteración debajo si existe. Sin punto/hora, sin proximidad, sin acción. Todas las filas pesan igual.
- Sin resultados: frase en llano + un botón de salida (buscar en todas / borrar búsqueda).
- Fuera de temporada: misma fila sin chip y sin franja.
- Relleno gris rotulado donde el fixture no trae hermandades. Choque abierto: conviven la búsqueda global del armazón y el campo del directorio.
