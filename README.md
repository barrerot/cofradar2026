# Cofradar

Web app responsive para vivir y seguir la Semana Santa desde el móvil: qué cofradías procesionan, por dónde van realmente, con qué grado de confianza, y **«Dar fe»** de lo que estás viendo.

Alcance de la primera versión: **Sevilla capital completa, Vísperas incluidas**, para la **Semana Santa de 2027** (19–28 de marzo).

## Dónde vive cada cosa

| Qué | Dónde |
|---|---|
| **Qué hace el producto** — entidades, reglas de negocio, algoritmo, alcance | [PRD en Notion](https://app.notion.com/p/3dfe0bf6d486817cb243e79d38744e7b) — **fuente de verdad** |
| **Cómo se presenta e interactúa** — tokens, componentes, estados, responsive, accesibilidad | [`design.md`](design.md) — v1.3, D1–D35 |
| Versión navegable del sistema de diseño | [Artifact](https://claude.ai/artifact/Npg46AGUof2kur3LwRG1Lt) |
| **Plan de ejecución** — 63 issues en 7 hitos | [Linear, proyecto `P-BUL-5 · Cofradar`](https://linear.app/buluu/project/cofradar-5dc1d2248bc1). El anterior, `P-BUL-4`, queda como copia de seguridad (`Cofradar_bak`) y no se toca |

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
| `docs/datos/mock/` | Fixture inventado de la Madrugá para diseñar, con su verificador (`python3 docs/datos/mock/verificar.py`) |
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

`docs/datos/` contiene las plantillas de transcripción. Están vacías: el trabajo de datos es el camino crítico del proyecto y está en el hito **1 · Datos**.

La fuente son los **horarios e itinerarios públicos del Consejo General de Hermandades y Cofradías de Sevilla**, citados siempre; **no se usan los cuadrantes de los medios**. El horario del Consejo marca la **cruz de guía y el palio** por todas las calles del recorrido, cada 30 minutos, y se traduce a puntos con latitud y longitud. Los pasos que van entre ambos se interpolan. Se trabaja con los horarios de 2026 y se actualiza con los de 2027 en cuanto se publiquen. **Cada dato lleva registrada su `fuente`** y un cambio de última hora **se corrige y se anota, nunca se sobrescribe en silencio**.

El modelo de datos son ocho entidades, una por CSV, descritas con su diagrama en [`docs/datos/MODELO.md`](docs/datos/MODELO.md).

| Archivo | Qué contiene |
|---|---|
| `punto_geografico.csv` | Cada lugar del horario, con sus coordenadas, una sola vez |
| `templo.csv` | Los templos, cada uno sobre su punto geográfico |
| `hermandad.csv` | Lo que no cambia de un año a otro: nombres, templo, hermanos, nazarenos |
| `paso.csv` | Los pasos de cada hermandad, en el orden del cortejo |
| `edicion.csv` | El año |
| `jornada.csv` | Las once jornadas, de Viernes de Dolores a Domingo de Resurrección |
| `salida_procesional.csv` | Una hermandad en una jornada de un año, con su estado |
| `punto_itinerario.csv` | La transcripción: por qué punto pasan la cruz de guía y el último paso, y cuándo |
