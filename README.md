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
| `docs/datos/itinerarios/2026/` | Recorrido provisional de cada salida de 2026 (un GeoJSON por salida) para desarrollar mientras sale el programa de 2027. Cómo se hacen y qué hacer en 2027: [`docs/datos/recorridos/LEEME.md`](docs/datos/recorridos/LEEME.md) |
| `backend/src/` | La API (Express). Lee los datos base de Supabase; el motor en vivo llega en la fase 4 |
| `backend/supabase/`, `backend/scripts/` | Las tablas de Supabase y el script que carga en ellas los CSV y los recorridos |
| `docs/design/pantallas/` | El export del design system: `.png` como se ve, `.html` el marcado de referencia, `.md` las notas |

## API y Supabase

Los datos base viven en **Supabase** (Postgres). La API de Express los lee con la clave secreta, que solo está en `backend/.env` (no se sube a Git; plantilla abajo). Las tablas tienen RLS sin políticas: sin esa clave no se lee nada.

```
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
SUPABASE_DB_URL=postgresql://postgres:<contraseña>@db.<proyecto>.supabase.co:5432/postgres
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

La URL y la clave **publicable** las usa también la web para entrar con Google: `vite.config.ts` las pasa al navegador, solo esas dos. La secreta y la de la base de datos nunca salen del servidor.

**Cargar o recargar los datos** después de cambiar los CSV de `docs/datos/` o los recorridos:

```bash
npm run cargar:datos -w backend
```

Crea las tablas que falten (`backend/supabase/esquema.sql`), vacía y vuelve a llenar todo en una sola transacción y cuenta las filas al final. Se puede repetir sin miedo.

**Rutas.** Las horas son las del programa, hora de Sevilla sin zona (`2026-03-29T15:35`). El `id` de una cofradía es su nombre en minúsculas y con guiones (`la-borriquita`). Todas aceptan `?anio=2026`; sin él, la última edición.

| Ruta | Devuelve |
|---|---|
| `GET /api/jornadas` | Las 11 jornadas: `id`, `nombre`, `orden`, `fecha` y cuántas `cofradias` salen |
| `GET /api/cofradias?jornada=<id>` | Las cofradías de una jornada (sin `jornada`, las 72), por hora de salida: `id`, `nombre`, `orden` (sin artículo), `jornada`, `templo`, `horaSalida`, `horaEntrada` |
| `GET /api/cofradias/:id` | La ficha: nombre oficial, web, fundación, historia, cifras, `sede`, `pasos` y la `salida` del año (templo del que sale, horario de `cruzGuia` y `ultimoPaso` por lugar, con `hora` y si está `publicada` en el programa) |
| `GET /api/cofradias/:id/recorrido` | La línea del recorrido (GeoJSON) |
| `GET /api/estado-jornada` | Estado en vivo: hoy responde `sin-motor` hasta la fase 4 |
| `GET /api/yo` | Con sesión, `{ id, email }`; sin ella, 401 |
| `GET /api/yo/relaciones` | Con sesión: `{ anio, seguidas: [id], vistas: [{ id, anio }] }` |
| `PUT` / `DELETE /api/yo/seguidas/:id` | Seguir o dejar de seguir una cofradía |
| `PUT` / `DELETE /api/yo/vistas/:id` | «La he visto» en la edición actual, o quitarlo |
| `GET /api/salud` | `{ ok: true }` |

**Entrar con Google** (Supabase Auth). La web guarda la sesión en el teléfono y la renueva sola (`frontend/src/datos/sesion.tsx`). A la API le manda el token en la cabecera `X-Sesion`, no en `Authorization`, porque en cofradar.buluu.es esa la usa la contraseña de Apache. `backend/src/sesion.ts` lo comprueba en todas las rutas; las que necesitan cuenta llevan `exigirSesion`.

Configurado fuera del código:
- **Google Cloud**, proyecto Cofradar: un cliente OAuth «Cofradar web» con
  - orígenes `https://cofradar.buluu.es` y `http://localhost:5173`;
  - redirección `https://<proyecto>.supabase.co/auth/v1/callback`.

  Está «en pruebas», así que solo entran los usuarios de prueba que se añadan allí.
- **Supabase**, Authentication:
  - Google activado con ese cliente;
  - Site URL `https://cofradar.buluu.es`;
  - Redirect URLs `https://cofradar.buluu.es/**` y `http://localhost:5173/**`.

## Publicar

**Versión de desarrollo: https://cofradar.buluu.es**, en el VPS de dev.buluu.es (91.107.207.230). Un solo proceso de Node sirve la web y la API en `127.0.0.1:3010` y Apache le reenvía las visitas, con certificado de Let's Encrypt y usuario y contraseña mientras está en desarrollo. Todo está en `despliegue/`:

```bash
despliegue/publicar.sh            # compila y reinicia (tras cada cambio)
despliegue/publicar.sh --arrancar # solo arranca; lo lanza el crontab de dev al reiniciar el VPS
```

Registro en `~/.cofradar/web.log` del usuario `dev`. El sitio de Apache es `despliegue/cofradar.buluu.es.conf` (la parte https la añadió certbot) y la contraseña, `despliegue/cofradar-acceso.conf`.

### En otro servidor


```bash
npm run build --workspace=frontend          # URL limpias: /cofradias
rsync -av --delete frontend/dist/ usuario@servidor:/ruta/public_html/
```

El build del frontend es estático, pero **pide los datos a la API en `/api`
del mismo dominio** (la jornada de la cabecera ya sale de ahí). En el servidor
tiene que haber, por tanto, la API de Express (`npm run build -w backend` y
`npm start -w backend`, con su `backend/.env`) y una regla que mande `/api` a
ella. Sin API la app abre igual, con lo último que guardó en el teléfono y el
aviso «Sin conexión». El `.htaccess` con la regla de reescritura que necesitan
las rutas viaja dentro de `frontend/public/`.

**App instalable (PWA).** `frontend/public/` lleva el manifiesto, los iconos y
el service worker (`sw.js`), que guarda la app para que abra sin conexión; los
datos los guarda la propia app con su hora. Solo se registra en el build de
producción. Los iconos salen del logotipo D
(`docs/design/intro_logos/cofradar-logotipo-d/iconos/`), copiados tal cual.

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

El modelo de datos son ocho entidades, una por CSV, descritas con su diagrama en [`docs/datos/MODELO.md`](docs/datos/MODELO.md). Allí está también el concepto del **GPS social** (cómo se validarán las aportaciones de «Dar fe» contra el itinerario), en diseño y sin implementar.

| Archivo | Qué contiene |
|---|---|
| `punto_geografico.csv` | Cada lugar del horario, una sola vez, con su punto representativo; su trazado va aparte, en `punto_geografico.geojson` (pendiente, BUL-168) |
| `templo.csv` | Los templos, cada uno sobre su punto geográfico |
| `hermandad.csv` | Lo que no cambia de un año a otro: nombres, templo, hermanos, nazarenos |
| `paso.csv` | Los pasos de cada hermandad, en el orden del cortejo |
| `edicion.csv` | El año |
| `jornada.csv` | Las once jornadas, de Viernes de Dolores a Domingo de Resurrección |
| `salida_procesional.csv` | Una hermandad en una jornada de un año, con su estado |
| `punto_itinerario.csv` | La transcripción: por qué punto pasan la cruz de guía y el último paso, y cuándo |
