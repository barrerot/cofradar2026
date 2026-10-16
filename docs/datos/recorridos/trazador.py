"""Trazador de recorridos como módulo: carga el callejero una vez y traza muchas salidas.
Mismo método que borriquita/trazar.py."""
import json, math, heapq, unicodedata, re

def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return " ".join(p for p in re.sub(r"[^\w\s]", " ", s).split()
                    if p not in {"la", "el", "los", "las", "de", "del", "calle", "c"})

def dist(a, b):
    la = math.radians((a[0] + b[0]) / 2)
    return math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * math.cos(la))


def cargar(ruta_osm):
    global nodos, areas, grafo, por_calle, saltos, celdas
    osm = json.load(open(ruta_osm))
    nodos = {e["id"]: (e["lat"], e["lon"]) for e in osm["elements"] if e["type"] == "node"}
    areas = []
    grafo = {}  # nodo -> [(vecino, metros, nombre normalizado, nombre)]
    for e in osm["elements"]:
        t = e.get("tags", {})
        if e["type"] != "way" or "highway" not in t or t.get("access") in ("private", "no"):
            continue
        if t.get("area") == "yes":   # plazas y avenidas dibujadas como superficie: su borde no es un camino
            areas.append(t.get("name", "")); continue
        nombre = t.get("name", "")
        for a, b in zip(e["nodes"], e["nodes"][1:]):
            if a in nodos and b in nodos:
                m = dist(nodos[a], nodos[b])
                grafo.setdefault(a, []).append((b, m, norm(nombre), nombre))
                grafo.setdefault(b, []).append((a, m, norm(nombre), nombre))
    # OSM a veces deja dos calles sin unir por pocos metros: se enlazan y se cuenta
    celdas = {}
    for n in grafo:
        la, lo = nodos[n]
        celdas.setdefault((round(la * 2000), round(lo * 2000)), []).append(n)
    saltos = 0
    for n in list(grafo):
        la, lo = nodos[n]
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for v in celdas.get((round(la * 2000) + dx, round(lo * 2000) + dy), []):
                    if v != n and dist(nodos[n], nodos[v]) < 6 and all(w != v for w, *_ in grafo[n]):
                        grafo[n].append((v, dist(nodos[n], nodos[v]), "", "[hueco de OSM unido]"))
                        saltos += 1
    global principal
    principal, pendientes = set(), set(grafo)
    while pendientes:   # la componente conexa más grande; las demás son aceras o patios sueltos
        semilla = pendientes.pop(); comp, pila = {semilla}, [semilla]
        while pila:
            for v, *_ in grafo[pila.pop()]:
                if v not in comp:
                    comp.add(v); pila.append(v)
        pendientes -= comp
        if len(comp) > len(principal):
            principal = comp
    por_calle = {}
    for a, vec in grafo.items():
        for b, m, n, _ in vec:
            if n:
                por_calle.setdefault(n, set()).add(a)


def cercano(p):
    """Nodo del callejero más próximo (busca en la rejilla, ampliando si hace falta)."""
    cx, cy = round(p[0] * 2000), round(p[1] * 2000)
    for r in range(1, 40):
        cand = [v for dx in range(-r, r + 1) for dy in range(-r, r + 1) for v in celdas.get((cx + dx, cy + dy), []) if v in principal]
        if cand:
            return min(cand, key=lambda n: dist(nodos[n], p))
    return min(grafo, key=lambda n: dist(nodos[n], p))

def ruta(origen, destinos, permitidas, prohibidos=frozenset()):
    """Dijkstra hasta el primer nodo de destinos; fuera de las calles permitidas cuesta 25 veces más.
    Los nodos `prohibidos` no se pisan."""
    cola, previo, coste = [(0, origen)], {origen: None}, {origen: 0}
    while cola:
        c, n = heapq.heappop(cola)
        if n in destinos:   # si ya está en la calle siguiente (un cruce), no se mueve
            camino = []
            while n is not None:
                camino.append(n); n = previo[n]
            return camino[::-1]
        if c > coste[n]:
            continue
        for v, m, nn, _ in grafo[n]:
            if v in prohibidos:
                continue
            nc = c + m * (1 if nn in permitidas else 25)
            if nc < coste.get(v, 1e18):
                coste[v], previo[v] = nc, n
                heapq.heappush(cola, (nc, v))
    return None

def pegar(p, calle, radio=120):
    """Nodo para un templo: el de su calle (la primera o la última del recorrido) si está a menos de `radio` m;
    si no, el más próximo. OSM pone a veces el centro del templo más cerca de la calle de atrás."""
    if calle and calle in por_calle:
        cand = [v for v in por_calle[calle] if v in principal]
        if cand:
            v = min(cand, key=lambda v: dist(nodos[v], p))
            if dist(nodos[v], p) < radio:
                return v
    return cercano(p)

