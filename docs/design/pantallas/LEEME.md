# Cofradar · pantallas para desarrollo

Una pantalla = tres archivos con el mismo nombre:

- `.png` — captura a 1170 × 2532 (390 × 844 a 3×).
- `.html` — la pantalla autónoma (tokens, componentes y fuentes incrustados). Ábrela en el navegador o inspecciona su marcado y clases `cf-*`.
- `.md` — las notas de diseño de esa pantalla.

`0-sistema/` trae `tokens.css`, `bundle.css` (tokens + componentes), `tokens.json`, las fuentes y el README del design system con todas las reglas.

Fuente de verdad: el artifact del design system. Lo rotulado como relleno, fixture, supuesto, propuesta o NO DEFINIDO no es decisión cerrada ni dato de producto.

## Superado por el PRD revisado (13 de octubre de 2026)

Estas fichas se hicieron antes de la revisión del PRD y **no deben usarse como referencia** hasta que se rehagan en las issues de diseño de Linear (BUL-191 a BUL-200). Ver D35 en `design.md`.

- **Las fichas numeradas de `1-marco/` (01 a 12)**: la cabecera lleva búsqueda global y selector de ciudad, que ya no existen. Las sustituyen las `armazon-*` (BUL-191).
- **Todo `2-inicio-ahora/`**: sustituido por `2-inicio/`.
- **Las fichas numeradas de `2-inicio/` (01 a 08)**: llevan búsqueda global, selector de ciudad y la fuera de temporada antigua. Las sustituyen las `inicio-*` (BUL-192).
- `3-mapa/07-4-agrupacion-nivel-3` y `08-4-deshacer-el-grupo`: sin agrupación de marcas.
- `3-mapa/09-5-filtros-en-la-cabecera` y `10-5-finalizadas-trae-a-el-calvario`: el mapa no tiene filtros.
- `3-mapa/13-7-centrado-en-un-hito…`: los hitos ya no son tocables.
- **El resto de `3-mapa/`**: la marca con flecha de dirección y el «final» del cortejo ya no existen. Se revisa en BUL-197.
- **`4-cofradias/`**: vale como base, pero sin búsqueda global en la cabecera. Se revisa en BUL-193.

## 1-marco

