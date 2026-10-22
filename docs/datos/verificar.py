#!/usr/bin/env python3
"""Comprueba los CSV de datos reales de docs/datos/ contra el modelo de MODELO.md.

Se usa mientras se rellenan: dice archivo, fila y columna de cada problema.
Los errores rompen el modelo (un id repetido, una relación a una fila que no
existe, un formato mal escrito). Los avisos son cosas que conviene mirar,
como dos puntos geográficos que parecen el mismo lugar escrito de dos formas.

Uso:
    python3 docs/datos/verificar.py            # comprueba docs/datos/
    python3 docs/datos/verificar.py <carpeta>  # comprueba otra carpeta
"""
import csv, os, re, sys, unicodedata
from datetime import datetime

BASE = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))

# Columnas de cada tabla, en el orden de MODELO.md
TABLAS = {
    "punto_geografico": ["id", "nombre", "tipo", "latitud", "longitud"],
    "hito": ["id", "punto_geografico_id", "orden", "carrera_oficial"],
    "templo": ["id", "nombre", "direccion", "punto_geografico_id"],
    "hermandad": ["id", "nombre", "nombre_oficial", "templo_id", "escudo", "web", "historia",
                  "fundacion", "numero_hermanos", "numero_nazarenos", "duracion_cortejo"],
    "elemento": ["id", "nombre", "llano", "orden", "clave"],
    "paso": ["id", "hermandad_id", "nombre", "orden", "autor", "capataz", "musica", "fotografia", "elemento_id"],
    "edicion": ["id", "anio"],
    "jornada": ["id", "nombre", "orden"],
    "salida_procesional": ["id", "hermandad_id", "edicion_id", "jornada_id", "estado"],
    "punto_itinerario": ["id", "salida_procesional_id", "punto_geografico_id", "referencia",
                         "fecha_hora", "hora_publicada", "orden"],
}
# columna -> tabla a la que apunta
RELACIONES = {
    "templo": {"punto_geografico_id": "punto_geografico"},
    "hermandad": {"templo_id": "templo"},
    "hito": {"punto_geografico_id": "punto_geografico"},
    "paso": {"hermandad_id": "hermandad", "elemento_id": "elemento"},
    "salida_procesional": {"hermandad_id": "hermandad", "edicion_id": "edicion", "jornada_id": "jornada"},
    "punto_itinerario": {"salida_procesional_id": "salida_procesional",
                         "punto_geografico_id": "punto_geografico"},
}
OBLIGATORIAS = {
    "punto_geografico": ["nombre", "tipo"],
    "templo": ["nombre", "punto_geografico_id"],
    "hermandad": ["nombre", "nombre_oficial", "templo_id"],
    "hito": ["punto_geografico_id", "orden", "carrera_oficial"],
    "elemento": ["nombre", "llano", "orden"],
    "paso": ["hermandad_id", "nombre", "orden"],
    "edicion": ["anio"],
    "jornada": ["nombre", "orden"],
    "salida_procesional": ["hermandad_id", "edicion_id", "jornada_id"],
    "punto_itinerario": ["salida_procesional_id", "punto_geografico_id", "referencia",
                         "fecha_hora", "hora_publicada", "orden"],
}
ENTEROS = {
    "hermandad": ["numero_hermanos", "numero_nazarenos", "duracion_cortejo"],
    "paso": ["orden"], "hito": ["orden"], "elemento": ["orden"], "edicion": ["anio"], "jornada": ["orden"], "punto_itinerario": ["orden"],
}
VALORES = {
    ("punto_geografico", "tipo"): {"calle", "plaza", "templo", "puente", "otro"},
    ("punto_itinerario", "referencia"): {"cruz_guia", "ultimo_paso"},
    ("punto_itinerario", "hora_publicada"): {"si", "no"},
    ("hito", "carrera_oficial"): {"si", "no"},
}
# Caja amplia alrededor de Sevilla capital
LAT, LON = (37.30, 37.45), (-6.06, -5.86)   # hasta Torreblanca, por el este

