import { readFileSync, readdirSync, writeFileSync } from "node:fs";

/* Fuentes de trazos, todas espejo local del artifact del design system. Las
   capturas de pantalla no traen todas las variantes de un componente —solo
   las que esa pantalla usa—, asi que las fichas de 0-sistema/componentes/
   completan el vocabulario (p. ej. las seis alteraciones, de las que Inicio
   solo muestra dos). Al añadir un area o una ficha se añade aqui y se
   declaran sus iconos en `mapa`. */
const dirs = [
  "docs/design/pantallas/1-marco",
  "docs/design/pantallas/2-inicio",
  "docs/design/pantallas/3-mapa",
  "docs/design/pantallas/4-cofradias",
  "docs/design/pantallas/0-sistema/componentes",
];

const trazos = new Map();
for (const dir of dirs) {
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".html"))) {
    const html = readFileSync(`${dir}/${f}`, "utf8");
    for (const m of html.matchAll(/<svg[^>]*width="(\d+)"[^>]*>(.*?)<\/svg>/gs)) {
      for (const d of m[2].matchAll(/\sd="([^"]+)"/g)) trazos.set(d[1].slice(0, 20), d[1]);
    }
  }
}

/* Iconos que se ven en las capturas PNG del export pero no vienen en ningun
   HTML. Se copian de Phosphor (@phosphor-icons/core 2.1.1, peso bold, el
   mismo que usa el export: su arrows-clockwise-bold es identico a
   `sincronizar`). */
