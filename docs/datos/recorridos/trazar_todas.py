"""Traza todos los recorridos de rec/*.json y escribe geo/*.geojson y un informe de comprobaciones."""
import json, sys, os, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import trazador as T

T.cargar(sys.argv[1])
os.makedirs("geo", exist_ok=True)
informe = []
for f in sorted(glob.glob("rec/[0-9]*.json")):
    rec = json.load(open(f))
    sal, avisos = T.trazar(rec)
    n = os.path.basename(f)[:-5]
    if sal is None:
        informe.append({"n": n, "nombre": rec["nombre"], "error": avisos}); continue
    linea = sal["features"][0]["geometry"]["coordinates"]
    # media vuelta: el trazado vuelve por el mismo sitio por el que acaba de pasar (se cuenta todo lo desandado)
    vueltas, m_vueltas = T.medias_vueltas(linea)
    ajenas = sum(m for c, m in sal["features"][0]["properties"]["calles"] if c and not c.startswith("["))
    props = sal["features"][0]["properties"]
    informe.append({"n": n, "nombre": rec["nombre"], "metros": props["metros"], "medias_vueltas": vueltas,
                    "m_medias_vueltas": round(m_vueltas), **sal["comprobaciones"], "avisos": props["avisos"]})
    json.dump(sal, open("geo/%s.geojson" % n, "w"), ensure_ascii=False)
json.dump(informe, open("geo/informe.json", "w"), ensure_ascii=False, indent=1)
for r in informe:
    if "error" in r:
        print(r["n"], r["nombre"], "ERROR", r["error"]); continue
    print("%s %-42s %6d m  ½v:%d (%dm)  ini:%dm fin:%dm" % (r["n"], r["nombre"][:42], r["metros"], r["medias_vueltas"],
          r["m_medias_vueltas"], r["empieza_a_m"], r["acaba_a_m"]))
