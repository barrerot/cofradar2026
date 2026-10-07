# Cofradar · Sistema de diseño

**Versión** 1.2 · **Fecha** 5 de octubre de 2026 · **Alcance** Cofradar completo para la Semana Santa de Sevilla, con el sistema preparado para otras ciudades
**Estado** Decisiones D1–D33 cerradas y alineado con el PRD. Cubre el **producto completo**: la distinción entre núcleo de lanzamiento y evolución rige el orden de desarrollo, no el alcance del diseño (§1). Las decisiones abiertas están registradas en el hito «Decisiones pendientes de producto» de Linear y referenciadas en §21. Los valores numéricos son *tokens iniciales*: se validan sobre componentes reales y, si fallan, se corrige el token de forma sistémica, nunca con excepciones locales.

---

## 0. Cómo usar este documento

Este documento es una **especificación de implementación**, no una guía de estilo inspiracional. Está escrito para que una herramienta de diseño o un agente de programación pueda aplicarlo sin interpretar decisiones ambiguas.

Reglas de lectura:

- Lo que aparece como **regla** es obligatorio y no se negocia componente a componente.
- Lo que aparece como **candidato** es un valor de partida acordado, modificable tras validación visual.
- Lo que aparece como **pendiente** no está decidido. No se debe inventar una solución: hay que preguntar.
- Si una decisión concreta de implementación contradice una regla de la sección 2, manda la regla.

Orden recomendado de implementación: tokens (§4) → temas (§5) → modelo de estados (§6) → confianza del dato (§7) → layout (§8) → componentes (§9) → mapa (§10).

### Relación con el PRD

Cofradar tiene dos documentos de referencia y no se solapan:

- **El PRD** (en Notion) define **qué hace Cofradar**: entidades, reglas de negocio, comportamiento, algoritmo y alcance.
- **Este documento** define **cómo se presenta e interactúa** con todo ello: jerarquía, componentes, patrones, estados visuales, responsive, accesibilidad y tokens.

Reglas de reconciliación: si una decisión de diseño cambia realmente una regla de producto, se actualiza el PRD; **si el PRD contiene una regla de producto que el diseño omitió, manda el PRD** y se actualiza este documento; y cualquier conflicto que implique cambiar una regla de negocio se plantea antes de resolverlo.

---

## 1. El producto, en lo que afecta al diseño

> **Este documento cubre Cofradar completo.** El PRD distingue núcleo de lanzamiento y evolución, y esa distinción rige **el orden de desarrollo**, no el alcance del diseño. Logros, retos, clasificaciones e identidad pública se diseñan igual que el resto: una pantalla no se deja sin definir porque su implementación vaya después.


Cofradar es una web app responsive para seguir la Semana Santa en la calle, con una capa participativa —la acción **«Dar fe»**— que registra la experiencia del usuario y, a la vez, alimenta el cálculo de la posición de las cofradías.

Seis condiciones del contexto real condicionan todas las decisiones de este documento. Cualquier propuesta de diseño debe superarlas:

| Condición | Consecuencia de diseño |
|---|---|
| **Se usa de pie, andando, entre mucha gente y con una mano** | Las acciones principales viven en la zona del pulgar. Cada toque cuesta el triple que sentado. Jerarquía por posición constante, no por tamaño. |
| **Luz solar directa de abril y, el mismo día, oscuridad casi total en la Madrugá** | Dos extremos de iluminación, ambos de uso máximo. Contraste alto obligatorio, nada de matices sutiles, tema oscuro de primera clase. |
| **Red saturada y GPS poco fiable en el casco antiguo** | La geolocalización nunca es obligatoria. Nunca se vacía una pantalla que tenía datos útiles. Persistencia local del último estado conocido. |
| **Los datos no son oficiales: salen de cuadrantes publicados y de estimación** | La honestidad del dato es una función de producto, no un detalle. Todo dato lleva su nivel de confianza y su frescura. |
| **Público de extremo a extremo: del cofrade que se sabe los cuadrantes al visitante que no conoce ningún nombre** | Toda pantalla necesita dos rutas de entrada: por identidad y por estado/tiempo. |
| **Es el mismo sistema con distinta intensidad según el contexto temporal**, no dos aplicaciones | La navegación es estable todo el año. Lo que cambia es el contenido y la presencia de acciones. |

---

## 2. Principios de diseño · reglas duras

Estas dieciocho reglas son el núcleo del sistema. Están ordenadas por frecuencia de aplicación, no por importancia.

1. **Ningún significado depende exclusivamente del color.** Todo estado, confianza o relación se comunica con al menos dos canales: color + texto + icono + forma.
2. **Lo que pasa en la calle se cuenta con colores semánticos. Lo que has hecho tú se cuenta en granate.** Es la separación entre capa operativa y capa personal, y es inviolable.
3. **El granate es identidad, nunca información.** No se usa para estados operativos, alertas ni como color de botón primario.
4. **Si algo tiene sombra en Cofradar, es porque realmente está por encima de otra cosa.** La elevación es información, no decoración.
5. **El trazo discontinuo significa siempre provisionalidad o estimación.** No se recicla nunca como recurso decorativo.
6. **Una actualización nunca borra información que todavía puede ser útil.**
7. **Persistir no es dar por vigente.** La caché permite mostrar; el sistema de confianza (§7) decide la validez.
8. **Cofradar debe poder decir «no lo sabemos».** Antes eso que una falsa sensación de precisión.
9. **Cofradar propone, el usuario confirma.** Jamás se registra una aportación de «Dar fe» automáticamente, ni con una candidata evidente.
10. **La geolocalización es una mejora, nunca una dependencia.** Toda función tiene una versión digna sin ubicación.
11. **La celebración nunca debe hacer que te pierdas aquello que estás celebrando.**
12. **El registro visual (funcional / editorial) se define a nivel de pantalla o sección, nunca componente a componente.**
13. **Newsreader no se usa para decorar.** Si la pantalla es funcional, manda Inter.
14. **El responsive cambia la presentación y la prioridad, nunca las capacidades.** Ninguna función esencial existe solo por haber pantalla grande.
15. **La identidad de Cofradar se percibe sin llenar la interfaz de símbolos religiosos ni tópicos visuales de Semana Santa.** Cálido no significa sepia, envejecido, rústico ni barroco.
16. **Cofradar no depende estructuralmente de moderación humana en tiempo real.** El producto no puede asumir que haya alguien atendiendo una cola de incidencias de madrugada. Si una alteración de alto impacto no puede publicarse con seguridad de forma automática, **el diseño expresa esa incertidumbre al usuario** antes de dar por hecho que hace falta una persona validándola.
17. **Se etiqueta lo bueno, nunca lo malo.** Una aportación que consolida puede llevar su marca; una que no, no lleva ninguna. **Nunca se muestra «rechazada»**: sería la acusación que el producto ha decidido no hacer, y la ausencia de medalla ya comunica lo que haya que comunicar.
18. **Cofradar nunca le dice al usuario qué debería estar viendo antes de preguntarle qué ve.** Nada se preselecciona ni se reordena según lo que el modelo espera encontrar. Ahorraría un toque y fabricaría la concordancia que luego se usa como corroboración, que es el círculo vicioso de §7 entrando por otra puerta.

### Personalidad visual

Cofradar combina cuatro ingredientes en proporciones fijas:

- **Base funcional: herramienta de campo.** Claridad, densidad alta, jerarquía fuerte, estados muy reconocibles.
- **Personalidad: editorial sobria.** Elegante y contemporánea, con carácter cofrade. **No debe parecer una app de transporte, logística o seguimiento de flotas, ni la web de una hermandad.**
- **Gamificación: lenguaje social y de juego, solo en sus momentos.** Puntos, niveles, progreso, celebración y, más adelante, logros, retos y clasificaciones. Fuera de ahí, en segundo plano.
- **Modo oscuro trabajado a fondo, pero claro por defecto.**

### Portadores de identidad, por orden

1. **Principal · la paleta de materiales.** Neutros cálidos inspirados en cera, piedra, albero, plata vieja y caoba. **Inspiración para construir la paleta, no colección literal de colores cofrades.**
2. **Secundario · la tipografía.** Inter en todo lo funcional; Newsreader selectiva en nombres de hermandades, cabeceras y momentos editoriales.
3. **Norma transversal · el lenguaje cofrade.** Ver §16.
4. **Dosis mínima · el detalle gráfico**, materializado en el set propio de iconos cofrades (§4.7) y en nada más.

---

## 3. Los dos registros

El sistema tiene **dos registros visuales**. No son temas: son dos modos del mismo tema, que se diferencian en **calor de la paleta** y **cantidad de aire**.

| | Registro `funcional` | Registro `editorial` |
|---|---|---|
| **Qué contiene** | Ahora, Jornada, mapa, horarios, tarjetas densas, estados, incidencias, controles, formularios | Ficha de hermandad, cabeceras de identidad, Mi tramo, celebración posterior a «Dar fe», portadas de jornada |
| **Calor** | Muy contenido, casi blanco | Perceptiblemente cálido hacia cera y albero |
| **Contraste** | Máximo | Alto, nunca por debajo de AA |
| **Espaciado** | Mitad baja de la escala (`space-1`–`space-4`) | Mitad alta de la escala (`space-6`–`space-16`) |
| **Tipografía** | Inter | Inter + Newsreader en títulos y nombres |
| **Densidad** | Alta: más datos por pantalla | Baja: el aire es parte del mensaje |

**Regla de aplicación.** El registro se declara en el contenedor con `data-register="funcional"` (valor por defecto) o `data-register="editorial"`, a nivel de pantalla o de sección. Los componentes **heredan** y no lo declaran. Está prohibido alternar registro componente a componente: produce la sensación de dos sistemas de diseño conviviendo.

**En modo oscuro el registro se conserva, invertido:** lo funcional usa el negro-tinta más neutro, lo editorial sube hacia un marrón-tinta perceptiblemente más cálido.

---

## 4. Design tokens

### Arquitectura de tokens · tres capas

Esta arquitectura es la que hace implementables los registros, los temas y el contraste sin duplicar componentes. **Los componentes consumen exclusivamente la capa 2.**

1. **Primitivos** — valores crudos. `--cf-neutral-200`, `--cf-granate-600`. Nunca se usan directamente en un componente.
2. **Semánticos** — rol en la interfaz. `--cf-surface`, `--cf-text`, `--cf-live`. Se **remapean** según `[data-theme]`, `[data-register]` y `[data-contrast]`.
3. **De componente** — solo cuando un componente necesita un valor propio irreducible. `--cf-marker-size`. Se evitan salvo necesidad.

```
:root                         → primitivos + semánticos del tema claro, registro funcional
[data-register="editorial"]   → remapea superficies, bordes y espaciado
[data-theme="dark"]           → remapea todos los semánticos
[data-contrast="max"]         → remapea solo contraste, bordes, pesos
```

Prefijo de todas las variables: `--cf-`.

### 4.1 Color · primitivos

**Neutro cálido, croma baja** — la columna vertebral del registro funcional.

| Token | Hex | |
|---|---|---|
| `--cf-neutral-0` | `#FFFFFF` | Blanco puro. Solo superficies funcionales en claro |
| `--cf-neutral-50` | `#FBF9F5` | Fondo funcional claro |
| `--cf-neutral-100` | `#F4F2ED` | Superficie hundida |
| `--cf-neutral-200` | `#E6E3DC` | Borde estándar |
| `--cf-neutral-300` | `#D4CFC6` | Borde reforzado |
| `--cf-neutral-400` | `#B3ADA3` | Deshabilitado, trazos secundarios |
| `--cf-neutral-500` | `#8C867C` | — |
| `--cf-neutral-600` | `#6A655C` | Texto atenuado (AA sobre `neutral-50`) |
| `--cf-neutral-700` | `#4A443C` | Texto secundario (AAA sobre `neutral-50`) |
| `--cf-neutral-800` | `#2B2722` | — |
| `--cf-neutral-900` | `#1D1A16` | **Tinta.** Texto principal, botón primario |
| `--cf-neutral-950` | `#15120F` | Fondo funcional oscuro |
| `--cf-neutral-1000` | `#0E0C0A` | Superficie hundida en oscuro |

**Cera, croma media** — exclusiva del registro editorial.

| Token | Hex | |
|---|---|---|
| `--cf-cera-50` | `#FDF9F1` | Superficie editorial claro |
| `--cf-cera-100` | `#F7F1E6` | Fondo editorial claro |
| `--cf-cera-200` | `#EFE6D5` | Superficie hundida editorial |
| `--cf-cera-300` | `#DFD3BE` | Borde editorial |
| `--cf-cera-400` | `#C9B896` | Acentos de superficie, separadores editoriales |
| `--cf-cera-900` | `#251E17` | Superficie editorial oscuro |
| `--cf-cera-950` | `#1C1712` | Fondo editorial oscuro |

**Granate** — identidad. Ver regla 3.

| Token | Hex | |
|---|---|---|
| `--cf-granate-50` | `#F9EBE9` | Superficie suave de marca, claro |
| `--cf-granate-100` | `#F1D6D4` | Borde suave de marca, claro |
| `--cf-granate-200` | `#E9AFB7` | — |
| `--cf-granate-300` | `#D97E8B` | **Marca en modo oscuro** |
| `--cf-granate-400` | `#B85566` | — |
| `--cf-granate-500` | `#8A2A3C` | — |
| `--cf-granate-600` | `#6E1C2F` | **Marca en modo claro** (AAA sobre `neutral-50`) |
| `--cf-granate-700` | `#58121F` | Estado presionado |
| `--cf-granate-900` | `#3A1A20` | Superficie suave de marca, oscuro |

**Semánticos de estado.** Los `-600`/`-700` son los únicos válidos para texto en claro (AAA). Los `-300`/`-400` son para texto en oscuro y para rellenos vivos en mapa.

| Familia | 50 | 100 | 300 | 400 | 500 | 600 | 700 |
|---|---|---|---|---|---|---|---|
| `--cf-verde-*` (positivo / en la calle) | `#E3F1E7` | `#C7E3D0` | `#5FC98B` | `#2E9E60` | `#1F7A4D` | `#15603B` | `#0E4A2D` |
| `--cf-ambar-*` (aviso / desvío) | `#FBF0D8` | `#F6E0AE` | `#E8B44D` | `#C78A0E` | `#9C5F00` | `#7A4800` | `#5E3700` |
| `--cf-rojo-*` (incidencia / crítico) | `#FBE9E6` | `#F6CFC9` | `#F0776B` | `#D33A2C` | `#B3261E` | `#9B2016` | `#7A1810` |
| `--cf-azul-*` (información neutra) | `#E4EFF6` | `#C4DCEB` | `#74B8E0` | `#2A7FB8` | `#1A6490` | `#14537A` | `#0F3F5C` |

> **Regla de separación granate / rojo.** Son los dos colores que más fácil se confunden y tienen significados incompatibles. **Nunca aparecen adyacentes en el mismo componente.** Si una pantalla necesita marca y alerta a la vez, la marca se retira a tinta.
>
> **El mecanismo de separación es distinto en cada tema, y eso es deliberado.**
>
> | Tema | Canales de separación | Medido |
> |---|---|---|
> | **Claro** | Tono + luminosidad. El granate es siempre **más oscuro** | `granate-600` tono 346° / lum. 4,4 % · `rojo-600` tono 4° / lum. 8,1 % |
> | **Oscuro** | Tono + **saturación**. El granate es siempre **menos saturado** | `granate-300` tono 351° / sat. 55 % · `rojo-300` tono 5° / sat. 82 % |
>
> **En oscuro la luminosidad no puede separarlos.** `granate-300` sí es más oscuro que `rojo-300` —31,5 % frente a 32,8 % de luminancia relativa—, pero el **ratio entre los dos es 1,03:1**: la diferencia existe y es imperceptible. Y no se puede ampliar: hacer el granate perceptiblemente más oscuro sobre fondo casi negro lo deja ilegible, porque `granate-400` da **3,74:1 sobre `--cf-surface`** y entre **3,24:1 y 4,21:1** según la superficie oscura — **por debajo de AA en todas ellas**. Por eso existe `granate-300` (§5) y por eso **en oscuro no se puede confiar en que se distingan por claridad**: la separación la cargan el tono y la saturación.
>
> Consecuencia de diseño: en oscuro, marca y alerta se apoyan además en el **canal de forma** —la marca de relación (§9.5) y el chip de alteración (§9.3) tienen anatomías distintas— y nunca solo en el color. Es la regla 1 aplicada aquí.

### 4.2 Color · semánticos

Lo que consumen los componentes. Columnas: valor en cada combinación de tema y registro.

| Token semántico | Claro · funcional | Claro · editorial | Oscuro · funcional | Oscuro · editorial |
|---|---|---|---|---|
| `--cf-bg` | `neutral-50` | `cera-100` | `neutral-950` | `cera-950` |
| `--cf-surface` | `neutral-0` | `cera-50` | `neutral-900` | `cera-900` |
| `--cf-surface-sunken` | `neutral-100` | `cera-200` | `neutral-1000` | `#15100B` |
| `--cf-surface-raised` | `neutral-0` | `cera-50` | `#262220` | `#2E251C` |
| `--cf-border` | `neutral-200` | `cera-300` | `#332E29` | `#3A2F24` |
| `--cf-border-strong` | `neutral-300` | `cera-400` | `#4A443D` | `#55473A` |
| `--cf-text` | `neutral-900` | `neutral-900` | `#F5F1EA` | `#F7F0E4` |
| `--cf-text-secondary` | `neutral-700` | `neutral-700` | `#C4BCB0` | `#C9BFAE` |
| `--cf-text-muted` | `neutral-600` | `neutral-600` | `#9A9287` | `#9E9385` |
| `--cf-text-inverse` | `neutral-50` | `neutral-50` | `neutral-950` | `neutral-950` |
| `--cf-brand` | `granate-600` | `granate-600` | `granate-300` | `granate-300` |
| `--cf-brand-strong` | `granate-700` | `granate-700` | `granate-200` | `granate-200` |
| `--cf-brand-soft` | `granate-50` | `granate-50` | `granate-900` | `granate-900` |
| `--cf-brand-border` | `granate-100` | `granate-100` | `granate-500` | `granate-500` |

Estados operativos (idénticos en ambos registros):

| Token semántico | Claro | Oscuro | Uso |
|---|---|---|---|
| `--cf-live` / `-soft` / `-border` | `verde-600` / `verde-50` / `verde-100` | `verde-300` / `#13301F` / `verde-700` | `en_calle`, confirmaciones |
| `--cf-warn` / `-soft` / `-border` | `ambar-600` / `ambar-50` / `ambar-100` | `ambar-300` / `#3A2A08` / `ambar-700` | `retraso`, `adelanto`, `inminente`, `proxima_entrada`, atención |
| `--cf-alert` / `-soft` / `-border` | `rojo-600` / `rojo-50` / `rojo-100` | `rojo-300` / `#3A1512` / `rojo-700` | `incidencia`, `cancelada`, crítico |
| `--cf-info` / `-soft` / `-border` | `azul-600` / `azul-50` / `azul-100` | `azul-300` / `#0E2838` / `azul-700` | Información neutra, contexto de jornada |
| `--cf-idle` / `-soft` / `-border` | `neutral-600` / `neutral-100` / `neutral-200` | `#9A9287` / `#201C19` / `#332E29` | `prevista`, `finalizada`, `no_procesiona` |

**Texto sobre superficie `-soft`.** Un chip de estado lleva **información crítica** (§14), así que su texto no usa el mismo valor que el icono o el trazo: usa un paso más oscuro en claro.