def medias_vueltas(linea):
    """Medias vueltas de una línea [[lon, lat], ...]: cuántas y cuántos metros se desandan en total.
    Cuenta todo el tramo que se recorre de vuelta por el mismo sitio, no solo el último segmento."""
    n, metros = 0, 0.0
    for k in range(1, len(linea) - 1):
        if linea[k - 1] == linea[k + 1] and linea[k - 1] != linea[k]:
            n += 1
            j = 0
            while k - 1 - j >= 0 and k + 1 + j < len(linea) and linea[k - 1 - j] == linea[k + 1 + j]:
                metros += dist(linea[k - 1 - j][::-1], linea[k - j][::-1]); j += 1
    return n, metros

def a_evitar(punto):
    """Para un punto de paso con "evitar": [calles], los nodos de esas calles a más de "radio_libre" m del punto.
    Sirve para llegar a la Campana sin entrar en Sierpes por una bocacalle y subir hasta la plaza."""
    if not isinstance(punto, dict) or "evitar" not in punto:
        return frozenset()
    p, libre = punto["via"], punto.get("radio_libre", 30)
    return frozenset(v for c in punto["evitar"] for v in por_calle.get(norm(c), ()) if dist(nodos[v], p) > libre)

def cerca(nodos_calle, desde, radio=2000):
    """Nodos de una calle a menos de `radio` metros de `desde` (si no hay, todos)."""
    p = nodos[desde]
    c = {n for n in nodos_calle if dist(nodos[n], p) < radio}
    return c or nodos_calle

def nombre_tramo(a, b):
    return next((nom for v, _, _, nom in grafo[a] if v == b), "")


