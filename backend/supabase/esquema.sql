-- Tablas de los datos base de Cofradar en Supabase (Postgres).
-- Son las ocho entidades de docs/datos/MODELO.md, con los mismos nombres y columnas, y `recorrido`,
-- la línea de cada salida (docs/datos/itinerarios/<año>/).
-- Se puede ejecutar las veces que haga falta: solo crea lo que no existe. Los datos los carga
-- `npm run cargar:datos -w backend` (scripts/cargar-supabase.ts).
--
-- Seguridad: RLS activado y sin políticas. Nadie lee estas tablas con la clave pública;
-- solo el servidor Express, con la clave secreta o la conexión directa.

create table if not exists punto_geografico (
  id        integer primary key,
  nombre    text not null,
  tipo      text not null check (tipo in ('calle', 'plaza', 'templo', 'puente', 'otro')),
  latitud   numeric(8, 5),
  longitud  numeric(8, 5)
);

create table if not exists templo (
  id                   integer primary key,
  nombre               text not null,
  direccion            text,
  punto_geografico_id  integer not null references punto_geografico (id)
);

create table if not exists hermandad (
  id                integer primary key,
  nombre            text not null,
  nombre_oficial    text not null,
  templo_id         integer not null references templo (id),
  escudo            text,
  web               text,
  historia          text,
  fundacion         text,
  numero_hermanos   integer,
  numero_nazarenos  integer,
  duracion_cortejo  integer
);

-- Los tipos de elemento del cortejo (5.4, aprobada por Carlos el 22/10/2026): «Cruz de guía · La cruz que
-- abre el cortejo», «Palio · El paso de la Virgen». `clave` marca los que la app necesita reconocer
-- ('cruz_guia'). Se corrigen en el panel (Taxonomías) y se exportan a docs/datos/elemento.csv.
create table if not exists elemento (
  id      integer primary key,
  nombre  text not null,
  llano   text not null,
  orden   integer not null,
  clave   text unique
);

-- Los lugares de la ciudad que importan, en orden (5.4, aprobada el 22/10/2026): la carrera oficial
-- (La Campana… Catedral) y otros como la Plaza del Duque. Antes estaban escritos en el código.
create table if not exists hito (
  id                   integer primary key,
  punto_geografico_id  integer not null unique references punto_geografico (id),
  orden                integer not null,
  carrera_oficial      boolean not null default false
);

create table if not exists paso (
  id            integer primary key,
  hermandad_id  integer not null references hermandad (id),
  nombre        text not null,
  orden         integer not null,
  autor         text,
  capataz       text,
  musica        text,
  fotografia    text,
  unique (hermandad_id, orden)
);

create table if not exists edicion (
  id    integer primary key,
  anio  integer not null unique
);

create table if not exists jornada (
  id      integer primary key,
  nombre  text not null,
  orden   integer not null unique
);

create table if not exists salida_procesional (
  id            integer primary key,
  hermandad_id  integer not null references hermandad (id),
  edicion_id    integer not null references edicion (id),
  jornada_id    integer not null references jornada (id),
  estado        text
);

-- fecha_hora es la hora de Sevilla tal como la da el programa ('2026-04-03T02:30'), sin zona horaria.
create table if not exists punto_itinerario (
  id                     integer primary key,
  salida_procesional_id  integer not null references salida_procesional (id),
  punto_geografico_id    integer not null references punto_geografico (id),
  referencia             text not null check (referencia in ('cruz_guia', 'ultimo_paso')),
  fecha_hora             timestamp not null,
  hora_publicada         boolean not null,
  orden                  integer not null
);

-- Una línea continua, ordenada y orientada por salida: el GeoJSON entero de docs/datos/itinerarios/<año>/.
create table if not exists recorrido (
  salida_procesional_id  integer primary key references salida_procesional (id),
  geojson                jsonb not null,
  metros                 integer,
  provisional            boolean not null default true
);

-- De qué tipo es cada paso (5.4): misterio, palio… Vacío mientras no se sepa.
alter table paso add column if not exists elemento_id integer references elemento (id);

create index if not exists paso_hermandad on paso (hermandad_id);
create index if not exists salida_jornada on salida_procesional (edicion_id, jornada_id);
create index if not exists salida_hermandad on salida_procesional (hermandad_id);
create index if not exists itinerario_salida on punto_itinerario (salida_procesional_id, referencia, orden);

alter table punto_geografico   enable row level security;
alter table templo             enable row level security;
alter table hermandad          enable row level security;
alter table paso               enable row level security;
alter table edicion            enable row level security;
alter table jornada            enable row level security;
alter table salida_procesional enable row level security;
alter table punto_itinerario   enable row level security;
alter table recorrido          enable row level security;
alter table elemento           enable row level security;
alter table hito               enable row level security;

-- ── Lo personal de cada cuenta (decisión del 20/10/2026: seguir y marcar vista piden cuenta) ──
-- No son datos base: la carga (cargar-supabase.ts) no las toca nunca. Por eso NO llevan clave ajena a
-- `hermandad`: la carga vacía y vuelve a llenar las tablas base, y con la clave lo impediría (o, en
-- cascada, borraría lo de todos). `hermandad_id` es el id del CSV, que no cambia al recargar.
-- Al borrar la cuenta en Supabase Auth se borra todo lo suyo (on delete cascade).