| Token | Claro | Oscuro | Medido en claro |
|---|---|---|---|
| `--cf-live-text` | `verde-700` | `verde-300` | 8,84:1 sobre `verde-50` |
| `--cf-warn-text` | `ambar-700` | `ambar-300` | 9,18:1 sobre `ambar-50` |
| `--cf-alert-text` | `rojo-700` | `rojo-300` | 9,11:1 sobre `rojo-50` |
| `--cf-info-text` | `azul-700` | `azul-300` | 9,53:1 sobre `azul-50` |
| `--cf-idle-text` | `neutral-700` | `#C4BCB0` | 8,60:1 sobre `neutral-100` |

Con el `-600` el mismo texto daba 5,2–6,9:1: cumple AA pero **se queda corto de AAA siendo información crítica**, y subir un paso no cuesta nada. `--cf-live`, `--cf-warn`, `--cf-alert` y `--cf-info` conservan su valor y siguen siendo los del **icono, el borde y el trazo**.

**Borde que identifica un control.**

| Token | Claro | Oscuro |
|---|---|---|
| `--cf-border-interactive` | `neutral-600` | `neutral-500` |

**Se remapea por tema, y la dirección del refuerzo se invierte.** Es el mismo principio que ya rige la elevación (§4.6) y el granate (§5): en claro se oscurece, en oscuro se aclara. Medido contra **el peor fondo de cada registro y tema**, que es el que decide:

| | Claro funcional | Claro editorial | Oscuro funcional | Oscuro editorial |
|---|---|---|---|---|
| Peor fondo | `sunken` `#F4F2ED` | `sunken` `#EFE6D5` | `raised` `#262220` | `raised` `#2E251C` |
| `neutral-500` | 3,23:1 | **2,91:1 ✗** | 4,37:1 | 4,16:1 |
| `neutral-600` | 5,17:1 | 4,67:1 | **2,72:1 ✗** | **2,60:1 ✗** |
| **Elegido** | `neutral-600` | `neutral-600` | `neutral-500` | `neutral-500` |

`neutral-500` fallaba en un caso real: un campo o un chip de filtro sobre `surface-sunken` del registro editorial daba **2,91:1**. Y `neutral-600` no sirve en oscuro, donde empeora el borde en lugar de mejorarlo.

`--cf-border` (1,28:1) y `--cf-border-strong` (1,55:1) son **separadores de contenido** y ese contraste es correcto para lo que hacen: delimitan tarjetas, filas y paneles que ya se distinguen por superficie y elevación. **No se tocan.** Pero cuando el borde es *lo único que identifica un control* —campos, chips de filtro, conmutadores— hace falta 3:1, y para eso está `--cf-border-interactive`. No cambia la paleta: usa un primitivo que ya existía.

Vivos, solo para rellenos de marcador y trazos de mapa, donde el fondo es cartografía y no superficie:

`--cf-live-vivid: verde-400` · `--cf-warn-vivid: ambar-400` · `--cf-alert-vivid: rojo-400` · `--cf-info-vivid: azul-400`

### 4.3 Tipografía

**Familias**

```css
--cf-font-sans: "Inter", "Inter var", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
--cf-font-serif: "Newsreader", Georgia, "Times New Roman", serif;
```

Ambas libres, variables y **autoalojadas**, subconjunto latino, `font-display: swap`. Inter con `font-feature-settings: "tnum" 1, "cv05" 1` en datos. Nunca se añade una tercera familia sin revisar este documento.

**Reparto.** Inter: horarios, distancias, estados, recorridos, botones, navegación, incidencias, formularios, todo dato. Newsreader: nombres de hermandades, cabeceras editoriales, fichas, celebración, cifras de hito. Ver regla 13.

**Escala de texto** (móvil; `rem` sobre raíz de 16px)

| Token | px / interlineado | rem | Uso |
|---|---|---|---|
| `--cf-text-xs` | 12 / 16 | 0.75 / 1.333 | Metadatos, frescura, etiquetas cortas. **Uso restringido: si no se lee, no pasa nada** |
| `--cf-text-sm` | 14 / 20 | 0.875 / 1.429 | Texto secundario, contenido de chips |
| `--cf-text-base` | 16 / 24 | 1 / 1.5 | Cuerpo. **Mínimo para texto que haya que leer** |
| `--cf-text-lg` | 18 / 26 | 1.125 / 1.444 | Nombre de hermandad, tarjeta compacta |
| `--cf-text-xl` | 20 / 28 | 1.25 / 1.4 | Nombre de hermandad, tarjeta estándar |
| `--cf-text-2xl` | 24 / 32 | 1.5 / 1.333 | Títulos de sección |
| `--cf-text-3xl` | 30 / 38 | 1.875 / 1.267 | Cabecera editorial · **Newsreader** |
| `--cf-text-4xl` | 36 / 44 | 2.25 / 1.222 | Ficha de hermandad, celebración · **Newsreader** |

**Escala de datos** — siempre cifras tabulares, peso 600 o 700, nunca Newsreader salvo cifra de hito.

| Token | px | Uso |
|---|---|---|
| `--cf-data-sm` | 14 | Horas en listas densas |
| `--cf-data-md` | 18 | Hora protagonista de la tarjeta |
| `--cf-data-lg` | 24 | Dato principal del bottom sheet |
| `--cf-data-xl` | 32 | Puntos obtenidos, cifras de celebración |

**Pesos.** Inter: 400 cuerpo · 500 énfasis · 600 datos, etiquetas de estado, botones · 700 cifras críticas y títulos funcionales. Newsreader: 400 cuerpo editorial · 600 títulos · cursiva disponible.

```css
--cf-weight-body:      400;
--cf-weight-emphasis:  500;
--cf-weight-data:      600;   /* datos, etiquetas de estado, botones */
--cf-weight-critical:  700;   /* cifras críticas, títulos funcionales */
```

**Interlineado de la escala de datos.** Sigue el mismo ritmo que la escala de texto, para que una cifra y una línea de texto puedan convivir en la misma fila sin descuadrarla.

```css
--cf-leading-data-sm: 20px;   /* con --cf-data-sm 14 */
--cf-leading-data-md: 24px;   /* con --cf-data-md 18 */
--cf-leading-data-lg: 30px;   /* con --cf-data-lg 24 */
--cf-leading-data-xl: 38px;   /* con --cf-data-xl 32 */
```

**Solo la escala de datos tokeniza su interlineado.** Es la que tiene que cuadrar en columnas y fijar el ritmo de fila; la de texto conserva su interlineado en la tabla de arriba porque un bloque de texto lo hereda del elemento y no necesita un valor nombrado.

**Reglas tipográficas**
- **Nada por debajo de 12px**, en ningún componente, tema o breakpoint.
- Toda la escala en `rem`. El zoom del navegador y el tamaño de letra del sistema deben funcionar sin romper el layout.
- Las mayúsculas sostenidas solo en etiquetas de una o dos palabras, con `letter-spacing: 0.04em`.
- Los nombres de hermandades no se truncan a media palabra: se permite hasta dos líneas antes de recortar con elipsis.

### 4.4 Espaciado

Base de 4px.

| Token | px | Uso típico |
|---|---|---|
| `--cf-space-1` | 4 | Icono ↔ texto |
| `--cf-space-2` | 8 | Interior de chips, separación mínima |
| `--cf-space-3` | 12 | Entre líneas de una tarjeta |
| `--cf-space-4` | 16 | Interior de tarjeta, margen lateral de pantalla en móvil |
| `--cf-space-5` | 20 | — |
| `--cf-space-6` | 24 | Entre tarjetas, interior de paneles |
| `--cf-space-8` | 32 | Entre bloques |
| `--cf-space-10` | 40 | — |
| `--cf-space-12` | 48 | Entre secciones · **altura táctil mínima** |
| `--cf-space-16` | 64 | Aire en superficies editoriales |

```css
--cf-touch-min: var(--cf-space-12);   /* 48px · §14 */
```

**Regla.** Registro funcional: `space-1`–`space-4`. Registro editorial: `space-6`–`space-16`. El aire es, junto al calor, lo que distingue un registro del otro.

### 4.5 Radios

| Token | px | Uso |
|---|---|---|
| `--cf-radius-sm` | 6 | Botones, campos, **chips de estado y badges funcionales** |
| `--cf-radius-md` | 10 | Tarjetas de cofradía, tarjetas de información |
| `--cf-radius-lg` | 14 | Contenedores grandes, paneles |
| `--cf-radius-xl` | 20 | Bottom sheet (esquinas superiores), modales |
| `--cf-radius-full` | 999 | Avatares, insignias, formas pill |

**Reglas.** Los radios se mantienen **contenidos en toda la parte funcional**: las tarjetas principales no tienen el aspecto excesivamente redondeado habitual en apps actuales. `--cf-radius-full` **no se asocia automáticamente a los badges**: un badge funcional o de estado usa `radius-sm` y pertenece al lenguaje sobrio. La forma pill se reserva a gamificación —insignias, logros, puntos, celebración— o a elementos donde esté funcionalmente justificada (avatar, conmutador).

### 4.6 Bordes y elevación

```css
--cf-border-width: 1px;
--cf-border-width-strong: 1.5px;   /* chips críticos, marcadores de mapa */
--cf-border-width-max: 2px;        /* solo con [data-contrast="max"] */

--cf-focus-ring-width:  2px;       /* §14 · nunca se elimina */
--cf-focus-ring-offset: 2px;
--cf-focus-ring-color:  var(--cf-text);
```

Las sombras se construyen con **tinta cálida con alfa**, nunca con negro puro: un negro neutro sobre paleta cálida produce un gris sucio azulado que delata el sistema.

```css
--cf-shadow-tint: 29 26 22;   /* neutral-900 en RGB, para usar con / alfa */

--cf-elev-0: none;                                      /* + borde */
--cf-elev-1: 0 1px 2px rgb(var(--cf-shadow-tint) / .06),
             0 1px 1px rgb(var(--cf-shadow-tint) / .04);
--cf-elev-2: 0 2px 8px rgb(var(--cf-shadow-tint) / .10),
             0 1px 2px rgb(var(--cf-shadow-tint) / .06);
--cf-elev-3: 0 8px 24px rgb(var(--cf-shadow-tint) / .16),
             0 2px 6px rgb(var(--cf-shadow-tint) / .08);
```

| Nivel | Mecanismo en claro | Mecanismo en oscuro | Uso |
|---|---|---|---|
| `elev-0` | Solo borde | Solo borde | Todo lo que vive dentro del flujo de contenido |
| `elev-1` | Sombra mínima + borde | `surface-raised` + borde | Cabeceras fijas, barras pegadas al scroll |
| `elev-2` | Sombra media + borde | `surface-raised` + `border-strong` | Controles y chips **sobre el mapa**, popovers |
| `elev-3` | Sombra marcada + borde | `surface-raised` + `border-strong` + línea superior luminosa | Bottom sheet, modales, celebración |

La línea superior luminosa del `elev-3` oscuro es un realce interior de 1px, no un borde:

```css
--cf-elev-3-dark-edge: inset 0 1px 0 rgb(245 241 234 / .08);
```

**Reglas de elevación**
- Ver regla 4: la sombra significa superposición real.
- **En modo oscuro las sombras no se usan.** Una sombra es ausencia de luz y sobre un fondo casi negro no hay nada que oscurecer. La jerarquía se construye con escalón de superficie y borde visible. **La sombra nunca es necesaria para entender la jerarquía.**
- **Superficies opacas siempre sobre el mapa.** Prohibidos el desenfoque, la translucidez y el glassmorphism: al sol destruyen el contraste, sobre cartografía vuelven el contenido ilegible según lo que haya debajo, y el desenfoque es caro en móviles medios con batería baja.

**Escala Z**

| Token | Valor | Capa |
|---|---|---|
| `--cf-z-base` | 0 | Contenido |
| `--cf-z-sticky` | 10 | Cabeceras pegadas |
| `--cf-z-action` | 20 | Franja de acción contextual |
| `--cf-z-nav` | 30 | Navegación principal |
| `--cf-z-sheet` | 40 | Bottom sheet / panel lateral |
| `--cf-z-modal` | 50 | Modales |
| `--cf-z-toast` | 60 | Feedback efímero |

### 4.7 Iconografía

**Familia base: Phosphor.** Elegida por sus seis pesos (`thin`, `light`, `regular`, `bold`, `fill`, `duotone`) sobre rejilla de 24, que aportan **dos canales redundantes al color** —peso y relleno— y hacen cumplible la regla 1.

| Token | px | Uso |
|---|---|---|
| `--cf-icon-sm` | 16 | Dentro de chips, etiquetas, texto en línea |
| `--cf-icon-md` | 20 | Uso general en tarjetas y listas |
| `--cf-icon-lg` | 24 | Navegación, acciones principales |
| `--cf-icon-xl` | 32 | Estados vacíos, celebración, cabeceras |

**Reglas de uso**
- En `icon-sm` se usa siempre peso `bold`: a 16px con luz solar el trazo `regular` desaparece.
- Un icono que comunique un estado importante **va siempre acompañado de texto**.
- `fill` indica activo, seleccionado o verificado. `regular`/contorno indica inactivo o no verificable.
- **`en_calle` no se representa nunca con un pin ni con una chincheta.** Una cofradía **ocupa calle y avanza**: no es un punto (D10). Un pin dentro de un chip de estado contradice la doctrina del segmento antes de que el usuario llegue al mapa. Se usan iconos de recorrido o de marcha.
- `duotone` no se usa en la capa funcional.

**Set propio de iconos cofrades.** Es el único lugar donde vive el detalle gráfico propio de Cofradar (portador 4 de §2). Dibujado sobre **la misma rejilla de 24, el mismo trazo y las mismas proporciones que Phosphor**: geométrico, austero, contemporáneo, sin florituras.

**Regla de contención: cada icono propio debe responder a una necesidad real de la interfaz.** Ocho iconos excelentes antes que cuarenta dibujos. No se crea un icono cofrade porque se pueda.

Conceptos candidatos, a confirmar cuando los componentes los pidan de verdad: `cruz-de-guia`, `paso-de-misterio`, `palio`, `nazareno`, `banda`, `templo`, `recorrido`, `cola`.

**Los marcadores de mapa no son iconos.** Tienen anatomía propia (§10.3) y los iconos van *dentro* del marcador, nunca en su lugar.

### 4.8 Movimiento

```css
--cf-dur-instant: 80ms;    /* feedback de pulsación */
--cf-dur-fast:   140ms;    /* chips, hover, foco */
--cf-dur-base:   200ms;    /* transiciones generales */
--cf-dur-sheet:  280ms;    /* bottom sheet entre alturas */
--cf-dur-slow:   320ms;    /* celebración media */

--cf-ease-out:    cubic-bezier(.2, .8, .25, 1);
--cf-ease-in-out: cubic-bezier(.4, 0, .2, 1);
```

**Con `prefers-reduced-motion: reduce`:**

```css
@media (prefers-reduced-motion: reduce) {
  --cf-dur-base:  0ms;
  --cf-dur-sheet: 0ms;
  --cf-dur-slow:  0ms;
  /* --cf-dur-instant y --cf-dur-fast se conservan */
}
```

**Asignación de curvas.** `--cf-ease-out` es la curva por defecto de todo el sistema: empieza rápido y frena, que es lo que se percibe como «llega». `--cf-ease-in-out` se reserva a las transiciones que **van y vuelven por el mismo camino**: conmutadores, chips que alternan entre dos estados equivalentes y fundidos cruzados. El bottom sheet entre alturas usa `ease-out` con imanes (§13).

`instant` y `fast` **se conservan**: son feedback de pulsación y de foco, no desplazamiento, y quitarlos degradaría la respuesta del producto sin beneficio para nadie. Lo que desaparece es el movimiento: `transform`, `scale` y los desplazamientos de panel se resuelven en su estado final. **Ninguna información se pierde** (§14).

**Reglas.** El movimiento en la capa funcional es corto y utilitario: confirma una acción o explica un desplazamiento, nunca entretiene. La capa de gamificación tiene licencia plena (§11). `prefers-reduced-motion: reduce` se respeta **siempre**: ninguna información desaparece al desactivar la animación (§14).

### 4.9 Breakpoints

Los nombres describen **espacio disponible**, no dispositivos. Valores candidatos: `640 / 1024 / 1440`.

| Token | Rango | Composición |
|---|---|---|
| `base` | < 640px | Espacio insuficiente: una columna, barra inferior, bottom sheet |
| `md` | 640–1023px | Espacio intermedio: una columna más cómoda, barra inferior |
| `lg` | 1024–1439px | Espacio suficiente: rail lateral, convivencia de paneles, ficha en panel |
| `xl` | ≥ 1440px | Espacio amplio: más área útil de mapa e información simultánea, con límites de lectura |

**El ancho y el tipo de interacción son ejes independientes.** El sistema consulta además `pointer`, `hover` y teclado. Una tablet horizontal entra en composición de paneles y **sigue necesitando objetivos táctiles de 48px**.

```css
@media (any-pointer: coarse) { /* objetivos ≥ 48px */ }
@media (hover: hover) and (pointer: fine) { /* estados hover, atajos */ }
```

**Las dos consultas son distintas a propósito, y el criterio es el coste de equivocarse.**

| | Consulta | Por qué |
|---|---|---|
| **Objetivos táctiles** | `any-pointer` · **lo disponible** | Equivocarse por exceso cuesta algo de densidad. Equivocarse por defecto cuesta **toques fallidos**, que es un fallo funcional y de accesibilidad. Si el toque es posible, los 48px hacen falta |
| **Estados de hover** | `pointer` · **lo primario** | Aquí la asimetría se invierte: dar estados de hover a un dispositivo cuyo primario es el dedo produce **trampas de hover**, menús que aparecen sin querer y afordancias que no se pueden cumplir |

**La regla general: donde la capacidad es aditiva e inofensiva, se consulta lo disponible; donde puede engañar, se consulta lo primario.**

> **Corrección transversal, descubierta al materializar B-04.** Esta regla decía `@media (pointer: coarse)` y miraba el **dispositivo primario**. Eso dejaba un hueco real: un portátil táctil declara `pointer: fine` y `any-pointer: coarse`, así que con §9.12 corregida **tendría la franja de «Dar fe» disponible y, aplicando la regla antigua al pie de la letra, sin objetivos de 48px**. Un botón que está ahí porque se puede tocar, y que no se puede tocar bien. **No es una decisión de B-04:** es una incoherencia que B-04 destapó entre dos reglas cerradas, y se corrige donde estaba el error.

### 4.10 Convención de nombres

`--cf-<capa>-<rol>-<variante>-<estado>`

- Capa 1 (primitivos): `--cf-<familia>-<peso>` → `--cf-granate-600`
- Capa 2 (semánticos): `--cf-<rol>[-<variante>]` → `--cf-surface-sunken`, `--cf-live-soft`
- Componentes en kebab-case y en castellano para lo específico del dominio: `tarjeta-cofradia`, `chip-estado`, `marcador-cofradia`, `franja-accion`, `panel-ficha`.
- Estados como atributos de datos, no como clases: `data-fase="en_calle"`, `data-confianza="estimado"`, `data-relacion="dar-fe"`, `data-verificacion="no-verificable"`.

**Trasladable sin reinterpretación a** variables CSS nativas (forma canónica), `tailwind.config` vía `theme.extend`, mapas de Sass o tokens de Figma. Los nombres de la capa 2 son el contrato: si una implementación cambia los primitivos, los componentes no se tocan.

---

## 5. Temas y contraste

Dos ejes **independientes**, cuatro combinaciones.

| Eje | Valores | Atributo | Por defecto |
|---|---|---|---|
| **Tema** | `light` · `dark` | `data-theme` | Preferencia del sistema |
| **Contraste** | `normal` · `max` | `data-contrast` | `normal` |

