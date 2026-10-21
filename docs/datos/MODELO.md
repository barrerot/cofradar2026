# Modelo de datos · base de trabajo

Modelo entidad-relación de ocho entidades, definido por Carlos el 15 de octubre de 2026. Es la base para transcribir los datos reales del hito **1 · Datos**. Se mantiene sencillo: solo cambia cuando haya un caso de uso concreto que lo pida.

Cada entidad es un CSV de esta carpeta, con el mismo nombre en minúsculas. Las claves son números enteros; las relaciones se rellenan con el `id` de la otra tabla.

```mermaid
erDiagram
    PUNTO_GEOGRAFICO {
        int id PK
        string nombre
        string tipo
        decimal latitud
        decimal longitud
    }

    TEMPLO {
        int id PK
        string nombre
        string direccion
        int punto_geografico_id FK
    }

    HERMANDAD {
        int id PK
        string nombre
        string nombre_oficial
        int templo_id FK
        string escudo
        string web
        string historia
        string fundacion
        int numero_hermanos
        int numero_nazarenos
        int duracion_cortejo
    }

    PASO {
        int id PK
        int hermandad_id FK
        string nombre
        int orden
        string autor
        string capataz
        string musica
        string fotografia
    }

    EDICION {
        int id PK
        int anio
    }

    JORNADA {
        int id PK
        string nombre
        int orden
    }

    SALIDA_PROCESIONAL {
        int id PK
        int hermandad_id FK
        int edicion_id FK
        int jornada_id FK
        string estado
    }

    PUNTO_ITINERARIO {
        int id PK
        int salida_procesional_id FK
        int punto_geografico_id FK
        string referencia
        datetime fecha_hora
        bool hora_publicada
        int orden
    }

    PUNTO_GEOGRAFICO ||--o{ TEMPLO : ubica
    TEMPLO ||--o{ HERMANDAD : sede_de
    HERMANDAD ||--o{ PASO : tiene
    HERMANDAD ||--o{ SALIDA_PROCESIONAL : realiza
    EDICION ||--o{ SALIDA_PROCESIONAL : contiene
    JORNADA ||--o{ SALIDA_PROCESIONAL : agrupa
    SALIDA_PROCESIONAL ||--o{ PUNTO_ITINERARIO : contiene
    PUNTO_GEOGRAFICO ||--o{ PUNTO_ITINERARIO : referencia
```

## Decisiones

- **Hermandad y salida van separadas.** La hermandad es lo que no cambia; la salida es su estación de penitencia en una jornada de un año (`EDICION`). Los horarios de 2027 se añaden como salidas nuevas, sin tocar los de 2026.
- **Cada lugar se da de alta una sola vez** en `PUNTO_GEOGRAFICO` y lo comparten todas las hermandades. Los nombres se normalizan a mano: no hay alias.
- **La geometría de cada lugar** (su trazado) va en un archivo aparte, **`punto_geografico.geojson`**, no en una columna del CSV (decisión del 16 de octubre de 2026, para el GPS social). Es un `FeatureCollection` con un `Feature` por punto, y su `properties.id` es el `id` de `punto_geografico.csv`. Una coordenada sola no basta para saber si alguien está cerca de una calle larga: en Sierpes, una persona a 200 m del punto representativo puede estar en plena calle. `latitud` y `longitud` siguen en el CSV como punto representativo, el que se usa para centrar el mapa o rotular.
  - Calles y vías: `LineString`, o `MultiLineString` si la calle está partida en tramos.
  - Templos y lugares puntuales: `Point`, o sin `Feature` cuando repetiría `latitud` y `longitud`.
  - Se obtiene de OpenStreetMap con consultas automáticas y se revisan a mano las coincidencias ambiguas.
  - Una calle sigue siendo **un solo registro** aunque pasen por ella muchas hermandades.
  - La geometría es de la calle entera: **no dice qué tramo ocupa una hermandad**. Eso sale de combinarla con el orden del itinerario, los horarios y las aportaciones.
  - Va aparte porque un trazado no cabe cómodo en una celda (las comillas dobladas lo hacen ilegible y fácil de romper) y porque así se abre directamente en cualquier visor de mapas.
