# Recorridos de las salidas procesionales

Esta carpeta guarda las herramientas que dibujan el recorrido de cada salida sobre el callejero de OpenStreetMap a partir del programa de mano del Consejo. El resultado es **un GeoJSON por salida** con una sola línea continua, ordenada y orientada, en `docs/datos/itinerarios/<año>/`.

## Lo que hay ahora: datos de 2026 para desarrollar

Cofradar sale para la Semana Santa de 2027, pero el programa oficial de 2027 no se publica hasta enero o febrero de 2027. Mientras tanto se desarrolla con los recorridos de 2026, que están en `docs/datos/itinerarios/2026/` (72 salidas, de Viernes de Dolores a Resurrección).

**Son datos provisionales**, y cada fichero lo dice (`"provisional": true`):

- **Puntos.** Los que nombra el programa son correctos.
- **Calles entre un punto y otro.** Las elige el trazador: el camino más corto, evitando calles que no están en la lista. Muchas aciertan y otras no.
- **Llamador 2025.** Se han añadido sus puntos, pero solo entre dos puntos del programa 2026 que el Llamador también tiene, y en el mismo orden. Así no se cuela un recorrido de 2025 que haya cambiado.
- **Catedral.** No se sabe el camino por dentro: es una línea recta de la Puerta de San Miguel a la de Palos.
- **Revisado a mano.** Solo la Borriquita (`revisados/11.json`).
- **Pendiente de revisar en el mapa:**
  - **Siete salidas con medias vueltas de más de 40 m:** La Misión, Alcosa, Bellavista, Pasión y Muerte, Santa Genoveva, La Candelaria y Las Cigarreras. Una media vuelta es cuando la línea entra en una calle y vuelve a salir por el mismo sitio.
  - **Templo sin situar:** Bellavista, Pasión y Muerte, Torreblanca y El Cerro.
  - **Templo situado a ojo:** la Universidad (Estudiantes), los Negritos, la Carretería, los Servitas y Santa Genoveva.
- **Horas.** No se han tocado. Siguen en `punto_itinerario.csv`; la correspondencia exacta entre horas y posiciones en la línea es la fase siguiente.

**No son los datos definitivos del modelo.** No cambian los CSV, `MODELO.md`, el PRD ni Linear.

## Qué hacer cuando salga el programa de 2027

Lo más sencillo: deja los PDF en `docs/datos/` y dile a Claude *«vamos con los recorridos de 2027, lee docs/datos/recorridos/LEEME.md»*. Esto es lo que hará, o lo que harías tú a mano.

### 1. Conseguir los documentos

- **Programa de mano del Consejo 2027** (enero o febrero). Es la fuente principal: da los puntos de paso y las horas de cruz de guía y paso.
- **Llamador 2027**, si ya ha salido. Suele salir más tarde, cerca de Semana Santa. Si no está, se usa el de 2026 o el de 2025: la regla de arriba evita que se cuelen cambios de recorrido.
- Déjalos en `docs/datos/`. **No se suben al repositorio**: el `.gitignore` excluye los PDF, porque el Llamador pesa 25 MB.

### 2. Ajustar lo que cambia cada año (en `generar.py`)

El programa cambia de maquetación y de orden de un año a otro. Antes de lanzar nada hay que mirar las páginas y comprobar estos puntos:

| Qué | Dónde | Ejemplo de 2026 |
|---|---|---|
| Página de cada jornada | `JORNADAS` y los `if` de `jornada` en `main()` | pág. 4 = Domingo de Ramos; la 2 lleva las dos Vísperas |
| Columnas que no se leen bien | `CORREGIDAS` (se copian de la imagen del PDF, por número de columna, **con las horas escritas en cada celda**: «Campana 1:39»; sin ellas, todas salen como aproximadas) | 54 Gran Poder, 55 Macarena, 71 Resurrección |
| Templos que OSM no reconoce | `TEMPLOS` | la Universidad, los Negritos… |
| Nombres abreviados que no casan con OSM | `MANUAL` | «F. Cef. González» → Calle Fray Ceferino González |
| Páginas del Llamador por jornada | `JORNADA_LL` y `PAGINAS_LLAMADOR` en `rehacer.sh` | 22–24 Domingo de Ramos |
| Nombres distintos en el Llamador | `OTRO_NOMBRE` | «MONTESIÓN» = Monte-Sión |
| Columnas del Llamador que se montan con la vecina | `transcribir_llamador.py` | El Amor, Santa Marta… |
| Carrera oficial, si cambia | `CARRERA`, `CAMPANA`, `PALOS` | Campana, Sierpes, Plaza, Avenida, Catedral |
| Recorridos revisados a mano | `revisados/NN.json` | **El número NN es la columna del programa y cambia cada año**: hay que renumerarlos o rehacerlos |