errores, avisos = [], []
def error(t, fila, col, msg): errores.append("%s.csv:%s: %s: %s" % (t, fila, col, msg))
def aviso(t, fila, col, msg): avisos.append("%s.csv:%s: %s: %s" % (t, fila, col, msg))

def es_entero(v): return re.fullmatch(r"-?\d+", v) is not None

def normalizar(nombre):
    """«La Campana», «Campana» y «calle Campana» dan lo mismo."""
    s = unicodedata.normalize("NFD", nombre.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^\w\s]", " ", s)
    palabras = [p for p in s.split() if p not in {"la", "el", "los", "las", "de", "del", "calle", "c"}]
    return " ".join(palabras)

# --- leer: cabecera exacta y filas con su número de línea ---
datos = {}
for t, columnas in TABLAS.items():
    ruta = os.path.join(BASE, t + ".csv")
    if not os.path.exists(ruta):
        error(t, "-", "archivo", "no existe")
        datos[t] = []
        continue
    with open(ruta, newline="", encoding="utf-8") as f:
        lector = csv.DictReader(f)
        if lector.fieldnames != columnas:
            error(t, 1, "cabecera", "debe ser %s" % ",".join(columnas))
        datos[t] = [(n, {k: (v or "").strip() for k, v in fila.items() if k}) for n, fila in enumerate(lector, start=2)]

# --- por tabla: id, obligatorias, enteros y valores permitidos ---
ids = {}
for t, filas in datos.items():
    vistos = {}
    for n, r in filas:
        i = r.get("id", "")
        if not es_entero(i):
            error(t, n, "id", "«%s» no es un número entero" % i)
        elif i in vistos:
            error(t, n, "id", "%s repetido (ya está en la fila %d)" % (i, vistos[i]))
        else:
            vistos[i] = n
        for c in OBLIGATORIAS[t]:
            if not r.get(c):
                error(t, n, c, "vacío")
        for c in ENTEROS.get(t, []):
            if r.get(c) and not es_entero(r[c]):
                error(t, n, c, "«%s» no es un número entero" % r[c])
        for (tv, c), validos in VALORES.items():
            if tv == t and r.get(c) and r[c] not in validos:
                error(t, n, c, "«%s» no vale; usa %s" % (r[c], ", ".join(sorted(validos))))
    ids[t] = vistos

# --- relaciones: cada *_id apunta a una fila que existe ---
for t, rel in RELACIONES.items():
    for n, r in datos[t]:
        for c, destino in rel.items():
            if r.get(c) and r[c] not in ids[destino]:
                error(t, n, c, "%s no está en %s.csv" % (r[c], destino))

# --- punto geográfico: coordenadas y nombres repetidos ---
sin_coordenadas = 0
por_nombre = {}
for n, r in datos["punto_geografico"]:
    lat, lon = r.get("latitud", ""), r.get("longitud", "")
    if not lat and not lon:
        sin_coordenadas += 1
    elif not lat or not lon:
        error("punto_geografico", n, "latitud/longitud", "hay una y falta la otra")
    else:
        try:
            la, lo = float(lat), float(lon)
            if not (LAT[0] <= la <= LAT[1] and LON[0] <= lo <= LON[1]):
                error("punto_geografico", n, "latitud/longitud", "%s, %s cae fuera de Sevilla" % (lat, lon))
        except ValueError:
            error("punto_geografico", n, "latitud/longitud", "«%s, %s» no son números" % (lat, lon))
    clave = normalizar(r.get("nombre", ""))
    if clave in por_nombre:
        aviso("punto_geografico", n, "nombre",
              "«%s» parece el mismo lugar que la fila %d («%s»)" % (r["nombre"], *por_nombre[clave]))
    elif clave:
        por_nombre[clave] = (n, r["nombre"])