**Vigentes** · lienzo «Cofradar · Armazón» (https://claude.ai/artifact/GjRRWCSgTTvC6xLFSBjELs), aprobado el 13 de octubre de 2026 en BUL-191. Solo PNG, a 780 × 1688 (390 × 844 a 2×); el marcado de referencia es el del lienzo. Las decisiones que fija están en el README del sistema, sección «Marco · armazón global».

- `armazon-1-jornada-activa-{claro,oscuro}` — 1 · JORNADA ACTIVA · MADRUGÁ, 02:40
- `armazon-2-sin-actividad-{claro,oscuro}` — 2 · SIN ACTIVIDAD · JUEVES SANTO, 11:00 (sin franja)
- `armazon-3-ficha-la-macarena-{claro,oscuro}` — 3 · SECUNDARIA · FICHA DE LA MACARENA
- `armazon-4-hoja-inferior-{claro,oscuro}` — 4 · HOJA INFERIOR A MEDIA ALTURA
- `armazon-5-sin-conexion-{claro,oscuro}` — 5 · SIN CONEXIÓN · ÚLTIMO DATO HACE 12 MIN

**Superadas**, se conservan como histórico:

- `01-jornada-activa-madruga-02-40` — JORNADA ACTIVA · MADRUGÁ, 02:40
- `02-sin-actividad-jueves-santo-17-15` — SIN ACTIVIDAD · JUEVES SANTO, 17:15
- `03-raiz-cofradias` — RAÍZ · COFRADÍAS
- `04-secundaria-ficha-de-la-macarena` — SECUNDARIA · FICHA DE LA MACARENA
- `05-sheet-abierto-jornada-activa` — SHEET ABIERTO · JORNADA ACTIVA
- `06-inicio-activo` — INICIO ACTIVO
- `07-mapa-activo` — MAPA ACTIVO
- `08-cofradias-activo` — COFRADÍAS ACTIVO
- `09-agenda-activo` — AGENDA ACTIVO
- `10-mi-cofradar-activo` — MI COFRADAR ACTIVO
- `11-visitante-sin-cuenta-sin-ubicacion` — VISITANTE · SIN CUENTA, SIN UBICACIÓN
- `12-autenticado-con-ubicacion` — AUTENTICADO · CON UBICACIÓN

## 2-inicio

**Vigentes** · lienzo «Cofradar · Inicio» (https://claude.ai/artifact/N8L84mRcJePUtfK6rEpJH7), aprobado el 13 de octubre de 2026 en BUL-192. Solo PNG, a 780 de ancho (390 a 2×); las de jornada activa son largas porque se dibujan enteras, con el desplazamiento incluido. Las horas de la incidencia, la distancia y el retraso son datos de ejemplo.

- `inicio-A-con-ubicacion-{claro,oscuro}` — A · JORNADA ACTIVA · MADRUGÁ, 02:40 · CON UBICACIÓN. La protagonista (La Macarena) va bajo «Cerca de ti» y no se repite en «En la calle». El Silencio aparece en el aviso de incidencias y además en su fila de «En la calle», con chip «Incidencia».
- `inicio-B-sin-ubicacion-claro` — B · SIN UBICACIÓN. La protagonista encabeza «En la calle».
- `inicio-C-sin-actividad-claro` — C · SIN ACTIVIDAD. Ninguna en la calle; próxima salida.
- `inicio-D-fuera-de-temporada-claro` — D · FUERA DE TEMPORADA. Cuenta atrás al Domingo de Ramos y «Consultar las cofradías»; la cabecera muestra la jornada a la que apunta.
- `inicio-E-sin-conexion-claro` — E · SIN CONEXIÓN. Pantalla congelada: la cruz de guía pasa a «02:26 · hace 14 min», discontinua, sin posiciones calculadas por horario.
- `inicio-elegir-jornada-{claro,oscuro}` — HOJA PARA ELEGIR JORNADA. Las once jornadas; la Madrugá marcada como «hoy».

**Superadas**, se conservan como histórico:

- `01-1-inicio-jornada-activa-madruga-02-40-con-ubicacion` — 1 · INICIO · JORNADA ACTIVA · MADRUGÁ, 02:40 · CON UBICACIÓN
- `02-1-contenido-completo-scroll` — 1 · CONTENIDO COMPLETO (SCROLL)
- `03-1-con-ubicacion` — 1 · CON UBICACIÓN
- `04-4-sin-ubicacion-tres-bloques` — 4 · SIN UBICACIÓN · TRES BLOQUES
- `05-4-contenido-completo` — 4 · CONTENIDO COMPLETO
- `06-2-sin-actividad-jueves-santo-17-15` — 2 · SIN ACTIVIDAD · JUEVES SANTO, 17:15
- `07-3-fuera-de-temporada-hoy-8-de-octubre-de-2026-fecha-de-ejemp` — 3 · FUERA DE TEMPORADA · HOY: 8 DE OCTUBRE DE 2026 (FECHA DE EJEMPLO)
- `08-selector-de-ciudad-y-jornada-desde-la-cabecera` — SELECTOR DE CIUDAD Y JORNADA · DESDE LA CABECERA

## 3-mapa

- `01-1-vista-general-nivel-1-madruga-02-40` — 1 · VISTA GENERAL · NIVEL 1 · MADRUGÁ, 02:40
- `02-2-vista-rapida-sheet-asomado-sobre-la-macarena` — 2 · VISTA RÁPIDA · SHEET ASOMADO SOBRE LA MACARENA
- `03-b-ubicacion-concedida-precision-suficiente` — B · UBICACIÓN CONCEDIDA, PRECISIÓN SUFICIENTE
- `04-c-comprobacion-de-la-cartografia-en-oscuro` — C · COMPROBACIÓN DE LA CARTOGRAFÍA EN OSCURO
- `05-3-nivel-2-la-macarena-sheet-asomado` — 3 · NIVEL 2 · LA MACARENA · SHEET ASOMADO
- `06-3-nivel-2-sheet-a-altura-media` — 3 · NIVEL 2 · SHEET A ALTURA MEDIA
- `07-4-agrupacion-nivel-3` — 4 · AGRUPACIÓN · NIVEL 3
- `08-4-deshacer-el-grupo` — 4 · DESHACER EL GRUPO
- `09-5-filtros-en-la-cabecera` — 5 · FILTROS · EN LA CABECERA
- `10-5-finalizadas-trae-a-el-calvario` — 5 · «FINALIZADAS» TRAE A EL CALVARIO
- `11-6-detalle-de-elemento-paso-de-cristo` — 6 · DETALLE DE ELEMENTO · PASO DE CRISTO
- `12-6-el-cortejo-en-su-orden` — 6 · EL CORTEJO, EN SU ORDEN
- `13-7-centrado-en-un-hito-llegada-desde-la-ficha` — 7 · CENTRADO EN UN HITO · LLEGADA DESDE LA FICHA
- `14-8-fuera-de-temporada` — 8 · FUERA DE TEMPORADA

## 4-cofradias

- `01-1-listado-jornada-activa-madruga-02-40` — 1 · LISTADO · JORNADA ACTIVA · MADRUGÁ, 02:40
- `02-1-listado-completo-scroll` — 1 · LISTADO COMPLETO (SCROLL)
- `03-2-buscando-g-con-mis-seguidas` — 2 · BUSCANDO «G» CON «MIS SEGUIDAS»
- `04-3-sin-resultados-con-filtro` — 3 · SIN RESULTADOS · CON FILTRO
- `05-3-sin-resultados-sin-filtro` — 3 · SIN RESULTADOS · SIN FILTRO
- `06-4-fuera-de-temporada` — 4 · FUERA DE TEMPORADA
- `07-4-desplazado-hasta-la-madruga` — 4 · DESPLAZADO HASTA LA MADRUGÁ
- `08-4-listado-completo-scroll` — 4 · LISTADO COMPLETO (SCROLL)
