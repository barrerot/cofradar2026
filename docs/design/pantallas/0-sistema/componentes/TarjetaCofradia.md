# Tarjeta de cofradía

Presenta una cofradía con doble ancla —nombre a la izquierda, estado a la derecha— y la línea de decisión: próximo punto relevante + hora.

## Qué aporta quien lo usa
- Nombre popular (hasta dos líneas antes de elipsis; nunca se corta a media palabra).
- Chip de estado (fase + confianza). Marca de relación opcional en la ranura que abre el bloque de identidad (delante del nombre, o anclada al escudo).
- Alteraciones (0..n), ordenadas por gravedad.
- Línea de decisión: punto + hora (≈ si es estimada).
- Proximidad opcional: solo si hay ubicación. Sin ubicación no se renderiza nada (ni aviso, ni hueco).
- Acción: «Dar fe» en `en_calle` y `proxima_entrada`; ninguna en `prevista`, `finalizada`, `cancelada`, `no_procesiona`; `inminente` NO DEFINIDO (no se dibuja).
- `data-densidad`: `compacta` · `estandar` · `expandida`.

## Densidades
- **Compacta**: nombre + estado (chip 24) + una línea de datos. Alteraciones múltiples → la más grave + «+N».
- **Estándar**: + alteraciones + proximidad + acción.
- **Expandida**: + progreso de recorrido (observado continuo, previsto discontinuo) + próximos hitos.

## Reglas
- El chip va siempre arriba a la derecha, en el mismo punto.
- Sin fotografía. Escudo opcional.
- La marca de relación nunca va junto al chip.