**Reglas**
- La preferencia del sistema decide el tema inicial. **Cualquier elección manual del usuario prevalece y se recuerda.**
- El contraste máximo es **elección manual persistente**. No se infiere que el usuario está al sol. La API de luz ambiental no está disponible en web: el sistema no intenta adivinarlo.
- **No hay cambio automático por hora.**

### Qué hace `data-contrast="max"`

Actúa **solo sobre legibilidad**, nunca sobre el layout:

- Aumenta el contraste texto / superficie (los textos atenuados suben a `text-secondary`).
- Aumenta contraste y grosor de bordes (`--cf-border-width` → `--cf-border-width-max`).
- Sube el peso de textos y cifras críticas (600 → 700).
- Refuerza la visibilidad de iconos (`regular` → `bold`).
- Refuerza la diferenciación de estados.
- Refuerza marcadores, recorridos, etiquetas e hitos del mapa.
- Refuerza controles interactivos y el anillo de foco.

**Los remapeos concretos**

```css
[data-contrast="max"] {
  --cf-border-width: var(--cf-border-width-max);   /* 1px → 2px */
  --cf-text-muted: var(--cf-text-secondary);       /* 5,5:1 → 9,2:1 */
  --cf-weight-emphasis: 600;                       /* 500 → 600 */
  --cf-weight-data: 700;                           /* 600 → 700 */
  --cf-focus-ring-width: 3px;                      /* 2px → 3px */
  /* --cf-border-interactive se refuerza POR TEMA, ver debajo */
}
```

Más tres reglas:

- Los **iconos** suben de `regular` a `bold`.
- **El texto de estado solo cambia en oscuro**, donde sube al paso `-100` de su familia. En claro no cambia: `--cf-*-text` ya usa el `-700` y ya está en AAA (8,6–9,5:1), así que no hay nada que reforzar.
- **`--cf-border-interactive` se refuerza en direcciones opuestas:** `neutral-700` en claro, `neutral-400` en oscuro. Subir a `neutral-600` en oscuro lo empeoraría, de 4,37:1 a 2,72:1.

**Puede aumentar ligeramente algún elemento crítico si mejora realmente su lectura, pero no cambia tamaños de forma general ni reorganiza componentes. La memoria espacial del usuario se conserva al activar y desactivar el contraste.**

### Invariancia semántica

**Claro, oscuro y máximo contraste no pueden cambiar el significado de ningún código visual.** Verde sigue siendo estado positivo, granate sigue siendo capa personal, discontinuo sigue siendo provisionalidad, relleno/contorno conserva su significado. **Cambian los valores necesarios para mantener el contraste, nunca la semántica.**

### Consecuencias obligatorias del modo oscuro

1. **El oscuro también es cálido.** Todos los oscuros se derivan de la tinta cálida. Nada de negros ni grises azulados.
2. **La elevación cambia de mecanismo, no de significado** (§4.6).
3. **El granate tiene variante propia** (`granate-300`). Un burdeos profundo sobre fondo casi negro es invisible.
4. **La modulación funcional / editorial continúa** (§3).
5. **El mapa tiene variante oscura propia**, con la legibilidad cartográfica por delante de la identidad (§10.1).

---

## 6. Modelo de estados

El estado de una cofradía tiene **cuatro capas independientes**. Confundirlas es el error estructural más grave que puede cometer la implementación.

| Capa | Cardinalidad | Ámbito | Canal visual |
|---|---|---|---|
| **Fase** | Exactamente una, siempre, **con su nivel de confianza** | La cofradía | Chip de estado, color semántico, tratamiento del marcador |
| **Alteración** | Cero, una o varias | La cofradía | Chips de alteración superpuestos, color semántico |
| **Contexto** | Cero o varios | **La jornada**, no la cofradía | Banda de contexto, `--cf-info` |
| **Relación con el usuario** | Según el tipo | El usuario ↔ la hermandad | **Granate**, anclado al bloque de identidad |

### 6.1 Eje A · Fase

Temporal, ordenada, y siempre hay exactamente una.

> **Regla de partida: todas las hermandades previstas para una jornada se consideran que procesionan, salvo que se indique expresamente lo contrario.** Las fases las conduce la **planificación**, no las aportaciones: llegada la hora prevista, la fase avanza aunque nadie haya dado fe. Las aportaciones refinan **posición, alteraciones y la confianza de la propia fase**.
>
> `no_procesiona` y `cancelada` **no se infieren nunca de la ausencia de aportaciones** —que nadie reporte puede significar que no ha salido o que nadie está dando fe, y son indistinguibles— y solo se activan desde administración. Si llega la hora prevista sin datos, Cofradar **no concluye que no ha salido**: muestra «sin información reciente» (§7).

| Fase | Significado | Color | Icono | Texto |
|---|---|---|---|---|
| `prevista` | Procesiona hoy, aún no ha salido | `--cf-idle` | Reloj, `regular` | «Prevista» + hora de salida |
| `inminente` | Salida muy próxima, ventana configurable | `--cf-warn` | Reloj, `fill` | «Sale pronto» + hora |
| `en_calle` | Realizando el recorrido | `--cf-live` | Punto, `fill` | «En la calle» |
| `proxima_entrada` | De regreso, próxima a entrar | `--cf-warn` | Flecha de retorno, `fill` | «Próxima a entrar» |
| `finalizada` | Ya ha entrado | `--cf-idle` | Check, `regular` | «Finalizada» |
| `cancelada` | **Terminal.** Debía procesionar y la hermandad decide **antes de salir** que no realiza estación de penitencia. No llega a estar en la calle | `--cf-alert` | Círculo tachado, `fill` | «No realiza estación» |
| `no_procesiona` | No es su día. Para cuando se consulta su ficha fuera de jornada | `--cf-idle` | Calendario, `regular` | «Hoy no procesiona» |

#### La fase también es un dato, y lleva su confianza

**El horario permite estimar una fase, no convertirla en un hecho.** Si a su hora prevista nadie ha dado fe, Cofradar no sabe si ha salido: solo sabe que debería haber salido. Decir «En la calle» sin más sería afirmar algo que no consta; dejarla en «Prevista» sería afirmar lo contrario, igual de infundado.

Por eso **la fase lleva el mismo nivel de confianza que cualquier otro dato** (§7). No es un mecanismo nuevo: es §7 aplicado a un sitio donde se nos había quedado implícito que la fase era siempre un hecho firme.

| Confianza de la fase | Qué significa | Texto |
|---|---|---|
| `confirmado` | Hay información reciente que la acredita | `En la calle` |
| `estimado` | Según la planificación debería estar así, sin corroborar | **`En la calle · según horario`** |
| `desactualizado` | Hubo información real y ha perdido vigencia | `En la calle · hace 23 min` |

**Regla general: toda fase derivada únicamente de la planificación es `estimado`.** Aplica igual a `inminente`, `en_calle`, `proxima_entrada` y `finalizada` — el problema es el mismo al final del recorrido: a la hora prevista de entrada y sin datos, «Finalizada» es otra afirmación sin respaldo.

**Dos excepciones por construcción:**

- `cancelada` y `no_procesiona` son **siempre `confirmado`**, porque solo pueden establecerse mediante la excepción administrativa.
- `prevista` es `confirmado` mientras no pase su hora de salida: hasta entonces la planificación sigue siendo el dato vigente y nada la contradice.

### 6.2 Eje B · Alteraciones

Excepcionales. Se **superponen** a la fase y no la sustituyen.

| Alteración | Significado | Color | Dato asociado |
|---|---|---|---|
| `retraso` | Va por detrás de lo previsto | `--cf-warn` | Minutos (`+12 min`) |
| `adelanto` | Va por delante de lo previsto | `--cf-warn` | Minutos (`−8 min`) |
| `cambio_recorrido` | Desvío respecto al itinerario previsto | `--cf-warn` | Descripción breve |
| `incidencia` | Aviso relevante no cubierto por los anteriores | `--cf-alert` | Texto |
| `interrumpida` | **En la calle y detenida de forma no prevista**: se refugia, para, espera. Puede reanudar. La fase sigue siendo `en_calle` | `--cf-alert` | Motivo y hora |
| `regreso_anticipado` | En la calle y acorta para volver antes de lo previsto. Desemboca en `finalizada` | `--cf-alert` | — |

> **Caso de referencia.** Una hermandad que sale, se refugia y acaba volviendo antes termina en fase `finalizada` con las alteraciones `interrumpida` y `regreso_anticipado` en su histórico. No se necesita ninguna fase especial.

> **Quien publica una alteración es el motor, no el usuario.** Las seis se infieren automáticamente de las aportaciones de «Dar fe» cuando hay evidencia suficiente. Un reporte de usuario es **señal**, no publicación. Y una alteración publicada que se desmiente **se retira y se anota, nunca se borra en silencio**.

### 6.3 Contexto de jornada

**Describe la jornada, no una cofradía.** Es transversal y se muestra en un componente propio (§9.6), nunca como chip en una tarjeta.

| Contexto | Ejemplo |
|---|---|
| `lluvia` | Lluvia o riesgo meteorológico afectando a la jornada |
| *(ampliable)* | Otros avisos generales de jornada |

**Regla de transición.** El contexto describe la jornada; la alteración describe una desviación ya producida en una cofradía concreta. Si llueve y una hermandad retrasa la salida, el contexto sigue siendo `lluvia` **y además** aparece la alteración `retraso` en esa cofradía. El contexto nunca se convierte automáticamente en alteración.

### 6.4 Relación con el usuario

Capa personal. **Se cuenta en granate** (regla 2) y **no entra nunca en la fila del chip de estado**: vive pegada al bloque de identidad de la hermandad, porque habla de la hermandad en tu historia, no de lo que hace hoy.

| Relación | Significado | ¿Puntúa? | ¿Necesita ubicación? |
|---|---|---|---|
| `seguida` | **Intención**: quiero verla. Personaliza Ahora, avisos y planificación. **Funciona en local sin cuenta** | No | No |
| `vista` | **Memoria personal**: la he visto. Marcable manualmente siempre, incluso a posteriori y de ediciones anteriores a Cofradar. **Funciona en local sin cuenta**. **Sin valor competitivo** | No. Estadística personal, nunca comparada | No |
| `dar-fe` | **Presencia y participación**: estoy viendo esta cofradía ahora. Es la acción que puntúa y la única que puede alimentar el cálculo de la posición pública | Sí | Mejora, no requisito |

> **La distinción que sostiene el modelo: «vista» es tu álbum personal y «Dar fe» es la participación.** Permite que alguien registre las cofradías que vio antes de usar Cofradar sin afectar a rankings, puntos ni logros.

**De las tres relaciones, solo `dar-fe` necesita identidad.** `seguida` y `vista` no puntúan, no tienen valor competitivo y no tocan el cálculo público: existen **en local y sin cuenta** (§18). Eso es lo que permite que Mi tramo sea útil de verdad antes de que exista una cuenta.

**«Dar fe» es una sola acción con dos consecuencias**, y el diseño tiene que dejar ver las dos sin convertirlas en dos pasos:

| Consecuencia | Qué significa | ¿Siempre ocurre? |
|---|---|---|
| **Personal** | Queda en tu historial, tu colección y tu gamificación | **Sí**, incluso sin ubicación |
| **Colaborativa** | Alimenta el motor de posición del que se benefician los demás | Solo cuando la aportación contiene información suficiente |

**Verificación** — dos grados visibles, con canal propio (§7.2), sobre un modelo de integridad que vive en el PRD:

| Grado | Significado | Puntuación |
|---|---|---|
| `verificado` | La aportación consolidó: coherente con la trayectoria que establecieron **otras observaciones** | Puntúa, con bonus si fue útil |
| `no-verificable` | El usuario ha dado fe y Cofradar **no ha podido comprobarlo**: falta de ubicación, precisión insuficiente, conectividad u otra causa | **Se registra siempre**, con sus **puntos base**. El bonus depende de que consolide |

Tres reglas del modelo que el diseño tiene que respetar:

- **La plausibilidad juzga la historia del usuario, nunca la posición que afirma.** El GPS es una señal, no el juez.
- **El modelo puede discrepar de una aportación, pero solo otras observaciones independientes pueden contradecirla.** Discrepar no es sospechoso: puede ser la primera observación correcta de algo que Cofradar aún no ha detectado.
- **Los puntos base son inmediatos y no varían nunca.** Lo único que llega después es el bonus, y llega **como buena noticia**.

> **Separar «el usuario ha dado fe» de «Cofradar ha podido usar esa aportación» es una regla del sistema**, no un detalle de implementación. La primera parte no se bloquea nunca; lo que queda condicionado es la segunda.

**Regla de redacción.** `no-verificable` **no suena nunca a sospecha ni a acusación.** El texto explica una limitación de Cofradar, no pone en duda que el usuario estuviera allí. Se escribe «No se pudo verificar», nunca «aportación dudosa».

### 6.5 Representación obligatoria de un estado

Todo estado se compone de **cuatro elementos mínimos**, por reglas 1 y 5:

```
[ color semántico ] + [ icono con peso/relleno significativo ] + [ texto literal ] + [ trazo según su confianza ]
```

El color puede faltar en contraste máximo si hiciera falta; **el texto nunca falta**, y **el trazo siempre dice si la fase está confirmada o no**.

---

## 7. Sistema de confianza del dato

Es la condición normal de Cofradar, no un caso límite: los datos salen de cuadrantes publicados y de estimación. Un producto que muestre todo con la misma rotundidad miente constantemente, y basta perder una cofradía por fiarse de una hora para dejar de fiarse de la aplicación entera.

### 7.1 Confianza y frescura · canal de trazo

**El canal es el trazo: continuo frente a discontinuo.** Es forma pura, así que sobrevive al sol, al daltonismo y al modo oscuro, y funciona igual en la interfaz y en la cartografía.

**Qué lleva confianza: todo dato derivado.** Horas, posiciones, progreso, proximidad **y la propia fase** (§6.1). La fase se nos había quedado fuera por tratarla como un hecho firme, y no lo es cuando sale solo del cuadrante.

| Nivel | En texto | En gráfico | Etiqueta |
|---|---|---|---|
| `confirmado` | `21:40`, sin marca, puede tener más peso visual cuando la jerarquía lo requiera | Trazo continuo | — |
| `estimado` | `≈ 21:40` | **Trazo discontinuo** | «estimado» cuando hay espacio o pueda existir ambigüedad |
| `desactualizado` | `21:40` + antigüedad explícita: `hace 23 min` | Trazo discontinuo + icono de desfase | **Antigüedad siempre visible** |

> **Tres niveles visibles, motor más granular.** El motor de posición puede manejar toda la granularidad que necesite —número de aportaciones, coherencia geográfica y temporal, dispersión, reputación—, incluido un grado interno de tipo `probable`. Al usuario se le presentan **solo tres**, porque a tres segundos, en movimiento y a pleno sol más grados no son distinguibles: `probable` se integra visualmente en `estimado`. Es una simplificación de **presentación**, no del modelo de datos.

```css
--cf-dash-pattern: 6 4;        /* discontinuo estándar */
--cf-dash-pattern-map: 10 6;   /* discontinuo en cartografía */
```

**Reglas**
- **La coletilla de confianza y frescura usa `--cf-text-secondary`, nunca `--cf-text-muted`.** `· según horario` y `· hace 23 min` son **información crítica** por §14 —son lo que permite saber si un dato es estimado o viejo—, y `text-muted` da 5,5:1: cumple AA pero no AAA. `text-secondary` da 9,2:1. `text-muted` se queda para metadatos que de verdad no son críticos.
- La **atenuación solo refuerza, nunca informa sola.** Un dato estimado puede ir ligeramente menos pesado, pero **jamás por debajo del contraste mínimo accesible**. La información la cargan el trazo y la marca textual. Está prohibido comunicar incertidumbre bajando opacidad o contraste.
- **Prohibido el difuminado** como recurso de incertidumbre.
- **Pasado su umbral, Cofradar deja de afirmar.** No se muestra una estimación maquillada: se muestra el **último dato conocido** con su hora y se dice que no hay información reciente. Un «no lo sabemos» explícito construye más confianza que una estimación caducada en silencio.
- Ver regla 5: el trazo discontinuo significa siempre provisionalidad y no se recicla como decoración.

**Umbrales de caducidad: por tipo de dato, no universales.** Una posición estimada pierde valor rápido; un horario previsto o un hito del recorrido pueden seguir siendo válidos mucho más tiempo. Cada tipo de dato declara los suyos.

| Tipo de dato | Vigente | Desactualizado | Deja de afirmarse |
|---|---|---|---|
| Posición estimada en tiempo real | < 10 min | 10–30 min | > 30 min |
| Horario previsto, hitos, información operativa | **Pendiente de definir por tipo** | | |

*(Los valores de posición son candidatos a validar; el resto es pendiente de producto, §21.)*

### 7.2 Verificación de «Dar fe» · canal de relleno

Conceptualmente emparentado con la confianza del dato, pero **no es lo mismo** y no comparte código visual: una cosa es «este dato es estimado» y otra «esta aportación no se ha podido verificar». Se usan **canales distintos para que ningún código signifique demasiadas cosas**.

| Significado | Canal | Código |
|---|---|---|
| Dato estimado o provisional | **Trazo** | Continuo ↔ discontinuo |
| Aportación verificada o no verificable | **Relleno** | `fill` ↔ contorno |

Una aportación verificada es una marca **rellena**; una no verificable es **la misma marca en contorno**. Los dos canales son independientes, basados en forma, legibles al sol y en oscuro, y no se pisan.

**El canal de relleno significa verificación solo dentro de la anatomía de «Dar fe».** `seguida` y `vista` también se dibujan una en contorno y otra en relleno (§9.5), y eso **no las convierte en verificadas ni en no verificables**: son glifos distintos y es el glifo el que las identifica. El relleno ahí es una propiedad de la forma, no una señal.

Dicho al revés, que es como hay que comprobarlo: **el usuario nunca tiene que deducir verificación de un relleno si no está mirando una marca de «Dar fe»**. Por eso las tres relaciones tienen forma propia y no solo tratamiento distinto.

**El usuario no debe tener que aprender el código.** Donde la diferencia sea relevante, aparece también explicación textual: `Verificado` / `No se pudo verificar`.

### 7.3 Sincronización ≠ frescura

Son **dos conceptos distintos** y se muestran en sitios distintos:

| Concepto | Qué significa | Dónde se muestra |
|---|---|---|
| **Última sincronización de Cofradar** | Cuándo consiguió la aplicación actualizar información | Indicador global, en la cabecera, visible en las tres vistas |
| **Frescura de un dato concreto** | Cuándo se obtuvo o calculó esa posición, hora o incidencia | Junto al dato, cuando sea relevante para decidir |

Que Cofradar se haya sincronizado hace un minuto **no significa** que la posición de una cofradía sea de hace un minuto. El indicador global da contexto general; cuando la frescura importa para una decisión, se muestra pegada al dato.

### 7.4 Proximidad y alcanzabilidad

**«Cerca» y «alcanzable» se presentan siempre como aproximación, nunca como certeza.** En Semana Santa 500 metros pueden ser fáciles o prácticamente imposibles según calles cortadas, aglomeraciones y recorridos.

**Lenguaje permitido:** `cerca`, `a 450 m`, `parece alcanzable`, o equivalentes prudentes.
**Lenguaje prohibido mientras no haya datos que lo sostengan:** `7 min andando`, tiempos de ruta peatonal, instrucciones de navegación. Cofradar no finge ser un navegador.

