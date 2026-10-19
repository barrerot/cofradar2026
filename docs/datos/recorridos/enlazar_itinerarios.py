"""Escribe en cada GeoJSON de recorrido el id de su salida (`salida_procesional_id`), para que el enlace no dependa del nombre.
Las salidas de una edición están en salida_procesional.csv en el orden de las columnas del programa, el mismo que rec/indice.json.
Se ejecuta dentro de trabajo/, después de exportar.py y de generar_csv.py.
Uso: python3 -I ../enlazar_itinerarios.py ../../itinerarios/2026 ../.. 2026"""
import csv, json, os, re, sys, unicodedata

destino, datos, anio = sys.argv[1], sys.argv[2], sys.argv[3]
leer = lambda t: list(csv.DictReader(open(os.path.join(datos, t + ".csv"), encoding="utf-8")))
edicion = next(e["id"] for e in leer("edicion") if e["anio"] == anio)
salidas = sorted((s for s in leer("salida_procesional") if s["edicion_id"] == edicion), key=lambda s: int(s["id"]))
jornadas = {j["id"]: j["nombre"] for j in leer("jornada")}
hermandades = {h["id"]: h["nombre"] for h in leer("hermandad")}
indice = sorted(json.load(open("rec/indice.json")), key=lambda r: r["i"])
if len(indice) != len(salidas):
    sys.exit("El programa tiene %d columnas y la edición %s, %d salidas" % (len(indice), anio, len(salidas)))

def slug(s):   # el mismo que exportar.py
    s = unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

for meta, s in zip(indice, salidas):
    if jornadas[s["jornada_id"]].replace("Madrugá", "Madrugada") != meta["jornada"]:
        sys.exit("No casan la columna %d (%s) y la salida %s (%s)" % (meta["i"], meta["jornada"], s["id"], jornadas[s["jornada_id"]]))
    fichero = os.path.join(destino, "%s-%s.geojson" % (slug(meta["jornada"]), slug(meta["nombre"])))
    g = json.load(open(fichero))
    props = g["features"][0]["properties"]
    props["salida_procesional_id"] = int(s["id"])
    props["hermandad"] = hermandades[s["hermandad_id"]]   # el nombre del modelo, no el abreviado del programa
    json.dump(g, open(fichero, "w"), ensure_ascii=False, separators=(",", ":"))
print(len(salidas), "recorridos enlazados con su salida")
