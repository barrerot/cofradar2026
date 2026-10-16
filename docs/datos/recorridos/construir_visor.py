"""Visor con todos los recorridos de geo/*.geojson (se ejecuta dentro de la carpeta de trabajo).
Uso: python3 -I construir_visor.py visor.html programa.json"""
import json, sys, glob, os
AQUI = os.path.dirname(os.path.abspath(__file__))
indice = {"%02d" % r["i"]: r for r in json.load(open("rec/indice.json"))}
informe = {r["n"]: r for r in json.load(open("geo/informe.json"))}
gs = json.load(open(sys.argv[2]))
sys.path.insert(0, AQUI)
from generar import CORREGIDAS, limpia
rutas = []
for f in sorted(glob.glob("geo/[0-9]*.geojson")):
    n = os.path.basename(f)[:-8]
    r = json.load(open(f))
    meta = indice[n]
    i = int(n)
    if i in CORREGIDAS:
        cruz, paso = [t for _, t in CORREGIDAS[i]["cruz"]], [t for _, t in CORREGIDAS[i]["paso"]]
    else:
        cruz, paso = gs[i]["cruz"], gs[i]["paso"]
    r["jornada"], r["hermandad"] = meta["jornada"], meta["nombre"]
    r["programa"] = {"cruz": [t for t in cruz if t != "+ INFO"], "paso": [t for t in paso if t != "+ INFO"]}
    r["medias_vueltas"] = informe[n]["medias_vueltas"]
    r["llamador"] = meta.get("llamador")
    r["anadidos"] = [d if isinstance(d, str) else d.get("nombre", "punto de paso") for d in meta.get("anadidos_llamador", [])]
    r["revisado"] = meta.get("revisado") if isinstance(meta.get("revisado"), str) else None
    if informe[n]["medias_vueltas"]:
        r["features"][0]["properties"]["avisos"].append(
            "El trazado da %d media(s) vuelta(s) (%d m en total): suele indicar un punto mal ordenado o un callejón" %
            (informe[n]["medias_vueltas"], informe[n]["m_medias_vueltas"]))
    rutas.append(r)
# calles de fondo: solo las que quedan cerca de algún recorrido (rejilla de ~200 m)
celdas = set()
for r in rutas:
    for lo, la in r["features"][0]["geometry"]["coordinates"]:
        cx, cy = round(la * 500), round(lo * 500)
        celdas.update((cx + a, cy + b) for a in (-1, 0, 1) for b in (-1, 0, 1))
osm = json.load(open("osm/sevilla.json"))
nodos = {e["id"]: (e["lat"], e["lon"]) for e in osm["elements"] if e["type"] == "node"}
calles = []
for e in osm["elements"]:
    t = e.get("tags", {})
    if e["type"] != "way" or not ("highway" in t or "area:highway" in t):
        continue
    pts = [nodos[k] for k in e["nodes"] if k in nodos]
    if not any((round(la * 500), round(lo * 500)) in celdas for la, lo in pts):
        continue
    calles.append({"n": t.get("name", ""), "a": 1 if (t.get("area") == "yes" or "area:highway" in t) else 0,
                   "p": [[round(la, 5), round(lo, 5)] for la, lo in pts]})
catedral = []
for e in json.load(open("osm/catedral.json"))["elements"]:
    if e["type"] == "relation" and e["id"] == 5641600:
        for mb in e["members"]:
            if mb.get("role") == "outer" and "geometry" in mb:
                catedral.append([[round(g["lat"], 6), round(g["lon"], 6)] for g in mb["geometry"]])
datos = {"calles": calles, "catedral": catedral, "rutas": rutas}
html = open(os.path.join(AQUI, "visor_plantilla.html")).read()
html = html.replace("/*LEAFLET_CSS*/", open(os.path.join(AQUI, "leaflet.css")).read()).replace("/*DATOS*/null", json.dumps(datos, ensure_ascii=False, separators=(",", ":")))
open(sys.argv[1], "w").write(html)
print(sys.argv[1], len(html) // 1024, "KB,", len(calles), "calles de fondo,", len(rutas), "recorridos")
