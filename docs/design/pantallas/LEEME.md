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
- **Las fichas numeradas de `4-cofradias/` (01 a 08)**: llevan búsqueda global en la cabecera. Las sustituyen las `cofradias-*`, `ficha-*` y `recorrido-*` (BUL-193).

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

**Vigentes** · lienzo «Cofradar · Inicio» (https://claude.ai/artifact/N8L84mRcJePUtfK6rEpJH7), aprobado el 13 de octubre de 2026 en BUL-192. Solo PNG, a 780 de ancho (390 a 2×); las de jornada activa son largas porque se dibujan enteras, con el desplazamiento incluido. Los datos salen del fixture (`docs/datos/mock/`) salvo la distancia, que es de ejemplo.

- `inicio-A-con-ubicacion-{claro,oscuro}` — A · JORNADA ACTIVA · MADRUGÁ, 02:40 · CON UBICACIÓN. La protagonista (La Macarena) va bajo «Cerca de ti» y no se repite en «En la calle». La Esperanza de Triana aparece en el aviso de incidencias («Interrumpida») y además en su fila de «En la calle». El Calvario, finalizada, no aparece.
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

## 5-agenda

**Vigentes** · lienzo «Cofradar · Agenda» (https://claude.ai/artifact/5drUVRNbvZTyJAQ9Erwffk), aprobado el 13 de octubre de 2026 en BUL-194. Solo PNG, a 780 de ancho (390 a 2×), dibujadas enteras. Datos del fixture; lo que no está, «dato pendiente».

- `agenda-A-madruga-en-curso-{claro,oscuro}` — A · MADRUGÁ 02:40 EN CURSO. Por hora de salida, sin priorizar; el estado va debajo del nombre en todas las filas. La finalizada (El Calvario) sigue en su sitio.
- `agenda-B-sabado-santo-claro` — B · SÁBADO SANTO CONSULTADO DURANTE LA MADRUGÁ. La franja «Dar fe» sigue: hay cofradías en la calle ahora.
- `agenda-C-con-cancelada-claro` — C · CON UNA CANCELADA (hermandad de ejemplo). La fila no desaparece.
- `agenda-D-fuera-de-temporada-claro` — D · FUERA DE TEMPORADA. «Horario previsto 2027», sin estado y solo con marcas de seguida.

El selector de días y la jornada de la cabecera son el mismo estado.

## 4-cofradias

**Vigentes** · lienzo «Cofradar · Cofradías» (https://claude.ai/artifact/FHSoReZHR4djgfGoDJ7Apa), aprobado el 13 de octubre de 2026 en BUL-193. Solo PNG, a 780 de ancho (390 a 2×), dibujadas enteras. Todos los datos salen del fixture (`docs/datos/mock/`); lo que no está, «dato pendiente».

- `cofradias-1A-todas-{claro,oscuro}` — LISTADO · MADRUGÁ 02:40 · TODAS. Agrupado por jornada y por hora de salida. Marca granate en tinta cuando la fila lleva un chip rojo.
- `cofradias-1B-busqueda-g-seguidas-claro` — BUSCANDO «G» CON «MIS SEGUIDAS».
- `cofradias-1C-sin-resultados-claro` — SIN RESULTADOS PARA «XZ».
- `cofradias-1D-fuera-de-temporada-claro` — FUERA DE TEMPORADA. Filas sin chip ni alteraciones.
- `ficha-2A-la-macarena-{claro,oscuro}` — FICHA · EN LA CALLE. Cada elemento con su posición, hora y confianza; «Dar fe» solo en la franja. Sin título en la segunda fila.
- `ficha-2B-esperanza-de-triana-claro` — FICHA · VARIAS ALTERACIONES. «Diste fe» con contorno (no afirma verificación).
- `ficha-2C-los-gitanos-claro` — FICHA · INMINENTE. Sin franja.
- `ficha-2D-el-calvario-claro` — FICHA · FINALIZADA. Sin franja.
- `ficha-2E-cancelada-claro` — FICHA · CANCELADA (hermandad de ejemplo). Solo «Recorrido y horarios» y «Seguir».
- `ficha-2F-la-soledad-claro` — FICHA · FUERA DE TEMPORADA, UN SOLO PASO.
- `recorrido-3-la-macarena-{claro,oscuro}` — RECORRIDO Y HORARIOS. Prevista arriba, real o estimada debajo; sin horas reales donde nadie dio fe.

Escudo de reserva: iniciales del nombre popular sin artículo (M, GP, ET…).

**Superadas**, se conservan como histórico:

- `01-1-listado-jornada-activa-madruga-02-40` — 1 · LISTADO · JORNADA ACTIVA · MADRUGÁ, 02:40
- `02-1-listado-completo-scroll` — 1 · LISTADO COMPLETO (SCROLL)
- `03-2-buscando-g-con-mis-seguidas` — 2 · BUSCANDO «G» CON «MIS SEGUIDAS»
- `04-3-sin-resultados-con-filtro` — 3 · SIN RESULTADOS · CON FILTRO
- `05-3-sin-resultados-sin-filtro` — 3 · SIN RESULTADOS · SIN FILTRO
- `06-4-fuera-de-temporada` — 4 · FUERA DE TEMPORADA
- `07-4-desplazado-hasta-la-madruga` — 4 · DESPLAZADO HASTA LA MADRUGÁ
- `08-4-listado-completo-scroll` — 4 · LISTADO COMPLETO (SCROLL)

## 6-dar-fe

**Vigentes** · lienzo «Cofradar · Dar fe» (https://claude.ai/artifact/FN8eSbaJYLcKu3nNsjcLT6), aprobado el 14 de octubre de 2026 en BUL-195. Solo PNG, a 780 de ancho (390 a 2×). Todo el flujo va en una hoja inferior sobre Inicio de la Madrugá (copia del lienzo «Inicio», sin redibujar). Distancias y puntos rotulados «Ejemplo»; la aportación de ejemplo es La Macarena · Cruz de guía · 02:40.

Reglas que fija: tocar una opción lleva al paso siguiente (sin botón «Continuar»); opciones abajo, al alcance del pulgar, y la pregunta arriba; «Atrás» y «Cancelar» siempre arriba de la hoja; nada preseleccionado.

- `dar-fe-1-guia-inicial-claro` — 1 · GUÍA INICIAL, solo la primera vez. Solo «Cancelar»: no hay paso anterior.
- `dar-fe-2-que-cofradia-{claro,oscuro}` — 2 · ¿QUÉ COFRADÍA? Por cercanía: La Macarena 300 m, El Gran Poder 450 m, El Silencio 600 m. «Atrás» vuelve a Inicio.
- `dar-fe-2b-que-cofradia-sin-ubicacion-claro` — 2b · SIN UBICACIÓN. Las de la calle por hora de salida y Los Gitanos aparte, «A punto de salir». La hoja sube casi hasta arriba. Marca de «Diste fe» de Esperanza de Triana en tinta (comparte fila con chip rojo).
- `dar-fe-3-que-tienes-delante-{claro,oscuro}` — 3 · ¿QUÉ TIENES DELANTE? Cuatro opciones en el orden del cortejo, mismo estilo. Desde la ficha, el flujo empieza aquí y «Atrás» vuelve a la ficha.
- `dar-fe-4-confirmar-{claro,oscuro}` — 4 · CONFIRMAR, «¿Das fe de esto?». Minimapa esquemático (en producción, OpenStreetMap) con tu punto cerca de La Campana.
- `dar-fe-4b-confirmar-sin-ubicacion-claro` — 4b · SIN UBICACIÓN. El botón sigue activo.
- `dar-fe-4c-confirmar-sin-conexion-claro` — 4c · SIN CONEXIÓN. «Guardar y enviar después»; el aviso de sin conexión sigue visible.
- `dar-fe-4d-confirmar-sin-cuenta-claro` — 4d · SIN CUENTA. «Entrar con Google y dar fe»: la cuenta se pide aquí y se vuelve al mismo paso.
- `dar-fe-5-hecho-{claro,oscuro}` — 5 · HECHO. Panel compacto con Inicio visible detrás; la marca se rellena de abajo arriba en 0,7 s (ya rellena si se pide menos movimiento). Se cierra con un toque y se va sola.
- `dar-fe-5b-hecho-pendiente-claro` — 5b · PENDIENTE DE ENVIAR. Reloj en lugar de la marca, sin puntos.
- `dar-fe-5c-bonus-claro` — 5c · BONUS, más tarde. Aviso sobre la franja, «+5» en granate.

## 7-mi-cofradar

**Vigentes** · lienzo «Cofradar · Mi Cofradar» (https://claude.ai/artifact/BbjE1xwHztK67A6tyNzwev), aprobado el 14 de octubre de 2026 en BUL-196. Solo PNG, a 780 de ancho (390 a 2×), dibujadas enteras. Datos del fixture; puntos y nivel rotulados «Ejemplo» hasta que se decidan (BUL-219).

- `portada-A-con-cuenta-{claro,oscuro}` — PORTADA CON CUENTA (P-19). Registro editorial: «120 puntos · Nivel 2» en granate, accesos a Seguidas (2), Mi colección (2 de 7) y Mis aportaciones (3); abajo Cuenta, Ajustes y Ayuda y fuentes.
- `portada-B-sin-cuenta-claro` — PORTADA SIN CUENTA. Lo guardado en el teléfono, sin cifras inventadas: «Empiezas a sumar puntos cuando das fe», «Esto está guardado solo en este teléfono» y «Entrar con Google» como botón secundario, no como barrera.
- `seguidas-claro` — SEGUIDAS (P-20). Por jornada, con marca granate y fase de hoy; dejar de seguir en cada fila.
- `seguidas-vacia-claro` — SEGUIDAS VACÍA. «Aún no sigues ninguna. Puedes seguirlas desde su ficha.»
- `coleccion-claro` — MI COLECCIÓN (P-21). «2 de 7», vistas con el año; «Añadir una que vi». Sin comparar con nadie.
- `aportaciones-claro` — MIS APORTACIONES (P-22). «Contribuyó a la posición», sin etiqueta o «Pendiente de enviar»; nunca «rechazada». Cierra con «¿Cómo se usan mis aportaciones?».
- `cuenta-claro` — CUENTA (P-23). Cuenta de Google, descargar datos, cerrar sesión y «Eliminar cuenta» en rojo.
- `eliminar-cuenta-claro` — ELIMINAR CUENTA (P-24). «Se borra» / «Se conserva, sin tu nombre»; botón de peligro desactivado hasta marcar la casilla.
- `ajustes-claro` — AJUSTES (P-25). Apariencia, máximo contraste, ubicación «No permitida» con «Permitir». El texto dice para qué la pedimos y que sin ella Cofradar funciona igual.
- `ajustes-ubicacion-bloqueada-claro` — AJUSTES · UBICACIÓN BLOQUEADA EN EL NAVEGADOR. Mismo texto y el aviso «Puedes cambiarlo en los permisos de tu navegador».
- `ayuda-y-fuentes-claro` — AYUDA Y FUENTES (P-26). Cómo leer los trazos y colores, de dónde salen los datos y © OpenStreetMap.
