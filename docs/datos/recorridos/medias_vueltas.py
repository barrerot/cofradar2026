"""Dónde da media vuelta cada recorrido: calle de llegada, metros del retroceso y paso que lo provoca."""
import json, sys, glob, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from trazador import dist
inf = sorted(json.load(open("geo/informe.json")), key=lambda r: -r.get("m_medias_vueltas", 0))
for r in inf[:int(sys.argv[1]) if len(sys.argv) > 1 else 12]:
    g = json.load(open("geo/%s.geojson" % r["n"]))
    linea = g["features"][0]["geometry"]["coordinates"]
    # nombre de cada segmento a partir de los tramos
    nombres = []
    for t in g["tramos"]:
        nombres += [t["properties"]["calle"]] * (len(t["geometry"]["coordinates"]) - 1)
    print("==", r["n"], r["nombre"], r["metros"], "m ·", r["medias_vueltas"], "medias vueltas,", r["m_medias_vueltas"], "m")
    for k, (a, b, c) in enumerate(zip(linea, linea[1:], linea[2:])):
        if a == c and a != b:
            # cuánto retrocede: segmentos seguidos que se deshacen
            m, j = 0, 0
            while k - j >= 0 and k + 2 + j < len(linea) and linea[k - j] == linea[k + 2 + j]:
                m += dist(linea[k - j][::-1], linea[k - j + 1][::-1]); j += 1
            antes = nombres[max(0, k - 3):k + 1]
            print("   %4d m en «%s» (venía de %s)" % (m, nombres[k], " / ".join(dict.fromkeys(antes))))