- **`referencia`** dice a qué parte del cortejo corresponde la hora: `cruz_guia` o `ultimo_paso`.
- **`hora_publicada`** distingue la hora que viene del documento (`si`) de una estimada (`no`).
- **`fecha_hora`** lleva fecha y hora, porque la Madrugá cruza la medianoche: `2026-04-03T00:30` va después de `2026-04-02T23:50`.
- **`estado`** de la salida registra suspensiones o interrupciones.
- **La fuente de los datos** queda por estudiar, sin tablas nuevas.

## Cómo rellenar

| Tabla | Campo | Formato | Ejemplo |
|---|---|---|---|
| `punto_geografico.csv` | `tipo` | `calle`, `plaza`, `templo`, `puente` u `otro` | `plaza` |
| | `latitud`, `longitud` | grados decimales, 5 decimales; en calles largas, un punto del tramo por donde pasan las cofradías | `37.39170`, `-5.99490` |
| `punto_geografico.geojson` | un `Feature` por punto | `properties.id` = `id` del CSV; `geometry` = `LineString`, `MultiLineString` o `Point`. **Ojo: GeoJSON va longitud primero** | `{"type":"Feature","properties":{"id":16},"geometry":{"type":"LineString","coordinates":[[-5.99490,37.39170],[-5.99460,37.39320]]}}` |
| `templo.csv` | `punto_geografico_id` | id del punto donde está el templo | `16` |
| `hermandad.csv` | `nombre` | el popular, como se usa en la app | `La Macarena` |
| | `nombre_oficial` | la denominación completa | `Real, Ilustre y Fervorosa Hermandad…` |
| `paso.csv` | `orden` | orden en el cortejo, desde 1 | `2` |
| `edicion.csv` | `anio` | cuatro cifras | `2026` |
| `jornada.csv` | `orden` | de Viernes de Dolores (1) a Domingo de Resurrección (11) | `8` para la Madrugá |
| `salida_procesional.csv` | `estado` | vacío si sale con normalidad | `suspendida` |
| `punto_itinerario.csv` | `referencia` | `cruz_guia` o `ultimo_paso` | `cruz_guia` |
| | `fecha_hora` | `AAAA-MM-DDTHH:MM` | `2026-04-03T02:30` |
| | `hora_publicada` | `si` o `no` | `si` |
| | `orden` | orden de paso dentro de la salida y la referencia, desde 1 | `7` |

Los CSV van en UTF-8, separados por comas; los textos con comas, entre comillas (y las comillas de dentro, dobladas). Los datos inventados de `mock/` son solo para diseñar y no se mezclan con estos.

## Comprobar

```sh
python3 docs/datos/verificar.py
```

Revisa los ocho CSV y dice archivo, fila y columna de cada problema:

- **Errores**: un `id` repetido o que no es un número, una columna obligatoria vacía, un `*_id` que apunta a una fila que no existe, un valor fuera de los permitidos (`tipo`, `referencia`, `hora_publicada`), una `fecha_hora` mal escrita, coordenadas fuera de Sevilla, dos pasos con el mismo orden en una hermandad y horas que van hacia atrás dentro de una salida (lo normal es olvidar cambiar el día tras la medianoche).
- **Avisos**: dos puntos que parecen el mismo lugar escrito de dos formas («La Campana» y «Campana»), un templo cuyo punto no es de tipo `templo`, más de tres pasos en una hermandad o dos salidas de la misma hermandad en un año.

Los puntos sin coordenadas no son error: durante el inventario se cuentan aparte.

> **Pendiente (BUL-168):** `punto_geografico.geojson` todavía no existe y el comprobador no lo revisa. Se añadirán a la vez en BUL-168: GeoJSON válido, cada `id` presente en el CSV y sin repetir, tipo de geometría permitido y dentro de Sevilla.

## GPS social · concepto

**Estado (21/10/2026): el motor está hecho y ya recibe los «Dar fe»** (ver «Motor» y «Aportaciones» al final). «GPS social» es el nombre interno del sistema que estima dónde va cada elemento del cortejo a partir de lo que ven los usuarios, sin dispositivos en los pasos. Para el usuario, la acción es **«Dar fe»** (`design.md`, D20); en la interfaz no se habla de «check-in».