### 3. Lanzar el proceso

```bash
docs/datos/recorridos/rehacer.sh docs/datos/<programa-2027>.pdf docs/datos/<llamador>.pdf 2027 "Programa de mano 2027 + Llamador <año>"
```

El proceso hace lo siguiente:

- Descarga el callejero de OSM la primera vez, en `trabajo/osm/`.
- Lee los dos PDF.
- Casa los nombres con OSM.
- Ordena los puntos y traza las líneas.
- Construye el visor `trabajo/visor.html`.
- Escribe un GeoJSON por salida en `docs/datos/itinerarios/2027/`.

La primera vez crea un entorno de Python con PyMuPDF en `trabajo/venv`. Tarda unos 3 minutos.

Si OSM ha cambiado mucho, borra `trabajo/osm/` para que se descargue de nuevo.

### 4. Comprobar

- `python3 docs/datos/verificar.py` avisa si una salida se queda **sin ninguna hora publicada**: casi siempre es que se han perdido al leer el PDF. En 2026 pasó con las Vísperas, cuya hora va en una segunda línea de la celda («Salida» / «17:20»; ya lo resuelve `extraer_tablas.py`), y con las columnas de `CORREGIDAS` copiadas sin horas.

- `trabajo/generar.log`:
  - las líneas **«sin casar»** son nombres del programa que no se han encontrado en OSM y hay que añadir a `MANUAL`;
  - **«Llamador: no está»** indica que esa hermandad no se ha encontrado en el Llamador.
- `trabajo/trazado.log`: longitud de cada recorrido, medias vueltas (`½v`) y a cuántos metros del templo empieza y acaba. Si un recorrido mide más de 13 km o menos de 2 km, hay algo mal.
- `python3 -I docs/datos/recorridos/medias_vueltas.py 12`, ejecutado dentro de `trabajo/`, dice en qué calle da la media vuelta cada uno de los peores.

### 5. Revisar en el mapa (esto lo tiene que hacer una persona)

Abre `trabajo/visor.html` o publícalo. Cada recorrido muestra al lado lo que dice el programa y el Llamador.

Cuando una calle esté mal, la corrección se guarda en `revisados/NN.json` con la lista completa de pasos. Ese fichero manda sobre lo generado. Ejemplo: `revisados/11.json`, la Borriquita de 2026.

## Qué necesita Claude de ti en 2027

1. **Los dos PDF** en `docs/datos/`.
2. **Las novedades que ya sepas:** hermandades nuevas o que no salen, cambios de templo, y si la carrera oficial cambia.
3. **La revisión de los recorridos dudosos** en el visor. Basta con frases como «la Cena no va por ahí, va por X».
4. **El camino por dentro de la Catedral**, si algún día se sabe. Mientras tanto se queda en «sin dato».

## Los CSV del modelo (borrador de 2026)

`generar_csv.py` rellena los ocho CSV de `docs/datos/` a partir de lo mismo que los recorridos:

| CSV | De dónde sale |
|---|---|
| `punto_itinerario` | Solo del programa del Consejo. Cada celda de la cruz de guía o del paso es un punto. Si la celda lleva hora («Campana 15:35»), `hora_publicada = si`; si no, la hora de su fila de media hora y `no` |
| `punto_geografico` | Cada lugar de esas celdas, una vez, con el punto de la calle por donde pasan los recorridos (fuera de los cruces); además, los templos y las dos puertas de la Catedral |
| `hermandad`, `paso`, `templo` | Nombres del programa y fichas del Llamador; encima, lo rellenado a mano en `aportes/` (ver su LEEME), que manda |
| `salida_procesional`, `edicion` | Una salida por columna del programa; la edición del año |