const EXTRA = {
  /** Navegación «Cofradías» (1-marco/armazon-*, vigente): article y
      article-fill, peso regular como el resto de la barra. El export antiguo
      traía users-three, que el armazón aprobado ya no usa. */
  cofradias:
    "M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,160H40V56H216V200ZM184,96a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,96Zm0,32a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,128Zm0,32a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,160Z",
  cofradiasRelleno:
    "M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM176,168H80a8,8,0,0,1,0-16h96a8,8,0,0,1,0,16Zm0-32H80a8,8,0,0,1,0-16h96a8,8,0,0,1,0,16Zm0-32H80a8,8,0,0,1,0-16h96a8,8,0,0,1,0,16Z",
  /** Introducción (P-02; 8-acceso/acceso-2): «Dar fe». eye-bold, en contorno:
      «vista» es el ojo relleno de la marca de relación. */
  ojo:
    "M251,123.13c-.37-.81-9.13-20.26-28.48-39.61C196.63,57.67,164,44,128,44S59.37,57.67,33.51,83.52C14.16,102.87,5.4,122.32,5,123.13a12.08,12.08,0,0,0,0,9.75c.37.82,9.13,20.26,28.49,39.61C59.37,198.34,92,212,128,212s68.63-13.66,94.48-39.51c19.36-19.35,28.12-38.79,28.49-39.61A12.08,12.08,0,0,0,251,123.13Zm-46.06,33C183.47,177.27,157.59,188,128,188s-55.47-10.73-76.91-31.88A130.36,130.36,0,0,1,29.52,128,130.45,130.45,0,0,1,51.09,99.89C72.54,78.73,98.41,68,128,68s55.46,10.73,76.91,31.89A130.36,130.36,0,0,1,226.48,128,130.45,130.45,0,0,1,204.91,156.12ZM128,84a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,84Zm0,64a20,20,0,1,1,20-20A20,20,0,0,1,128,148Z",
  /** Sin conexion: cabecera y aviso «Sin conexion · ultimo dato hace…»
      (0-sistema/estados/estado-5, 1-marco/armazon-5). cloud-slash-bold. */
  sinConexion:
    "M56.88,31.93A12,12,0,1,0,39.12,48.07L71.79,84A68,68,0,0,0,72,220h88a91.26,91.26,0,0,0,30.66-5.24l8.46,9.31a12,12,0,0,0,17.76-16.14ZM160,196H72a44,44,0,0,1-1.8-87.95A91.91,91.91,0,0,0,68,128a12,12,0,0,0,24,0,68.22,68.22,0,0,1,2.66-18.84l77.88,85.67A68.67,68.67,0,0,1,160,196Zm92-68a91.32,91.32,0,0,1-17.53,54,12,12,0,1,1-19.41-14.11,68,68,0,0,0-89.57-98.53,12,12,0,0,1-12.2-20.66A92,92,0,0,1,252,128Z",
  /** Sin cartografia (0-sistema/estados/estado-7): map-trifold-bold con una
      barra que lo tacha de arriba a la izquierda a abajo a la derecha, del
      mismo grosor que la de cloud-slash. Phosphor no trae «map-slash». */
  sinCartografia:
    "M231.38,46.54a12,12,0,0,0-10.29-2.18L161.4,59.28l-60-30a12,12,0,0,0-8.28-.91l-64,16A12,12,0,0,0,20,56V200a12,12,0,0,0,14.91,11.64L94.6,196.72l60,30a12,12,0,0,0,8.28.91l64-16A12,12,0,0,0,236,200V56A12,12,0,0,0,231.38,46.54ZM108,59.42l40,20V196.58l-40-20Zm-64,6,40-10V174.63l-40,10ZM212,190.63l-40,10V81.37l40-10ZM24.88,15.93a12,12,0,1,0-17.76,16.14l224,208a12,12,0,1,0,17.76-16.14Z",
  /** Ubicación (Ajustes, P-25; 7-mi-cofradar/ajustes). map-pin-bold. */
  ubicacion:
    "M128,60a44,44,0,1,0,44,44A44.05,44.05,0,0,0,128,60Zm0,64a20,20,0,1,1,20-20A20,20,0,0,1,128,124Zm0-112a92.1,92.1,0,0,0-92,92c0,77.36,81.64,135.4,85.12,137.83a12,12,0,0,0,13.76,0,259,259,0,0,0,42.18-39C205.15,170.57,220,136.37,220,104A92.1,92.1,0,0,0,128,12Zm31.3,174.71A249.35,249.35,0,0,1,128,216.89a249.35,249.35,0,0,1-31.3-30.18C80,167.37,60,137.31,60,104a68,68,0,0,1,136,0C196,137.31,176,167.37,159.3,186.71Z",
  /** Permiso no concedido: «No permitida». prohibit-bold. */
  prohibido:
    "M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm84,108a83.6,83.6,0,0,1-16.75,50.28L77.72,60.75A84,84,0,0,1,212,128ZM44,128A83.6,83.6,0,0,1,60.75,77.72L178.28,195.25A84,84,0,0,1,44,128Z",
  /** Permiso bloqueado en el navegador. lock-simple-bold. */
  candado:
    "M208,76H180V56A52,52,0,0,0,76,56V76H48A20,20,0,0,0,28,96V208a20,20,0,0,0,20,20H208a20,20,0,0,0,20-20V96A20,20,0,0,0,208,76ZM100,56a28,28,0,0,1,56,0V76H100ZM204,204H52V100H204Z",
  /** Permiso concedido: «Permitida». check-circle-bold. */
  permitido:
    "M176.49,95.51a12,12,0,0,1,0,17l-56,56a12,12,0,0,1-17,0l-24-24a12,12,0,1,1,17-17L112,143l47.51-47.52A12,12,0,0,1,176.49,95.51ZM236,128A108,108,0,1,1,128,20,108.12,108.12,0,0,1,236,128Zm-24,0a84,84,0,1,0-84,84A84.09,84.09,0,0,0,212,128Z",
  /** Política de privacidad. file-text-bold. */
  documento:
    "M216.49,79.52l-56-56A12,12,0,0,0,152,20H56A20,20,0,0,0,36,40V216a20,20,0,0,0,20,20H200a20,20,0,0,0,20-20V88A12,12,0,0,0,216.49,79.52ZM160,57l23,23H160ZM60,212V44h76V92a12,12,0,0,0,12,12h48V212Zm112-80a12,12,0,0,1-12,12H96a12,12,0,0,1,0-24h64A12,12,0,0,1,172,132Zm0,40a12,12,0,0,1-12,12H96a12,12,0,0,1,0-24h64A12,12,0,0,1,172,172Z",
  /** Fila que lleva a otra pantalla. caret-right-bold. */
  /** «Consultar las cofradías →» (2-inicio/inicio-D). arrow-right-bold, pareja de flechaIzquierda. */
  flechaDerecha:
    "M224.49,136.49l-72,72a12,12,0,0,1-17-17L187,140H40a12,12,0,0,1,0-24H187L135.51,64.48a12,12,0,0,1,17-17l72,72A12,12,0,0,1,224.49,136.49Z",
  /** Portada de Mi Cofradar (7-mi-cofradar/portada-*): Cuenta, Ajustes y Ayuda y
      fuentes. user, sliders-horizontal y question, peso regular como en la captura. */
  usuario:
    "M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z",
  ajustes:
    "M40,88H73a32,32,0,0,0,62,0h81a8,8,0,0,0,0-16H135a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16Zm64-24A16,16,0,1,1,88,80,16,16,0,0,1,104,64ZM216,168H199a32,32,0,0,0-62,0H40a8,8,0,0,0,0,16h97a32,32,0,0,0,62,0h17a8,8,0,0,0,0-16Zm-48,24a16,16,0,1,1,16-16A16,16,0,0,1,168,192Z",
  ayuda:
    "M140,180a12,12,0,1,1-12-12A12,12,0,0,1,140,180ZM128,72c-22.06,0-40,16.15-40,36v4a8,8,0,0,0,16,0v-4c0-11,10.77-20,24-20s24,9,24,20-10.77,20-24,20a8,8,0,0,0-8,8v8a8,8,0,0,0,16,0v-.72c18.24-3.35,32-17.9,32-35.28C168,88.15,150.06,72,128,72Zm104,56A104,104,0,1,1,128,24,104.11,104.11,0,0,1,232,128Zm-16,0a88,88,0,1,0-88,88A88.1,88.1,0,0,0,216,128Z",
  /** «Añadir una que vi» (7-mi-cofradar/coleccion). plus-bold. */
  mas:
    "M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z",
  /** Cuenta (7-mi-cofradar/cuenta): cambiar de cuenta, descargar, cerrar sesión y
      eliminar. arrows-left-right, download-simple, sign-out y trash, peso regular. */
  cambiarCuenta:
    "M213.66,181.66l-32,32a8,8,0,0,1-11.32-11.32L188.69,184H48a8,8,0,0,1,0-16H188.69l-18.35-18.34a8,8,0,0,1,11.32-11.32l32,32A8,8,0,0,1,213.66,181.66Zm-139.32-64a8,8,0,0,0,11.32-11.32L67.31,88H208a8,8,0,0,0,0-16H67.31L85.66,53.66A8,8,0,0,0,74.34,42.34l-32,32a8,8,0,0,0,0,11.32Z",
  descargar:
    "M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40a8,8,0,0,0-11.32-11.32L136,124.69V32a8,8,0,0,0-16,0v92.69L93.66,98.34a8,8,0,0,0-11.32,11.32Z",
  salir:
    "M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z",
  papelera:
    "M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z",
  /** Iconos cofrades del mapa y de «Dar fe» (BUL-218): dibujo propio, sencillo y sin
      ornamento, en el lienzo de Phosphor. Cruz de guía: el asta con su travesaño y el
      remate. Paso de misterio: la escena (triángulo) sobre el canasto. Palio: el techo,
      los varales y el canasto. Los huecos van en sentido contrario (regla nonzero). */
  cruzGuia:
    "M128,28a20,20,0,1,0,0.01,0ZM118,58h20V228H118ZM80,88h96v20H80Z",
  misterio:
    "M128,48l68,120H60ZM128,100l-32,56h64ZM40,180H216v24H40Z",
  palio:
    "M40,52H216V84H40ZM52,84H204v16H52ZM60,100H76V212H60ZM180,100h16V212H180ZM48,184H208v24H48Z",
  chevronDerecha:
    "M184.49,136.49l-80,80a12,12,0,0,1-17-17L159,128,87.51,56.49a12,12,0,1,1,17-17l80,80A12,12,0,0,1,184.49,136.49Z",
  /** Trivial cofrade (10-trivial/trivial-01): la fila de Mi Cofradar. cards,
      peso regular como Ajustes y Ayuda. */
  trivial:
    "M184,72H40A16,16,0,0,0,24,88V200a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V88A16,16,0,0,0,184,72Zm0,128H40V88H184V200ZM232,56V176a8,8,0,0,1-16,0V56H64a8,8,0,0,1,0-16H216A16,16,0,0,1,232,56Z",
  /** Trivial: la fuente de cada pregunta, que abre la web de la hermandad.
      arrow-square-out-bold. */
  enlaceExterno:
    "M228,104a12,12,0,0,1-24,0V69l-59.51,59.51a12,12,0,0,1-17-17L187,52H152a12,12,0,0,1,0-24h64a12,12,0,0,1,12,12Zm-44,24a12,12,0,0,0-12,12v64H52V84h64a12,12,0,0,0,0-24H48A20,20,0,0,0,28,80V208a20,20,0,0,0,20,20H176a20,20,0,0,0,20-20V140A12,12,0,0,0,184,128Z",
  /** Trivial online (11-trivial-online/): las seis categorías del tablero (scroll, image, flag,
      signpost, music-notes y lightbulb), la estrella (star-fill), el plazo (timer), la invitación
      (link), las seis caras del dado (dice-one…six) y el resultado (flag-checkered). Peso regular,
      como en el lienzo; la estrella, rellena. */
  catHistoria:
    "M96,104a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H104A8,8,0,0,1,96,104Zm8,40h64a8,8,0,0,0,0-16H104a8,8,0,0,0,0,16Zm128,48a32,32,0,0,1-32,32H88a32,32,0,0,1-32-32V64a16,16,0,0,0-32,0c0,5.74,4.83,9.62,4.88,9.66h0A8,8,0,0,1,24,88a7.89,7.89,0,0,1-4.79-1.61h0C18.05,85.54,8,77.61,8,64A32,32,0,0,1,40,32H176a32,32,0,0,1,32,32V168h8a8,8,0,0,1,4.8,1.6C222,170.46,232,178.39,232,192ZM96.26,173.48A8.07,8.07,0,0,1,104,168h88V64a16,16,0,0,0-16-16H67.69A31.71,31.71,0,0,1,72,64V192a16,16,0,0,0,32,0c0-5.74-4.83-9.62-4.88-9.66A7.82,7.82,0,0,1,96.26,173.48ZM216,192a12.58,12.58,0,0,0-3.23-8h-94a26.92,26.92,0,0,1,1.21,8,31.82,31.82,0,0,1-4.29,16H200A16,16,0,0,0,216,192Z",
  catImagenes:
    "M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,16V158.75l-26.07-26.06a16,16,0,0,0-22.63,0l-20,20-44-44a16,16,0,0,0-22.62,0L40,149.37V56ZM40,172l52-52,80,80H40Zm176,28H194.63l-36-36,20-20L216,181.38V200ZM144,100a12,12,0,1,1,12,12A12,12,0,0,1,144,100Z",
  catPatrimonio:
    "M42.76,50A8,8,0,0,0,40,56V224a8,8,0,0,0,16,0V179.77c26.79-21.16,49.87-9.75,76.45,3.41,16.4,8.11,34.06,16.85,53,16.85,13.93,0,28.54-4.75,43.82-18a8,8,0,0,0,2.76-6V56A8,8,0,0,0,218.76,50c-28,24.23-51.72,12.49-79.21-1.12C111.07,34.76,78.78,18.79,42.76,50ZM216,172.25c-26.79,21.16-49.87,9.74-76.45-3.41-25-12.35-52.81-26.13-83.55-8.4V59.79c26.79-21.16,49.87-9.75,76.45,3.4,25,12.35,52.82,26.13,83.55,8.4Z",
  catJornadas:
    "M246,106.65,212.33,69.3A16,16,0,0,0,200.44,64H136V32a8,8,0,0,0-16,0V64H40A16,16,0,0,0,24,80v64a16,16,0,0,0,16,16h80v64a8,8,0,0,0,16,0V160h64.44a16,16,0,0,0,11.89-5.3L246,117.35A8,8,0,0,0,246,106.65ZM200.44,144H40V80H200.44l28.8,32Z",
  catMusica:
    "M212.92,17.69a8,8,0,0,0-6.86-1.45l-128,32A8,8,0,0,0,72,56V166.08A36,36,0,1,0,88,196V110.25l112-28v51.83A36,36,0,1,0,216,164V24A8,8,0,0,0,212.92,17.69ZM52,216a20,20,0,1,1,20-20A20,20,0,0,1,52,216ZM88,93.75V62.25l112-28v31.5ZM180,184a20,20,0,1,1,20-20A20,20,0,0,1,180,184Z",
  catTradiciones:
    "M176,232a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,232Zm40-128a87.55,87.55,0,0,1-33.64,69.21A16.24,16.24,0,0,0,176,186v6a16,16,0,0,1-16,16H96a16,16,0,0,1-16-16v-6a16,16,0,0,0-6.23-12.66A87.59,87.59,0,0,1,40,104.49C39.74,56.83,78.26,17.14,125.88,16A88,88,0,0,1,216,104Zm-16,0a72,72,0,0,0-73.74-72c-39,.92-70.47,33.39-70.26,72.39a71.65,71.65,0,0,0,27.64,56.3A32,32,0,0,1,96,186v6h64v-6a32.15,32.15,0,0,1,12.47-25.35A71.65,71.65,0,0,0,200,104Zm-16.11-9.34a57.6,57.6,0,0,0-46.56-46.55,8,8,0,0,0-2.66,15.78c16.57,2.79,30.63,16.85,33.44,33.45A8,8,0,0,0,176,104a9,9,0,0,0,1.35-.11A8,8,0,0,0,183.89,94.66Z",
  estrella:
    "M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z",
  reloj:
    "M128,40a96,96,0,1,0,96,96A96.11,96.11,0,0,0,128,40Zm0,176a80,80,0,1,1,80-80A80.09,80.09,0,0,1,128,216ZM173.66,90.34a8,8,0,0,1,0,11.32l-40,40a8,8,0,0,1-11.32-11.32l40-40A8,8,0,0,1,173.66,90.34ZM96,16a8,8,0,0,1,8-8h48a8,8,0,0,1,0,16H104A8,8,0,0,1,96,16Z",
  enlace:
    "M240,88.23a54.43,54.43,0,0,1-16,37L189.25,160a54.27,54.27,0,0,1-38.63,16h-.05A54.63,54.63,0,0,1,96,119.84a8,8,0,0,1,16,.45A38.62,38.62,0,0,0,150.58,160h0a38.39,38.39,0,0,0,27.31-11.31l34.75-34.75a38.63,38.63,0,0,0-54.63-54.63l-11,11A8,8,0,0,1,135.7,59l11-11A54.65,54.65,0,0,1,224,48,54.86,54.86,0,0,1,240,88.23ZM109,185.66l-11,11A38.41,38.41,0,0,1,70.6,208h0a38.63,38.63,0,0,1-27.29-65.94L78,107.31A38.63,38.63,0,0,1,144,135.71a8,8,0,0,0,16,.45A54.86,54.86,0,0,0,144,96a54.65,54.65,0,0,0-77.27,0L32,130.75A54.62,54.62,0,0,0,70.56,224h0a54.28,54.28,0,0,0,38.64-16l11-11A8,8,0,0,0,109,185.66Z",
  dado1:
    "M192,32H64A32,32,0,0,0,32,64V192a32,32,0,0,0,32,32H192a32,32,0,0,0,32-32V64A32,32,0,0,0,192,32Zm16,160a16,16,0,0,1-16,16H64a16,16,0,0,1-16-16V64A16,16,0,0,1,64,48H192a16,16,0,0,1,16,16Zm-68-64a12,12,0,1,1-12-12A12,12,0,0,1,140,128Z",
  dado2:
    "M192,32H64A32,32,0,0,0,32,64V192a32,32,0,0,0,32,32H192a32,32,0,0,0,32-32V64A32,32,0,0,0,192,32Zm16,160a16,16,0,0,1-16,16H64a16,16,0,0,1-16-16V64A16,16,0,0,1,64,48H192a16,16,0,0,1,16,16Zm-88-84a12,12,0,1,1-12-12A12,12,0,0,1,120,108Zm40,40a12,12,0,1,1-12-12A12,12,0,0,1,160,148Z",
  dado3:
    "M192,32H64A32,32,0,0,0,32,64V192a32,32,0,0,0,32,32H192a32,32,0,0,0,32-32V64A32,32,0,0,0,192,32Zm16,160a16,16,0,0,1-16,16H64a16,16,0,0,1-16-16V64A16,16,0,0,1,64,48H192a16,16,0,0,1,16,16ZM104,92A12,12,0,1,1,92,80,12,12,0,0,1,104,92Zm36,36a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm36,36a12,12,0,1,1-12-12A12,12,0,0,1,176,164Z",
  dado4:
    "M192,32H64A32,32,0,0,0,32,64V192a32,32,0,0,0,32,32H192a32,32,0,0,0,32-32V64A32,32,0,0,0,192,32Zm16,160a16,16,0,0,1-16,16H64a16,16,0,0,1-16-16V64A16,16,0,0,1,64,48H192a16,16,0,0,1,16,16Zm-96-92a12,12,0,1,1-12-12A12,12,0,0,1,112,100Zm56,0a12,12,0,1,1-12-12A12,12,0,0,1,168,100Zm-56,56a12,12,0,1,1-12-12A12,12,0,0,1,112,156Zm56,0a12,12,0,1,1-12-12A12,12,0,0,1,168,156Z",
  dado5:
    "M192,32H64A32,32,0,0,0,32,64V192a32,32,0,0,0,32,32H192a32,32,0,0,0,32-32V64A32,32,0,0,0,192,32Zm16,160a16,16,0,0,1-16,16H64a16,16,0,0,1-16-16V64A16,16,0,0,1,64,48H192a16,16,0,0,1,16,16ZM104,92A12,12,0,1,1,92,80,12,12,0,0,1,104,92Zm72,0a12,12,0,1,1-12-12A12,12,0,0,1,176,92Zm-72,72a12,12,0,1,1-12-12A12,12,0,0,1,104,164Zm36-36a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm36,36a12,12,0,1,1-12-12A12,12,0,0,1,176,164Z",
  dado6:
    "M192,32H64A32,32,0,0,0,32,64V192a32,32,0,0,0,32,32H192a32,32,0,0,0,32-32V64A32,32,0,0,0,192,32Zm16,160a16,16,0,0,1-16,16H64a16,16,0,0,1-16-16V64A16,16,0,0,1,64,48H192a16,16,0,0,1,16,16ZM104,84A12,12,0,1,1,92,72,12,12,0,0,1,104,84Zm72,0a12,12,0,1,1-12-12A12,12,0,0,1,176,84Zm-72,44a12,12,0,1,1-12-12A12,12,0,0,1,104,128Zm72,0a12,12,0,1,1-12-12A12,12,0,0,1,176,128Zm-72,44a12,12,0,1,1-12-12A12,12,0,0,1,104,172Zm72,0a12,12,0,1,1-12-12A12,12,0,0,1,176,172Z",
  /** Compartir (11-trivial-online/18): Export de Phosphor, regular. */
  compartir:
    "M216,112v96a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V112A16,16,0,0,1,56,96H80a8,8,0,0,1,0,16H56v96H200V112H176a8,8,0,0,1,0-16h24A16,16,0,0,1,216,112ZM93.66,69.66,120,43.31V136a8,8,0,0,0,16,0V43.31l26.34,26.35a8,8,0,0,0,11.32-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40A8,8,0,0,0,93.66,69.66Z",
  bandera:
    "M227.32,48.75A8,8,0,0,0,218.76,50c-28,24.22-51.72,12.48-79.21-1.13C111.07,34.76,78.78,18.79,42.76,50A8,8,0,0,0,40,56V224a8,8,0,0,0,16,0V179.77c26.79-21.16,49.87-9.75,76.45,3.41,28.49,14.09,60.77,30.06,96.79-1.13a8,8,0,0,0,2.76-6V56A8,8,0,0,0,227.32,48.75ZM216,71.6v40.65c-14,11.06-27,13.22-40,10.88V79.34A60.05,60.05,0,0,0,216,71.6Zm-56,3.76v43c-6.66-2.67-13.43-6-20.45-9.48-8.82-4.37-18-8.91-27.55-12.18v-43c6.66,2.66,13.43,6,20.45,9.48C141.27,67.55,150.46,72.09,160,75.36ZM96,48.91V92.69a60.06,60.06,0,0,0-40,7.75V59.78C70,48.72,83,46.57,96,48.91ZM86.58,152A60.06,60.06,0,0,0,56,160.43V119.78c14-11.06,27-13.22,40-10.88v43.8A65.61,65.61,0,0,0,86.58,152ZM112,156.67v-43c6.66,2.66,13.43,6,20.45,9.48,8.82,4.37,18,8.9,27.55,12.17v43c-6.66-2.67-13.43-6-20.45-9.48C130.73,164.47,121.54,159.94,112,156.67Zm64,26.45v-43.8a65.61,65.61,0,0,0,9.42.72A60.11,60.11,0,0,0,216,131.57v40.68C202,183.31,189,185.46,176,183.12Z",
};

