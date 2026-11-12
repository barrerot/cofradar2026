# Las estampas del álbum

Material para el diseño de las estampas ilustradas (F-56), con Claude Design.

- `fichas.csv`: una fila por hermandad (las 72). La jornada, el templo, los titulares y el archivo del escudo salen de `docs/datos/`. La túnica y sus colores se sacaron de la web de cada hermandad, y si no los traía, del programa de mano de 2018 de la Fundación Cajasol. Cada fila lleva su fuente en `fuente_tunica`.
  - Las columnas con algo en `revisar` tienen el dato incompleto o dudoso.
  - Sin dato (no se inventa): Pino Montano, Bellavista, Alcosa, San José Obrero y La Milagrosa.
- El prompt para Claude Design es `docs/design/prompts/29-estampas-ilustradas.txt`. Pide el sistema y 6 estampas de prueba; las demás, en tandas, cuando esté aprobado.
- Los escudos **no** van al repositorio, que es público. Están en el servidor, en `~/.cofradar/escudos/`, y se suben a mano a Claude Design.
- Las fotos de referencia de los titulares tampoco van al repositorio.

## El sistema aprobado (12/11/2026)

Claude Design hizo el sistema en el lienzo «Cofradar · Las estampas»: marco, colores de la túnica, grados y sello. Sus dibujos a mano de los titulares no se reconocían, así que el titular se saca de una foto con un filtro de grabado. Carlos lo aprobó.

- **La estampa en la app** es `frontend/src/rutas/Estampa.tsx`: un SVG de 200 × 300 que vale igual a 110 px (álbum) que a 300 px (hoja). Un grado por capa: la conoces = el titular a grabado y el escudo al medallón; la has visto = los colores de la túnica en el marco; has dado fe = el sello granate.
- **Los colores** de cada hermandad están en `frontend/src/datos/tunicas.ts`, sacados de `fichas.csv` con las reglas del lienzo (banda y filete, una tinta por color).
- **Qué titular va en cada estampa** está en `titulares.csv`. Carlos lo eligió el 12/11/2026 sobre mi propuesta, y el único cambio fue La Trinidad, con la Esperanza.
- **El titular a grabado** sale de `grabado.py` con lo que dice `grabados.csv`: la foto, el recorte y la gamma de cada hermandad. Las fotos están en `~/.cofradar/titulares/` y los SVG van a `~/.cofradar/grabados/`. Ninguno de los dos va al repositorio. El servidor los sirve en `/api/grabados/`. Una hermandad sin grabado lleva su escudo grande en la ventana.
- **Para añadir una tanda:**
  1. Copia la foto a `~/.cofradar/titulares/`. Mejor grande, con la cara bien visible.
  2. Añade su fila a `grabados.csv`.
  3. Ejecuta `~/.cofradar/venv/bin/python -I docs/design/estampas/grabado.py <cofradia>`.
  4. Mira cómo queda y ajusta el recorte o la gamma.

  No hace falta volver a publicar la app.
- **Antes de lanzar:** varias fotos son de blogs y de fotógrafos, con su marca de agua. Para la versión pública harán falta fotos propias o con permiso.
