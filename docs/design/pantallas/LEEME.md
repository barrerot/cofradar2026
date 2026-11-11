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
- **Las fichas numeradas de `3-mapa/` (01 a 14)**: la marca con flecha de dirección y el «final» del cortejo ya no existen. Las sustituyen las `mapa-*` (BUL-197).
- **Las fichas numeradas de `4-cofradias/` (01 a 08)**: llevan búsqueda global en la cabecera. Las sustituyen las `cofradias-*`, `ficha-*` y `recorrido-*` (BUL-193).

## 0-sistema/estados

**Vigentes** · lienzo «Cofradar · Estados» (https://claude.ai/artifact/EuCqAKEQihwLFiGnfanf84), aprobado el 15 de octubre de 2026 en BUL-199. Solo PNG, a 780 de ancho (390 a 2×). Los estados 1, 2, 6 y 8 salen de ese lienzo; los 3, 4, 5 y 7 son copias de fichas ya aprobadas en otras áreas, para tener los ocho juntos.

Regla: una actualización nunca borra información que todavía sirve, y un dato guardado no se presenta como actual. Sin spinners ni cargas que tapen la pantalla. Sin conexión sin datos y error solo existen cuando no hay nada guardado que enseñar: si lo hay, se enseña con su antigüedad.

- `estado-1-primera-carga-{claro,oscuro}` — 1 · PRIMERA CARGA. Tras «Empezar», sin nada guardado. Esqueleto de Inicio en el relleno, sin texto ni animación, sin franja «Dar fe». Único estado con esqueleto.
- `estado-2-refrescando-claro` — 2 · REFRESCANDO. Inicio completo; solo cambia el indicador a «actualizando» (las flechas giran). Si falla con datos en pantalla, los datos se quedan.
- `estado-3-nada-en-la-calle-claro` — 3 · NO HAY NADA EN LA CALLE. Copia de `2-inicio/inicio-C`.
- `estado-4-sin-datos-claro` — 4 · SIN DATOS. Copia de `4-cofradias/ficha-2F`: «Dato pendiente» en cada campo que no tenemos.
- `estado-5-sin-conexion-con-datos-claro` — 5 · SIN CONEXIÓN CON DATOS. Copia de `2-inicio/inicio-E`; ver también `armazon-5` y `mapa-1b`.
- `estado-6-sin-conexion-sin-datos-{claro,oscuro}` — 6 · SIN CONEXIÓN, SIN NADA GUARDADO. «Necesitas conexión para verlo la primera vez.», «Cuando vuelva, se cargará solo.» y «Reintentar». Sin el aviso azul, porque no hay último dato. Mensaje centrado sin datos de la jornada, distinto del 3.
- `estado-7-sin-cartografia-claro` — 7 · SIN CARTOGRAFÍA. Copia de `3-mapa/mapa-1c`.
- `estado-8-error-claro` — 8 · ERROR. «Algo ha fallado.», «Inténtalo de nuevo en un momento.» y «Reintentar». Triángulo en contorno gris, nunca rojo; el indicador, sin antigüedad.

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

**Vigentes** · lienzo «Cofradar · Mapa» (https://claude.ai/artifact/Asf77skgP8xGzthvyeFmRK), aprobado el 15 de octubre de 2026 en BUL-197. Solo PNG, a 780 de ancho (390 a 2×). Datos del fixture; distancias rotuladas «Ejemplo».

**Cartografía:** el callejero está dibujado a mano sobre los puntos de referencia, con las calles aproximadas. Sirve para juzgar las marcas, no el mapa. En producción será OpenStreetMap con MapLibre (D36).

**Cómo funciona el mapa:**
- Una marca por elemento: cruz de guía, paso de Cristo y palio, con iconos provisionales.
- Cada marca lleva el borde del color del estado: continuo si está confirmada, discontinuo si es estimada o desactualizada.
- Sin flecha y sin agrupación.
- Un tramo fino del color del estado une la cruz con el último paso.
- El nombre popular va junto a la cruz.
- Ningún rótulo tapa una marca, y cada rótulo va pegado a la suya.

**Las fichas:**
- `mapa-1-general-{claro,oscuro}` — 1 · MAPA GENERAL · MADRUGÁ 02:40 · CON UBICACIÓN. Tu posición, al noreste de La Campana. Los Gitanos (inminente) aparecen como aviso al borde: «Fuera del mapa, al noreste». El Calvario (finalizada) no sale. Las marcas de El Gran Poder y La Macarena, que comparten calle, van separadas unos 20 px.
- `mapa-1a-sin-ubicacion-claro` — 1a · SIN UBICACIÓN, DENEGADA O BLOQUEADA. Sin punto ni «Centrar»; no se pide nada. Si nunca se ha pedido, lleva «Centrar en mi ubicación»: ver `8-acceso/acceso-4a`.
- `mapa-1b-sin-conexion-claro` — 1b · SIN CONEXIÓN. Todas las marcas discontinuas. Solo llevan etiqueta de antigüedad las que no tienen los 12 min del aviso: la cruz de La Macarena («hace 14 min», como en Inicio E) y El Silencio («hace 23 min»).
- `mapa-1c-sin-cartografia-claro` — 1c · SIN CARTOGRAFÍA. «No podemos dibujar el mapa, pero sabemos dónde van», con la lista por hermandad y elemento.
- `mapa-2-cofradia-{claro,oscuro}` — 2 · MAPA DE LA MACARENA. El recorrido del fixture: hecho en verde continuo hasta La Campana y pendiente en discontinuo. La Basílica sale por el borde. Las demás cofradías van en segundo plano, más pequeñas. En la hoja asomada, las horas, el 64 % y «Dar fe» en el sitio de la franja.
- `mapa-3-palio-{claro,oscuro}` — 3 · DETALLE DEL PALIO DE LA MACARENA. «Nadie ha dado fe del palio todavía» y «A unos 350 m · parece alcanzable» (ejemplo). Debajo, el resto de la cofradía.
- `mapa-3b-cruz-claro` — 3b · DETALLE DE LA CRUZ DE GUÍA. «Vista hace 4 min» y «A unos 300 m» (ejemplo).

**Superadas**, se conservan como histórico:

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

Hojas: las de los pasos 1 a 4 esperan respuesta, así que tapan la barra de navegación y llevan el oscurecido del sistema detrás (añadido el 15 de octubre de 2026 en BUL-198, ver `8-acceso`). El panel «Hecho» y el aviso del bonus son avisos pasajeros y no llevan capa.

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

## 8-acceso

**Vigentes** · lienzo «Cofradar · Arranque y acceso» (https://claude.ai/artifact/X23AUrqSFpBsFg5nSLtjRJ), aprobado el 15 de octubre de 2026 en BUL-198. Solo PNG, a 780 de ancho (390 a 2×). Las pantallas de fondo son copias sin redibujar de Inicio, Dar fe, Mi Cofradar y Mapa.

Regla que fija: no se pide nada antes de que haga falta. La cuenta se pide al ir a participar y la ubicación, cuando la persona toca algo que la necesita. Nunca dos veces y nunca con tono de amenaza.

Hojas: la que interrumpe y espera respuesta (Dar fe, ubicación) llega hasta abajo y tapa la barra de navegación, con el fondo oscurecido; la informativa (las del Mapa) se apoya sobre la barra, sin capa. El panel «Hecho» de Dar fe es un aviso pasajero y tampoco lleva capa. Así lo dice el README del sistema.

**Sustituidas el 20/10/2026** · arranque (1) e introducción (2): ahora valen las del logotipo D, en `docs/design/intro_logos/cofradar-logotipo-d/` (pantallas, animación de referencia, SVG e iconos).

- `acceso-1-arranque-{claro,oscuro}` — 1 · ARRANQUE (P-01). Solo «Cofradar» en Newsreader. Solo la primera vez o sin datos guardados; si hay datos, se abre el último estado conocido.
- `acceso-2-introduccion-{claro,oscuro}` — 2 · INTRODUCCIÓN (P-02), solo la primera vez. Una pantalla editorial con tres ideas y un único botón, «Empezar»; sin «Saltar».
- `acceso-3a-vuelta-dar-fe-claro` — 3a · VUELTA DE GOOGLE DESDE DAR FE (P-03). No hay hoja intermedia: «Entrar con Google y dar fe» abre Google y, al volver, la aportación se envía sola. Panel «Hecho» con «Has entrado con tu cuenta de Google.»
- `acceso-3b-vuelta-mi-cofradar-claro` — 3b · VUELTA DE GOOGLE DESDE MI COFRADAR. «Has entrado. Lo que tenías en este teléfono ya está en tu cuenta.» (se va solo); Seguidas 2 y colección 2 de 7 se conservan; aparece la fila Cuenta.
- `acceso-3c-no-se-pudo-entrar-claro` — 3c · NO SE PUDO ENTRAR. Vuelve a Confirmar con todo igual y el aviso azul «No has entrado con Google. Tu aportación sigue aquí.» Nunca rojo ni «error».
- `acceso-4a-mapa-sin-pedir-claro` — 4a · MAPA SIN UBICACIÓN, NUNCA PEDIDA (P-04). El 1a del Mapa con «Centrar en mi ubicación». Si la persona dijo que no o está bloqueada, el botón no aparece.
- `acceso-4b-hoja-ubicacion-{claro,oscuro}` — 4b · «¿USAR TU UBICACIÓN?». Mismo texto que Ajustes; «Permitir» lanza el aviso del navegador y «Ahora no» cierra la hoja (el botón sigue en el mapa). Si en el aviso del navegador dice que no, el botón desaparece. Desde Ajustes, «Permitir» lanza el aviso directamente, sin hoja.
- `acceso-4c-bloqueada-claro` — 4c · BLOQUEADA EN EL NAVEGADOR. «Tu navegador tiene bloqueada la ubicación para Cofradar.» y «Entendido», sin pasos de ningún navegador concreto.

## 9-admin

**Vigentes** · lienzo «Cofradar · Administración» (https://claude.ai/artifact/1eWPmZ1Bx5Ui7K6eRBTVBu), aprobado el 15 de octubre de 2026 en BUL-200. Solo PNG, escritorio a 2880 × 1800 (1440 × 900 a 2×) y móvil a 780 de ancho, solo tema claro. Datos del fixture a las 02:40; la hora de la lluvia es de ejemplo y lo que el fixture no trae va como «hora pendiente».

Regla: el panel no es una mesa de control. Las fases las mueve el horario y las alteraciones las publica el motor («Cofradar»). El equipo solo marca cancelada (antes de salir), publica avisos de jornada e incidencias en texto, y retira lo que resulte falso. Nada se borra: se retira con motivo y queda en el registro. Borde rojo, nunca relleno, para lo que deja rastro («Retirar», «Marcar como cancelada»). Cancelada ≠ no procesiona: lo segundo es «no es su día» y sale de los datos base.

- `admin-1-acceso` — 1 · ACCESO (P-27). «Entrar con Google».
- `admin-1b-sin-permiso` — 1b · SIN PERMISO. «Esta cuenta no tiene acceso al panel.», en gris, y «Entrar con otra cuenta».
- `admin-2-jornada-en-curso` — 2 · JORNADA EN CURSO (P-28). Aviso de jornada, tabla de las seis con fase, alteraciones (hora y autor) y solo las acciones con sentido; «Registro de hoy» por hora.
- `admin-2b-marcar-cancelada` — 2b · MARCAR COMO CANCELADA, Los Gitanos (la única que no ha salido). Nota obligatoria; el botón se activa al escribirla.
- `admin-2c-retirar` — 2c · RETIRAR «Interrumpida» de Esperanza de Triana. Motivo obligatorio.
- `admin-2d-publicar-incidencia` — 2d · PUBLICAR INCIDENCIA en La Macarena, con vista previa de la tarjeta de Inicio.
- `admin-2e-jornada-en-curso-movil` — 2e · JORNADA EN CURSO EN MÓVIL, para usarla desde la calle. Tarjeta por cofradía, botones de 48 px, menú en la cabecera.
- `admin-3-datos-base` — 3 · DATOS BASE (P-29). Las siete hermandades; La Macarena con su ficha e itinerario esquemático. La Soledad, «Sin horarios» y «Sin itinerario» en gris.
- `admin-4-taxonomias` — 4 · TAXONOMÍAS (P-30). Los tres elementos en orden de cortejo, reordenables; hitos y templos.
- `admin-5-permisos-y-configuracion` — 5 · PERMISOS Y CONFIGURACIÓN (P-31). Personas con acceso; umbrales de posición 10 y 30 min (§7.1); ventana de «Inminente» y horarios, pendientes (BUL-226, BUL-227).

## 10-trivial

**Vigentes** · lienzo «Cofradar · Trivial» (https://claude.ai/artifact/3gEjCuRuZmbq9inqz7hyBM), aprobado el 6 de noviembre de 2026 en BUL-372. Solo PNG, a 780 de ancho (390 a 2×), dibujadas enteras. Prompts: `prompts/22-trivial-lienzo-nuevo.txt` y `23-trivial-ajustes.txt`. Las preguntas son reales, del banco `docs/datos/trivial/`.

Reglas (PRD, F-50): partidas de 10 preguntas; sin cuenta, sin conexión y sin puntos; no se guarda nada; nunca en Inicio ni en el Mapa. La respuesta buena va en verde con check y «Correcta». La equivocada va con contorno en tinta, X y «Tu respuesta», nunca en rojo. Sin reloj. La franja «Dar fe» sigue visible mientras se juega.

- `trivial-01-mi-cofradar-con-trivial-claro` — 1 · ACCESO DESDE MI COFRADAR. La portada aprobada más la fila «Trivial cofrade», con el icono Cards en gris, no en granate.
- `trivial-02-ficha-la-macarena-con-trivial-claro` — 2 · ACCESO DESDE LA FICHA (P-11). Bloque «¿Cuánto sabes de La Macarena?» · «20 preguntas» · «Jugar», al final de la ficha.
- `trivial-03-elegir-partida-claro` — 3 · ELEGIR PARTIDA (P-32). «Todas las hermandades» o «Una hermandad»; dificultad Mezcla, Fácil, Media o Difícil; «Empezar».
- `trivial-03b-elegir-una-hermandad-claro` — 3B · ELEGIR UNA HERMANDAD. El buscador del listado de Cofradías, sin marcas ni chips de estado.
- `trivial-03c-elegir-partida-la-macarena-claro` — 3C · VUELTA CON LA MACARENA ELEGIDA. La lupa permite cambiarla.
- `trivial-04-pregunta-sin-responder-{claro,oscuro}` — 4 · PREGUNTA. «Pregunta 1 de 10», chip hermandad · tema, respuestas A–D.
- `trivial-05-pregunta-acertada-{claro,oscuro}` — 5 · ACERTADA. Las demás bajan a texto secundario, sin transparencia; explicación y fuente; «Siguiente».
- `trivial-06-pregunta-fallada-claro` — 6 · FALLADA. «Tu respuesta» en tinta junto a la «Correcta».
- `trivial-07-resultado-claro` — 7 · RESULTADO. «7 de 10», «Has repasado 10 preguntas.», lista desplegable con explicación y fuente; «Otra partida» y «Volver a Mi Cofradar». Las filas 4 a 10 son de ejemplo.
- `trivial-08-sin-conexion-claro` — 8 · SIN CONEXIÓN. La pregunta con el aviso azul; el juego funciona igual.

## 11-trivial-online

**Vigentes** · lienzo «Cofradar · Trivial online» (https://claude.ai/artifact/X7QiwMVwdykPf33Bj5vY9K), aprobado el 10 de noviembre de 2026. Solo PNG, a 780 de ancho (390 a 2×), dibujadas enteras. Prompt: `prompts/24-trivial-online-lienzo-nuevo.txt`, con los ajustes «CI/CO» en las fichas y un borde fino en tinta en las casillas. Las preguntas son reales, del banco `docs/datos/trivial/`. Los alias son de ejemplo.

Reglas (PRD, F-51 y P-33): partida por turnos entre dos cuentas, con 48 horas por turno y 6 estrellas. La casilla decide la categoría. El rival solo ve el alias. No da puntos de Cofradar y necesita conexión.

**El tablero** tiene 43 casillas:
- **El anillo:** 36 casillas, con una estrella cada 6. Siguiendo el anillo:
  - La Campana: Historia;
  - Sierpes: Imágenes;
  - Plaza de San Francisco: Patrimonio y símbolos;
  - Avenida de la Constitución: Jornadas y sedes;
  - Puerta de los Palos: Música y literatura;
  - Puerta de San Miguel: Tradiciones y curiosidades.
- **Las casillas normales:** después de cada estrella vienen las otras cinco categorías, en este orden.
- **Las calles:** la Salida está en el centro, con tres calles de 2 casillas hacia La Campana, Plaza de San Francisco y Puerta de los Palos.

**Colores e iconos de las categorías** (Phosphor, de oscuro a claro):

| Categoría | Color | Icono |
|---|---|---|
| Historia | #4A3528 | Scroll |
| Imágenes | #2D5E66 | Image |
| Patrimonio y símbolos | #A3593A | Flag |
| Jornadas y sedes | #7F8C3E | Signpost |
| Música y literatura | #D19A8E | MusicNotes |
| Tradiciones y curiosidades | #E2D9C3, icono en tinta | Lightbulb |

**Las fichas** llevan dos letras del alias: la tuya con contorno sólido en tinta y la del rival con contorno discontinuo.

**Las pantallas:**
- `01-portada-trivial` — 1 · PORTADA. «Jugar solo», que lleva a «Elegir partida» del lienzo aprobado, y «Jugar online» con «1 partida te espera».
- `02-elegir-alias`, `02b-alias-cogido` — 2 · ALIAS la primera vez. El error va en tinta con icono, no en rojo.
- `03-vestibulo-online` — 3 · VESTÍBULO. «Invitar a un amigo», «Buscar rival», las filas de invitación y búsqueda, y la bandeja «Tu turno / Turno del rival / Finalizadas».
- `04-invitar-amigo` — 4 · INVITAR. El enlace, «Compartir», «Copiar enlace» y «Cancelar invitación».
- `05-invitacion-recibida`, `05b-invitacion-caducada`, `05c-invitacion-cancelada`, `05d-invitacion-ya-aceptada` — 5 · INVITACIÓN RECIBIDA y sus estados, con «Volver al trivial» cuando no hay nada que aceptar.
- `06-partida-te-toca-tirar-{claro,oscuro}` — 6 · TE TOCA. Tablero, marcador y «Tirar el dado» junto a «Dar fe».
- `07-partida-elegir-destino-{claro,oscuro}` — 7 · ELEGIR DESTINO. Un 4 que da tres destinos, numerados en el tablero y como botones de texto.
- `08-pregunta-online` — 8 · PREGUNTA. Chip de categoría, A–D y «Confirmar respuesta».
- `09-acierto-en-estrella-{claro,oscuro}` — 9 · ACIERTO EN ESTRELLA. «Consigues la estrella de Imágenes» y «Volver a tirar».
- `10-fallo` — 10 · FALLO. «Ahora le toca a Costalero83» y «Volver a la partida».
- `11-esperando-al-rival` — 11 · ESPERANDO. Sin «Tirar», con enlace «Rendirse».
- `12-rendirse` — 12 · RENDIRSE. Hoja de confirmación.
- `13-resultado`, `13b-rival-rendido`, `13c-cerrada-por-inactividad` — 13 · RESULTADO. El «6 – 4» solo aparece en la victoria por estrellas.
- `14-sin-conexion` — 14 · SIN CONEXIÓN. Bandeja con lo último guardado y enlace a «Jugar solo».

**Ampliación del 11 de noviembre de 2026** (PRD: F-52, F-53 y F-54). Prompt: `prompts/25-trivial-online-revancha-ajustes.txt`, con sus ajustes. Los números de hermano, las fechas y el historial son de ejemplo. Las piezas de Mi Cofradar y Cuenta son copias dentro de este lienzo; mandan sobre `7-mi-cofradar/` y `8-acceso/` solo en el número de hermano.
- `15-resultado-revancha-{claro,oscuro}`, `15b-revancha-pedida`, `15c-jugador-eliminado` — 15 · RESULTADO CON REVANCHA:
  - «Pedir la revancha» y el enlace al historial («Tú y Costalero83: 3 – 2»);
  - ya pedida, el botón se desactiva y aparece «Cancelar»;
  - si el rival eliminó su cuenta, solo «Ganaste», sin marcador grande ni revancha, como en la 13b.
- `16-vestibulo-revanchas` — 16 · BANDEJA:
  - el grupo «Te piden la revancha», arriba, con «Aceptar» y «Ahora no»;
  - la revancha que has pedido tú, entre las filas de estado.
- `17-historial-rival-{claro,oscuro}` — 17 · HISTORIAL CON UN RIVAL:
  - el marcador «3 – 2», la partida en curso y las terminadas (las ganadas con contorno en tinta, nunca rojo);
  - «Este marcador solo lo veis vosotros dos».
- `18-retar-con-pregunta` — 18 · RETAR. La 9 con «Retar a un amigo con esta pregunta» y la vista previa del mensaje. También va en la 10 y en la resolución del trivial en solitario.
- `19-reto-al-abrir`, `20-reto-resuelto`, `20b-reto-acertado` — 19 y 20 · EL RETO. Lo que ve quien abre el enlace: sin cuenta, la pregunta, su resolución con fuente, «Jugar al trivial» y «Retar a otro con esta pregunta».
- `21a-mi-cofradar-numero-hermano`, `21b-cuenta-numero-hermano`, `21c-partida-numero-hermano` — 21 · NÚMERO DE HERMANO:
  - en Mi Cofradar, bajo el nivel;
  - en Cuenta, como fila propia bajo la cuenta de Google;
  - en el marcador de la partida, «nº 214» bajo cada alias.

## 12-ano-cofrade

**Vigentes** · lienzo «Cofradar · El año cofrade», aprobado el 11 de noviembre de 2026. Solo PNG, a 780 de ancho (390 a 2×), dibujadas enteras. Prompt: `prompts/26-cirio-y-cuadrillas-lienzo-nuevo.txt`. La pregunta es real (id 812 del banco `docs/datos/trivial/`); los alias, días, cirios, cuadrillas y partidas son de ejemplo. Es Cuaresma (jueves 4 de marzo de 2027, día 23): sin franja «Dar fe».

Reglas (PRD, F-55 y F-57; P-34 y P-36): pregunta del día del 10/02 al 20/03/2027, la misma para todos, cambia a las 00:00 de Madrid. Contestar (aciertes o no) mantiene el cirio; dejar pasar un día lo apaga. Cuadrillas de 2 a 30, privadas, por orden alfabético y sin podio; nunca puntos, nivel ni dónde ha estado nadie.

**El cirio** (dibujo propio, de línea): encendido, llama rellena en cobre apagado #B86B3C; hoy aún no, llama solo en contorno; apagado, solo el pabilo. Se distinguen por la forma, no por el color. 96 px en la pregunta resuelta y 20 px como icono.

**Pregunta del día:**
- `01-portada-pregunta-del-dia` y `01b-hecho`, `01c-apagado`, `01d-sin-cuenta`, `01e-antes`, `01f-despues` — 1 · LA TARJETA en la portada del trivial, encima de «Jugar solo». Fuera de Cuaresma (salvo del 1/02 al 9/02 y el final), no aparece. En `01f`, los días son los de cada persona.
- `02-pregunta` — 2 · SIN RESPONDER, con «Día 23 de Cuaresma · jueves 4 de marzo».
- `03-acierto-{claro,oscuro}` — 3 · RESUELTA: explicación y fuente, el bloque del cirio (días, «Has acertado 18 de 23» y una marca por día: llena si acertaste, contorno si no), «Compartir», «Volver al trivial» y «Retar a un amigo con esta pregunta».
- `04-compartir`, `04b-compartir-fallo` — 4 · COMPARTIR: «Cofradar · Día 23 de Cuaresma ✅ 🕯️ 23 días» (❌ si falla), nunca la respuesta. Única pantalla con emojis.
- `05-fallo` — 5 · FALLO: el cirio sigue igual; solo baja la cuenta de aciertos.
- `06-apagado`, `06b-vuelve-a-encenderse` — 6 · CIRIO APAGADO, sin reproche, y vuelta a 1 día al contestar.
- `07-mi-cofradar` — 7 · MI COFRADAR: la línea del cirio bajo el número de hermano y la fila «Cuadrillas» (UsersThree). La cabecera «Madrugá ▾» y la tarjeta de puntos son las aprobadas; en la app, fuera de Semana Santa, la cabecera es la del selector de siempre.

**Cuadrillas:**
- `08-tus-cuadrillas`, `08b-vacia` — 8 · TUS CUADRILLAS y «Crear una cuadrilla».
- `09-crear`, `09b-sin-nombre` — 9 · CREAR: nombre de hasta 30 letras; error en tinta.
- `10-invitar` — 10 · INVITAR: enlace de 7 días para varias personas, «6 de 30», «Anular el enlace». Invita cualquier miembro; anula solo el capataz.
- `11-invitacion` y `11b-sin-cuenta`, `11c-sin-alias`, `11d-llena`, `11e-caducado`, `11f-ya-dentro` — 11 · INVITACIÓN RECIBIDA y sus estados.
- `12-la-cuadrilla-{claro,oscuro}`, `12b-fuera-de-cuaresma` — 12 · LA CUADRILLA: miembros por orden alfabético con nº de hermano y cirio («capataz» en texto, sin corona), la partida en curso y las terminadas. Fuera de Cuaresma, sin cirio. En la app, el «6 – 4» no se parte de línea.
- `13-miembro`, `13b-jugar`, `13c-reto-enviado`, `13d-capataz` — 13 · UN MIEMBRO: «Tú y X: 3 – 2 · Ver historial», y «Ir a la partida», «Jugar una partida» o «Reto enviado · vence en 72 h»; el capataz, además, «Quitar de la cuadrilla».
- `14-bandeja` — 14 · EL RETO EN LA BANDEJA: el grupo de arriba pasa a «Te esperan», con revanchas y retos de cuadrilla. Las fechas de «Finalizadas» son las de la 16 del online.
- `15-menu`, `15b-menu-capataz`, `15c-salir`, `15d-salir-capataz`, `15e-salir-ultimo`, `15f-quitar` — 15 · MENÚ, SALIR Y QUITAR. Si sale el capataz, pasa a serlo quien lleve más tiempo dentro (en la app, con su alias real); si sale el último, la cuadrilla desaparece.

**Álbum y cargo** (página «Álbum y cargo» del mismo lienzo, aprobada el 11 de noviembre de 2026; F-56 y F-58, P-35 y P-37). Prompts: `prompts/27-album-y-cargo-ajustes.txt` y `prompts/27b-album-y-cargo-correcciones.txt`. Es la Madrugá del 26/03/2027, 02:40, salvo la 24b (Cuaresma). Nombres de hermandades y la pregunta del Gran Poder, reales; grados, puntos y alias, de ejemplo.

Reglas: el álbum enseña lo que tienes y deja en blanco lo que no; nunca «te falta», «de 72», contadores por jornada ni barras. Es de por vida y no da puntos. Cargo: la calle (dar fe, sin tope) y la casa (partida online ganada 5, pregunta del día 2, hasta 10 al día; el trivial en solitario no suma). Desde Diputado de tramo, al menos la mitad de la calle.

**La estampa** (solo tipografía): papel con marco y filete, la jornada en pequeño, una rayita y el nombre en Newsreader. En blanco: marco y filete finos en gris y el nombre en gris, sin marcas. Con grados, el filete pasa a tinta y engorda (1, 1,5 o 2 px) y salen sus marcas: Cards «La conoces», ojo relleno granate «La has visto», sello con check granate «Has dado fe». La de tres grados no cambia de color. En la app, las marcas no pueden tocar el filete (en la 17 van muy justas).

**Álbum:**
- `16-mi-cofradar`, `16-mi-cofradar-oscuro` — 16 · MI COFRADAR: la tarjeta con «Diputado de tramo en Cofradar», «Faltan 320» hacia Fiscal de cruz y «De la calle 620 · De la casa 560» (toda lleva a la 21); la fila «Álbum de estampas · 14» (BookOpen) entre Mi colección y Mis aportaciones. Cada fila, solo su número.
- `17-album`, `17-album-oscuro` — 17 · EL ÁLBUM: «Tienes 14 estampas», «Cómo se completan», selector de jornada sin fechas y cuadrícula de tres en fila.
- `18-estampa`, `18b-en-blanco`, `18c-dos-grados` — 18 · UNA ESTAMPA: la estampa en grande, una fila por grado con lo que hay («2026 · 2027», «Madrugá de 2027») y «Ver su ficha». En blanco, las tres filas en gris sin texto de lo que falta.
- `19-como-se-completan` — 19 · CÓMO SE COMPLETAN, con «Lo de cada año se suma. El álbum no da puntos.»
- `20-nueva-en-tu-album` — 20 · NUEVA EN TU ÁLBUM: bajo la fuente del acierto, miniatura y «Nueva en tu álbum: El Gran Poder · la conoces · Ver el álbum». Sin animación.

**Cargo:**
- `21-tu-cargo`, `21-tu-cargo-oscuro` — 21 · TU CARGO: cargo, puntos y frase del puesto; los doce cargos (pasados con check, el tuyo resaltado, los siguientes en secundario, sin candados); la calle y la casa con su cifra; la regla; «Los puntos no compran nada…».
- `22-tope-de-la-calle` — 22 · EL TOPE: 400 de la calle y 780 de la casa se quedan en Contraguía. Sin barra ni «Faltan»: línea en tinta con icono de información.
- `23-subes-de-cargo`, `23b-subes-tras-partida` — 23 · SUBES DE CARGO: hoja con «Ahora eres Costalero en Cofradar», la frase del puesto y un solo «Seguir». Sin confeti ni compartir. Sale tras dar fe o tras ganar una partida.
- `24a-mas-5`, `24b-tope-de-la-casa` — 24 · LOS PUNTOS DE LA CASA: «+5 puntos para tu cargo» en la partida ganada, «+2» en la pregunta del día y «Hoy ya has sumado los 10 puntos de la casa. Mañana, más.» al llegar al tope.

Frases de los cargos dibujadas: Costalero, Contraguía y Diputado de tramo. Las otras nueve, por escribir y revisar con Carlos.

**Tu Semana Santa** (página «Tu Semana Santa» del mismo lienzo, aprobada el 11 de noviembre de 2026; F-59). Prompt: `prompts/28-tu-semana-santa.txt` (con tres correcciones en el chat: la 31 sin tarjeta del cargo, la 29 de Monaguillo, y el icono del trivial en la línea de la pregunta del día). Es el Domingo de Resurrección, 28/03/2027, por la tarde: cabecera «Resurrección» y sin franja «Dar fe». Alias, cifras y cargos, de ejemplo.

Reglas: solo datos que Cofradar tiene, nunca las horas en la calle ni por dónde anduvo nadie. Sale lo que hizo y se calla lo que no: sin «0», sin «te faltó», sin comparar ni medallas. Vive solo en Mi Cofradar; cada año tiene su tarjeta, y el año sin nada no tiene ni fila.

**La tarjeta** (solo tipografía): la estampa del álbum en grande, con papel, marco fino y filete de 2 px en tinta. Arriba, «Cofradar» espaciado y «Semana Santa de Sevilla · 2027»; una rayita, el alias en Newsreader y «Hermano nº 214 · Diputado de tramo en Cofradar»; un filete y las líneas del año, alineadas a la izquierda con su icono (ojo, sello de dar fe, cirio, Cards, BookOpen); al pie, «cofradar.es». Tamaño fijo, con las líneas centradas en vertical: con dos líneas sigue siendo una estampa entera. Siempre en claro; en oscuro solo cambia la pantalla de alrededor. Un alias largo se corta por el guion bajo, nunca a mitad de palabra.

- `25-mi-cofradar-resurreccion`, `25-mi-cofradar-resurreccion-oscuro` — 25 · MI COFRADAR: la fila «Tu Semana Santa 2027 · Ya está tu tarjeta del año» (Scroll en granate sobre cuadrado granate suave, borde granate suave) entre la tarjeta del cargo y el bloque de «lo tuyo». Desde el año siguiente, la fila se queda sin la línea de «ya está».
- `26-tu-semana-santa`, `26-tu-semana-santa-oscuro` — 26 · LA TARJETA: «← Mi Cofradar», «Tu Semana Santa», la tarjeta, «Compartir», «Guardar imagen» y «Las horas que pasaste en la calle no salen: Cofradar no guarda dónde has estado.»
- `27-imagen-compartida` — 27 · LA IMAGEN, a 1080 × 1920 (estados de WhatsApp e historias): la misma tarjeta, con la letra algo mayor y casi sin margen.
- `28-compartir` — 28 · COMPARTIR: la hoja aprobada con miniatura y «Mi Semana Santa 2027 en Cofradar · cofradar.es», sin emojis; «Compartir» y «Ahora no».
- `29-un-ano-con-poco`, `29b-imagen-con-poco` — 29 · UN AÑO CON POCO: «Nazareno_de_la_Alfalfa», «Hermano nº 1.873 · Monaguillo en Cofradar», solo «Viste 3 cofradías» y «Contestaste 12 preguntas del día» (con Cards, no con el cirio apagado). La 29b, a 1080 × 1920, con el alias en dos líneas.
- `30-otros-anos`, `30b-ano-anterior` — 30 · OTROS AÑOS: al pie de la 26, «Otros años» con una fila por año («Semana Santa 2027»); al abrirla, «← Tu Semana Santa» y título «Semana Santa 2027».
- `31-sin-nada` — 31 · SIN NADA QUE CONTAR: Mi Cofradar sin la fila y sin la tarjeta del cargo (0 puntos). Las cifras de las filas de «lo tuyo» no cuentan: la app enseña las que tenga cada persona.