Si en el futuro existe información suficiente para calcular una ruta peatonal realmente útil en ese contexto, la estimación puede mejorar. Hasta entonces, prudencia.

---

## 8. Layout y arquitectura

### 8.1 Las tres vistas

Las tres usan **los mismos datos y los mismos componentes**, y son coherentes entre sí. Cada una contesta a una pregunta distinta.

| Vista | Pregunta | Comportamiento |
|---|---|---|
| **Ahora** | «¿Qué puedo ver ahora?» | Bloques priorizados y compactos: qué está en la calle, qué tengo cerca, qué está a punto de ocurrir, si hay incidencias importantes. **Prioriza pero no oculta**: el acceso a la jornada completa está siempre a un toque. No es un feed opinado |
| **Mapa** | «¿Dónde están y hacia dónde van?» | Vista completa. Selección de cofradía y consulta de información mediante bottom sheet **sin perder el contexto del mapa** |
| **Jornada** | «¿Qué hay programado?» | Todo lo programado, **sin priorización**, para consultar, comparar horarios y planificar. Cambio de día |

**Qué entra en Ahora y qué no.** Los cuatro bloques describen **lo que está ocurriendo**, así que de ahí salen tres reglas:

- **Una cofradía aparece una sola vez.** Sus alteraciones viajan con ella, en los chips de su tarjeta; **no la duplican en el bloque de incidencias**. Ese bloque lleva **avisos** (§9.8), que pueden referirse a una cofradía pero no son su tarjeta. Una pantalla que se lee en segundo y medio no puede contar dos veces la misma hermandad.
- **`finalizada` no aparece en Ahora.** Ya no se puede ver, así que no contesta a «¿qué puedo ver ahora?». **No se oculta:** vive en Jornada, que es todo lo del día sin priorizar y está a un toque. Es exactamente lo que significa «prioriza pero no oculta».
- **«Lo que ha pasado mientras no estabas» no es un quinto bloque.** Es un elemento **transitorio** de regreso, donde aterriza lo asíncrono porque no hay centro de notificaciones (D32). Convive con los cuatro sin formar parte de ellos y **desaparece cuando no hay novedades**: no tiene estado vacío.

**El acceso a la jornada completa lo satisface la propia barra de navegación**, que está siempre visible. Un acceso adicional dentro del contenido es una decisión de composición, no un requisito.

**Los cuatro bloques son QUÉ contiene Ahora, no en qué orden.** El orden lo fija **cuánto puede cambiar cada cosa lo que el usuario va a hacer en los próximos minutos**, que es el mismo criterio con el que se decide qué interrumpe por push (§20.1). Consecuencia dura: **un aviso crítico nunca queda por debajo de contenido que no lo es.** Enterrar una incidencia que puede mandar a alguien a otro sitio contradice el propósito del componente (§9.8) y la clasificación de información crítica (§14).

**Y Ahora elige la densidad de tarjeta que le conviene en cada bloque.** Las tres densidades están en §9.4 y la acción viaja con la **estándar**; la **compacta** no la lleva por definición. Eso **no priva de nada**: la acción contextual de «Dar fe» vive dentro de cada cofradía (§9.12) y la vía rápida está en la franja. Una lista de ocho tarjetas estándar que obliga a hacer scroll para ver la tercera **falla la pregunta de la pantalla**, y contestar en segundo y medio pesa más que tener un botón en cada fila.

### 8.2 Navegación principal

**Cuatro destinos estables, con acción contextual separada por encima.** La navegación es estable y la acción es contextual: son cosas distintas y se comportan distinto.

```
┌─────────────────────────────────────────┐
│  contenido                              │
│                                         │
├─────────────────────────────────────────┤
│  franja de acción contextual   (z 20)   │  ← solo cuando hay algo que hacer
├─────────────────────────────────────────┤
│  Ahora  Mapa  Jornada  Mi tramo (z 30)  │  ← siempre, posición fija
└─────────────────────────────────────────┘
```

**La cabecera es una zona del marco, no un componente.** El marco define **dónde cae** —pegada arriba, con su área segura y su `z-sticky`— y **qué lleva siempre**: el indicador de **última sincronización** (§7.3), que es global y visible en las tres vistas.

**Todo lo demás lo compone cada ruta**, porque cada una necesita cosas distintas: Ahora y Jornada llevan el selector de ciudad y jornada, Jornada además el selector de día, el mapa sus filtros. **No existe un componente «cabecera» único y no debe diseñarse como si lo fuera.**

**Reglas de la navegación**
- **Icono + etiqueta de texto siempre visibles.** Hay visitantes que abren la app por primera vez de noche en una calle llena; y al sol un icono pequeño sin etiqueta es un jeroglífico.
- **Nada de menú lateral ni hamburguesa.** Cuatro destinos caben en una barra.
- **Objetivos táctiles de 48px mínimo** y respeto de las áreas seguras del dispositivo.
- **La barra no se oculta al hacer scroll.**
- Los cuatro destinos **mantienen siempre posición, nombre y significado general**, todo el año.

### 8.3 Las dos intensidades

Cofradar **no son dos aplicaciones** (temporada y fuera de temporada): es **el mismo sistema con distinta intensidad según el contexto temporal**.

**La aparición de la acción de «Dar fe» y el comportamiento de Ahora dependen del estado real de la jornada, no del calendario.** Puede ser Martes Santo a las cinco de la tarde y no haber nada en la calle.

| Destino | Jornada activa | Sin actividad |
|---|---|---|
| **Ahora** | Operativo y muy dinámico | Próxima jornada, cuenta atrás, novedades relevantes, planificación, elementos personales con sentido |
| **Mapa** | Operativo | Exploración de hermandades, templos, recorridos e hitos |
| **Jornada** | Jornada actual, cambio de día | Próxima Semana Santa cuando exista información; revisión de jornadas anteriores |
| **Mi tramo** | Capa personal completa | La misma, con protagonismo natural. **No cambia de posición en la navegación** |

**Regla:** informar, no rellenar. **Ahora no se rellena artificialmente para no estar vacío.** Si lo único relevante es «La próxima salida prevista es a las 17:15», eso es suficiente.

**La arquitectura no se acopla a la idea de que fuera de Semana Santa no ocurre nada.** Cofradar puede terminar teniendo utilidad en más momentos del año.

### 8.4 Composición responsive

| Espacio | Navegación | Contenido | Ficha |
|---|---|---|---|
| **Insuficiente** (`base`) | Barra inferior | Una columna | Bottom sheet |
| **Intermedio** (`md`) | Barra inferior | Una columna más cómoda | Bottom sheet |
| **Suficiente** (`lg`) | Rail lateral | Lista + mapa en paneles | Panel lateral |
| **Amplio** (`xl`) | Rail lateral | Lista + mapa + detalle simultáneos | Panel lateral |

**Equivalencias — mismo componente, distinto anclaje:**

- **Bottom sheet (móvil) ⇄ panel lateral (escritorio)**
- **Barra inferior (móvil) ⇄ rail lateral (escritorio)**

Los componentes y su semántica son idénticos; cambia la composición. **No se crean componentes exclusivos de escritorio.**

**Reglas de composición**
- El contenido textual y las listas tienen **ancho máximo** (`--cf-measure-max: 42rem` para texto, `--cf-panel-max: 28rem` para el panel de lista). No se estiran porque exista espacio: una tarjeta de 1.400px de ancho es ilegible.
- **El mapa aprovecha el espacio sobrante.**
- `hover`, `focus`, navegación por teclado y atajos **enriquecen** escritorio sin alterar el modelo móvil.
- **Móvil es la referencia principal del sistema.** Toda mejora de escritorio es aditiva.

---

## 9. Componentes

Plantilla de especificación: propósito · cuándo · cuándo no · anatomía · variantes · tamaños · estados · responsive.

### 9.1 Botón

**Propósito.** Ejecutar una acción.
**Cuándo.** Siempre que haya una acción. Una sola acción primaria por contexto visible.
**Cuándo no.** Para navegar entre destinos (eso es navegación) ni para alternar un filtro (eso es chip).

**Variantes**

| Variante | Fondo | Texto | Borde | Uso |
|---|---|---|---|---|
| `primario` | `--cf-text` (tinta) | `--cf-text-inverse` | — | Acción principal del contexto, **incluida la acción «Dar fe»** |
| `secundario` | `--cf-surface` | `--cf-text` | `--cf-border-strong` | Acción alternativa |
| `terciario` | Transparente | `--cf-text` | — | Acciones de bajo peso, dentro de tarjetas |
| `peligro` | `--cf-alert` | `--cf-text-inverse` | — | Destructivo. Uso excepcional |

**El botón primario es tinta, nunca granate.** Si el primario fuera granate, el granate pasaría a significar «acción» y perdería su papel de identidad (regla 3).

**Tamaños.** `sm` 36px de alto (solo en escritorio y dentro de tarjetas densas) · `md` 44px (por defecto) · `lg` 52px (acción principal a pantalla completa, celebración). **En interacción táctil, el área de toque nunca baja de 48px aunque el botón mida menos.**

**Estados.** `default` · `hover` (solo `hover: hover`) · `focus-visible` (anillo de `--cf-focus-ring-width` en `--cf-focus-ring-color` con `--cf-focus-ring-offset` de separación, **nunca se elimina**) · `active` (desplazamiento de 1px + el paso siguiente de la rampa) · `disabled` (`--cf-neutral-400`, con explicación de por qué) · `loading` (indicador en el propio botón, texto conservado, **ancho estable**).

**Hover y active son tokens semánticos, nunca un filtro y nunca un primitivo consumido directamente.** Un `filter: brightness()` desatiende el calor deliberado de la paleta y rompe los contrastes medidos; y un componente que consume la capa 1 se salta la arquitectura de §4.

| Token | Claro | Oscuro |
|---|---|---|
| `--cf-primary-bg` | `neutral-900` | `#F5F1EA` |
| `--cf-primary-bg-hover` | `neutral-800` | `neutral-200` |
| `--cf-primary-bg-active` | `neutral-950` | `neutral-300` |
| `--cf-danger-bg` | `rojo-600` | `rojo-300` |
| `--cf-danger-bg-hover` | `rojo-700` | `rojo-100` |
| `--cf-danger-bg-active` | `rojo-700` | `rojo-100` |
| `--cf-surface-hover` | `--cf-surface-sunken` | `--cf-surface-raised` |

**La dirección del refuerzo se invierte con el tema**, y esto ya no es una excepción: es el **tercer** sitio del sistema donde pasa, después de la elevación (§4.6) y de `--cf-border-interactive` (§4.2). **En claro se oscurece, en oscuro se aclara**, porque en oscuro el botón primario *es* la superficie clara. Mis valores de claro no servían en oscuro: `neutral-800` sobre `surface` oscura da **1,17:1** y `neutral-950` da **1,08:1**.

Medido, texto sobre fondo del botón · fondo del botón sobre `surface`:

| | Claro | Oscuro |
|---|---|---|
| `primario` default | 16,48 · 17,33 | 16,58 · 15,40 |
| `primario` hover | 14,10 · 14,83 | 14,56 · 13,52 |
| `primario` active | 17,75 · 18,66 | 12,03 · 11,18 |
| `peligro` default | 7,65 · 8,04 | 6,71 · 6,24 |
| `peligro` hover | 10,16 · 10,68 | 13,05 · 12,12 |

En oscuro el `peligro` **sube a `rojo-100`** en lugar de bajar: oscurecerlo lo rompe —`rojo-400` deja el texto en **3,92:1**, por debajo de AA—. El salto de claridad es grande y aquí conviene: es un botón destructivo y que se note que estás encima no es un defecto.

El `active` lleva además el desplazamiento de 1px en todas las variantes, y el `secundario` suma borde `--cf-border-interactive`. Es el patrón que `granate-700` ya documentaba como «estado presionado» en §4.1, convertido en capa 2.

**Sobre el `loading`:** lo que la regla exige es **texto conservado y ancho estable**. La forma del indicador —anillo, línea, barra— es decisión del componente, siempre que no mueva el ancho ni sustituya al texto.

**Responsive.** `md` por defecto en móvil; en escritorio el ancho se ajusta al contenido en lugar de ocupar el 100%.

### 9.2 Chip de estado (fase)

**Propósito.** Comunicar la **fase** de una cofradía (§6.1).
**Cuándo.** Siempre en toda representación de una cofradía: tarjeta, ficha, marcador, histórico.
**Cuándo no.** Para alteraciones (chip propio), para contexto de jornada (§9.6) ni para la relación del usuario (§9.5).

**Anatomía.** `[ icono 16px bold ][ space-1 ][ texto 14px/600 ]`, `radius-sm`, fondo `--cf-<estado>-soft`, texto `--cf-<estado>`, borde `--cf-<estado>-border` de 1px.

**El borde lleva la confianza de la fase** (§6.1), con el canal de trazo de §7.1: **continuo** si `confirmado`, **discontinuo** si `estimado` o `desactualizado`. Y el texto lo acompaña: `En la calle · según horario` cuando la fase solo sale del cuadrante, `· hace 23 min` cuando hubo datos y han caducado. Nunca se comunica solo con el trazo.

**Consecuencia que conviene anticipar.** Al principio de una jornada, con poca participación, **casi todos los chips estarán discontinuos**. Es honesto —en ese momento Cofradar de verdad no sabe— y tiene un efecto secundario bueno: **los chips se consolidan según la gente da fe**, así que el usuario descubre sin que nadie se lo explique que su participación convierte estimaciones en certezas. Es el mejor argumento para dar fe y sale gratis.

**Posición fija.** El chip aparece **siempre en el mismo punto** de la tarjeta, para que el ojo pueda leer la columna de estados en vertical ignorando el resto (§9.4).

**Variantes.** Una por fase, con los valores de §6.1. **No son siete por tres.** La confianza aplica a `inminente`, `en_calle`, `proxima_entrada` y `finalizada`; `cancelada` y `no_procesiona` son **siempre confirmadas por construcción** —solo existen por la excepción administrativa— y `prevista` lo es mientras no pase su hora (D22). Así que la matriz real es **15 chips**: cuatro fases × tres confianzas, más tres fases con una sola. Un chip `cancelada · según horario` **no puede existir**, y dibujarlo contradiría D21.
**Tamaños.** `sm` (altura **base** 24px, listas densas) · `md` (altura **base** 28px, por defecto).

**Las alturas son base, no rígidas**, y el orden de prioridad cuando el contenido no cabe es este, de arriba abajo:

1. **La coletilla de confianza y frescura no se abrevia ni se suprime jamás.** Es información crítica (§14): es lo que permite saber si el dato vale.
2. **Se abrevia la etiqueta de la fase**, que es lo que esta misma sección ya prescribe: `En la calle · hace 23 min` → `En calle · hace 23 min`.
3. **Si aún no cabe, el chip crece a dos líneas** y deja de medir 28px. Preferible a truncar a media palabra.
4. **El chip no se sale de su posición fija.** La doble ancla de §9.4 se resuelve por posición, y un chip más alto no la rompe: el nombre también puede ocupar dos líneas (§4.3). Lo que no puede pasar es que el chip se mueva de sitio o que el nombre y el estado dejen de empezar a la misma altura.
**Estados.** Estático. No es interactivo. Si una pantalla necesita filtrar por estado, es un **chip de filtro** y es otro componente.
**Responsive.** Idéntico. En espacio insuficiente el texto no se abrevia: se abrevia la etiqueta de la fase, nunca se suprime.

### 9.3 Chip de alteración

**Propósito.** Comunicar una desviación concreta sobre lo previsto (§6.2).
**Cuándo.** Cuando existe al menos una alteración. Se **superpone** al chip de fase, no lo sustituye.
**Cuándo no.** Para contexto de jornada. Para lluvia que todavía no ha alterado nada.

**Anatomía.** Igual que el chip de estado, más el **dato** cuando existe: `[ icono ][ etiqueta ][ dato tabular ]` → `⚠ Retraso +12 min`.

**Reglas**
- **Varias alteraciones conviven.** Se ordenan por gravedad: `incidencia` / `interrumpida` / `regreso_anticipado` antes que `cambio_recorrido`, antes que `retraso` / `adelanto`.
- En la tarjeta `compacta` se muestra **solo la más grave** y un contador `+2` que abre el resto.
- Los minutos van en cifras tabulares (`--cf-data-sm`, peso 700) para que no salten al actualizarse.
- Nunca se oculta una alteración por falta de espacio: se abrevia la etiqueta.

### 9.4 Tarjeta de cofradía

El componente central del sistema. Aparece en Ahora, Jornada, bottom sheet del mapa, histórico y colección.

**Propósito.** Representar una cofradía y permitir decidir si ir a verla.
**Cuándo.** Cualquier listado o selección de cofradías.
**Cuándo no.** Como contenedor de información que no sea una cofradía (eso es tarjeta de información, §9.7).

**Estructura: doble ancla.** Nombre y estado tienen **el mismo nivel de prioridad**, resuelto por **posición fija y no por tamaño**. El cofrade escanea la columna de nombres; el visitante escanea la columna de estados; ninguno molesta al otro.

```
┌──────────────────────────────────────────────┐
│ [rel]  La Macarena            ● En la calle  │   ← ancla identidad / ancla estado
│                               ⚠ +12 min      │   ← alteraciones
│                                              │
│        Campana  ≈ 21:40                      │   ← línea de decisión (dato protagonista)
│        A 450 m · parece alcanzable           │   ← capa de proximidad, solo si hay ubicación
│                                              │
│                              [  Dar fe  ]    │   ← acción
└──────────────────────────────────────────────┘
```

- `[rel]` = marca de relación con el usuario (§9.5), anclada al bloque de identidad, **en granate**, fuera de la fila del chip de estado.
- Nombre de hermandad en **Newsreader** (`text-xl` en estándar, `text-lg` en compacta).

> **Dos líneas de nombre es comportamiento normal, no un defecto.** A 390px el nombre comparte los ~358px útiles con la marca de relación y el chip de estado, así que `El Gran Poder` o `El Silencio` pueden ocupar dos líneas incluso con la etiqueta de fase abreviada. Está permitido por §4.3 y **no rompe la doble ancla**: el chip conserva su posición y el anclaje superior, de modo que nombre y estado siguen empezando a la misma altura. **No se comprime más la tarjeta para evitarlo** — ni cuerpo menor, ni truncado, ni mover el chip.
- Todo lo demás en **Inter**.

**La línea de decisión.** El dato protagonista es **el próximo punto útil donde encontrar esa cofradía**, con su hora: `Campana ≈ 21:40`. Funciona siempre, con o sin ubicación.

> **«Próximo punto» no significa el siguiente hito institucional del recorrido**, sino el **siguiente punto relevante para verla** según los datos disponibles. En Sevilla puede coincidir con la Campana, la Catedral u otro punto conocido; el modelo permite cualquier punto del itinerario y cualquier ciudad.

**El nombre del hito es tocable y abre el mapa** centrado en ese punto, dentro del contexto de esa cofradía y su recorrido. **Haya o no ubicación:** la distancia ayuda, pero no sustituye al mapa — el usuario puede querer saber dónde cae ese punto, hacia dónde ir o cómo encaja en el recorrido. **Es una propiedad general del dato, no una ayuda para el visitante**: un hito es un lugar, y un lugar debe poder verse en el mapa.

El nombre de hermandad que se muestra en la tarjeta es el **nombre popular** (§16); la denominación completa vive en la ficha.

La **proximidad** es una capa adicional que **enriquece sin sustituir** al hito como protagonista, y solo existe cuando hay ubicación e información suficiente. Lenguaje prudente obligatorio (§7.4).

El **progreso del recorrido** es información secundaria: vive en la variante expandida y en la ficha.