### Principio

**El programa oficial da la previsión inicial. Las aportaciones independientes de los usuarios permiten estimar y corregir la posición real de la cruz de guía y de cada paso.**

La estimación vigente **nunca se convierte en una verdad que impida corregirla**. Una aportación que no coincide con lo estimado puede ser justo la primera que ve un retraso. Es el principio del PRD: «el modelo puede discrepar de una aportación, pero solo otras observaciones independientes pueden contradecirla».

### Tres fases que van siempre separadas

```mermaid
flowchart LR
    A["Dar fe<br/>hermandad + elemento<br/>+ ubicación y hora si las hay"] --> R

    subgraph R["1 · Registro"]
        R1["Siempre se guarda<br/>Historial y puntos base<br/>si supera la plausibilidad del PRD"]
    end

    R --> E

    subgraph E["2 · Elegibilidad"]
        E1{"¿Sirve para<br/>estimar posiciones?"}
    end

    E1 -->|sí| C
    E1 -->|no| X["Fuera del cálculo<br/>Sin marca de rechazo<br/>Sin penalización automática"]

    subgraph C["3 · Cálculo"]
        C1["Posición estimada<br/>de cada elemento"]
    end

    P["Programa oficial<br/>punto_itinerario"] --> C1
    G["Geometría<br/>punto_geografico"] --> E1
    G --> C1
    C1 -.->|"la estimación orienta, no veta"| E1
```

1. **Registro.** Todo «Dar fe» queda registrado con sus puntos base, como dice el PRD. Esto no depende de la ubicación, la conexión ni lo que diga la estimación.
2. **Elegibilidad.** Se decide si la aportación puede usarse para estimar posiciones.
   - Si no puede, se excluye del cálculo y nada más: **no se muestra como rechazada ni penaliza al usuario de forma automática** (PRD: «nunca se muestra rechazada»; la reputación «solo baja ante patrones»).
   - **Discrepar de la posición estimada no la hace inelegible por sí solo.**
3. **Cálculo.** Con las aportaciones elegibles y el programa oficial se estima la posición de cada elemento.
   - La cruz de guía y cada paso tienen posición propia.
   - Varias observaciones independientes que coinciden entre sí corrigen la estimación. De ahí salen `retraso`, `adelanto` y `cambio_recorrido`.

### Tres tipos de desajuste

No significan lo mismo y no se tratan igual:

| Desajuste | Qué es | Ejemplo | Consecuencia prevista |
|---|---|---|---|
| **Incompatible con el itinerario** | La ubicación no encaja con ningún lugar del recorrido de esa salida | Alguien da fe de La Macarena desde Triana, por donde no pasa | Candidata a quedar fuera del cálculo. Pero varias aportaciones coherentes en un mismo sitio fuera del recorrido pueden ser un `cambio_recorrido`, no un error |
| **Discrepancia horaria** | Está en el recorrido, pero a una hora que no casa con el programa | Paso de Cristo en Sierpes a las 03:30 cuando el horario lo situaba allí a las 02:50 | **Sigue siendo elegible.** Es la señal de un posible `retraso` o `adelanto` |
| **Contradicción con observaciones anteriores** | Choca con lo que otras personas independientes acaban de ver | Diez personas sitúan la cruz de guía en la Plaza de San Francisco a las 03:00 y una la sitúa en la Campana a la misma hora | Pesa menos o queda en espera de corroboración. **Solo otras observaciones** pueden contradecirla, no la estimación |

### Casos que el PRD ya decide

| Caso | Registro | Elegibilidad | Cálculo |
|---|---|---|---|
| Elemento concreto + ubicación | Sí | Según los tres desajustes | Sitúa **ese** elemento |
| «Estoy viendo la cofradía» + ubicación (F-22, D24) | Sí | Sí, como presencia | Dice que **el cortejo** pasa por ahí. **No se atribuye automáticamente** a la cruz de guía ni a ningún paso |
| Sin ubicación fiable (D30) | Sí | No participa **directamente** en el cálculo geográfico | Puede aportar evidencia de presencia y fase, como ya dice el PRD |
| Diferida, sin conexión (F-26) | Sí, en cuanto llega | Se guardan **hora de observación y hora de recepción**, por separado | La hora que declara el dispositivo **no se da por fiable automáticamente** |

