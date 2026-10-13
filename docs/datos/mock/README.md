# Fixture canónico de la Madrugá · datos inventados

> **Nada de esta carpeta es transcripción real.** Todas las horas, el estado de la
> jornada y los recorridos son **inventados**. Están aquí para diseñar y para
> poblar los fixtures de desarrollo, nunca para informar a nadie.
>
> La transcripción real vive en `docs/datos/`, un nivel por encima. **No se mezclan.**

Linear: nació en [B-01 · BUL-122](https://linear.app/buluu/issue/BUL-122) (proyecto Cofradar_bak) y se alineó con el PRD revisado en [BUL-166](https://linear.app/buluu/issue/BUL-166). Es la **fuente única
de datos de los prompts de diseño**: ningún prompt de diseño se inventa nombres, horas,
templos ni puntos. Si algo cambia aquí, hay que propagarlo a los issues que lo repiten.

## Qué es real y qué no

| | |
|---|---|
| **Real** | Las seis hermandades de la Madrugá, sus denominaciones, sus nombres populares, sus templos y los titulares de sus pasos (`revisado: no` hasta contrastarlos con la fuente). Los nueve hitos del centro y sus coordenadas. |
| **Real** | La séptima fila, **La Soledad de San Lorenzo**: Sábado Santo, **un solo paso de palio**, parroquia de San Lorenzo Mártir. Verificado contra la web de la hermandad y Wikipedia. `revisado: si`. |
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
| `cofradia_elementos.csv` | **Qué elementos tiene cada hermandad**, en el orden del cortejo, con el **titular** de cada paso. Todos se localizan en el mapa. La taxonomía es configurable, no universal |
| `puntos_control.csv` | Nueve hitos con coordenadas reales + los seis templos, para que salida y entrada sean puntos referenciables |
| `horarios.csv` | 106 filas: itinerario programado de la **cruz de guía y el palio** por cofradía × punto, como el horario del Consejo. El paso de Cristo no tiene horas: se interpola |
| `jornada.csv` | La jornada, la hora de referencia (02:40) y el contexto activo (`lluvia`) |
| `estado_jornada.csv` | El corazón del fixture: fase, confianza, **qué elemento ancla la observación**, alteraciones, próximo punto y relación del usuario |
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

**3 · La configuración de elementos no es universal, y por eso hay una séptima fila.**
Las seis de la Madrugá llevan **dos pasos cada una**, que es la verdad, así que entre
ellas no hay forma de ejercitar una hermandad de un solo paso sin falsear un dato real.
Por eso `cofradias.csv` trae a **La Soledad de San Lorenzo**, de Sábado Santo, **solo
con su configuración**: sin horas, sin itinerario y sin estado. Existe para que
`cofradia_elementos.csv` tenga que variar de verdad, y el verificador falla si todas
las hermandades acaban teniendo el mismo número de elementos localizables.

Su dato está **verificado como los otros seis**: Hermandad Sacramental de la Soledad,
parroquia de **San Lorenzo Mártir**, **Sábado Santo** desde 1956 —cierra el día— y **un
solo paso**, el palio de Nuestra Señora de la Soledad, que en 1614 fue el primero de
Sevilla en salir bajo palio. Fuentes: la web de la propia hermandad
(`hermandaddelasoledad.org`) y su artículo en Wikipedia. La coordenada de su templo es
la de la **Plaza de San Lorenzo**, que comparte con la Basílica del Gran Poder.

**4 · El final del cortejo no es un elemento, y el horario solo trae dos.**
Desde la revisión del PRD (D35) el final no está en la taxonomía, ni en ninguna hermandad,
ni en el selector de «Dar fe»: en la calle no se destaca como tal. Y `horarios.csv` trae,
como el horario del Consejo, **solo la cruz de guía y el último paso**; el paso de Cristo
se sitúa interpolando entre ambos y queda estimado hasta que alguien da fe de él. El
verificador falla si reaparece el final o si el horario trae un paso intermedio.

**5 · Qué elemento ancla cada observación.**
`elemento_observado` es nuevo y es lo que decide qué marca va confirmada. Las seis filas
recorren todos los casos: la cruz de guía (La Macarena), **el palio y no la cabeza**
(El Silencio y El Calvario, a su entrada), el paso de Cristo (Esperanza de Triana), y **dos
sin elemento** — El Gran Poder porque nadie ha dado fe, Los Gitanos porque la aportación
fue genérica, que da presencia y fase pero **ningún anclaje de posición**. El verificador
exige que un segmento `confirmado` tenga detrás un elemento observado.

**6 · Dos cofradías no tienen segmento, y tiene que seguir siendo así.**
Los Gitanos están `inminente`: todavía no ocupan calle. El Calvario está `finalizada`:
ya no la ocupa. Un mapa que les dibuje una línea está mal.

## Un dato que se deriva, no se almacena

**El progreso espacial del recorrido sale de `segmentos.geojson` + `itinerarios/`**, proyectando la cabeza del segmento sobre la línea y dividiendo por su longitud total. Para La Macarena a las 02:40 son **1.396 m de 2.172 m, el 64 %**. La cabeza es la **cruz de guía**, así que la cifra no cambia con D34.

**Lo que sí cambia de significado es la cola.** El tramo ocupado va ahora de la cruz de
guía **al último paso localizado**, no al final del cortejo (D34). La geometría de
`segmentos.geojson` no se ha tocado: lo que cambia es que su extremo trasero **es el
palio**. El cortejo continúa más allá y el tramo no afirma lo contrario.

**No se calcula con el tiempo transcurrido.** Entre su salida (00:05) y su entrada (13:25) han pasado 155 de 800 minutos, un 19 %, y ese número **no dice nada del recorrido**: una cofradía con retraso avanza menos de lo que el reloj sugiere, y el regreso no ocupa el mismo espacio que la ida. Presentar una interpolación temporal como progreso espacial es afirmar algo que el dato no sostiene.

Salvedad del mock: el itinerario de esta carpeta es **de ida**, de la basílica a la Catedral, así que el 64 % es de ese trazado y no del recorrido completo de vuelta.

## Verificar

```sh
python3 docs/datos/mock/verificar.py
```

Comprueba la coherencia entre horarios y estado, que las divergencias tengan una
alteración que las justifique, que `desactualizado` lleve siempre su última
observación, que haya segmento si y solo si la cofradía ocupa calle, y que **ninguna
fila pueda afirmar `cancelada` ni `no_procesiona`** — esos dos estados solo los activa
administración, nunca una aportación ni un fixture.
