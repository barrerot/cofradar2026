"""Escribe un GeoJSON por salida procesional (una sola línea continua, ordenada y orientada) en la carpeta indicada.
Se ejecuta dentro de la carpeta de trabajo, después de trazar_todas.py.
Uso: python3 -I exportar.py ../../itinerarios/2026 2026 "Programa de mano 2026 + Llamador 2025"
"""
import json, sys, os, glob, re, unicodedata

destino, anio, fuente = sys.argv[1], int(sys.argv[2]), sys.argv[3]
os.makedirs(destino, exist_ok=True)
indice = {"%02d" % r["i"]: r for r in json.load(open("rec/indice.json"))}

def slug(s):
    s = unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

escritos = []
for f in sorted(glob.glob("geo/[0-9]*.geojson")):
    n = os.path.basename(f)[:-8]
    g = json.load(open(f))
    meta = indice[n]
    linea = g["features"][0]
    props = {
        "hermandad": meta["nombre"],
        "jornada": meta["jornada"],
        "anio": anio,
        "provisional": True,
        "fuente": fuente + "; las calles entre puntos las elige el trazador sobre OpenStreetMap",
        "revisado": meta.get("revisado") if isinstance(meta.get("revisado"), str) else None,
        "metros": linea["properties"]["metros"],
        "catedral_interior": "sin dato: línea recta de la Puerta de San Miguel a la de Palos",
        "avisos": linea["properties"]["avisos"],
        "licencia": "Cartografía © colaboradores de OpenStreetMap (ODbL)",
    }
    salida = {"type": "FeatureCollection", "features": [
        {"type": "Feature", "properties": props, "geometry": linea["geometry"]}]}
    nombre = "%s-%s.geojson" % (slug(meta["jornada"]), slug(meta["nombre"]))
    json.dump(salida, open(os.path.join(destino, nombre), "w"), ensure_ascii=False, separators=(",", ":"))
    escritos.append(nombre)
print(len(escritos), "salidas en", destino)