**Sede y templo de salida.** La hermandad lleva su sede (`templo_id`). El itinerario empieza y acaba en el templo del que sale ese año, que puede ser otro (en 2026, las Cigarreras, la Hiniesta y Pasión y Muerte: `SEDE_DISTINTA`).

Se lanza dentro de `trabajo/`, después de `rehacer.sh`, y se comprueba con el comprobador:

```bash
venv/bin/python -I ../generar_csv.py programa.json ../../<llamador>.pdf osm/sevilla.json 2026 borrador_csv
python3 -I ../../verificar.py borrador_csv
```

Si da bien, se copian los CSV de `borrador_csv/` a `docs/datos/` (menos `jornada.csv`, que no cambia).

Después se enlaza cada recorrido con su salida y se cargan los datos en Supabase:

```bash
python3 -I ../enlazar_itinerarios.py ../../itinerarios/2026 ../.. 2026   # dentro de trabajo/
npm run exportar:datos -w backend                                        # en la raíz: guarda antes lo corregido en el panel
npm run cargar:datos -w backend -- --pisar                               # y carga el año nuevo encima
```

Desde el 22/10/2026 manda Supabase: lo corregido en el panel (5.3) solo está allí hasta que se exporta. Por eso se exporta primero y se sube; la carga normal se niega a pisarlo, y con `--pisar` se carga encima.

`enlazar_itinerarios.py` escribe en cada GeoJSON el `salida_procesional_id` de su salida y el nombre de la hermandad del modelo («Vera Cruz», no el «Vera+Cruz» abreviado del programa). Casa por columna del programa: las salidas de una edición van en `salida_procesional.csv` en el mismo orden. La carga vacía las tablas de Supabase y las vuelve a llenar con los CSV y los recorridos, y cuenta las filas al final.

**Para 2027 hay que adaptarlo antes de usarlo.** Hoy escribe los CSV desde cero con una sola edición. En 2027 tiene que **añadir** la edición 2027 y sus salidas e itinerarios **sin tocar los de 2026**, reutilizando los `id` de hermandades, templos y lugares que ya existen. Además:

- cambiar `FECHAS` a las fechas de 2027;
- revisar `ERRATAS`, `SEDE_DISTINTA` y `DESCARTAR`.

`plantilla_excel.py` crea el Excel para completar a mano lo que falta (`aportes/datos_pendientes_2026.xlsx`).

## Ficheros

| Fichero | Para qué |
|---|---|
| `rehacer.sh` | Hace todo el proceso, en orden |
| `descargar_osm.py`, `descargar_templos.py` | Callejero, templos y contorno de la Catedral desde OSM (Overpass) |
| `extraer_tablas.py` | Columnas de cruz de guía y paso del programa del Consejo |
| `extraer_llamador.py`, `extraer_llamador_visperas.py`, `transcribir_llamador.py` | Lo mismo para el Llamador (semana, Vísperas y columnas copiadas a mano) |
| `nombres.py` | Casa nombres abreviados («Pl. Cr. de Burgos») con nombres de OSM |
| `generar.py` | Junta cruz, paso y Llamador en una lista ordenada de puntos por hermandad |
| `trazador.py`, `trazar_todas.py` | Dibuja la línea sobre el callejero y la comprueba |
| `construir_visor.py`, `visor_plantilla.html`, `leaflet.css` | Visor para revisar en el mapa |
| `exportar.py` | Un GeoJSON limpio por salida en `docs/datos/itinerarios/<año>/` |
| `generar_csv.py` | Borrador de los ocho CSV del modelo (ver arriba) |
| `enlazar_itinerarios.py` | Escribe en cada GeoJSON el id de su salida |
| `plantilla_excel.py`, `aportes/` | Excel para completar a mano lo que falta, y lo ya completado |
| `medias_vueltas.py` | Dónde da media vuelta cada recorrido |
| `revisados/` | Recorridos corregidos a mano, que mandan sobre los generados |
| `trabajo/` | Descargas y ficheros intermedios; no se sube al repositorio |

Cartografía © colaboradores de OpenStreetMap (licencia ODbL): cualquier pantalla que la muestre debe citarlo.
