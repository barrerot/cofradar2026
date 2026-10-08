# Chip de estado

Muestra la fase de una cofradía (uno y solo uno de los siete estados canónicos) y la confianza del dato. Es estático: no es un botón.

## Qué aporta quien lo usa
- `data-fase`: `prevista` · `inminente` · `en_calle` · `proxima_entrada` · `finalizada` · `cancelada` · `no_procesiona`.
- `data-confianza`: `confirmado` · `estimado` · `desactualizado`. Para `prevista`, `cancelada` y `no_procesiona` solo `confirmado`.
- Para `desactualizado`, la antigüedad («hace 23 min»).
- `data-size="24"` para el tamaño pequeño; por defecto 28. Son alturas BASE.
- `data-abrev="si"` cuando no cabe: muestra la etiqueta abreviada de la fase (solo «En calle» está definida) y conserva la completa para lectores de pantalla.

## Cuando no cabe
1. La coletilla de confianza y frescura no se abrevia ni se suprime nunca.
2. Se abrevia la etiqueta de la fase («En la calle» → «En calle»).
3. Si aún no cabe, el chip crece a dos líneas (nunca se trunca a media palabra).
4. La posición del chip no se mueve: nombre y estado empiezan a la misma altura.

## Anatomía
Contorno SVG (`.cf-outline`) con trazo 1,5px en el color base (`--cf-<estado>`): continuo si confirmado, `--cf-dash-pattern` si estimado o desactualizado. Icono 16 bold en el color base. Texto en `--cf-<estado>-text`. Coletilla en `--cf-text-secondary`.

## Reglas
- Nunca fusionar, reinterpretar ni crear fases. «No realiza estación · según horario» no existe.
- La confianza nunca va solo en el trazo: estimado añade «· según horario»; desactualizado añade el icono de desfase y «· hace N min».
- En la calle nunca se representa con un pin.
- Familias: `en_calle` live · `inminente` y `proxima_entrada` warn (los dos umbrales del recorrido) · `prevista`, `finalizada`, `no_procesiona` idle · `cancelada` alert.
- Iconos de fase: Phosphor, provisionales.