**Variantes de densidad** — una sola tarjeta con tres densidades, no tres componentes:

| Variante | Dónde | Contenido |
|---|---|---|
| `compacta` | Jornada, histórico, listas largas | Nombre + estado + hora o dato clave. Una línea de datos. Alteración más grave + contador |
| `estandar` | Ahora | Nombre + estado + alteraciones + próximo punto y hora + proximidad si existe + acción |
| `expandida` | Bottom sheet / panel de ficha | Lo anterior + progreso de recorrido + próximos hitos + «Dar fe» |

**Imagen.** **Las tarjetas funcionales son tipográficas.** El nombre en Newsreader hace el trabajo de identificación.
- **Sin fotografía** en ningún caso en tarjetas funcionales: pesa con mala red, es caro en derechos y empuja la tarjeta hacia lo contemplativo cuando su trabajo es ayudar a decidir en tres segundos.
- **El escudo** es identidad **opcional**, para ficha y variante expandida, cuando se disponga de él y esté resuelto su uso (**pendiente**, §21). **El sistema funciona perfectamente sin escudo**, y **la marca de relación del usuario no depende visualmente de él**: se ancla al bloque de identidad exista o no.

**Estados.** `default` · `pressed` · `seleccionada` (en mapa: borde `border-strong` y superficie `surface-raised`; **nunca se señala la selección solo con color**) · `atenuada` (fase `finalizada` o fuera de foco en el mapa) · `con dato desactualizado` (§7.1).

**Responsive.** Ancho completo de columna hasta `md`; en `lg`+ dentro del panel de lista con `--cf-panel-max`. La estructura no cambia.

### 9.5 Marca de relación con el usuario

**Propósito.** Indicar `seguida`, `vista` o `dar-fe` (§6.4).
**Cuándo.** En cualquier representación de una cofradía con la que el usuario tenga relación.
**Cuándo no.** Nunca en la fila del chip de estado. Nunca en colores semánticos.

**Anatomía.** Marca compacta en **granate** (`--cf-brand`), anclada al bloque de identidad de la hermandad —al escudo si existe, al nombre si no—. Misma posición en tarjeta, marcador de mapa y ficha.

| Relación | Forma | Relleno |
|---|---|---|
| `seguida` | Marcador / banderín | Contorno |
| `vista` | Marca de colección | Relleno |
| `dar-fe` verificada | Marca de «Dar fe» | **Relleno** |
| `dar-fe` no verificable | **La misma marca** | **Contorno** + etiqueta textual cuando sea necesario |

**Las tres relaciones se identifican por su glifo, no por su relleno.** El contorno de `seguida` y el relleno de `vista` refuerzan su significado —intención frente a hecho— pero **no son el canal de verificación**: ese solo opera entre las dos filas de `dar-fe`, donde la forma es la misma y lo único que cambia es el relleno (§7.2).

**Posición canónica: la marca abre el bloque de identidad**, delante del nombre, como en el diagrama de §9.4. No va detrás del nombre: un nombre de hermandad puede ocupar **dos líneas** (§4.3), y una marca que lo siga acabaría suelta al final de la segunda línea, rompiendo la columna de identidad que la tarjeta existe para mantener alineada.

Ver §7.2: el canal de relleno no se mezcla con el canal de trazo.

### 9.6 Banda de contexto de jornada

**Propósito.** Comunicar contexto que afecta a la jornada completa (§6.3), no a una cofradía.
**Cuándo.** Cuando existe contexto activo. Al principio de Ahora y de Jornada, y como capa de aviso en el mapa.
**Cuándo no.** Para alteraciones de una cofradía concreta.

**Anatomía.** Banda a ancho completo, `--cf-info-soft`, barra de acento izquierda de `--cf-accent-bar` en `--cf-info`, `radius-sm`, icono `icon-md` + texto `text-sm`. Descartable solo si no es crítica; el contexto crítico persiste.

### 9.7 Tarjeta de información

**Propósito.** Agrupar información que no es una cofradía: hito del recorrido, dato de la hermandad, bloque de ayuda, resumen de jornada.
**Cuándo no.** Para representar una cofradía, ni para avisos (§9.8).

Superficie `--cf-surface`, borde 1px, `radius-md`, interior `space-4`. Hereda el registro del contenedor.

### 9.8 Aviso e incidencia

**Propósito.** Comunicar algo que requiere atención y puede cambiar una decisión.
**Cuándo.** Incidencias, suspensiones, cambios de recorrido relevantes, pérdida de conexión.
**Cuándo no.** Para contexto no accionable (§9.6) ni para confirmaciones (toast, §9.14).

**Variantes.** `atencion` (`--cf-warn`) · `critico` (`--cf-alert`) · `informativo` (`--cf-info`).
**Anatomía.** Icono `icon-md` **bold** + título `text-base`/600 + cuerpo `text-sm` + acción opcional. Barra de acento izquierda de `--cf-accent-bar` en el color del estado, superficie `-soft`.

```css
--cf-accent-bar: 3px;   /* barra que marca estado · §9.6 y §9.8 */
```

Es el **único token de capa de componente** que el sistema necesita hoy: lo comparten la banda de contexto y el aviso con el mismo significado. El resto de medidas de componente —altura de chip, tirador del sheet, altura de navegación, ancho del rail— **son locales y no se tokenizan**, porque no hay reutilización semántica que lo justifique (§4.10).
**Reglas.** El crítico **no es descartable** mientras siga activo. El texto dice **qué ha pasado y qué significa para el usuario**, no solo que hay una incidencia. Jamás se comunica gravedad solo con color: el icono y el título la llevan.

**Procedencia visible.** Un aviso debe dejar ver si lo **publica Cofradar** —porque el motor lo ha inferido— o si es **información aportada por usuarios y sin confirmar**. Son dos cosas distintas y no pueden leerse igual: una posición equivocada hace que alguien ande de más; una suspensión falsa manda a la gente a casa.

Es la regla 16 aplicada: cuando algo no se puede confirmar automáticamente, el trabajo es **comunicar bien esa incertidumbre**, no esconder el aviso esperando a que una persona lo valide. Mismo principio que §7: Cofradar puede decir «no lo sabemos».

**Caducidad.** Un aviso sin confirmar desaparece pasado su umbral. Si no, la interfaz acumula avisos fantasma que nadie retira, y eso acaba teniendo el mismo efecto que mentir.

### 9.9 Bottom sheet / panel de ficha

**Propósito.** Mostrar la ficha de una cofradía sin perder el contexto del mapa.
**Cuándo.** Al seleccionar una cofradía en el mapa; como contenedor de detalle en móvil.
**Cuándo no.** Para decisiones bloqueantes (eso es modal, §9.10).

**Tres alturas** en móvil: `asomado` (chip de identidad + estado + dato de decisión, ~20% de alto) · `medio` (~55%, tarjeta expandida) · `expandido` (~90%, ficha completa). Arrastrable por el tirador, con ajuste por imanes a las tres alturas.

**Anatomía.** `radius-xl` en esquinas superiores, `elev-3`, **superficie opaca**, tirador visible de 32×4px en `--cf-border-strong`.
**Reglas.** El tirador cae en la zona del pulgar. **El mapa sigue visible y operable en `asomado` y `medio`.** En oscuro, la elevación es escalón de superficie + borde (§4.6).
**Responsive.** En `lg`+ se convierte en **panel lateral** fijo, sin alturas ni arrastre, con el mismo contenido y la misma jerarquía.

### 9.10 Modal

**Propósito.** Interrumpir para una decisión que no puede continuar sin respuesta.
**Cuándo no.** Para mostrar información, confirmar algo trivial o celebrar (§11.3). **Nunca para «Dar fe».**

`radius-xl`, `elev-3`, ancho máximo 28rem, foco atrapado, cierre con Escape y por fuera, acción primaria a la derecha en escritorio y abajo en móvil.

**El fondo detrás del modal es una capa de atenuación sólida, sin desenfoque**, y es un token semántico:

```css
--cf-overlay: rgb(29 26 22 / .55);   /* claro */
--cf-overlay: rgb(14 12 10 / .60);   /* oscuro */
```

**En oscuro la atenuación casi no separa, y eso es aceptable.**

Medido con la **referencia explícita**, porque sin ella la cifra no significa nada: superficie del modal —`--cf-surface` en claro, `--cf-surface-raised` en oscuro— **contra `--cf-bg` ya atenuado**.

| | Fondo atenuado | Modal vs fondo |
|---|---|---|
| **Claro** | `#817E7A` | **4,04:1** |
| **Oscuro** | `#110E0C` | **1,22:1** |

No hay nada que oscurecer sobre un fondo que ya es casi negro. Pero no hace falta: en oscuro la jerarquía la construyen **`surface-raised` + `border-strong` + la línea luminosa**, que es exactamente lo que §4.6 prescribe para ese tema. La atenuación se conserva en los dos por otra razón —señalar que el resto está inerte y recoger el clic de fuera—, no por contraste. No contradice la prohibición de §4.6: lo que ahí se prohíbe es la **translucidez en superficies que portan contenido sobre cartografía**, porque vuelve ilegible lo que llevan encima. Una capa de atenuación hace lo contrario —suprime el fondo para que el modal se lea mejor— y no porta contenido. El desenfoque sigue prohibido, por coste en móviles medios y por lo que le hace al contraste al sol.

### 9.11 Navegación principal

**Barra inferior** (`base`, `md`): cuatro destinos, altura 56px + área segura, superficie `--cf-surface`, `elev-1`, borde superior 1px. Cada destino: icono `icon-lg` + etiqueta `text-xs`/600. Activo = icono `fill` + texto `--cf-text` + indicador de 2px; inactivo = icono `regular` + texto `--cf-text-muted`. **El estado activo no depende solo del color: cambia el relleno del icono.**

**Rail lateral** (`lg`+): misma estructura en vertical, ancho 80px (o 240px con etiqueta extendida), mismos estados. Objetivos de 48px si el puntero es grueso.

### 9.12 Franja de acción contextual

**Propósito.** Dar vía rápida a «Dar fe» en la zona del pulgar.
**Cuándo.** **Solo cuando realmente tiene sentido dar fe**, según el estado real de la jornada. Desaparece cuando no hay ninguna cofradía susceptible.
**Cuándo no.** Como quinta pestaña. Como contenedor de navegación.

**Anatomía.** Franja compacta justo encima de la navegación, `z-action`, superficie `--cf-surface`, `elev-1`, con una acción primaria. **Visualmente diferenciada de la navegación** y **compacta**: no debe parecer una pestaña ni restar espacio vertical apreciable.

**Comportamiento de la vía rápida**
1. El usuario pulsa.
2. Cofradar **propone candidatas**, usando ubicación, hora, recorrido y estado **para ordenar y reducir**, nunca para decidir.
3. Si no hay ubicación o no es suficientemente precisa, propone las cofradías `en_calle` en ese momento.
4. **El usuario confirma la cofradía**, incluso si hay una candidata evidente (regla 9).
5. **El usuario indica el elemento** que está viendo (§9.18).
6. Revisa ubicación y hora, y envía.

Es **un solo flujo**, no una acción de presencia seguida de otra de aportación. Y tiene que resolverse en muy pocos pasos: el usuario está de pie, entre gente y con una mano. Si no ha iniciado sesión, la cuenta se pide **aquí, en el momento en que hace falta**, y no antes.

**La vía rápida es un atajo, no un sustituto:** la acción contextual de «Dar fe» sigue existiendo dentro de cada cofradía.
**Responsive.** La franja depende del **tipo de interacción y del contexto operativo, nunca del ancho por sí solo** (§4.9).

| | Franja | Por qué |
|---|---|---|
| **El toque está disponible como modo de interacción** (`any-pointer: coarse`), a cualquier ancho | **Se conserva** | La franja existe para poner la acción primaria **al alcance de una interacción táctil a una mano**. Si el toque es posible, eso sigue haciendo falta |
| **El toque no está disponible** | No aparece | No hay nada que resolver: la acción vive en el contexto de cada cofradía |

**Lo que se consulta es `any-pointer`, no `pointer`.** `pointer` informa del dispositivo **primario**, y eso deja mal definidos los híbridos: un portátil con pantalla táctil o una tablet con teclado acoplado declaran `pointer: fine` y **siguen pudiendo cogerse con la mano**. Si el toque está entre los modos disponibles, la franja se conserva.

**Los dos ejes se componen y no se estorban.** Un híbrido tiene estados de `hover`, atajos de teclado, objetivos táctiles de 48px **y** franja, todo a la vez. Nada de esto describe dónde está el usuario ni qué está haciendo: describe **qué modos de interacción admite el dispositivo**, que es lo único que el sistema puede saber.

En los dos casos **«Dar fe» sigue disponible** como acción primaria del contexto de cada cofradía: **pierde protagonismo, no capacidades** (regla 14).

> **Corregido.** Esta regla decía antes «en `lg`+ la franja no aparece», y eso **deducía el contexto físico del viewport**: daba por hecho que una pantalla ancha significa alguien sentado. Contradice §4.9, que ya establece que ancho y tipo de interacción son **ejes independientes** y que una tablet horizontal sigue necesitando objetivos táctiles de 48px. Lo que gobierna es el puntero, no los píxeles.

### 9.13 Campos y formularios

Cofradar tiene poca entrada de datos; la que hay debe ser intachable.

Altura 48px, `radius-sm`, borde 1px `--cf-border-strong`, superficie `--cf-surface`, texto `text-base` (**nunca menor: por debajo de 16px iOS hace zoom al enfocar**). Etiqueta siempre visible encima en `text-sm`/500 — **no se usa placeholder como etiqueta**. Error debajo en `--cf-alert` con icono, y `aria-describedby`. `input` con `type` e `inputmode` correctos. **El error nunca se comunica solo con el color del borde.**

### 9.14 Feedback efímero (toast)

Confirmar que algo ha ocurrido, sin interrumpir. Aparece sobre la franja de acción, `z-toast`, `elev-2`, duración 4s, descartable, con acción de deshacer cuando aplique. **No se usa para errores que requieren decisión** (§9.8) ni para la celebración de «Dar fe» (§11.3).

### 9.15 Barra de progreso

Dos usos, misma anatomía, **semántica distinta por trazo**:

| Uso | Relleno | Trazo |
|---|---|---|
| Progreso de recorrido | Tramo recorrido en `--cf-live` | **Discontinuo** en la parte estimada o pendiente (§7.1) |
| Progreso de nivel o reto | `--cf-brand` (granate) | Continuo |

Altura 6px, `radius-full`, fondo `--cf-surface-sunken`. Siempre acompañada de su valor en texto: una barra sin cifra no es un dato.

### 9.16 Selector de día y filtros

**Chips de filtro**, distintos de los chips de estado: interactivos, `radius-sm`, estado seleccionado con fondo `--cf-text` y texto inverso (**no solo color: también peso**). El selector de día es una fila desplazable horizontalmente con el día actual centrado al abrir; cada día indica si tiene información disponible.

**En el selector de día el peso está reservado a la disponibilidad de información**, así que la selección **no lo usa**: se expresa con fondo `--cf-text` y texto inverso, más `aria-current`. Es la diferencia con el chip de filtro, donde el peso sí es un canal libre.

No hace falta una señal más. **La regla 1 gobierna el significado del producto** —fase, confianza, alteración, relación—, no el estado de selección de un control: una forma rellena entre formas en contorno no es ambigua. Y los dos canales se componen sin estorbarse, incluido el caso de un día que es el actual y además no tiene información.

### 9.17 Avatar y escudo

`radius-full`, tamaños 24 / 32 / 48 / 64. **Fallback obligatorio sin imagen**: iniciales en Newsreader sobre `--cf-brand-soft`. El escudo de hermandad es opcional en todo el sistema (§9.4).

### 9.18 Selector de elemento

**Propósito.** Indicar qué parte del cortejo se está viendo al dar fe. Es lo que convierte una aportación en proyectable sobre el itinerario.
**Cuándo.** Dentro del flujo de «Dar fe», siempre.
**Cuándo no.** Como filtro general del mapa: para eso hay chips de filtro (§9.16).

**Es opcional.** Siempre existe la opción **«Estoy viendo la cofradía»**, y no es una versión degradada: alguien puede estar viendo nazarenos, una banda o una parte intermedia del cortejo, o tener una visión parcial, y saber perfectamente de qué hermandad se trata sin poder precisar más.

**Nadie da fe en vano.** El motor usa cada aportación con la precisión que tiene, y **menos precisión no es peor aportación: es información distinta**.

| Lo que se aporta | Lo que Cofradar obtiene |
|---|---|
| Cofradía + elemento + ubicación | **Ancla de posición** precisa |
| Cofradía + ubicación | El cortejo **pasa por ese punto** |
| Cofradía sin ubicación | **Aporta evidencia de presencia y fase.** Con corroboración suficiente, es lo que acaba convirtiendo un `· según horario` en un estado confirmado (§6.1) |

> **Ninguna aportación confirma nada por sí sola.** Todo pasa por el sistema de consolidación (§7.2): una sola aportación genérica y sin ubicación **no convierte** una fase estimada en confirmada. Aporta evidencia, y la fase se confirma cuando el motor tiene corroboración suficiente.

**Anatomía.** Fila de opciones grandes, cada una con su icono del set cofrade (§4.7). **Pregunta por lo que se ve, con el término cofrade como texto secundario:**

```
[icono]  La cruz que abre el cortejo
         Cruz de guía
```

Objetivo táctil de 56px, por encima del mínimo: se pulsa de pie, con una mano y sin poder mirar mucho la pantalla.

**Reglas**
- **El orden del cortejo es información.** Las opciones se ordenan como va el cortejo —cruz de guía primero, final al final—, nunca por frecuencia de uso ni alfabéticamente.
- **Las opciones salen de los elementos configurados para esa cofradía**, no de una lista universal: no todas las hermandades tienen la misma composición. Taxonomía configurable por ciudad (§17).
- **Nunca se preselecciona ni se reordena por probabilidad** (regla 18).
- **El que sabe contesta igual de rápido que el que no.** Si la opción genérica fuera más cómoda que las precisas, mucha gente la pulsaría por velocidad y degradaríamos el dato sin motivo.
- Al usuario **no se le dice nunca que su aportación es poco precisa** (regla 17).

**Efecto secundario que vale la pena.** Al preguntar en llano y rotular debajo el término cofrade, el selector enseña el vocabulario **usándolo**. Resuelve buena parte de la ayuda al visitante sin glosario y sin que Cofradar deje de hablar como habla la Semana Santa.

---

## 10. El mapa

El mapa no es un componente: es un subsistema. No existe un patrón previo para lo que Cofradar necesita, porque **una cofradía no es un punto**: una hermandad con dos pasos y mil nazarenos ocupa entre doscientos y seiscientos metros de calle. La cruz de guía puede estar entrando en la Campana mientras el palio no ha salido aún de la calle anterior. Representarla con un pin dice algo falso y esconde la información más útil que existe en la calle: que a una cofradía se la puede alcanzar por la cola cuando ya no se llega a la cabeza.

### 10.1 Cartografía base

**Requisito:** cartografía **vectorial altamente personalizable**, con estilo propio en variantes clara y oscura. **Preferencia** por una solución tipo MapLibre o Mapbox. *No es todavía una decisión cerrada de diseño* (§21).

**Regla de prioridad.** El mapa debe integrarse visualmente con Cofradar, pero **la legibilidad cartográfica tiene prioridad absoluta sobre la identidad**. No se tiñe en exceso para hacerlo coincidir con la paleta.

Estilo: reducción de ruido (menos POIs, menos etiquetas comerciales), calles y manzanas con contraste suficiente para que los trazos de recorrido se lean encima, etiquetas de calle legibles, variante oscura cálida coherente con §5.

