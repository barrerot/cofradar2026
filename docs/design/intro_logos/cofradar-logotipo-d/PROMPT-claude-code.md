# Prompt para Claude Code · Logotipo D e intro animada de Cofradar

Copia desde la línea de abajo y pégalo en Claude Code, con esta carpeta (`cofradar-logotipo-d/`) copiada en la raíz del repo.

---

Integra en Cofradar el logotipo nuevo y la introducción animada. Todo lo necesario está en `cofradar-logotipo-d/`. Lee primero `cofradar-logotipo-d/LEEME.md`.

**1. Iconos y favicon**
- Copia `iconos/` a la carpeta pública de la app (la que sirva `/`).
- En el `<head>`: `favicon.svg` (`type="image/svg+xml"`), `favicon-32.png` y `favicon-16.png` como respaldo, y `apple-touch-icon-180.png` como `apple-touch-icon`.
- En el manifest de la PWA:
  - `icon-192.png` e `icon-512.png` con `purpose: "any"`;
  - `icon-maskable-512.png` con `purpose: "maskable"`;
  - `theme_color` y `background_color`: `#F7F1E6` (cera).
- Si ya hay iconos provisionales, sustitúyelos.

**2. Logotipo como componente**
- Crea un componente de logo a partir de los SVG de `svg/`. Hay dos variantes:
  - símbolo + palabra (`horizontal`, `vertical`);
  - solo símbolo, con la versión `pequeno` para menos de 40 px.
- Color: usa `currentColor` en lugar de los hex fijos (`#1D1A16` / `#F7F1E6`), para que herede la tinta del tema.
- No le pongas granate ni ningún color de estado.
- Los recortes del símbolo son máscaras SVG: funciona sobre cualquier fondo. Si lo pones varias veces en la misma página, haz que los `id` de las máscaras sean únicos.

**3. Pantalla de introducción (P-02) y arranque (P-01)**
- La referencia que funciona es `intro-animada/intro.html` y `intro-animada/arranque.html`: ábrelos en el navegador. Es CSS + SVG puro, sin librerías. Porta ese marcado y ese CSS a los componentes del repo, sin rediseñar nada.
- Las variables `--c-*` del HTML son la paleta editorial (cera) de Cofradar. Cámbialas por los tokens del design system que ya use el repo: claro, y oscuro con el tema.
- La animación dura 2,8 s y se reproduce una sola vez al montar la pantalla. Nunca en bucle, nunca girando.
  - Las clases `cf-draw`, `cf-dash`, `cf-rise`, `cf-ping`, `cf-up` y `cf-in` llevan cada una su retardo en línea.
  - Las variables `--t` y `--ps` solo sirven para congelar fotogramas; en producción pueden quedarse a `0s` / `running`, o quitarse.
- Con `prefers-reduced-motion: reduce` se muestra directamente el estado final. Ya está en el CSS; respétalo.
- Un toque en cualquier parte de la pantalla durante la animación la salta al estado final. El botón «Empezar» funciona en cuanto se ve.
- La intro solo aparece la primera vez. El arranque, solo la primera vez o cuando no hay datos guardados. Si ya hay datos, se abre el último estado conocido. Si los datos llegan antes de que acabe la animación del arranque, no se espera a que termine.
- No cambies los textos de los tres bloques.
- La leyenda «Confirmado · Según horario · Ahora» está pendiente de decidir: déjala, pero con el texto fácil de cambiar.

**4. Tipografía**
- La palabra «Cofradar» va en Newsreader 600, con `letter-spacing: -0.015em`. Inter para el resto.
- Si el repo ya carga las fuentes en local, usa esas en lugar del enlace a Google Fonts del HTML de referencia.

**5. Comprobación**
Al acabar:
- abre la intro en claro y en oscuro, y con reducción de movimiento activada;
- compara con las imágenes de `pantallas/`;
- comprueba que el manifest valida (Lighthouse › PWA).

Prohibido: degradados, desenfoques, transparencias, spinners, granate en el logo.