// clave = los 20 primeros caracteres del trazo tal como aparece en el export
const mapa = {
  // ── Marco ──────────────────────────────────────────────────────────────
  chevronAbajo:      "M216.49,104.49l-80,8",
  sincronizar:       "M228,48V96a12,12,0,0",
  buscar:            "M232.49,215.51,185,1",
  flechaIzquierda:   "M228,128a12,12,0,0,1",
  cerrar:            "M208.49,191.51a12,12",
  inicio:            "M219.31,108.68l-80-8",
  inicioRelleno:     "M224,120v96a8,8,0,0,",
  mapa:              "M228.92,49.69a8,8,0,",
  agenda:            "M208,32H184V24a8,8,0",
  miCofradar:        "M128,24A104,104,0,1,",
  miCofradarRelleno: "M172,120a44,44,0,1,1",
  /** Chip de filtro activo. Lo trae 4-cofradias. */
  check:             "M232.49,80.49l-128,1",

  // ── Fases de la cofradia (chip de estado) ──────────────────────────────
  /* Las siete fases canonicas. `prevista` comparte trazo con `calendario` y
     `cancelada` con `interrumpida`: en el export son el mismo glifo, y no se
     duplican aqui. */
  inminente:      "M204,75.64V40a20,20,",
  enCalle:        "M200,164a36.07,36.07",
  proximaEntrada: "M144.49,136.49l-40,4",
  finalizada:     "M229,45a12,12,0,0,0-",
  noProcesiona:   "M180,128a12,12,0,0,1",

  // ── Alteraciones ───────────────────────────────────────────────────────
  retraso:           "M128,44a96,96,0,1,0,",
  adelanto:          "M246.81,111.29,158.6",
  cambioRecorrido:   "M232.49,192.49l-32,3",
  interrumpida:      "M128,20A108,108,0,1,",
  regresoAnticipado: "M236,144a68.07,68.07",
  /* `incidencia` comparte trazo con `critico`: es el mismo triangulo de
     advertencia en el export. No se duplica. */

  // ── Confianza del dato ─────────────────────────────────────────────────
  /** Cola del chip cuando el dato esta desactualizado: «· hace 23 min». */
  desactualizado: "M140,80v41.21l34.17,",
  /** Procedencia del aviso: publicado por Cofradar / informado por usuarios. */
  procedenciaCofradar: "M128,84a44,44,0,1,0,",
  procedenciaUsuarios: "M164.38,181.1a52,52,",
  /* El aviso informativo. `critico` y `atencion` reusan trazo: en el export
     son el mismo triangulo y el mismo reloj que `incidencia` y `retraso`. */
  informativo: "M108,84a16,16,0,1,1,",

  // ── Marca de relacion con la cofradia ──────────────────────────────────
  /* La verificacion de «dar fe» es diferencia de FORMA, no de color: la
     verificada va en relleno y la no verificable en contorno. */
  vista:              "M247.31,124.76c-.35-",
  seguida:            "M184,28H72A20,20,0,0",
  darFeVerificada:    "M225.86,102.82c-3.77",
  darFeNoVerificable: "M228.75,100.05c-3.52",

  // ── Varios de contenido ────────────────────────────────────────────────
  /** Aviso de contexto de la banda superior (riesgo de lluvia). */
  lluvia:     "M156,12A80.22,80.22,",
  /** Aviso critico de incidencia. */
  critico:    "M240.26,186.1,152.81",
  /** «Ver toda la Madruga». */
  calendario: "M208,28H188V24a12,12",
  /** Opcion marcada en un filtro. */
  marca:      "M232.49,80.49l-128,1",
  /** «Centrar en mi ubicación» del mapa (3-mapa, 8-acceso/acceso-4a). */
  centrar:    "M232,116h-4.72A100.2",
};