### 10.2 Los tres niveles de revelación

El mapa **revela progresivamente**. En vista general contesta rápido a «qué hay ahora y dónde»; la complejidad del recorrido aparece solo al seleccionar.

**Nivel 1 · Vista general**
- **Ninguna línea de recorrido completa.** Diez itinerarios completos en el casco antiguo producen un plato de espaguetis ilegible.
- Cofradías `en_calle`: **segmento** sobre su recorrido, mostrando que ocupan calle y no son un punto.
- **Dirección de avance integrada en el marcador de cabeza**, no como flecha pegada al lado.
- `prevista` e `inminente`: marcador en su punto de salida, **sin segmento** (todavía no ocupan calle).
- `finalizada`: fuera del foco o muy atenuada.

**Nivel 2 · Cofradía seleccionada**
- **Recorrido completo** de esa cofradía.
- **Diferenciación entre recorrido realizado y pendiente** (trazo continuo / discontinuo, §7.1).
- **Segmento** que representa dónde se encuentra actualmente.
- **Hitos relevantes** con hora prevista y hora real o estimada cuando existan.
- **Bottom sheet** con la información detallada (§9.9).
- **Las demás cofradías permanecen visibles en segundo plano**: el usuario está decidiendo entre varias.

**Nivel 3 · Zoom bajo o aglomeración**
- Agrupación por proximidad para evitar saturación.
- **El grupo debe comunicar si contiene alguna cofradía con incidencia importante**, no limitarse a mostrar un número. Un grupo que oculte una suspensión es un grupo que miente.

### 10.3 Anatomía del marcador

Los marcadores **tienen sistema propio**. No se usa un icono de Phosphor puesto encima del mapa.

```
        ┌─────────┐
        │  icono  │   ← icono del set cofrade o de fase, icon-sm bold
        └────┬────┘   ← indicador de dirección integrado en la forma
             ▾
```

| Elemento | Especificación |
|---|---|
| Superficie | **Opaca siempre**, `--cf-surface` |
| Borde | `--cf-border-width-strong` en el color del estado |
| Relleno de estado | `--cf-<estado>-vivid` (los vivos son para fondo de cartografía) |
| Icono | Set cofrade o icono de fase, `icon-sm`, peso `bold` |
| Dirección | **Integrada en la forma del marcador** |
| Estado | Por **forma y relleno**, no solo por color |
| Confianza de la fase | Por **trazo del borde**: continuo si `confirmado`, discontinuo si `estimado` o `desactualizado` (§6.1). Mismo código que el chip y que el segmento |
| Relación del usuario | Marca en granate, misma posición relativa que en la tarjeta (§9.5) |
| Etiqueta con nombre | **No viaja siempre con el marcador** (se solaparían todas en el casco antiguo). Aparece al seleccionar y en zoom alto |
| Elevación | `elev-2` en claro; escalón de superficie + borde en oscuro |

**Tamaños.** `md` 32px (por defecto) · `lg` 40px (seleccionado) · `cluster` 40px con contador y marca de incidencia si la hay.

### 10.4 El segmento

**Qué es.** La **mejor estimación de la zona de calle ocupada** por la cofradía. **El diseño no puede asumir que conocemos con precisión la cabeza y la cola.** Su precisión depende de los datos disponibles y la representación debe funcionar también con datos estimados.

| Nivel de confianza | Representación |
|---|---|
| Posición y progreso **confirmados** | Trazo continuo, grosor pleno |
| Posición y progreso **estimados** | Trazo **discontinuo** (`--cf-dash-pattern-map`) |
| Dato **desactualizado o de baja confianza** | Trazo discontinuo + marcador con indicador de desfase + antigüedad en la ficha |

**Prohibido el difuminado** de los extremos: dificulta la lectura sobre cartografía. La incertidumbre se comunica con **trazo, marca textual y frescura del dato**, nunca con pérdida de contraste.

**Los elementos son núcleo, no evolución futura.** Una cofradía tiene varios puntos relevantes dentro del segmento —**cruz de guía, paso de Cristo o misterio, palio y final**— y están en el producto desde el lanzamiento: son la taxonomía sobre la que se dan las aportaciones y de la que **se deriva el propio segmento**, que va del primer elemento conocido al último. Por eso el segmento es siempre una estimación: **no es una línea indivisible, es el contenedor de esos puntos**.

No hace falta mostrarlos todos siempre. En vista general basta el segmento y el marcador de cabeza; los elementos se revelan al seleccionar la cofradía y en su ficha, donde cada uno lleva su propia posición, su hora y su nivel de confianza, porque **un elemento puede estar confirmado y otro estimado en la misma cofradía**. El caso canónico: el paso de Cristo, que los cuadrantes no recogen, se interpola entre la cruz de guía y el palio y queda marcado como estimado hasta que alguien da fe de él.

**De dónde sale la confianza de cada elemento.** No hace falta ninguna regla nueva: es §7.1 aplicado al elemento, y el mecanismo ya está en el PRD. La posición estimada de un elemento a una hora dada **sale por interpolación entre los dos anclajes más cercanos del horario transcrito**, así que **todo elemento cuya posición venga solo del cuadrante es `estimado`**. Lo que la confirma es una aportación que **nombre ese elemento** (§9.18): ancla ese y solo ese. Y una aportación genérica —«Estoy viendo la cofradía»— **aporta evidencia de presencia y de fase, no un anclaje de posición**, así que puede acabar confirmando la fase sin confirmar la posición de ningún elemento. Son dos cosas distintas y el mapa tiene que poder mostrarlas a la vez: **una cofradía con la fase confirmada y los cuatro elementos estimados es un estado normal**, no una contradicción.

### 10.5 Recorrido e hitos

**Modelo de recorrido basado en hitos configurables por ciudad**, cada uno con hora prevista y, cuando sea posible, hora real o estimada.

- Sevilla tendrá sus hitos (Campana, Plaza de San Francisco, Catedral…); otra ciudad tendrá los suyos **sin cambiar el sistema**.
- **La carrera oficial no es una fase.** Es un hito —o un tramo de hitos— del recorrido, para no atar el modelo de estados a una ciudad concreta.
- Cofradar debe poder expresar **dónde está una cofradía dentro de su recorrido**, no solo mostrar una coordenada.

| Elemento | Representación |
|---|---|
| Recorrido pendiente | Trazo discontinuo, `--cf-border-strong` |
| Recorrido realizado | Trazo continuo, `--cf-live` |
| Hito con hora confirmada | Punto relleno + etiqueta con hora |
| Hito con hora estimada | Punto en contorno + `≈ hora` |
| Hito ya pasado | Punto atenuado + hora real si se conoce |

### 10.6 Ubicación del usuario

**La geolocalización nunca es obligatoria** (regla 10). La ubicación depende de los permisos y de lo que entregue el navegador, y el diseño debe funcionar igual sin ella.

Ocho estados, y **«no solicitado» y «denegado» no son el mismo estado**: para pintar el mapa da igual, pero para lo que Cofradar puede ofrecer no — en uno aún puede pedir permiso, en el otro ya no.

| Estado | Mapa | Proximidad |
|---|---|---|
| **No solicitado** | Completo, centrado en la ciudad o en la actividad | No se ofrece. Existe la posibilidad de pedir el permiso (§19) |
| **Concedido, precisión suficiente** | Punto de usuario + radio de precisión real, **nunca menor que el que informa el navegador** | Sí, con lenguaje prudente (§7.4) |
| **Concedido, precisión reducida** | Punto con radio honesto, grande | **No se usa para proponer proximidad**. La aportación sigue valiendo: es información distinta, no peor (§9.18) |
| **Concedido, sin posición todavía** | Completo, sin punto de usuario | No. Es un «no lo sabemos» de los nuestros, **distinto de no tener permiso**: ocurre en calles estrechas, con aglomeración o con la red saturada |
| **Denegado** | Completo | No. **No se vuelve a pedir** (§19) |
| **Bloqueado por navegador o sistema** | Completo | No. Mensaje distinto, porque no hay nada que el usuario pueda hacer desde Cofradar (§19) |
| **Posición lejos de la jornada** | Completo, sin forzar el encuadre | No se calcula ni se rellena. **No se le dice al usuario que está lejos como un reproche** (regla 17) |
| **Revocado con Cofradar abierto** | Vuelve al estado sin permiso **sin recargar** | Desaparece la capa, no deja hueco |

**La falta de ubicación nunca degrada la confianza de un dato.** Una cofradía `confirmado` lo sigue estando sin GPS: lo único que desaparece es la posición del usuario respecto a ella.

### 10.7 Contraste máximo en el mapa

`data-contrast="max"` refuerza especialmente **marcadores, recorridos, etiquetas e hitos**: bordes más gruesos, rellenos más saturados, etiquetas con mayor peso y, si hace falta, placa de fondo opaca. Siempre **priorizando la legibilidad cartográfica sobre la identidad**.

---

## 11. «Dar fe», gamificación y celebración

Es la única capa con licencia para el lenguaje «social y de juego», y está **contenida en momentos concretos** (D1). Fuera de ellos, la gamificación queda en segundo plano.

### 11.1 Dónde vive el granate

| Sí | No |
|---|---|
| Marca de relación con el usuario (§9.5) | Botones primarios |
| Puntos, niveles, progreso personal | Chips de estado |
| Insignias, logros, retos | Avisos e incidencias |
| Celebración posterior a «Dar fe» | Cualquier estado operativo |
| Cabeceras editoriales y de identidad | Indicadores de confianza del dato |

### 11.2 La acción «Dar fe»

**Significado.** «Estoy viendo esta cofradía ahora.» Es la única relación que puntúa y la única que puede alimentar el cálculo de la posición pública (§6.4). **Una sola acción con dos consecuencias**, personal y colaborativa, nunca dos pasos.

**Dos entradas, una sola acción:**
1. **Acción contextual**, dentro de la cofradía (tarjeta expandida, ficha, bottom sheet). Botón **primario en tinta**.
2. **Vía rápida global**, en la franja de acción contextual (§9.12).

**Reglas**
- **Cofradar propone, el usuario confirma** (regla 9).
- **La vía rápida nunca queda bloqueada por falta de ubicación.**
- **El flujo incluye el elemento** que se está viendo (§9.18). Es lo que hace la aportación útil para los demás, y no se separa en una segunda acción.
- **Todo el flujo se diseña para la calle**: de pie, entre gente, con una mano y mirando el paso y no la pantalla. Cada toque de más cuesta el triple que sentado.
- El botón es **tinta, no granate**. Lo que hace especial a «Dar fe» no es su color: es que tiene vía rápida propia y que lo que viene después es lo único que celebra.
- El granate aparece **después**, cuando esa aportación pasa a formar parte de la historia del usuario, sus puntos y su relación con esa hermandad.
- Si el usuario no ha iniciado sesión, la cuenta se pide **en el momento de dar fe**, no antes: consultar Cofradar nunca exige registro (§18).
- **La aportación en vuelo se conserva.** Si la autenticación interrumpe el flujo, lo que el usuario estaba a punto de enviar se guarda y se recupera **en el paso exacto donde estaba**. Sin eso, la interrupción es una pérdida de datos: nadie repite una aportación de algo que ya ha pasado.
- **«Dar fe» no se bloquea nunca por falta de GPS.** La vía rápida tampoco. El GPS es una señal, no el juez.

### 11.3 Celebración · dos niveles

**Regla 11: la celebración nunca debe hacer que te pierdas aquello que estás celebrando.** Si alguien acaba de dar fe es porque tiene el palio delante: una pantalla completa que le secuestra el móvil cuatro segundos es un error de diseño, no una recompensa.

| Nivel | Cuándo | Forma |
|---|---|---|
| **Media** (por defecto) | Cada aportación de «Dar fe» | Panel inferior compacto: confirmación inmediata del registro, puntos obtenidos si corresponde, progreso relevante. **Descartable con un toque y se va solo.** No tapa lo importante |
| **Alta** (excepcional) | Subir de nivel · completar un reto · desbloquear un logro importante · otros hitos poco frecuentes | Pantalla completa, con fuerza: granate, movimiento, set de iconos cofrades, radios generosos, formas pill, cifras en `--cf-data-xl` |

**Los puntos base se muestran al instante**; el **bonus, si lo hay, llega después**, cuando la aportación consolida, y se presenta **como buena noticia** y nunca como la resolución de una duda.

**La celebración alta conserva toda su información sin animación** cuando `prefers-reduced-motion: reduce` está activo (§14).

Si la aportación es `no-verificable`, la celebración **confirma el registro con normalidad** y explica con lenguaje no acusatorio que no se pudo verificar y qué implica (§6.4).

### 11.4 Componentes de gamificación

| Componente | Especificación |
|---|---|
| **Contador de puntos** | Cifras tabulares, `--cf-data-md`/700, granate. Incremento animado solo si hay movimiento permitido |
| **Reputación** | **No tiene componente.** Es interna y **no se muestra como número**: es una entrada del motor de validación, no una moneda de juego |
| **Historial de aportaciones** | Todas aparecen. Las consolidadas pueden llevar marca de *contribuyó a la posición*; las demás, **sin etiqueta** (regla 17) |
| **Indicador de nivel** | Insignia `radius-full`, granate, con progreso al siguiente nivel (§9.15, trazo continuo) |
| **Insignia de logro** | `radius-full`, `--cf-brand-soft` con borde `--cf-brand-border`; icono del set cofrade o propio del logro. Estados: `bloqueado` (contorno, atenuado, con la condición visible), `desbloqueado` (relleno, granate) |
| **Tarjeta de reto** | Tarjeta de información en registro editorial, con progreso, condición y recompensa |
| **Colección de vistas** | Rejilla de hermandades con marca `vista` (§9.5). Es el «álbum personal» y **no tiene valor competitivo** |
| **Clasificación** | Lista compacta, con la posición propia destacada y el periodo de la edición. **Solo las aportaciones consolidadas** entran. El ámbito y la magnitud que ordena están pendientes (§21) |

Logros, retos y clasificaciones **van después en el orden de desarrollo** y **no quedan fuera del diseño** (§1).

### 11.5 Las seis reglas de la economía

> **Cofradar no es un juego sobre la Semana Santa.** La gamificación reconoce participación, descubrimiento y aportaciones útiles, y **nunca compite con la calle ni premia cantidad por encima de calidad.**

| # | Regla |
|---|---|
| **R1** | **Un solo marcador, tres reconocimientos.** Los puntos miden exclusivamente «Dar fe». El descubrimiento se reconoce en la colección y **no da puntos**; los logros son el único lugar donde se reconoce un hito que no es una aportación. `seguida` y `vista` nunca puntúan ni aparecen en una clasificación |
| **R2** | **Progresión de por vida, competición por edición.** Puntos y nivel se acumulan siempre; las clasificaciones se cierran por edición, para que quien llega nuevo pueda competir desde su primer año |
| **R3** | **Misma base, bonus según redundancia.** Todo «Dar fe» que supera la plausibilidad recibe **los mismos puntos base**, con independencia de su precisión. El bonus decrece **según la redundancia de la información, nunca por repetir cofradía**. El máximo sigue siendo detectar que una estimación se ha quedado obsoleta |
| **R4** | **Los puntos no compran nada.** El nivel no desbloquea funciones, no da peso en el motor y no influye en la reputación. La recompensa de un reto solo puede ser reconocimiento |
| **R5** | **Los retos reconocen lo que el usuario vive y hace; no dirigen sus movimientos.** Ni «ve ahora a», ni «te falta esta cofradía», ni «llega antes de». Viven en su sección y **nunca en Ahora ni en el mapa** |
| **R6** | **Los puntos nunca bajan.** La reputación puede bajar ante patrones porque es una defensa del sistema; los puntos reconocen algo que ya ocurrió |

**Las cifras concretas son calibración, no diseño** (§21): el componente es el mismo con seis niveles que con doce. Los **nombres de nivel y las condiciones de logro que aparezcan en cualquier maqueta son ejemplos provisionales** y van marcados como tales (§21).

---

## 12. Carga, vacío y error

En Cofradar estas pantallas **no son casos excepcionales: son el estado normal durante buena parte del tiempo.**

### 12.1 Enfoque de carga: último dato conocido

**Regla 6: una actualización nunca borra información que todavía puede ser útil.**

Perder cobertura dos minutos al meterse en una calle estrecha y volver con la pantalla en blanco no es cargar: es borrar. Si Cofradar está mostrando datos y pierde conexión o empieza a actualizar, **esos datos permanecen visibles**; lo que cambia es la información sobre su frescura y el estado de sincronización.

| Situación | Comportamiento |
|---|---|
| **Primera carga real**, sin ningún dato local | **Skeleton.** Es el único caso en que se usa |
| **Refresco con datos previos** | Contenido anterior visible y utilizable + **indicador discreto de actualización en curso** |
| **Cualquier refresco** | **Nunca spinner bloqueante** |

**Requisito de implementación.** Cofradar debe **conservar localmente el último estado conocido** necesario para mantener una experiencia útil ante problemas de conexión. No es una optimización: es la condición para que el resto del sistema funcione.

**Regla 7: persistir no es dar por vigente.** La caché permite mostrar información; **no convierte información antigua en información vigente**. Cada dato conserva su propia frescura y puede pasar de actual a desactualizado y finalmente a «último dato conocido» (§7.1).

### 12.2 Los cinco estados, más el refresco

Son **componentes distintos**, no un «vacío» genérico.

| Estado | Qué es | Tratamiento |
|---|---|---|
| `vacio-legitimo` | **Sabemos que no hay ninguna cofradía en la calle ahora.** No es un error ni falta información | **Tono tranquilo, sin iconografía de alerta.** Dice qué ocurre y, si existe algo próximo realmente relevante, qué será lo siguiente y cuándo |
| `sin-datos` | Cofradar **no dispone de información suficiente** sobre esa jornada, hermandad o elemento | Lo explica de forma directa. **Sin inventar ni rellenar.** Nunca sugiere que el usuario ha hecho algo mal |
| `sin-conexion-con-datos` | Hay datos locales y no se pueden actualizar | **Se muestra el último estado conocido con su frescura claramente visible** + aviso de que Cofradar no puede actualizarlo + reintento **sin bloquear la interfaz** |
| `sin-conexion-sin-datos` | Primera vez que se abre esa información, sin conexión y sin nada almacenado | Dice claramente que **necesita conexión** para obtenerla. **No se confunde con «no hay nada en la calle» ni con «no tenemos datos de esa hermandad»** |
| `error` | Fallo inesperado | Mensaje sencillo, reintento, **sin jerga técnica** y sin culpar a nadie |
| `refrescando` | **No es un problema.** Cofradar está intentando obtener información nueva | Indicador discreto; **todo el contenido anterior sigue utilizable**. Se diferencia claramente de `sin-conexion` |

**`vacio-legitimo` merece atención real de diseño.** Por frecuencia es una de las pantallas más vistas de la aplicación: todas las mañanas de Semana Santa, todas las tardes antes de las salidas, y los once meses restantes. Es donde más fácil es que Cofradar parezca inútil y donde mejor puede demostrar que sabe de lo que habla.

**Pero ser útil no significa rellenar la pantalla.** Si lo único relevante es «La próxima salida prevista es a las 17:15», eso es suficiente (regla de §8.3).

**Resumen operativo**

```
Dato anterior disponible  → se conserva y se contextualiza
Dato antiguo              → se muestra como antiguo, nunca como actual
No hay datos              → Cofradar lo reconoce
No hay nada ocurriendo    → Cofradar lo explica, no lo trata como error
Actualizar                → nunca bloquea innecesariamente lo que ya puedo consultar
```

