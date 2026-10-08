# Cofradar

Web app responsive para vivir y seguir la Semana Santa desde el móvil: qué cofradías procesionan, por dónde van realmente, con qué grado de confianza, y **«Dar fe»** de lo que estás viendo.

Alcance de la primera versión: **Sevilla capital completa**.

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| **Qué hace el producto** — entidades, reglas de negocio, algoritmo, alcance | [PRD en Notion](https://app.notion.com/p/3dfe0bf6d486817cb243e79d38744e7b) — **fuente de verdad** |
| **Cómo se presenta e interactúa** — tokens, componentes, estados, responsive, accesibilidad | [`design.md`](design.md) — v1.2, D1–D25, 18 reglas duras |
| Versión navegable del sistema de diseño | [Artifact](https://claude.ai/artifact/Npg46AGUof2kur3LwRG1Lt) |
| **Plan de ejecución** — 48 issues en 7 hitos | Linear, proyecto `P-BUL-4 · Cofradar` |

**El PRD manda.** Si Linear o el diseño lo contradicen, gana el PRD y se corrige lo otro. Si el PRD contiene una regla de producto que el diseño omitió, manda el PRD y se actualiza `design.md`.

## Arrancar

```bash
npm install      # instala y sincroniza el design system
npm run dev      # Express en :3001, Vite en :5173
```

El CSS y las fuentes salen de `docs/design/pantallas/0-sistema` via
`npm run sync:diseno`, que corre solo tras cada `npm install`. `bundle.css` es
generado y no se commitea: **no se edita a mano**. Lo nuestro es
`frontend/src/estilos/base.css` (lo que el design system no trae: @font-face y
reset) y `marco.css` (las zonas del armazon).

| Dentro de | Que hay |
|---|---|
| `frontend/src/marco/` | El armazon: cabecera, navegacion de cinco destinos, franja de accion, pantalla secundaria y bottom sheet |
| `frontend/src/rutas/` | Una pantalla por area, con relleno a la espera de su hito |
| `backend/src/` | Esqueleto de la API. Sin motor todavia |
| `docs/design/pantallas/` | El export del design system: `.png` como se ve, `.html` el marcado de referencia, `.md` las notas |

## Publicar

```bash
npm run build --workspace=frontend          # URL limpias: /cofradias
rsync -av --delete frontend/dist/ usuario@servidor:/ruta/public_html/
```

El build es estático: no necesita Node en el servidor, porque hoy todo sale
del fixture y no hay ni una llamada al backend. El `.htaccess` con la regla de
reescritura que necesitan las rutas viaja dentro de `frontend/public/`.

**Si el servidor no deja configurar esa reescritura** —nginx sirviendo los
estáticos sin pasar por Apache, o un hosting ajeno— se compila con rutas de
hash:

```bash
VITE_ROUTER=hash npm run build --workspace=frontend   # /#/cofradias
```

Así el servidor solo ve `/` y no hace falta ninguna regla. Es para demos: las
URL de hash se comparten peor, y en producción se usa el build normal.

Para ver el marco en sus dos intensidades (§8.3): `?jornada=sin-actividad`
quita la franja de «Dar fe». Para mirar una pantalla en los dos temas sin
tocar los ajustes del sistema: `?tema=oscuro` y `?tema=claro`. Es andamio de
revisión: sin parámetro, el tema lo sigue decidiendo el sistema y §5 mantiene
claro por defecto.

## Datos

`docs/datos/` contiene las plantillas de transcripción. Están vacías: el trabajo de datos es el camino crítico del proyecto y está en el hito **1 · Datos y motor**.

Los datos no salen de una fuente institucional —no hay acuerdo con el Consejo de Hermandades—, sino de cuadrantes de horarios de paso publicados por medios. Por eso **cada dato lleva registrada su `fuente`** y un cambio de última hora **se corrige y se anota, nunca se sobrescribe en silencio**.

| Archivo | Qué contiene |
|---|---|
| `cofradias.csv` | Una fila por cofradía y jornada |
| `elementos.csv` | Taxonomía de puntos rastreables, configurable por ciudad |
| `puntos_control.csv` | Lugares del cuadrante, geocodificados una sola vez |
| `horarios.csv` | La transcripción: qué elemento pasa por qué punto y cuándo |
| `etiquetas.csv` | Lugares en bruto extraídos de los cuadrantes, antes de resolver |
| `itinerarios/` | Un GeoJSON por cofradía, **en el sentido de la marcha** |
