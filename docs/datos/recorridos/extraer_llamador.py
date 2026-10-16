"""Extrae del Llamador (rejilla con texto centrado) las columnas cruz de guía / paso de cada hermandad.
Cada palabra va a la fila y a la columna cuyo centro tiene más cerca.
Uso: python extraer_llamador.py llamador.pdf salida.json páginas"""
import sys, json, re, fitz

HORA = re.compile(r"^\d{1,2}:\d\d$")

def pagina(p):
    ws = p.get_text("words")
    cab = [w for w in ws if w[4] == "CRUZ"]
    if not cab:
        return []
    yh = min(w[1] for w in cab)
    fila = sorted([w for w in ws if abs(w[1] - yh) < 3], key=lambda w: w[0])
    # centros de subcolumna: "CRUZ DE GUÍA" (de CRUZ a GUÍA) y PALIO/PASO
    cols = []
    k = 0
    while k < len(fila):
        w = fila[k]
        if w[4] == "CRUZ":
            fin = next((x for x in fila[k:] if x[4].startswith("GU")), w)
            cols.append(("cruz", (w[0] + fin[2]) / 2)); k += 1
        elif w[4] in ("PALIO", "PASO", "PASOS", "MISTERIO", "DUELO"):
            cols.append(("paso", (w[0] + w[2]) / 2)); k += 1
        else:
            k += 1
    # ejes de horas: líneas que son solo una hora, por columna x
    lineas = {}
    for w in ws:
        lineas.setdefault((w[5], w[6]), []).append(w)
    horas = sorted([(round(l[0][0]), (l[0][1] + l[0][3]) / 2, l[0][4]) for l in lineas.values()
                    if len(l) == 1 and HORA.match(l[0][4]) and l[0][1] > yh])
    ejes, actual = [], []
    for x, y, t in horas:
        if actual and x - actual[-1][0] > 15:
            ejes.append(actual); actual = []
        actual.append((x, y, t))
    if actual: ejes.append(actual)
    ejes = [sorted(e, key=lambda h: h[1]) for e in ejes if len(e) >= 6]
    ejes_x = [sum(h[0] for h in e) / len(e) for e in ejes]
    # grupos (hermandades): parejas cruz + paso
    grupos = []
    for tipo, cx in cols:
        if tipo == "cruz":
            grupos.append({"cruz_x": cx, "paso_x": None, "celdas": {"cruz": {}, "paso": {}}, "cab": []})
        elif grupos and grupos[-1]["paso_x"] is None:
            grupos[-1]["paso_x"] = cx
    centros = sorted([(g["cruz_x"], gi, "cruz") for gi, g in enumerate(grupos)] +
                     [(g["paso_x"], gi, "paso") for gi, g in enumerate(grupos) if g["paso_x"]])
    for w in ws:
        cx, cy = (w[0] + w[2]) / 2, (w[1] + w[3]) / 2
        if any(abs(cx - ex) < 14 for ex in ejes_x) and HORA.match(w[4]):
            continue
        x, gi, sub = min(centros, key=lambda c: abs(c[0] - cx))
        if abs(x - cx) > 45:
            continue
        g = grupos[gi]
        if w[1] < yh - 2:
            g["cab"].append((round(w[1]), w[0], w[4])); continue
        if w[1] < yh + 4:
            continue
        # eje: el más cercano a la izquierda de la columna (o el más cercano)
        izq = [k for k, ex in enumerate(ejes_x) if ex < g["cruz_x"]]
        e = ejes[max(izq, key=lambda k: ejes_x[k])] if izq else ejes[min(range(len(ejes)), key=lambda k: abs(ejes_x[k] - cx))]
        f = min(range(len(e)), key=lambda k: abs(e[k][1] - cy))
        g["celdas"][sub].setdefault((f, e[f][2]), []).append((round(w[1], 1), w[0], w[4]))
    out = []
    for g in grupos:
        cab = " ".join(t for _, _, t in sorted(g["cab"]))
        res = {"cabecera": cab}
        for sub in ("cruz", "paso"):
            res[sub] = [(h, " ".join(t for _, _, t in sorted(ws_))) for (f, h), ws_ in sorted(g["celdas"][sub].items())]
        out.append(res)
    return out

d = fitz.open(sys.argv[1])
res = []
for n in [int(x) for x in sys.argv[3].split(",")]:
    for g in pagina(d[n - 1]):
        g["pagina"] = n
        res.append(g)
json.dump(res, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
print(len(res), "columnas")