---

## 13. Interacción y feedback

| Acción | Respuesta |
|---|---|
| Pulsación | Confirmación visual en `--cf-dur-instant`, siempre |
| Acción con efecto inmediato visible | Sin toast: el cambio en pantalla es el feedback |
| Acción sin efecto visible | Toast (§9.14), con deshacer cuando aplique |
| «Dar fe» | Celebración media (§11.3) |
| Hito de gamificación | Celebración alta (§11.3) |
| Acción fallida | Aviso (§9.8) con causa y reintento. **Nunca se pierde lo que el usuario había introducido** |
| Cambio de altura del bottom sheet | `--cf-dur-sheet`, `--cf-ease-out`, con imanes |
| Selección en el mapa | Marcador a `lg` + bottom sheet a `medio` + recorrido completo, simultáneos |
| Toque en el nombre de un hito | Abre el mapa centrado en ese punto, **en el contexto de esa cofradía y su recorrido**. Todo dato que nombre un lugar lleva a verlo (§9.4) |

**Reglas**
- **Ninguna acción destructiva sin confirmación**, y las confirmaciones dicen qué se va a perder.
- Las acciones de la capa personal (`seguida`, `vista`) son **optimistas con reversión**: responden al instante y se corrigen si fallan.
- **«Dar fe» nunca es optimista en cuanto a verificación**: la aportación se registra al instante, pero el grado de verificación se comunica con honestidad en cuanto se conoce.

---

## 14. Accesibilidad

### Contraste

**AA (4.5:1) como mínimo general. AAA (7:1) como objetivo para la información crítica.**

**«Crítico» se define por la función que cumple el dato, no por el componente en el que aparece.** Un mismo componente puede contener información AAA y otra AA.

Son críticos, entre otros:

- Estado actual de una cofradía.
- Hora o dato temporal protagonista.
- Retrasos y adelantos relevantes.
- Alteraciones e incidencias.
- Avisos importantes.
- Acciones primarias.
- Información necesaria para entender si un dato es **estimado, desactualizado o no se ha podido actualizar**.
- **Cualquier información cuya mala lectura pueda provocar que el usuario tome una decisión equivocada en la calle.**

AAA es el objetivo de esos elementos **siempre que sea técnicamente posible sin romper otros requisitos de accesibilidad o semántica**.

Motivo de fondo: a pleno sol un contraste de 4.5:1 medido en laboratorio se comporta como mucho menos, porque el reflejo de la pantalla añade luz a los negros y aplana la diferencia. Cumplir AA no garantiza que se lea en la calle a mediodía.

### Excepción medida y documentada · AAA en modo oscuro

**En oscuro, dos de los cinco estados no alcanzan AAA sobre su superficie `-soft`, y no se van a forzar.**

| Estado | Medido en oscuro | |
|---|---|---|
| `warn` | 7,31:1 | AAA |
| `info` | 7,01:1 | AAA, **por un margen mínimo**: si algún valor de esa familia se mueve, hay que volver a medirlo |
| `idle` | 8,99:1 | AAA, con `--cf-idle-text` `#C4BCB0` |
| `live` | 6,95:1 | AA · **excepción** |
| `alert` | 5,83:1 | AA · **excepción** |

Llegar a AAA exigiría una de dos cosas, y **las dos rompen requisitos de semántica**, que es la salvedad que la propia regla de AAA contempla:

- **Oscurecer la superficie `-soft`** hasta casi negro, con lo que pierde el tinte que comunica el estado.
- **Aclarar el texto** hasta un pastel, con lo que se pierde la separación de tono que distingue la alerta de la marca personal (§4.1).

Así que para `live` y `alert` en oscuro la carga la llevan los **canales redundantes** —icono en `bold`, texto explícito, trazo— y el usuario que necesite más tiene `data-contrast="max"`, que sube el texto de estado al paso `-100` de su familia. **Esto queda escrito para que nadie lo «arregle» después lavando los colores.**

### Requisitos confirmados

| Requisito | Especificación |
|---|---|
| **Foco visible** | **Siempre.** Anillo de 2px en `--cf-text` con 2px de separación. Nunca se elimina ni se sustituye por nada más débil |
| **Teclado** | Navegación completa donde corresponda. Orden de tabulación lógico. Foco atrapado en modales y liberado al cerrar |
| **Movimiento** | `prefers-reduced-motion: reduce` respetado. **Las celebraciones mantienen toda su información aunque desaparezca la animación** |
| **Color** | **Ningún significado depende exclusivamente del color** (regla 1) |
| **Zoom y tamaño de texto** | El zoom del navegador y el tamaño de texto del sistema no deben romper la interfaz. Todo en `rem` |
| **Objetivos táctiles** | **Mínimo 48px siempre que el toque esté disponible** (`any-pointer: coarse`), no solo cuando sea el modo primario, y nunca detectado por ancho (§4.9) |
| **Texto** | Nada por debajo de 12px; 16px mínimo para contenido que haya que leer |
| **Lectores de pantalla** | Fase, alteraciones, confianza y frescura se exponen como texto, no solo como color o forma. Las actualizaciones en vivo usan regiones `aria-live` con cortesía adecuada: `polite` para refrescos, `assertive` solo para incidencias críticas |
| **Orientación** | Funciona en vertical y horizontal. Nada se bloquea a una orientación |

---

## 15. Responsive · reglas

Composición y breakpoints en §4.9 y §8.4. Reglas que rigen por encima de ellos:

1. **El responsive cambia la presentación y la prioridad, nunca las capacidades.** Ninguna funcionalidad esencial existe únicamente porque haya pantalla grande.
2. **Móvil es la referencia principal del sistema.** Toda mejora de escritorio es aditiva.
3. **No se crean componentes exclusivos de escritorio.** Se recomponen los que existen.
4. **Ancho y tipo de interacción son ejes independientes.**
5. **El contenido textual y las listas tienen ancho máximo**; el mapa aprovecha el espacio sobrante.
6. En pantallas grandes se puede mostrar **más información simultánea**, nunca información distinta.

---

## 16. Escritura y lenguaje

**Norma transversal del producto, no una opción visual** (portador 3 de §2).

**Cofradar habla el lenguaje real de la Semana Santa con naturalidad y precisión:** cruz de guía, palio, carrera oficial, Campana, salida, entrada, Madrugá, tramos, estación de penitencia, nazarenos, banda.

- **«Dar fe» es el nombre propio de la acción en Cofradar.** No se llama check-in, ni registrar, ni marcar. Es la expresión cofrade de dar testimonio de lo que uno ha visto, y es lo que hace que la mecánica se entienda sin explicarla.
- **El área personal se llama «Mi tramo»**, no «Perfil».
- **No se explican esos términos al usuario habitual.** La ayuda al visitante la resuelve el producto y no un glosario (D25): el selector de «Dar fe» pregunta en llano con el término cofrade debajo, los hitos son interactivos y el nombre popular es dato explícito. **Nada en la interfaz debe delatar que eres de fuera.**
- Los nombres de hermandades se escriben como los escribe la hermandad, no normalizados. Cada una tiene **dos formas, ambas configuradas como dato**: el **nombre popular** —el que usa todo el mundo— para tarjetas, Ahora, Jornada y mapa, y la **denominación completa** para la ficha. **Cofradar no inventa abreviaciones.**
- **La ayuda al visitante sale del propio producto, no de un modo visitante.** Cofradar debe ser comprensible para quien llega por primera vez **sin resultar infantil ni redundante** para quien lleva toda la vida viendo cofradías. Queda descartado detectar quién es visitante —por perfil, historial o preguntas de bienvenida—, tener interfaces distintas para él, y construir un glosario o una sección de ayuda específica. **Nada en la interfaz debe delatar que eres de fuera.**
- El tono es **sobrio y respetuoso**, nunca solemne ni devocional. Cofradar informa; no predica ni celebra la fiesta por el usuario.
- **Lenguaje de la incertidumbre** (§7.4): `cerca`, `a 450 m`, `parece alcanzable`, `≈ 21:40`, `hace 23 min`, `último dato conocido`, `no hay información reciente`.
- **Lenguaje de la verificación** (§6.4): `Verificado`, `No se pudo verificar`. **Nunca** `dudoso`, `no válido`, `sospechoso`.
- Los errores explican **qué ha pasado y qué puede hacer el usuario**, sin jerga técnica y sin culparle.
- Los estados vacíos legítimos dicen **qué ocurre y qué será lo siguiente**, sin rellenar.

---

## 17. Preparación para otras ciudades

Sevilla es el alcance inicial. El sistema está construido para que otra ciudad **no obligue a rediseñar**. Lo que es dato y lo que es sistema:

| Es **dato configurable por ciudad** | Es **sistema, común a todas** |
|---|---|
| Hitos del recorrido y sus nombres | El modelo de estados (fase, alteración, contexto, relación) |
| Itinerarios, puntos de salida y templos | El sistema de confianza y frescura |
| Hermandades, nombres, escudos | Los tokens, los dos registros, los dos temas |
| Qué punto es «relevante para verla» | Las tres vistas y la navegación |
| Ventanas de `inminente` y umbrales de caducidad | Los componentes y sus variantes |
| Vocabulario local, si difiere | Las reglas de §2 |
| Estilo de cartografía local | La anatomía de marcador, segmento y recorrido |

**Dos precauciones ya aplicadas:** la carrera oficial es un hito y no una fase (§10.5); y «próximo punto» es el siguiente punto relevante para verla, no un hito institucional concreto (§9.4).

**Lo único que habría que revisar al cambiar de ciudad** es el set de iconos cofrades, si el vocabulario visual local difiere, y los valores de calor de la paleta si la identidad material de esa ciudad es muy distinta a la de cera, piedra y albero.

---

## 18. Cuenta, identidad y acceso

**Consultar Cofradar nunca exige nada.** La identidad se pide en el momento en que hace falta, y solo entonces.

### 18.1 Acceso

**Única vía: cuenta de Google.** No existe usuario y contraseña de Cofradar, ni código por correo, ni registro tradicional, **ni pantalla de recuperación** — sin contraseña no hay nada que recuperar.

- **«Entrar con Google» sirve para crear la cuenta y para acceder a una existente.** Una sola puerta: al usuario no se le pregunta si ya tiene cuenta, porque en ese momento es ruido.
- Cofradar mantiene su **cuenta interna** asociada a la identidad que autentica Google.
- **Sesión persistente con renovación transparente.** Nada de reautenticaciones inesperadas durante el uso normal: una sesión que caduca a las tres de la madrugada del Viernes Santo es un fallo operativo.
- **Cambiar la cuenta de Google asociada solo es posible desde una sesión viva.** Eso convierte la sesión persistente en la red de seguridad real del sistema. Si alguien pierde el acceso a su cuenta de Google, la recuperación es de Google: Cofradar no inventa un segundo sistema de autenticación.
- **El registro no pide ni un campo.**

### 18.2 Cuenta privada ≠ identidad pública

Son dos capas distintas y se piden en momentos distintos.

| | Cuándo se crea | Qué contiene |
|---|---|---|
| **Cuenta** | Al intentar una acción que necesita identidad: «Dar fe», reportar una incidencia | Nada que el usuario tenga que rellenar |
| **Identidad pública** | **Solo cuando el usuario va a hacer algo en lo que otros puedan verlo** por primera vez | Nombre visible y avatar (§9.17) |

**No se piden nombre ni avatar «por si algún día hacen falta».** Qué contiene el perfil que ven los demás está pendiente (§21).

### 18.3 Interrupción y vuelta

Pedir la cuenta en medio de una acción es lo correcto, y también lo más delicado del flujo.

- La interrupción **explica por qué hace falta identidad aquí y solo aquí**.
- Al terminar, el usuario vuelve **al paso exacto del flujo donde estaba, con sus datos intactos** (§11.2).
- **Ninguna aportación en vuelo se pierde.**

### 18.4 Datos locales y fusión

**`seguida` y `vista` funcionan en local y sin cuenta** (§6.4), incluidas hermandades vistas en ediciones anteriores a Cofradar. Mi tramo **no es una pantalla de acceso con otro título**: funciona de verdad en todo lo que no necesita identidad, y lo que sí la necesita se muestra **nombrado y vacío de verdad**, nunca con cifras de ejemplo (regla: informar, no rellenar).

> **Autenticarse nunca provoca pérdida de información local.**

- Al crear cuenta, los datos locales **se incorporan** a ella.
- Al iniciar sesión en una cuenta que ya tiene información, **fusión y nunca sustitución silenciosa**.
- **Cerrar sesión no borra nada**, ni local ni remoto: se vuelve al estado sin cuenta con la colección intacta. Quitar los datos del dispositivo es una acción explícita y aparte.
- Las reglas finas de conflicto y duplicado están pendientes (§21).

**La invitación a crear cuenta es una afirmación sobre el dato, no una promesa de recompensa:** «esto está guardado solo en este teléfono». Nunca «desbloquea Mi tramo».

### 18.5 Cuenta y Ajustes

> **Cuenta es quién eres y cómo sales. Ajustes es cómo se comporta Cofradar.**

**Cuenta:** la cuenta de Google asociada · identidad pública si existe · exportar mis datos · cerrar sesión · eliminar cuenta.
**Ajustes:** apariencia · accesibilidad · permisos · privacidad · ayuda.

### 18.6 Eliminar cuenta

**Los datos personales del usuario y las observaciones que ya forman parte del conocimiento colectivo no tienen el mismo ciclo de vida.**

| Se borra | Se conserva, sin vínculo con nadie |
|---|---|
| Identidad, vía de acceso, nombre público y avatar | El hecho observado: elemento, punto, hora, confianza |
| Puntos, nivel, logros, retos | |
| Reputación interna | |
| Colección, vistas y seguidas | |
| El historial **como historial suyo** | |
| Su presencia en cualquier clasificación | |

El historial muere y la observación no, y es coherente: el historial es la **proyección personal** de la aportación, y la observación es **el hecho**. Solo el primero es un dato personal.

**Reglas de la pantalla**
- Borrado **inmediato**, sin plazo de gracia, con **exportar mis datos** ofrecido en la misma pantalla: lo que el usuario más va a echar de menos es su colección, no sus puntos.
- Lo dice **en llano y antes de confirmar**, nunca enterrado en un texto legal: *«Tus aportaciones dejan de estar asociadas a ti. La información que aportaron sobre esa jornada no se borra: es lo que explica por qué Cofradar dijo lo que dijo aquella noche.»*
- Las clasificaciones **se recalculan**: no se deja el nombre de alguien que ya no existe.

*La validación jurídica de esta política está pendiente (§21). Lo anterior es comportamiento de producto, no una afirmación legal cerrada.*

---

## 19. Permisos

Dos permisos, un mismo patrón. **Cofradar es web y PWA: nada de asumir comportamiento de aplicación nativa.**

### 19.1 Las cuatro reglas

**Nunca un diálogo del navegador sin un paso propio delante.** La petición tiene que llegar explicada, porque puede no haber una segunda oportunidad.

**Se explica al principio, se pide al usarlo.** La introducción cuenta que Cofradar **funciona sin ubicación** —que es un argumento de confianza, no una disculpa— y el permiso se solicita cuando el usuario toca algo que lo aprovecha: centrar el mapa, o «Dar fe». **Nunca durante el arranque.** Es el mismo criterio que la identidad: se pide cuando hace falta.

**Regla agnóstica de plataforma.** Si navegador y sistema permiten solicitar el permiso, Cofradar puede hacerlo después de explicarlo. Si **ya no puede solicitarse desde la web**, Cofradar lo explica de forma contextual e indica que debe cambiarse en los permisos del navegador o del dispositivo. **Nunca instrucciones que Cofradar no pueda saber si son ciertas** en ese navegador: ningún «ve a Ajustes de la app» inventado.

**El permiso no se pide dos veces.** Denegado es una respuesta, no un obstáculo. Se vuelve a ofrecer el camino solo cuando el usuario intenta algo que lo necesita.

### 19.2 Una sola invitación, en un solo lugar

El riesgo de diseño real es un producto que, sin ubicación, pone «activa la ubicación» en cada tarjeta.

- La proximidad es una **capa adicional** de la tarjeta (D12). Sin ubicación **esa capa no está y no deja hueco**, ni aviso, ni promesa.
- La invitación vive en **Ajustes · Permisos** y en el momento en que el usuario pide algo que la usa. En ningún otro sitio.

Los ocho estados del permiso de ubicación y su efecto sobre el mapa están en §10.6.

### 19.3 Permiso de avisos

Mismo patrón, con una diferencia: **puede no estar disponible**. En algunos navegadores el push exige que Cofradar esté instalado en la pantalla de inicio.

- Si no está disponible, **se dice sin convertirlo en una campaña de instalación**. La instalación de la PWA nunca es una barrera ni una insistencia.
- **Seguir una cofradía no equivale a consentir avisos fuera de Cofradar** (§20).

---

## 20. Avisos y notificaciones

> **Ninguna información importante depende del push.** Todo lo que se envía fuera está también dentro al volver.

Es una regla estructural, no una preferencia: Cofradar es web y PWA, y el push no llega a todo el mundo.

### 20.1 El criterio

**¿Cambia lo que el usuario va a hacer en los próximos minutos?** Si no, espera dentro.

Detrás está la regla 11 subida un nivel: dice que la celebración nunca debe hacer que te pierdas lo que estás celebrando. **Un aviso que te hace mirar el móvil mientras pasa el palio es el mismo error. Cofradar no compite con la calle.**

### 20.2 Los tres canales

| Acontecimiento | Al volver | Durante el uso | Push |
|---|---|---|---|
| Cofradía seguida: salida o inminencia relevante | Sí | Sí | **Sí** |
| Cofradía seguida: retraso o adelanto relevante | Sí | Sí | **Sí** |
| Cofradía seguida: cambio de recorrido | Sí | Sí | **Sí** |
| Cofradía seguida: interrumpida | Sí | Sí | **Sí** |
| Cofradía seguida: `cancelada` o `no_procesiona` | Sí | Sí | **Sí** |
| Contexto de jornada, como la lluvia | Sí | Sí | **Sí**, una vez |
| Cofradía seguida: ha entrado | Sí | Sí | No |
| Progresión normal por la carrera oficial | No | Sí | No |
| Bonus diferido de un «Dar fe» | Sí | Sí | No |
| Logro, subida de nivel, reto completado | Sí | Sí | No |
| Reto nuevo disponible | Sí | No | No |
| Posición en una clasificación | Sí | No | No |

Las seis primeras **son el producto**: evitar que alguien camine hacia un sitio por el que el cortejo ya pasó. `cancelada` es el aviso más valioso que Cofradar puede mandar.

Lo demás es gamificación, y la gamificación está **contenida en sus momentos** (D1). Un push por un logro es gamificación escapándose de su sitio; un «te han superado» convertiría a Cofradar en lo que no es.

La **progresión normal no se avisa ni al volver**: ya está en Ahora y en el mapa, y avisar de algo que no ha cambiado nada es ruido por definición.

### 20.3 Reglas

- **Seguir no es consentir.** `seguida` personaliza Cofradar dentro; el push se activa aparte y con su permiso (§19.3).
- **Un control, no siete.** «Avisarme de las que sigo», y nada de gamificación. Un producto que necesita ajustes finos de notificaciones ha fallado antes, al no decidir qué merece la pena.
- **Un aviso por cofradía y por tipo de acontecimiento.** Si el motor oscila entre 11 y 13 minutos de retraso, eso no son dos avisos.
- **Sin horario de silencio.** El instinto es añadirlo y aquí sería un error: el momento de máximo valor de Cofradar son las tres de la madrugada.
- Qué desviación es «relevante» está pendiente (§21).

