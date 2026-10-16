"""Vísperas del Llamador: una sola columna por hermandad (sin cruz de guía / paso).
Las columnas salen de la fila de sedes (la última de la cabecera). Cada palabra va a la fila y la columna
cuyo centro tiene más cerca. Uso: python extraer_llamador_visperas.py llamador.pdf salida.json páginas"""
import sys, json, re, fitz

HORA = re.compile(r"^\d{1,2}:\d\d$")

def pagina(p):
    ws = p.get_text("words")
    lineas = {}
    for w in ws:
        lineas.setdefault((w[5], w[6]), []).append(w)
    horas = sorted([((l[0][1] + l[0][3]) / 2, l[0][4], l[0][0]) for l in lineas.values()
                    if len(l) == 1 and HORA.match(l[0][4]) and l[0][0] < 40])
    y0 = horas[0][0] - 6
    eje_x = max(h[2] for h in horas) + 20
    cab = [w for w in ws if w[3] < y0 and w[0] > eje_x and w[1] > 20]
    y_sede = max(w[1] for w in cab)
    sede = sorted([w for w in cab if abs(w[1] - y_sede) < 3], key=lambda w: w[0])
    grupos, actual = [], [sede[0]]
    for w in sede[1:]:
        if w[0] - actual[-1][2] > 6:
            grupos.append(actual); actual = []
        actual.append(w)
    grupos.append(actual)
    centros = [(g[0][0] + g[-1][2]) / 2 for g in grupos]
    # las columnas son del mismo ancho: si faltan a la derecha (sedes en otra línea), se completan
    if len(centros) >= 3:
        paso = sorted(b - a for a, b in zip(centros, centros[1:]))[0]
        borde = max(w[2] for w in ws if w[1] > y0)
        centros = [centros[0] + k * paso for k in range(40) if centros[0] + k * paso < borde - 5]
        grupos = [[w for w in sede if abs((w[0] + w[2]) / 2 - c) < paso / 2] or [("", 0, 0, 0, "?")] for c in centros]
    cols = [{"sede": " ".join(w[4] for w in g), "cab": [], "celdas": {}} for g in grupos]
    for w in ws:
        cx, cy = (w[0] + w[2]) / 2, (w[1] + w[3]) / 2
        if w[0] < eje_x - 15:
            continue
        k = min(range(len(centros)), key=lambda k: abs(centros[k] - cx))
        if w[3] < y0:
            if w[1] < y_sede - 2 and w[1] > 20:
                cols[k]["cab"].append((round(w[1]), w[0], w[4]))
            continue
        f = min(range(len(horas)), key=lambda f: abs(horas[f][0] - cy))
        cols[k]["celdas"].setdefault((f, horas[f][1]), []).append((round(w[1], 1), w[0], w[4]))
    out = []
    for c in cols:
        nombre = " ".join(t for _, _, t in sorted(c["cab"]))
        celdas = [(h, " ".join(t for _, _, t in sorted(v))) for (f, h), v in sorted(c["celdas"].items())]
        out.append({"cabecera": nombre + " · " + c["sede"], "cruz": celdas, "paso": []})
    return out

d = fitz.open(sys.argv[1])
res = []
for n in [int(x) for x in sys.argv[3].split(",")]:
    for g in pagina(d[n - 1]):
        g["pagina"] = n
        res.append(g)
json.dump(res, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
for g in res:
    print(g["pagina"], "·", g["cabecera"], "\n    ", " / ".join("%s %s" % c for c in g["cruz"]))
