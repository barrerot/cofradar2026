# Cofradar · Logotipo D «El tramo con nazareno»

La C de Cofradar dibujada con el lenguaje de la app:
- trazo sólido: confirmado;
- trazo discontinuo: según horario;
- el nazareno: la cabeza del cortejo, ahora.

Solo en tinta (#1D1A16) y cera (#F7F1E6). El granate es para «lo tuyo» y los verdes son estados, así que el logo no usa ninguno.

## Contenido

- `svg/`: vectores con fondo transparente. La palabra «Cofradar» va trazada en curvas, así que no necesita la fuente instalada.
  - `cofradar-logo-horizontal-*`: símbolo + palabra en línea. Para el encabezado y documentos.
  - `cofradar-logo-vertical-*`: símbolo encima de la palabra. Para la intro, el arranque y portadas.
  - `cofradar-simbolo-*`: solo el símbolo, desde 40 px.
  - `cofradar-simbolo-pequeno-*`: por debajo de 40 px. Las tres rayas se unen en un trazo.
  - `cofradar-palabra.svg`: solo la palabra.
  - `-tinta`: para fondos claros. `-cera`: para fondos oscuros.
- `png/`: los mismos SVG en PNG a 8×, con fondo transparente.
- `iconos/`:
  - `icon-1024` / `512` / `192`: icono de la app, sin esquinas redondeadas porque las pone el sistema;
  - `icon-maskable-512`: con margen de seguridad, para Android;
  - `apple-touch-icon-180`;
  - `favicon.svg`, `favicon-32`, `favicon-16`.
- `intro-animada/`: `intro.html` y `arranque.html`. La animación ya está hecha, en CSS + SVG: ábrelos en el navegador. «Repetir animación» la vuelve a lanzar. Sigue el modo claro u oscuro del sistema y respeta «reducir movimiento».
- `pantallas/`: la hoja del logotipo, las pantallas finales (claro y oscuro) y cuatro fotogramas de la animación.
- `PROMPT-claude-code.md`: el encargo listo para pegar en Claude Code.

## Reglas de uso

- Espacio libre alrededor: como mínimo, el ancho de una raya del tramo previsto.
- No girar, no deformar, no cambiar los colores, no añadir sombras ni degradados.
- El nazareno siempre completo, con antifaz en pico y túnica, y nunca con rostro ni huecos para los ojos.
- La animación se reproduce una sola vez y nunca en bucle. Así no se confunde con un indicador de carga.

## Animación (2,8 s, curva ease-out del sistema `cubic-bezier(.2,.8,.25,1)`)

| Momento | Qué pasa |
|---|---|
| 0,10–0,95 s | se dibuja el tramo sólido |
| 0,85–1,27 s | el nazareno se levanta sobre el tramo |
| 1,00–1,90 s | anillo de «radar» desde la cabeza |
| 1,25–1,75 s | las tres rayas de lo previsto, una a una |
| 1,10–1,70 s | sube la palabra «Cofradar» |
| 1,75 s | leyenda |
| 1,95–2,64 s | los tres bloques, escalonados |
| 2,40–2,85 s | botón «Empezar» |