### 20.4 No hay centro de notificaciones

Cada cosa aparece **donde le corresponde**, y nunca en una bandeja aparte.

| Qué | Dónde aterriza |
|---|---|
| Lo que ha pasado con las cofradías seguidas | **Ahora**, que es la pantalla que contesta «qué merece mi atención» |
| El bonus diferido | Celebración media al volver, y el **historial** |
| Un logro nuevo | La **galería de logros**, marcado |
| Una posición de clasificación | La **clasificación** |

Un centro de notificaciones sería una lista que compite con Ahora contando lo mismo peor. Y la regla **informar, no rellenar** se aplica igual: una bandeja vacía es una pantalla que no debería existir.

---

## 21. Pendientes

Nada de esto está decidido. **No se debe inventar una solución: o se pregunta, o se diseña con un valor provisional marcado como tal.**

### Decisiones de producto pendientes

**Catorce decisiones, todas registradas en el hito `Decisiones pendientes de producto` de Linear.** Cada issue explica qué está decidido, qué queda abierto, qué interfaces afecta y por qué no bloquea el diseño.

**Regla de entrada al parking:** solo se para el diseño si la decisión impide describir correctamente la pantalla, o si sus alternativas producen interfaces sustancialmente diferentes. Si la estructura puede diseñarse con **contenido provisional claramente marcado**, el asunto se aparca y se sigue.

| Pendiente | Issue | Contexto |
|---|---|---|
| **Magnitud que ordena las clasificaciones.** Si los puntos base son iguales y nunca bajan, la cantidad bruta infla el total | BUL-141 | §11.4, §11.5 |
| **Ámbito de las clasificaciones**: por jornada, por hermandad o global | BUL-142 | §11.4 |
| **Contenido del perfil público**: qué ven los demás de mí | BUL-143 | §18.2, §9.17 |
| **Qué puede exigir la condición de un logro o un reto.** «Condición visible» y «no dirigir movimientos» chocan | BUL-144 | §11.4, §11.5 |
| **Reglas finas de fusión** de datos locales al autenticarse | BUL-145 | §18.4 |
| **Validación RGPD** de la política de eliminación de cuenta | BUL-146 | §18.6 |
| **Qué desviación es «relevante»** para avisar de una cofradía seguida | BUL-147 | §20.3 |
| **Qué hace «útil» al próximo punto relevante**, y cómo depende de la frescura del dato | BUL-148 | §7.4, §9.4 |
| **Nomenclatura de niveles y catálogo** de logros y retos. Contenido cofrade que no se improvisa | BUL-149 | §11.4, §11.5 |
| **Cifras de la economía de gamificación.** Las seis reglas están cerradas (§11.5); quedan los números | BUL-117 | §11.5 |
| **Umbrales de caducidad por tipo de dato**, salvo posición estimada | BUL-82 | §7.1 |
| **Ventana de `inminente`** (cuántos minutos antes de la salida) | BUL-83 | §6.1 |
| **Derechos de uso de los escudos** de las hermandades | BUL-118 | §9.4 · el sistema funciona sin ellos |
| **Cómo se representan las cofradías sin cobertura**, o si se representan. Restricción: **Ahora y el mapa no pueden parecer un tablero de misiones** | BUL-121 | §9.4, §10 |

**Cerrados desde la última versión:** si `vista` tiene valor simbólico (R1: estadística personal, nunca comparada) y cómo ayudar al visitante (D25: lo resuelve el producto, no un glosario).

### Pendientes de validar visualmente

| Pendiente | Contexto |
|---|---|
| **Todos los valores de color** · contraste real sobre componentes, en claro, oscuro y contraste máximo | §4.1, §4.2 |
| **Escalas de tipografía, espaciado, radios y elevación** · especialmente sobre el mapa y en móvil | §4.3–§4.6 |
| **Breakpoints** `640 / 1024 / 1440` | §4.9 |
| **Solución gráfica definitiva de la incertidumbre en el mapa** · el trazo discontinuo es la decisión; su grosor, patrón y comportamiento en zoom hay que afinarlos | §10.4 |
| **Representación visual de la fase estimada** · conceptualmente discontinuo = provisional ya está decidido, pero hay que comprobar sobre componentes reales si una pantalla con muchos chips discontinuos se lee con claridad o parece rota. **Si no funciona, se cambia la representación, no el modelo** | §6.1, §9.2 |
| **Qué iconos cofrades se dibujan realmente**, decidido por necesidad de la interfaz | §4.7 |
| **Alturas exactas del bottom sheet** | §9.9 |

### Decisiones técnicas abiertas

| Pendiente | Contexto |
|---|---|
| **Librería de mapas concreta.** Requisito: cartografía vectorial altamente personalizable. Preferencia: MapLibre o Mapbox. **No cerrado** | §10.1 |
| **Estrategia de persistencia local** del último estado conocido | §12.1 |
| **Si los estados de `hover` deben consultar `any-hover` en lugar de `hover`.** Es la misma pregunta que ya resolvimos para la franja en §9.12: `hover` informa del dispositivo **primario**, así que una tablet con ratón acoplado declara `hover: none` y se queda sin estados de hover teniendo ratón. **La regla vigente sigue siendo la de §4.9** y no se cambia por la puerta de atrás. La diferencia con el caso de la franja es el coste: allí se perdía el alcance de la acción primaria, aquí solo se pierde un refinamiento visual y el usuario conserva objetivos de 48px, que con un ratón no estorban | §4.9 |

### Decisión aplazada por acuerdo

**Detalle gráfico propio más allá de los iconos.** Se decidió que el detalle gráfico de Cofradar son los iconos cofrades (§4.7). Si en el futuro se quisiera algo más, se decide **al final**, con tipografía, color y componentes ya validados, y nunca como ornamentación gratuita.

**Vía abierta, no pendiente:** si el sistema necesitara más alma, el lugar acordado para ponerla es la serif — **Alegreya como serif editorial junto a Inter como sans funcional** — sin tocar la capa de datos.

---

## 22. Resumen de decisiones · D1–D33

| # | Decisión |
|---|---|
| **D1** | Base funcional de herramienta de campo + personalidad editorial sobria + gamificación «social y de juego» solo en sus momentos + modo oscuro trabajado, con claro por defecto |
| **D2** | Portadores de identidad: paleta de materiales (principal), tipografía (secundario), lenguaje cofrade (norma transversal), detalle gráfico (dosis mínima). Cálido como inspiración, no como colección literal |
| **D3** | Tinta para estructura e interacción; granate reservado a identidad y gamificación; espectro semántico íntegro para los estados. Ningún estado solo con color |
| **D4** | Estado operativo = una fase + cero o varias alteraciones. Contexto de jornada aparte. Relación con el usuario en capa independiente. `cancelada` es fase; `interrumpida` y `regreso_anticipado` son alteraciones. La carrera oficial es un hito, no una fase |
| **D5** | Tres vistas: Ahora (feed de «ahora»), Mapa (vista completa con bottom sheet), Jornada (lista completa sin priorizar). Geolocalización nunca obligatoria. «Cerca» y «alcanzable» como aproximación |
| **D6** | Calor **modulado por registro**: funcional casi blanco con contraste máximo; editorial perceptiblemente cálido. Registro definido a nivel de pantalla o sección. El mapa prioriza legibilidad cartográfica sobre identidad |
| **D7** | **Inter** en todo lo funcional con cifras tabulares obligatorias; **Newsreader** en nombres de hermandades, cabeceras y momentos editoriales. Newsreader no se usa para decorar |
| **D8** | Separación **mixta por contexto**: borde dentro del contenido, elevación real cuando algo flota. Sombras teñidas de tinta. Superficies opacas sobre el mapa. Radios contenidos en lo funcional; pill solo en gamificación o cuando esté justificado |
| **D9** | **Phosphor** como familia base, por sus pesos y `fill` como canales redundantes al color. Set propio **pequeño y funcional** de iconos cofrades como único detalle gráfico. Los marcadores de mapa tienen sistema propio |
| **D10** | Mapa en **tres niveles de revelación**, con la cofradía representada como **segmento** y no como punto. El segmento es la mejor estimación de la zona ocupada. Sin difuminado. Los elementos —cruz de guía, paso de Cristo, palio, final— son núcleo desde el lanzamiento y el segmento se deriva de ellos |
| **D11** | **Trazo continuo / discontinuo** como código de confianza del dato, con marca textual y frescura explícita. Cofradar puede decir «no lo sabemos». Umbrales **por tipo de dato**. Sincronización ≠ frescura |
| **D12** | Tarjeta de cofradía de **doble ancla** (nombre y estado, por posición fija) en tres densidades. Dato protagonista: **próximo punto relevante + hora**; proximidad como capa adicional con lenguaje prudente |
| **D13** | Tres relaciones: `seguida` (intención), `vista` (**álbum personal**, sin valor competitivo), `dar-fe` (presencia, juego y aportación colaborativa). Verificado puntúa; **no verificable se registra siempre y recibe los puntos base** — lo único que queda condicionado es el bonus (corregido por D31). **Granate para la capa personal.** Tarjeta tipográfica; escudo opcional; sin fotografía |
| **D14** | «Dar fe» con **dos entradas** (contextual + vía rápida global) y confirmación siempre del usuario. **Celebración media** por defecto, alta solo en hitos. Botón en **tinta**. Verificación por **canal de relleno**, no por trazo. Lenguaje no acusatorio |
| **D15** | Navegación **estable de cuatro destinos** (Ahora · Mapa · Jornada · Mi tramo) con **acción contextual separada** por encima. Icono + etiqueta siempre. Sin hamburguesa. Mismo sistema con distinta intensidad, según el estado real de la jornada y no el calendario |
| **D16** | Dos ejes independientes: **tema** (claro/oscuro) × **contraste** (normal/máximo). Elección manual persistente. El contraste máximo no cambia el layout. **Invariancia semántica** en todas las combinaciones. El oscuro también es cálido y la elevación cambia de mecanismo |
| **D17** | Escritorio como **fusión en paneles** y mejora progresiva del mismo sistema. Bottom sheet ⇄ panel lateral; barra inferior ⇄ rail lateral. Ancho máximo de lectura. El responsive cambia presentación y prioridad, **no capacidades** |
| **D18** | **Último dato conocido** + persistencia local; skeleton solo en primera carga; nunca spinner bloqueante. **Cinco estados distintos** más `refrescando`. Persistir no es dar por vigente. Informar, no rellenar |
| **D19** | Espaciado base 4; escala tipográfica con mínimo de 12px y 16px para lectura; escala propia de datos; todo en `rem`. **AA general + AAA en información crítica**, definida por función y no por componente. Los tokens son iniciales: se corrigen de forma sistémica, nunca con excepciones locales |
| **D20** | Reconciliación con el PRD. **«Dar fe» es el nombre y el concepto único**: una sola acción con consecuencia personal y colaborativa, que sustituye al «check-in» del diseño. Los **elementos del cortejo son núcleo** desde el lanzamiento y el segmento se deriva de ellos. Se separa **«el usuario ha dado fe»** de **«Cofradar ha podido usar la aportación»**. El cuarto destino es **Mi tramo**. Tres niveles de confianza visibles sobre un motor más granular. **Logros, retos y clasificaciones pasan a evolución** y no bloquean el lanzamiento |
| **D21** | **Publicación de alteraciones.** Planificación prevista por defecto + inferencia automática mediante «Dar fe» + corrección administrativa excepcional. Las fases las conduce la planificación; las aportaciones refinan posición y alteraciones. Las seis alteraciones las **publica el motor**; `no_procesiona` y `cancelada` **nunca se infieren** de la ausencia de datos y solo se activan desde administración. Un reporte de usuario es **señal, no publicación**. Descartada la matriz de fuentes oficiales y el ciclo reporte → validación → publicada |
| **D22** | **La fase lleva nivel de confianza**, como cualquier otro dato derivado. El horario permite **estimar** una fase, no convertirla en hecho: una fase que sale solo de la planificación es `estimado` y se rotula `según horario`. Aplica a `inminente`, `en_calle`, `proxima_entrada` y `finalizada`. `cancelada` y `no_procesiona` son siempre confirmadas por construcción, y `prevista` lo es mientras no pase su hora. **No se crea ninguna fase nueva ni ningún canal nuevo**: es el sistema de confianza de D11 aplicado donde se había quedado implícito |
| **D23** | **Integridad de «Dar fe».** Dos monedas: **puntos** generosos con suelo de plausibilidad, **reputación** interna, sin número visible, que solo baja ante patrones. Tres momentos: registro siempre, **puntos base inmediatos**, consolidación automática posterior con tres resultados internos. **La plausibilidad juzga la historia del usuario, nunca la posición que afirma**; **el modelo discrepa, solo otras observaciones contradicen**, y quien corrige una estimación equivocada hace la aportación más valiosa. Umbrales a calibrar. Fuera de v1: detección de coordinación, huella de dispositivo y modelos de aprendizaje |
| **D24** | **Selector de elemento opcional.** Siempre existe «Estoy viendo la cofradía», y no es una versión degradada: cada nivel de precisión informa de algo distinto y el menos preciso **aporta evidencia de presencia y fase**. El selector pregunta en llano con el término cofrade debajo, y sus opciones salen de **los elementos configurados para esa cofradía**. **Nunca se preselecciona por probabilidad.** El bonus premia información útil, no el gesto: una precisión incorrecta no vale más que un genérico correcto |
| **D25** | **Comprensible sin modo visitante.** Los **hitos son interactivos**: tocar el nombre abre el mapa en ese punto, haya o no ubicación, como propiedad general del dato. El **nombre popular** es dato explícito y configurable por hermandad, nunca una abreviación generada; la denominación completa vive en la ficha. **Descartados**: detectar visitantes, interfaces distintas para ellos, glosario y sección de ayuda. Descartada también por ahora la **zona junto al hito** —`San Lorenzo · San Lorenzo` no ayuda a quien no conoce la ciudad—, a revisar sobre componentes reales |
| **D26** | **Acceso únicamente con cuenta de Google.** Sin usuario y contraseña, sin código por correo, sin registro tradicional y **sin pantalla de recuperación**: sin contraseña no hay nada que recuperar. Entrar y crear cuenta son **la misma puerta**. Sesión persistente con renovación transparente; cambiar la cuenta asociada solo es posible **desde una sesión viva**. El registro no pide ni un campo |
| **D27** | **Cuenta privada ≠ identidad pública.** Crear cuenta no obliga a configurar nombre ni avatar: la identidad pública se pide **solo cuando el usuario va a hacer algo en lo que otros puedan verlo**, nunca por si acaso. La identidad se solicita al participar, y la interrupción **conserva la aportación en vuelo** y devuelve al paso exacto del flujo |
| **D28** | **Mi tramo es útil sin cuenta.** `seguida` y `vista` funcionan **en local y sin cuenta**, incluidas ediciones anteriores a Cofradar, porque ninguna puntúa ni toca el cálculo público. Lo que necesita identidad se muestra nombrado y **vacío de verdad**, nunca con cifras de ejemplo. **Autenticarse nunca provoca pérdida de información local**: al crear cuenta se incorpora, al entrar en una cuenta con datos se **fusiona y nunca se sustituye en silencio**, y cerrar sesión no borra nada |
| **D29** | **Cuenta es quién eres y cómo sales; Ajustes es cómo se comporta Cofradar.** Al eliminar la cuenta **se borra la persona y se conserva la observación anonimizada**, porque los datos personales y el conocimiento colectivo no tienen el mismo ciclo de vida. Borrado inmediato, con exportación en la misma pantalla y explicado en llano |
| **D30** | **Ubicación opcional y pedida en contexto, nunca en el arranque.** Siempre con una explicación propia antes del diálogo del navegador, y **regla agnóstica de plataforma**: si el permiso ya no puede solicitarse desde la web, se explica sin dar instrucciones que Cofradar no pueda verificar. Ocho estados, con «no solicitado» y «denegado» **separados**. Sin ubicación desaparece solo la capa de proximidad; **nunca se degrada la confianza de un dato** y **«Dar fe» no se bloquea jamás por falta de GPS**. Una sola invitación, en un solo lugar |
| **D31** | **Economía de gamificación: seis reglas** (§11.5). Un solo marcador con tres reconocimientos; progresión de por vida y competición por edición; **misma base para todo «Dar fe» válido** y bonus decreciente **según la redundancia de la información, nunca por repetir cofradía**; los puntos no compran nada; los retos reconocen y **no dirigen movimientos**; los puntos nunca bajan. Las cifras son calibración |
| **D32** | **Avisos como canal complementario.** Ninguna información importante depende del push: todo lo que sale está también dentro al volver. Push solo para acontecimientos operativos que cambien el plan del usuario, **nunca para gamificación**. **Seguir no es consentir.** Un control, no siete. Un aviso por cofradía y tipo. Sin horario de silencio. **No hay centro de notificaciones**: cada cosa aterriza donde le corresponde |
| **D33** | **El diseño cubre el producto completo.** La distinción entre núcleo de lanzamiento y evolución rige el **orden de desarrollo**, no el alcance del diseño. **Reportar una incidencia es un flujo de diseño propio**, distinto de consumir avisos, y sigue siendo **señal para el motor y nunca publicación** |

---

## 23. Qué es específico de Cofradar y qué es reutilizable

### Específico de Cofradar · no trasladable sin rediseño

- **El modelo de estados de cuatro capas** (§6) y sus valores concretos.
- **El subsistema de mapa**: la cofradía como segmento, los tres niveles de revelación, la anatomía del marcador, el recorrido con hitos (§10).
- **El sistema de confianza y frescura** tal como está calibrado (§7). El *concepto* es muy reutilizable; los umbrales y el lenguaje son de aquí.
- **La tarjeta de cofradía de doble ancla** (§9.4) y su línea de decisión.
- **Las tres relaciones del usuario** y la separación entre colección personal y participación (§6.4, §11).
- **«Dar fe» como acción única con doble consecuencia**, y la separación entre el registro personal y su utilidad colaborativa (§6.4, §11.2).
- **El selector de elemento** y el orden del cortejo como información (§9.18).
- **El set de iconos cofrades** (§4.7).
- **El lenguaje cofrade** (§16).
- **La franja de acción contextual** ligada al estado real de la jornada (§9.12).

### Reutilizable casi tal cual en otro proyecto

- **La arquitectura de tokens en tres capas** con remapeo por tema, registro y contraste (§4).
- **Los dos registros** funcional / editorial (§3). Es un patrón general excelente para cualquier producto que mezcle datos y contenido.
- **Los dos ejes tema × contraste** y la regla de invariancia semántica (§5).
- **La estrategia de elevación mixta por contexto** y la sombra teñida (§4.6).
- **Los canales redundantes al color**: trazo para provisionalidad, relleno para verificación, peso de icono para énfasis (§7).
- **El enfoque de carga «último dato conocido»** y la taxonomía de cinco vacíos (§12). Aplicable a cualquier producto con datos en vivo y red mala.
- **Las reglas de accesibilidad** y el criterio de AAA por función y no por componente (§14).
- **Las reglas de responsive** y las equivalencias de componente por anclaje (§15).
- **La escala de espaciado, radios, movimiento y breakpoints** (§4).

### Fácil de re-tematizar

Cambiar la identidad visual completa del sistema requiere tocar **solo la capa 1 de tokens**: el calor de los neutros, el color de marca y, si hiciera falta, las familias tipográficas. Los componentes no se tocan, porque consumen exclusivamente la capa 2.

---

*Fin del documento. Toda modificación de una regla de §2 o de una decisión de §22 debe discutirse antes de implementarse: el sistema está construido sobre su coherencia mutua, no sobre valores aislados.*
