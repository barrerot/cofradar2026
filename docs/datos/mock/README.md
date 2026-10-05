# Fixture canónico de la Madrugá · datos inventados

> **Nada de esta carpeta es transcripción real.** Todas las horas, el estado de la
> jornada y los recorridos son **inventados**. Están aquí para diseñar y para
> poblar los fixtures de desarrollo, nunca para informar a nadie.
>
> La transcripción real vive en `docs/datos/`, un nivel por encima. **No se mezclan.**

Linear: [B-01 · BUL-122](https://linear.app/buluu/issue/BUL-122). Es la **fuente única
de datos del milestone Diseño**: ningún prompt de diseño se inventa nombres, horas,
templos ni puntos. Si algo cambia aquí, hay que propagarlo a los issues que lo repiten.

## Qué es real y qué no

| | |
|---|---|
| **Real** | Las seis hermandades de la Madrugá, sus denominaciones, sus nombres populares y sus templos. Los nueve hitos del centro y sus coordenadas. |
| **Aproximado** | Los recorridos: siguen calles reales y van en el sentido de la marcha, pero no son el itinerario oficial. |
| **Inventado a propósito** | Todas las horas y todo el estado de las 02:40. |

El estado está fabricado para que **cada fila ejercite un caso distinto** — fase
confirmada, estimada y desactualizada seguidas; dos alteraciones simultáneas; una
finalizada con alteración en el histórico; una inminente sin segmento. Una jornada
real normal no te daría todos esos casos a la vez, y son los que más fácil es
diseñar mal.

## Los ficheros

| Fichero | Qué contiene |
|---|---|
| `cofradias.csv` | Las seis, con denominación completa y `nombre_popular` como **columnas separadas** |
| `elementos.csv` | La taxonomía de elementos de Sevilla, con su orden en el cortejo y su descripción en llano |
| `puntos_control.csv` | Nueve hitos con coordenadas reales + los seis templos, para que salida y entrada sean puntos referenciables |
| `horarios.csv` | 212 filas: itinerario programado por cofradía × elemento × punto |
| `jornada.csv` | La jornada, la hora de referencia (02:40) y el contexto activo (`lluvia`) |
| `estado_jornada.csv` | El corazón del fixture: fase, confianza, alteraciones, próximo punto y relación del usuario |
| `itinerarios/*.geojson` | Un recorrido completo por hermandad |
| `segmentos.geojson` | Los **cuatro** segmentos ocupados a las 02:40 |
| `verificar.py` | Comprueba que todo lo anterior no se contradice |

## Tres cosas que el fixture enseña, y conviene no «arreglar»

**1 · El próximo punto no es el siguiente hito, es el siguiente hito defendible.**
El Silencio, por horario, está pasando ahora mismo por la Plaza de San Francisco. Pero
su última observación es de hace 23 minutos, así que Cofradar no ofrece un punto que
está ocurriendo en este instante: ofrece la Catedral a las 03:10, que todavía puede
sostener. Al Gran Poder le pasa lo mismo con la Campana a dos minutos. **La prudencia
es una regla del producto, no un hueco del mock.**

**2 · El estado puede divergir del horario, y eso es información.**
El próximo punto de la Esperanza de Triana está a +88 minutos de su itinerario
programado. No es un error: es lo que significa `cambio_recorrido`. Igual que El Calvario
entró a las 02:30 cuando su entrada programada eran las 04:10 — eso es
`regreso_anticipado`. El verificador solo acepta estas divergencias **si hay una
alteración que las explique**.

**3 · Dos cofradías no tienen segmento, y tiene que seguir siendo así.**
Los Gitanos están `inminente`: todavía no ocupan calle. El Calvario está `finalizada`:
ya no la ocupa. Un mapa que les dibuje una línea está mal.

## Verificar

```sh
python3 docs/datos/mock/verificar.py
```

Comprueba la coherencia entre horarios y estado, que las divergencias tengan una
alteración que las justifique, que `desactualizado` lleve siempre su última
observación, que haya segmento si y solo si la cofradía ocupa calle, y que **ninguna
fila pueda afirmar `cancelada` ni `no_procesiona`** — esos dos estados solo los activa
administración, nunca una aportación ni un fixture.