const faltan = Object.entries(mapa).filter(([, k]) => !trazos.has(k));
if (faltan.length) {
  console.error("no encontrados:", faltan.map(([n]) => n));
  process.exit(1);
}

const cuerpo = Object.entries(mapa)
  .map(([nombre, clave]) => `  ${nombre}:\n    "${trazos.get(clave)}",`)
  .concat(Object.entries(EXTRA).map(([nombre, d]) => `  ${nombre}:\n    "${d}",`))
  .join("\n");

writeFileSync(
  "frontend/src/marco/trazos.ts",
  `/**
 * ARCHIVO GENERADO · no editar a mano.
 *
 * Trazos SVG extraidos literalmente de las capturas del export
 * (docs/design/pantallas/*​/*.html). Son iconos Phosphor con el lienzo
 * 0 0 256 256 que usa el export (y alguno que solo sale en las capturas PNG,
 * copiado de Phosphor: ver EXTRA en el generador). Se copian en lugar de instalar la libreria:
 * asi no hay una dependencia que pueda dibujar algo distinto a la captura.
 *
 * Regenerar: node scripts/gen-trazos.mjs
 */
export const TRAZOS = {
${cuerpo}
} as const;

export type NombreTrazo = keyof typeof TRAZOS;
`,
);
console.log(`${Object.keys(mapa).length + Object.keys(EXTRA).length} trazos escritos`);
