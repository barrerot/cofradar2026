# Aviso e incidencia

Explica algo que ha pasado y qué significa para el usuario.

## Qué aporta quien lo usa
- `data-tipo`: `atencion` (warn) · `critico` (alert) · `informativo` (info).
- Título (16/600) y cuerpo (14) que digan qué ha pasado y qué significa.
- Procedencia: `cofradar` («Publicado por Cofradar», trazo continuo) o `usuarios` («Información de usuarios · sin confirmar», trazo discontinuo, caduca si nadie lo corrobora).
- Acción opcional.

## Reglas
- El crítico no es descartable mientras siga activo; usa `role="alert"`. El resto `role="status"`.
- La procedencia es una propiedad del dato: nunca reputación ni juicio sobre personas.
- Plazo de caducidad: NO DEFINIDO.