### Qué aporta cada dato del modelo

| Dato | Qué responde | Ejemplo |
|---|---|---|
| `punto_itinerario` (`orden`) | Por qué lugares pasa y en qué orden | La Macarena: … → Campana → Sierpes → Plaza de San Francisco → … |
| `punto_itinerario` (`fecha_hora`, `referencia`) | A qué hora debería estar la cruz de guía o el último paso en cada lugar (la previsión) | Cruz de guía en la Campana a las `2026-04-03T02:30` |
| Geometría del punto (`punto_geografico.geojson`) | Si una persona está **en** ese lugar, aunque esté lejos de su punto representativo | Un usuario a mitad de Sierpes está en Sierpes |
| `paso.orden` | Qué elementos hay entre la cruz de guía y el último paso | El paso de Cristo va entre los dos |

**Ejemplo.** A las 02:50 alguien da fe del paso de Cristo de La Macarena desde la mitad de Sierpes.
- La geometría dice que está en Sierpes.
- El itinerario dice que Sierpes va después de la Campana.
- El programa pone la cruz de guía en la Campana a las 02:30 y el último paso más tarde.
- Así que es compatible con el itinerario y con el horario.

Si fueran las 03:30, sería una **discrepancia horaria**: la aportación sigue siendo elegible y, si otras independientes coinciden, la estimación se corrige hacia un retraso.

### Recorrido sobre la cartografía

La geometría de OpenStreetMap es la **base cartográfica**. **Unir calles completas no da el itinerario exacto.** Hay cuatro problemas por resolver:

- **Tramos parciales.** Muchas cofradías recorren solo una parte de una calle larga.
- **Sentido.** La línea de OSM tiene una dirección que no tiene por qué coincidir con la de la marcha.
- **Intersecciones.** Hay que saber en qué cruce se sale de una calle y se entra en la siguiente.
- **Repeticiones.** Una misma calle puede aparecer dos veces en un itinerario, a la ida y a la vuelta, en dos `punto_itinerario` con distinto `orden`.

**Solución (aprobada el 16/10/2026): un recorrido por salida, en un archivo aparte.** No hay entidades nuevas (ni `TRAMO_RECORRIDO` ni parecidas).

- Cada salida procesional tiene un GeoJSON en `docs/datos/itinerarios/<año>/`, con **una sola línea continua, ordenada y orientada** desde que sale del templo hasta que entra.
- La línea va por las calles por las que pasa de verdad la hermandad. Por eso resuelve los cuatro problemas:
  - **Tramos parciales:** la línea solo cubre el trozo de calle que recorre.
  - **Sentido:** va en el sentido de la marcha.
  - **Intersecciones:** se ven en los cruces donde la línea cambia de calle.
  - **Repeticiones:** la ida y la vuelta son dos trozos distintos de la misma línea.
- Las horas siguen en `punto_itinerario`, sin cambios. Falta decidir cómo se sitúa cada hora sobre la línea: es la fase siguiente (ver «Abierto», punto 3).
- La geometría de cada calle sigue en `punto_geografico.geojson`. Sirve para saber si alguien está **en** un lugar; la del recorrido, para saber por dónde va **esa** salida.
- **Ejemplo:** La Borriquita 2026 sale de El Salvador, sube por Cuna y Orfila hasta la Campana, hace la carrera oficial, cruza la Catedral y vuelve por Placentines, Francos y Chapineros. Mide 2,5 km, en una sola línea con flechas de sentido.

**Datos de ahora.** Hay 72 recorridos provisionales de 2026 en `docs/datos/itinerarios/2026/` para desarrollar mientras sale el programa de 2027.

- Salen del programa de mano 2026 y del Llamador 2025, trazados sobre OpenStreetMap.
- Las calles entre dos puntos del programa las elige el trazador, así que cada archivo lleva `"provisional": true`. Solo la Borriquita está revisada a mano.
- El interior de la Catedral no se conoce: es una línea recta de la Puerta de San Miguel a la de los Palos.
- Cómo se hacen y cómo se rehacen en 2027: [`recorridos/LEEME.md`](recorridos/LEEME.md).

