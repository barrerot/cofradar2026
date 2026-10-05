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
