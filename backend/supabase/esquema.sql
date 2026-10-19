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