BUL-169 (el recorrido de cada cofradía sobre el callejero) se da por hecha con estos recorridos de 2026. Rehacerlos con el programa de 2027 y casar las horas con la línea quedan para issues nuevas.

### Aprobado

- Siguen las **ocho entidades** de la transcripción. La única tabla nueva es `aportacion` (aprobada el 21/10/2026, ver «Aportaciones»). Las posiciones estimadas no se guardan: el motor las calcula cada vez.
- Cada salida tiene su recorrido como una sola línea continua, ordenada y orientada, en un GeoJSON aparte (`docs/datos/itinerarios/<año>/`). Las horas siguen en `punto_itinerario`.
- Cada `PUNTO_GEOGRAFICO` tiene su geometría en GeoJSON, en el archivo aparte `punto_geografico.geojson` enlazado por `id`. `latitud` y `longitud` siguen en el CSV como punto representativo.
- Un registro por lugar. La geometría sale de OpenStreetMap, con revisión manual de las coincidencias ambiguas.
- Se mantiene el principio de la previsión oficial corregida por observaciones independientes.
- Registro, elegibilidad y cálculo van siempre separados.
- Dar fe siempre queda registrado con sus puntos base. Una aportación incompatible puede excluirse del cálculo, sin mostrarse como rechazada y sin penalización automática.
- Una discrepancia con la estimación no invalida una aportación. Hay tres tipos de desajuste y se tratan por separado.
- «Estoy viendo la cofradía» informa de la presencia del cortejo y nunca se atribuye automáticamente a un elemento.
- Nunca se impide dar fe. Sin coordenadas fiables, la aportación no participa directamente en el cálculo geográfico.
- En las aportaciones diferidas se guardan por separado la hora de observación y la de recepción, y la hora del dispositivo no se da por fiable automáticamente.
- El archivo de geometrías y su comprobación van en BUL-168.
- No cambian las decisiones sobre `referencia`, `hora_publicada`, `fecha_hora`, `EDICION`, `JORNADA` y `SALIDA_PROCESIONAL`.

### Abierto

1. **Umbrales.** Distancia al recorrido, tolerancia horaria, niveles de confianza y criterios de penalización por patrones. Se fijarán con pruebas; nada de lo escrito aquí es una cifra.
2. **Dónde vive la geometría.** *Resuelto el 16/10/2026:* en `punto_geografico.geojson`, aparte del CSV (ver «Decisiones»). Solo queda ver cuánta precisión hace falta.
3. **Horas sobre el recorrido.** Tramo, sentido, intersecciones y repeticiones están *resueltos el 16/10/2026* con un recorrido por salida (sección anterior). Queda cómo casar cada hora de `punto_itinerario` con su posición en la línea. *Resuelto el 19/10/2026:* cada archivo lleva en `properties.salida_procesional_id` el `id` de su salida, y así se enlaza en Supabase (tabla `recorrido`).
4. **Fiabilidad de la hora diferida.** Falta decidir cómo se juzga una hora de observación que no se da por fiable automáticamente.
5. **Evidencia sin ubicación.** Falta decidir cómo pesa en la fase y en la presencia una aportación sin coordenadas fiables, o una genérica «Estoy viendo la cofradía».
6. **Cuándo varias observaciones son «independientes»** y cuántas hacen falta para corregir una estimación.
7. **Dónde se guardan aportaciones y posiciones estimadas.** *Resuelto el 21/10/2026:* tabla `aportacion` (ver «Aportaciones»). Las posiciones no se guardan.
8. **«Cómo se calcula la posición» del PRD.** Sigue hablando de «punto de control» y de «la línea del itinerario». Se revisará cuando se resuelva el punto 3.

### Motor (4.1 a 4.3, 21/10/2026)

Código en `backend/src/motor/` y pruebas en `motor.test.ts` (`npm test -w backend`). Lo sirve `GET /api/jornadas/:id/estado`, que se calcula una vez cada 30 segundos.

