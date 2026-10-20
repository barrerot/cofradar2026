"""Extrae de un PDF de horarios (programa del Consejo o Llamador) las columnas cruz de guía / paso de cada hermandad.
Uso: python extraer_tablas.py fichero.pdf salida.json [páginas separadas por comas]"""
import sys, json, re, fitz

HORA = re.compile(r"^\d{1,2}:\d\d$")
SUB = ("PASO", "PALIO", "DUELO", "PASOS", "MISTERIO", "CRISTO")

def pagina(p):
    ws = p.get_text("words")
    cruces = sorted([w for w in ws if w[4] == "CRUZ"], key=lambda w: (round(w[1]), w[0]))
    if not cruces:
        return []
    yh = min(w[1] for w in cruces)
    fila_cab = [w for w in ws if abs(w[1] - yh) < 3]
    cruces = sorted([w for w in fila_cab if w[4] == "CRUZ"], key=lambda w: w[0])
    subs = sorted([w for w in fila_cab if w[4] in SUB], key=lambda w: w[0])
    grupos = []
    for k, c in enumerate(cruces):
        fin = cruces[k + 1][0] if k + 1 < len(cruces) else p.rect.width
        s = next((w for w in subs if c[0] < w[0] < fin), None)
        grupos.append({"izq": c[0] - 12, "der": fin - 12, "medio": (s[0] - 16) if s else None,
                       "sub": s[4] if s else None, "cab": [], "cruz": [], "paso": []})
    # líneas de texto (bloque, línea)
    lineas = {}
    for w in ws:
        lineas.setdefault((w[5], w[6]), []).append(w)
    # ejes de horas: líneas que solo contienen una hora, agrupadas por columna
    sueltas = sorted((ls[0][0], round(ls[0][1], 1), " ".join(w[4] for w in ls)) for ls in lineas.values()
                     if HORA.match(" ".join(w[4] for w in ls)) and ls[0][1] > yh)
    ejes, actual = [], []
    for x, y, t in sueltas:
        if actual and x - actual[-1][2] > 15:
            ejes.append(actual); actual = []
        actual.append((y, t, x))
    if actual: ejes.append(actual)
    ejes = [sorted(e) for e in ejes if len(e) >= 6]
    # Una hora sola en su línea que NO es del eje es de una celda partida en dos líneas («Salida» / «17:20»,
    # en las Vísperas): se queda en la celda, y unir() la junta con la línea de arriba
    del_eje = {(x, y) for e in ejes for y, _, x in e}
    for ls in lineas.values():
        ls.sort(key=lambda w: w[0])
        x0, y0 = ls[0][0], ls[0][1]
        texto = " ".join(w[4] for w in ls)
        g = next((g for g in grupos if g["izq"] <= x0 < g["der"]), None)
        if not g:
            continue
        if y0 < yh - 2:
            g["cab"].append((round(y0, 1), x0, texto)); continue
        if y0 < yh + 4 or (x0, round(y0, 1)) in del_eje:
            continue
        col = "paso" if g["medio"] is not None and x0 >= g["medio"] else "cruz"
        g[col].append((round(y0, 1), texto))
    hs = sorted({round(w[1], 1) for w in ws if HORA.match(w[4]) and w[1] > yh})
    difs = sorted(b - a for a, b in zip(hs, hs[1:]) if b - a > 2)
    paso_fila = difs[len(difs) // 2] if difs else 12
    def unir(celdas):
        celdas = sorted(celdas); res = []
        for y, t in celdas:
            if res and y - res[-1][2] < 8:   # celda partida en dos líneas (las filas van a 11 pt o más)
                res[-1][1] = (res[-1][1][:-1] if res[-1][1].endswith("-") else res[-1][1] + " ") + t
                res[-1][2] = y
            else:
                res.append([y, t, y])
        return [(a, b) for a, b, _ in res]
    out = []
    for g in grupos:
        cand = [e for e in ejes if min(x for _, _, x in e) <= g["izq"] + 5]
        if p.number == 1 and g["izq"] > 310:   # pág. 2: el Sábado de Pasión usa el eje de la derecha
            cand = [max(ejes, key=lambda e: e[0][2])]
        eje = [(y, t) for y, t, _ in max(cand, key=lambda e: min(x for _, _, x in e))] if cand else []
        g["cruz"], g["paso"] = unir(g["cruz"]), unir(g["paso"])
        cab = sorted(g["cab"])
        out.append({"cabecera": " | ".join(t for _, _, t in cab),
                    "sub": g["sub"],
                    "cruz": [t for _, t in sorted(g["cruz"])],
                    "paso": [t for _, t in sorted(g["paso"])],
                    "cruz_y": [y for y, _ in sorted(g["cruz"])],
                    "paso_y": [y for y, _ in sorted(g["paso"])],
                    "eje": eje})
    return out

d = fitz.open(sys.argv[1])
pags = [int(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 else range(1, len(d) + 1)
res = []
for n in pags:
    for g in pagina(d[n - 1]):
        g["pagina"] = n
        res.append(g)
json.dump(res, open(sys.argv[2], "w"), ensure_ascii=False, indent=1)
print(len(res), "columnas de hermandad")
