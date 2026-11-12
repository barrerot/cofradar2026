# Las estampas del álbum

Material para el diseño de las estampas ilustradas (F-56), con Claude Design.

- `fichas.csv`: una fila por hermandad (las 72). La jornada, el templo, los titulares y el archivo del escudo salen de `docs/datos/`. La túnica y sus colores se sacaron de la web de cada hermandad, y si no los traía, del programa de mano de 2018 de la Fundación Cajasol. Cada fila lleva su fuente en `fuente_tunica`.
  - Las columnas con algo en `revisar` tienen el dato incompleto o dudoso.
  - Sin dato (no se inventa): Pino Montano, Bellavista, Alcosa, San José Obrero y La Milagrosa.
- El prompt para Claude Design es `docs/design/prompts/29-estampas-ilustradas.txt`. Pide el sistema y 6 estampas de prueba; las demás, en tandas, cuando esté aprobado.
- Los escudos **no** van al repositorio, que es público. Están en el servidor, en `~/.cofradar/escudos/`, y se suben a mano a Claude Design.
- Las fotos de referencia de los titulares tampoco van al repositorio.