- **Todo es un retraso por elemento.** El horario dice dónde debería ir cada elemento a cada hora. Si dos personas distintas ven el segundo paso de La Macarena a las 03:30 en el sitio donde el programa lo ponía a las 02:50, ese paso va 40 minutos tarde. A partir de ahí avanza al ritmo del programa con esos 40 minutos de desfase, aunque nadie diga nada más.
- **Un elemento sin aportaciones** toma el retraso de los de alrededor. Un paso nunca adelanta al de delante.
- **Consolidar** pide 2 personas distintas, con menos de 15 minutos entre una y otra y que impliquen el mismo retraso (±8 min). Una sola aportación queda «sin resolver» y no mueve nada. Las que chocan con un grupo que ya ha consolidado quedan «contradichas».
- **Ubicación:** a más de 60 m del recorrido, la aportación queda fuera del cálculo de la posición, pero sigue contando como presencia. Si la calle se recorre dos veces, se elige la pasada que el programa pone más cerca de esa hora.
- **Fase:** la lleva el horario, con el retraso que se sepa. Si dos personas la están viendo, está en la calle aunque el horario diga otra cosa.
- **Confianza:** confirmado hasta 10 min desde la última aportación que consolidó, desactualizado hasta 30 min y estimado después.
- **Alteraciones:** retraso o adelanto a partir de 10 min, al minuto (el mismo que se usa para las horas estimadas).
- **Todas las cifras son candidatas a calibrar.**
- **Falta:** inferir `interrumpida`, `cambio_recorrido` y `regreso_anticipado`.

### Aportaciones (21/10/2026)

Tabla `aportacion` en `backend/supabase/esquema.sql`, aprobada por Carlos. Cada «Dar fe» es una fila.

- **Registro personal:**
  - quién, qué cofradía y qué elemento (0 la cruz, 1 a 3 los pasos; vacío es «Estoy viendo la cofradía»);
  - dónde estaba, si el teléfono lo sabía, y con qué precisión;
  - cuándo lo vio y cuándo llegó al servidor;
  - los puntos base.
- **Valor colaborativo:** `resultado` (consolidada, sin resolver, contradicha o fuera del cálculo) y `bonus`. Lo escribe el motor y nunca se enseña como «rechazada».
- **Ejemplo:** «Ana, a las 03:30, da fe del segundo paso de La Macarena desde la calle Sierpes».
- **Se guarda siempre.** Los cuatro controles del momento (`backend/src/motor/plausibilidad.ts`: repetición, teletransporte, ritmo y ventana de la jornada) solo deciden si da los 10 puntos base y si el motor la usa.
- **El motor solo usa las plausibles.** Si la ubicación tiene más de 100 m de margen, solo cuenta como presencia.
- **Al borrar la cuenta se borran sus aportaciones**, y salen en «Descargar mis datos». Guardar la ubicación entra en la consulta legal de BUL-223.
- **`de_prueba`** marca las hechas con el reloj de prueba (`?ahora=`). Se borran antes del lanzamiento.

### Bonus y reputación (4.13, 21/10/2026)

- **Bonus** (`motor.ts`, `BONUS`). Solo para las aportaciones que consolidan, y vale más cuanto menos sabía Cofradar justo antes:
  - **+5** si consolida;
  - **+10** si nadie había situado ese elemento en la última media hora;
  - **+20** si el retraso cambia 10 minutos o más respecto a lo que se creía: la estimación se había quedado vieja.

  Lo de «antes» se mira solo con las aportaciones anteriores. El bonus nunca baja y los puntos base no cambian. La app lo avisa una vez, sobre la franja: «Tu aportación ayudó a situar a La Macarena · +20».
- **Reputación** (`reputacion.ts`). Interna, sin número visible y sin guardarse: sale del historial de cada persona.
  - Empieza en 0,5 y sube despacio con cada aportación que consolida.
  - Solo baja ante un patrón: al menos 8 aportaciones juzgadas y la mayoría contradichas por otras personas, con inercia para quien tiene buen historial. Discrepar de la estimación no cuenta.
  - Por debajo de 0,2, esa persona no cuenta para que un dato consolide. Sus aportaciones se guardan igual y siguen dando puntos base.