# --- templo: su punto debería ser de tipo templo ---
tipo_punto = {r["id"]: r.get("tipo") for _, r in datos["punto_geografico"]}
for n, r in datos["templo"]:
    if tipo_punto.get(r.get("punto_geografico_id")) not in (None, "templo"):
        aviso("templo", n, "punto_geografico_id", "el punto %s no es de tipo templo" % r["punto_geografico_id"])

# --- paso: orden sin repetir dentro de la hermandad, de 1 a 3 pasos ---
pasos = {}
for n, r in datos["paso"]:
    clave = (r.get("hermandad_id"), r.get("orden"))
    if clave in pasos:
        error("paso", n, "orden", "la hermandad %s ya tiene un paso con orden %s (fila %d)" % (clave[0], clave[1], pasos[clave]))
    pasos[clave] = n
cuantos = {}
for h, _ in pasos:
    cuantos[h] = cuantos.get(h, 0) + 1
for n, r in datos["hermandad"]:
    if cuantos.get(r["id"], 0) > 3:
        aviso("hermandad", n, "id", "%s tiene %d pasos; lo normal es de 1 a 3" % (r["id"], cuantos[r["id"]]))

# --- salida: una por hermandad y año ---
salidas = {}
for n, r in datos["salida_procesional"]:
    clave = (r.get("hermandad_id"), r.get("edicion_id"))
    if clave in salidas:
        aviso("salida_procesional", n, "hermandad_id",
              "la hermandad %s ya tiene salida en la edición %s (fila %d)" % (clave[0], clave[1], salidas[clave]))
    salidas[clave] = n

# --- punto de itinerario: formato de fecha y horas que avanzan con el orden ---
serie = {}
for n, r in datos["punto_itinerario"]:
    fh = r.get("fecha_hora", "")
    if fh:
        try:
            momento = datetime.strptime(fh, "%Y-%m-%dT%H:%M")
        except ValueError:
            error("punto_itinerario", n, "fecha_hora", "«%s» debe ser AAAA-MM-DDTHH:MM" % fh)
            continue
        if es_entero(r.get("orden", "")):
            serie.setdefault((r["salida_procesional_id"], r["referencia"]), []).append((int(r["orden"]), momento, n))
for (salida, ref), puntos in serie.items():
    puntos.sort()
    for (o1, m1, n1), (o2, m2, n2) in zip(puntos, puntos[1:]):
        if o1 == o2:
            error("punto_itinerario", n2, "orden", "salida %s, %s: orden %d repetido (fila %d)" % (salida, ref, o2, n1))
        elif m2 < m1:
            error("punto_itinerario", n2, "fecha_hora",
                  "salida %s, %s: el orden %d va a las %s, antes que el %d (%s); ¿falta cambiar el día tras la medianoche?"
                  % (salida, ref, o2, m2.strftime("%d %H:%M"), o1, m1.strftime("%d %H:%M")))

# --- toda salida trae al menos su hora de salida escrita en el programa ---
# Si ninguna hora de una salida es «si», casi seguro que la extracción del PDF las ha perdido (pasó en 2026
# con las Vísperas y con las columnas copiadas a mano: ver CORREGIDAS en recorridos/generar.py).
publicadas = {}
for n, r in datos["punto_itinerario"]:
    sid = r.get("salida_procesional_id")
    publicadas[sid] = publicadas.get(sid, False) or r.get("hora_publicada") == "si"
for n, r in datos["salida_procesional"]:
    if r["id"] in publicadas and not publicadas[r["id"]]:
        aviso("salida_procesional", n, "id",
              "la salida %s no tiene ninguna hora publicada: ¿se han perdido al leer el PDF?" % r["id"])

# --- informe ---
for t, filas in datos.items():
    print("%-20s %5d filas" % (t + ".csv", len(filas)))
if sin_coordenadas:
    print("\n%d puntos geográficos sin coordenadas todavía." % sin_coordenadas)
if avisos:
    print("\nAvisos (%d):" % len(avisos))
    for a in avisos: print("  " + a)
if errores:
    print("\nErrores (%d):" % len(errores))
    for e in errores: print("  " + e)
    sys.exit(1)
print("\nSin errores.")