def trazar(rec):
    pass
    avisos, coords, calles = [], [], []
    if rec.get("inicio") is None or rec.get("fin") is None:   # templo sin situar: extremo de la primera/última calle
        rec = dict(rec)
        calles_ok = [p for p in rec["pasos"] if isinstance(p, str) and norm(p) in por_calle]
        def extremo(a, b):
            # la calle a que de verdad toca a b (puede haber otras con el mismo nombre en otros barrios),
            # y de ella el extremo más alejado de b
            na, nb = por_calle[norm(a)] & principal, por_calle[norm(b)] & principal
            x, y = min(((u, v) for u in na for v in nb), key=lambda uv: dist(nodos[uv[0]], nodos[uv[1]]))
            local = [n for n in na if dist(nodos[n], nodos[x]) < 800]
            return list(nodos[max(local, key=lambda n: dist(nodos[n], nodos[y]))])
        if len(calles_ok) >= 2:
            rec["inicio"] = rec.get("inicio") or extremo(calles_ok[0], calles_ok[1])
            rec["fin"] = rec.get("fin") or extremo(calles_ok[-1], calles_ok[-2])
            avisos.append("templo sin situar: empieza y acaba en el extremo de la primera y la última calle")
        else:
            return None, ["no hay calles suficientes para trazar"]
    primera = next((norm(p) for p in rec["pasos"] if isinstance(p, str)), None) if isinstance(rec["pasos"][0], str) else None
    actual = pegar(rec["inicio"], primera)
    coords.append(nodos[actual])
    pasos = rec["pasos"] + [{"fin": rec["fin"]}]
    for i, paso in enumerate(pasos):
        if isinstance(paso, dict) and "manual" in paso:
            for p in paso["puntos"]:
                coords.append(tuple(p)); calles.append("[a mano] " + paso["manual"])
            actual = cercano(paso["puntos"][-1])
            if dist(nodos[actual], paso["puntos"][-1]) > 15:
                avisos.append("el tramo a mano «%s» acaba a %.0f m del callejero" % (paso["manual"], dist(nodos[actual], paso["puntos"][-1])))
            coords.append(nodos[actual]); calles.append("[enlace]")
            continue
        if isinstance(paso, dict) and "via" in paso:
            destinos, permitidas = {cercano(paso["via"])}, set()
            if actual in destinos:
                continue
            camino = ruta(actual, destinos, permitidas, a_evitar(paso))
            if not camino:
                avisos.append("no hay camino hasta el punto %s" % paso.get("nombre", paso["via"])); continue
            for a, b in zip(camino, camino[1:]):
                coords.append(nodos[b]); calles.append(nombre_tramo(a, b))
            actual = camino[-1]; continue
        if isinstance(paso, dict) and "fin" in paso:
            ultima = norm(pasos[i - 1]) if i and isinstance(pasos[i - 1], str) else None
            destinos, permitidas = {pegar(paso["fin"], ultima)}, {ultima} if ultima else set()
            if actual in destinos:
                continue
        else:
            n = norm(paso)
            if n not in por_calle:
                avisos.append("«%s» no está en OSM con ese nombre" % paso); continue
            if not any(dist(nodos[v], nodos[actual]) < 3000 for v in por_calle[n]):
                avisos.append("«%s» solo existe lejos de aquí en OSM (otra calle con el mismo nombre): se ignora" % paso); continue
            sig = pasos[i + 1] if i + 1 < len(pasos) else None
            if isinstance(sig, str) and norm(sig) in por_calle and not any(dist(nodos[v], nodos[actual]) < 3000 for v in por_calle[norm(sig)]):
                sig = None
            permitidas = {n} | ({norm(pasos[i - 1])} if i and isinstance(pasos[i - 1], str) else set())
            if actual not in por_calle[n]:   # primero llegar a la calle (p. ej. si la anterior no estaba en OSM)
                camino = ruta(actual, cerca(por_calle[n], actual), permitidas)
                if not camino:
                    avisos.append("no hay camino hacia «%s»" % paso); continue
                for a, b in zip(camino, camino[1:]):
                    coords.append(nodos[b]); calles.append(nombre_tramo(a, b))
                actual = camino[-1]
            if actual in por_calle[n] and isinstance(sig, str) and norm(sig) in por_calle:
                destinos = cerca(por_calle[norm(sig)], actual); permitidas |= {norm(sig)}
            elif actual in por_calle[n] and isinstance(sig, dict) and "manual" in sig:
                destinos = {cercano(sig["puntos"][0])}
            elif actual in por_calle[n] and isinstance(sig, dict) and ("fin" in sig or "via" in sig):
                # la siguiente parada es un punto (templo o plaza): se va derecho a él, sin pasarse para luego volver
                destinos = {pegar(sig["fin"], n) if "fin" in sig else cercano(sig["via"])}
                if actual in destinos:
                    continue
            else:
                destinos = cerca(por_calle[n], actual)
        siguiente = pasos[i + 1] if i + 1 < len(pasos) and not (isinstance(paso, dict) and "fin" in paso) else None
        camino = ruta(actual, destinos, permitidas, a_evitar(siguiente))
        if not camino:
            avisos.append("no hay camino hacia «%s»" % paso); continue
        for a, b in zip(camino, camino[1:]):
            coords.append(nodos[b]); calles.append(nombre_tramo(a, b))
        actual = camino[-1]

    # resumen de calles realmente usadas, en orden y sin repetir seguidas
    usadas = []
    for c in calles:
        if not usadas or usadas[-1][0] != c:
            usadas.append([c, 0])
    u = -1
    for k, (a, b) in enumerate(zip(coords, coords[1:])):
        if k == 0 or calles[k] != calles[k - 1]:
            u += 1
        usadas[u][1] += dist(a, b)
    largo = sum(dist(a, b) for a, b in zip(coords, coords[1:]))
    pedidas = {norm(p) for p in rec["pasos"] if isinstance(p, str)}
    metros_por = {}
    for c, m in usadas:
        metros_por[c] = metros_por.get(c, 0) + m
    ajenas = sorted("%s (%d m)" % (c, m) for c, m in metros_por.items()
                    if c and not c.startswith("[") and norm(c) not in pedidas and m >= 15)
    sin_nombre = sum(1 for c in calles if not c)
    if ajenas:
        avisos.append("el camino usa calles que no están en la lista: " + ", ".join(ajenas))
    huecos = sum(1 for c in calles if c == "[hueco de OSM unido]")
    if huecos:
        avisos.append("%d huecos de OSM (menos de 6 m) unidos para seguir" % huecos)
    pedidas_area = sorted({a for a in areas if norm(a) in pedidas and norm(a) not in {norm(c) for c, _ in usadas}})
    if pedidas_area:
        avisos.append("solo dibujadas como superficie en OSM, sin línea que seguir: " + ", ".join(pedidas_area))
    if sin_nombre:
        avisos.append("%d segmentos sin nombre en OSM (pasos, aceras o plazas)" % sin_nombre)
    # tramos por calle, solo para pintarlos y revisar (no es dato del modelo)
    tramos, k = [], 0
    for c, m in usadas:
        pts = [coords[k]]
        while k < len(calles) and calles[k] == c:
            k += 1; pts.append(coords[k])
        tramos.append({"type": "Feature", "properties": {"calle": c or "(sin nombre)", "metros": round(m),
                       "manual": c.startswith("[a mano]")},
                       "geometry": {"type": "LineString", "coordinates": [[round(lo, 6), round(la, 6)] for la, lo in pts]}})
    salto = max((dist(a, b) for k, (a, b) in enumerate(zip(coords, coords[1:]))
                 if not calles[k].startswith("[a mano]")), default=0)
    d_ini, d_fin = dist(coords[0], rec["inicio"]), dist(coords[-1], rec["fin"])
    salida = {"type": "FeatureCollection", "comprobaciones": {"empieza_a_m": round(d_ini), "acaba_a_m": round(d_fin), "tramo_recto_mas_largo_m": round(salto)},
              "tramos": tramos, "features": [{
        "type": "Feature",
        "properties": {"nombre": rec["nombre"], "metros": round(largo), "calles": [[c, round(m)] for c, m in usadas], "avisos": avisos},
        "geometry": {"type": "LineString", "coordinates": [[round(lo, 6), round(la, 6)] for la, lo in coords]}}]}
    return salida, avisos