-- Las cofradías que sigue cada persona
create table if not exists seguida (
  usuario_id    uuid not null references auth.users (id) on delete cascade,
  hermandad_id  integer not null,
  creada        timestamptz not null default now(),
  primary key (usuario_id, hermandad_id)
);

-- Las que ha visto, por año: Mi colección (P-21) junta las de todos los años
create table if not exists vista (
  usuario_id    uuid not null references auth.users (id) on delete cascade,
  hermandad_id  integer not null,
  anio          integer not null,
  creada        timestamptz not null default now(),
  primary key (usuario_id, hermandad_id, anio)
);

alter table seguida enable row level security;
alter table vista   enable row level security;

-- ── Las aportaciones de «Dar fe» (aprobada por Carlos el 21/10/2026; MODELO.md, «Abierto», 7) ──
-- Una fila por cada vez que alguien da fe. Guarda por separado el REGISTRO PERSONAL (quién, qué, cuándo,
-- desde dónde, y sus puntos base, que no cambian nunca) y el VALOR COLABORATIVO que le da el motor
-- (`resultado` y `bonus`), que se calcula después y nunca se enseña como «rechazada».
-- Como `seguida` y `vista`: sin clave ajena a `hermandad` y borrada con la cuenta.
create table if not exists aportacion (
  id            uuid primary key default gen_random_uuid(),
  usuario_id    uuid not null references auth.users (id) on delete cascade,
  -- El id que le pone el teléfono: si la reenvía (sin conexión, reintentos), no se duplica
  cliente_id    text not null,
  hermandad_id  integer not null,
  -- 0 la cruz de guía, 1..3 los pasos en el orden del cortejo; null es «Estoy viendo la cofradía»
  elemento      smallint check (elemento between 0 and 3),
  -- Dónde estaba quien dio fe, si el teléfono lo sabía, y con qué precisión (metros)
  latitud       numeric(8, 5),
  longitud      numeric(8, 5),
  precision_m   integer,
  -- Cuándo lo vio (lo dice el teléfono, no se da por fiable sin más) y cuándo llegó aquí
  observada     timestamptz not null,
  recibida      timestamptz not null default now(),
  -- Los cuatro controles del momento (BUL-186): si los supera, puntos base
  plausible     boolean not null,
  puntos_base   integer not null default 0,
  -- Lo que hizo el motor con ella: consolidada, sin_resolver, contradicha o fuera_del_calculo
  resultado     text,
  bonus         integer not null default 0,
  -- Hecha con el reloj de prueba (?ahora=): se borra antes del lanzamiento
  de_prueba     boolean not null default false,
  unique (usuario_id, cliente_id)
);

create index if not exists aportacion_hermandad on aportacion (hermandad_id, observada);
create index if not exists aportacion_usuario on aportacion (usuario_id, observada);

alter table aportacion enable row level security;

-- ── El registro del panel de administración (aprobada por Carlos el 22/10/2026; 5.2, F-39, F-40) ──
-- Las excepciones que el motor no puede deducir, una fila por cada cosa que se publica desde el panel:
--   aviso_jornada       afecta a toda la jornada; `clase` 'lluvia' u 'otro'          («Lluvia · Las hermandades están valorando su salida»)
--   incidencia          de una cofradía, en texto                                  («La Macarena · El palio vuelve a su templo por la Campana»)
--   cancelada           una cofradía que no sale; `texto` es la nota               («Los Gitanos · decisión del cabildo por la lluvia»)
--   retirar_alteracion  esconde una alteración que publicó el motor; `clase` es su tipo, `detalle` como se
--                       veía («Retraso 12 min») y `texto` el motivo
-- Nada se borra: retirar es rellenar `retirada`, con quién y por qué. Va aparte de `salida_procesional`
-- porque la carga de los CSV vacía las tablas base, y porque así queda quién lo hizo y cuándo.
-- Sin clave ajena a `hermandad` (como `aportacion`). Al borrar la cuenta de quien publicó, la fila se
-- queda (es el histórico del día) y conserva el correo.
create table if not exists registro_panel (
  id               uuid primary key default gen_random_uuid(),
  anio             integer not null,
  jornada_id       integer not null,
  tipo             text not null check (tipo in ('aviso_jornada', 'incidencia', 'cancelada', 'retirar_alteracion')),
  hermandad_id     integer,
  clase            text,
  detalle          text,
  texto            text not null check (length(trim(texto)) > 0),
  autor_id         uuid references auth.users (id) on delete set null,
  autor_email      text not null,
  creada           timestamptz not null default now(),
  retirada         timestamptz,
  retirada_email   text,
  retirada_motivo  text,
  -- Hecha con el reloj de prueba: se borra antes del lanzamiento (como en `aportacion`)
  de_prueba        boolean not null default false,
  check (tipo = 'aviso_jornada' or hermandad_id is not null),
  check ((retirada is null) = (retirada_motivo is null))
);

create index if not exists registro_panel_jornada on registro_panel (anio, jornada_id, creada);

alter table registro_panel enable row level security;
