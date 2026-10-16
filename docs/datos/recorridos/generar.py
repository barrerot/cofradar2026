"""Prueba: recorrido de cada hermandad a partir del programa de mano 2026 (solo puntos de referencia).

Uso: python3 -I generar.py programa2026.json osm/sevilla.json salida_dir [llamador2025.json llamador2025_visperas.json]
Para cada hermandad junta las columnas de cruz de guía y paso en un solo orden (por la hora de cada fila,
restando al paso el retraso que lleva sobre la cruz), casa cada nombre con OSM y traza la línea.
"""
import json, sys, re, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import trazador as T
from nombres import mejor, plano

CATEDRAL = {"manual": "Catedral: interior sin dato (Puerta de San Miguel → Puerta de los Palos)",
            "puntos": [[37.3855144, -5.9938093], [37.3860529, -5.9925407]]}
# La carrera oficial empieza en la Campana: se llega sin pisar Sierpes fuera de la plaza (si no, el trazador
# entra por una bocacalle a mitad de Sierpes, sube hasta la Campana y vuelve a bajar)
CARRERA = [{"via": [37.39261, -5.99517], "nombre": "La Campana", "evitar": ["Calle Sierpes"], "radio_libre": 31}, "Calle Sierpes", "Plaza de San Francisco",
           "Avenida de la Constitución", CATEDRAL]

JORNADAS = {2: "Viernes de Dolores", 4: "Domingo de Ramos", 6: "Lunes Santo", 8: "Martes Santo",
            10: "Miércoles Santo", 12: "Jueves Santo", 14: "Madrugada", 16: "Viernes Santo", 18: "Sábado Santo"}

# Templos que OSM no da con el nombre del programa (punto aproximado) o que no sé situar (None)
TEMPLOS = {
    "Bellavista": None, "Pasión y Muerte": None, "Torreblanca": None, "El Cerro": None,
    "S. José Obrero": [37.39756, -5.97535], "Santa Genoveva": [37.36858, -5.97490],
    "Los Estudiantes": [37.38070, -5.99200], "Santa Cruz": [37.38658, -5.98944],
    "El Cristo de Burgos": [37.39271, -5.98998], "Los Negritos": [37.39085, -5.98395],
    "Monte-Sión": [37.39686, -5.99129], "La Carretería": [37.38420, -5.99630],
    "La Soledad|16": [37.38902, -5.99732], "El Cachorro": [37.38957, -6.01095],
    "Los Servitas": [37.39535, -5.98760], "El Santo Entierro": [37.39299, -5.99712],
    "Bendición y Esperanza": [37.35907, -5.96990],
}

# Nombres del programa que no casan solos con OSM: calle de OSM, punto de paso, varios, o None (se ignora)
V = lambda la, lo: {"via": [la, lo]}
POSTIGO = V(37.38526, -5.99497)
MANUAL = {
    "Acedo": None, "Ar. del Postigo": POSTIGO, "Arco Postigo": POSTIGO, "Arco del Post.": POSTIGO,
    "Arco del Postigo": POSTIGO, "Post. del Aceite": POSTIGO, "Postigo Aceite": POSTIGO, "Postigo del Aceite": POSTIGO,
    "Av. Don Pelayo": "Calle Don Pelayo", "Ciudad de Chivas": "Avenida Ciudad de Chiva",
    "Dña M. Coronel": "Calle Doña María Coronel", "D. Mª Coronel": "Calle Doña María Coronel",
    "Doña M. Coronel": "Calle Doña María Coronel", "Entrecárceles": "Calle Entre Cárceles",
    "Fray Cefer. Glez": "Calle Fray Ceferino González", "Fray Cefer. Glez.": "Calle Fray Ceferino González",
    "Fray Ceferino Glez.": "Calle Fray Ceferino González", "F. Cef. González": "Calle Fray Ceferino González",
    "Glorieta del Cid": "Avenida de El Cid", "Gta. del Cid": "Avenida de El Cid", "Avda. Cid": "Avenida de El Cid",
    "Jardines Murillo": V(37.38437, -5.98677), "Jovella. - Tetuán": ["Calle Jovellanos", "Calle Tetuán"],
    "Lonja Universid.": None, "M Auxiliadora": "Calle María Auxiliadora", "Mª Auxiliadora": "Calle María Auxiliadora",
    "Ntra. Sra. Dolores": "Calle Nuestra Señora de los Dolores", "N. S. de los Dolores": "Calle Nuestra Señora de los Dolores",
    "P. José Sebatián Bandarán": "Calle Padre José Sebastián Bandarán",
    "Parque Fed. García Lorca": V(37.37718, -5.97077), "Parque García Lorca": V(37.37718, -5.97077),
    "Parroquia": None, "Parroquia Santa Genoveva": None, "Parroquia de Santa Ana": V(37.38257, -6.00093),
    "Pl. Santa Ana": V(37.38257, -6.00093), "Plazuela Santa Ana": V(37.38257, -6.00093),
    "Peña Bética Ntra. Sra. Oliva": "Ronda Nuestra Señora de la Oliva", "Ronda Ntra. Sra. Oliva": "Ronda Nuestra Señora de la Oliva",
    "Pl. Cadenas": None, "Pl. España (TN)": V(37.37787, -5.98805), "Pl. España (TS)": V(37.37588, -5.98684),
    "Pl. España": V(37.37721, -5.98660), "Pl. Fdo. Herrera": "Plaza Fernando de Herrera",
    "Pl. Los Terceros": V(37.39361, -5.98809), "Pl. Molviedro": V(37.38786, -5.99795), "Pl. de Molviedro": V(37.38786, -5.99795),
    "Pl. Retiro": None, "Pl. San Andrés": V(37.39393, -5.99376), "Pte S. Bernardo": V(37.38497, -5.98415),
    "Pte de Triana": "Puente de Isabel II", "Pte. de Triana": "Puente de Isabel II", "Puente de Triana": "Puente de Isabel II",
    "Puente Isabel II": "Puente de Isabel II", "Puente del Indio": None, "Puñonrrostro": "Calle Puñonrostro",
    "Páez de Ribera": "Calle Páez de Rivera", "Rotonda Esqueleto": None, "R. Esqueleto": None,
    "Rotonda Hospital V. Rocío": None, "S. J. Dios-E. Dato": ["Calle San Juan de Dios", "Avenida de Eduardo Dato"],
    "Castilla": "Calle Castilla", "P. Romero": "Avenida de Pedro Romero", "(Pta del Perdón)": None,
    "Tom. de Ibarra": "Calle Tomás de Ybarra", "Tomás de Ibarra": "Calle Tomás de Ybarra",
    "Torrecuadrada": "Calle Torre Cuadrada", "Torredonjimeno": "Calle Torre Donjimeno", "Torres Naharro": "Calle Torrenaharro",
    "Torrescarcela": "Calle Torre Carcelas", "Torresquevedo": "Calle Torres Quevedo",
    "Travesía Ntra. Sra. Consolación": "Travesía de Nuestra Señora de la Consolación", "J. M. S. Román": "Calle José Muñoz San Román",
    # nombres que casan con más de una calle
    "Alfalfa": "Plaza de la Alfalfa", "Card. C. Amigo": "Calle Cardenal Carlos Amigo", "C. Carlos Amigo": "Calle Cardenal Carlos Amigo",
    "Pl. Duque": "Plaza del Duque de la Victoria", "P. J. de Córdoba": "Plaza Padre Jerónimo de Córdoba",
    "Sol": "Calle Sol", "Virgen del Sol": "Calle Virgen del Sol", "Plza. J. Pasión": "Plaza Jesús de la Pasión",
    "Pl. Jesús de la P.": "Plaza Jesús de la Pasión", "Granada": "Calle Granada", "Goya": "Calle Goya",
    "Aníbal González": "Calle Aníbal González", "Europa": "Avenida de Europa", "Placentines": "Calle Placentines",
    "Divino Perdón": None,
    "Postigo": POSTIGO, "Lonja de la Universidad": None,   # en el Llamador de Alcosa es la parroquia, no la calle (Carlos, 16/10/2026)
    "Alfonso XI": "Calle Alfonso XI", "C. del Rosario": "Calle Cuesta del Rosario", "José Laguillo": "Calle José Laguillo",
}
for k in ("J. L. de la Vega", "J. L. de la vega", "J. Lasso Vega", "J. Lasso de la V."):
    MANUAL[k] = "Calle Javier Lasso de la Vega"
for k in ("S. J. de la Palma", "San J. Palma", "San Juan de la Palma"):
    MANUAL[k] = "Calle San Juan de la Palma"

# Columnas que el extractor no lee bien (maquetación distinta): transcritas de la imagen del PDF.
# Cada lista empieza en la hora indicada y avanza media hora por fila; "" es una fila vacía.
def filas(inicio, textos):
    h, m = map(int, inicio.split(":"))
    t0 = h * 60 + m
    return [(t0 + 30 * k, t) for k, t in enumerate(textos) if t]

CORREGIDAS = {
    54: {"cruz": filas("0:30", ["Salida", "Jesús del Gran Poder", "Campana", "Plaza", "S. Miguel", "Palos", "Arfe",
                                 "Santas Patronas", "Gravina", "Pl. del Museo", "Entrada"]),
         "paso": filas("1:30", ["Salida", "Jesús del Gran Poder", "Campana", "Plaza", "S. Miguel", "Palos", "Arfe",
                                 "Santas Patronas", "Gravina", "Bailén", "Pl. del Museo", "Cardenal Spínola", "Entrada"])},
    55: {"cruz": filas("0:00", ["Salida", "Resolana", "Feria", "Correduría", "Trajano", "Campana", "Plaza", "S. Miguel",
                                 "Palos", "Francos", "Cuesta del Rosario", "Sales y Ferré", "Imagen", "S. Ángela de la Cruz",
                                 "Feria", "Feria", "Parras", "Muro", "Resolana", "Arco de la Macarena", "Entrada"]),
         "paso": filas("1:30", ["Salida", "Resolana", "Feria", "Correduría", "Trajano", "Pl. Duque", "Campana", "Plaza",
                                 "S. Miguel", "Palos", "Alemanes", "Francos", "Villegas", "Boteros", "S. Ángela de la Cruz",
                                 "S. Ángela de la Cruz", "Madre Mª Purísima", "Feria", "Feria", "Feria", "Parras", "Muro",
                                 "Resolana", "Arco de la Macarena", "Entrada"])},
    71: {"cruz": filas("8:30", ["Salida", "San Luis - Relator", "Alameda", "Conde de Barajas", "J. del Gran Poder", "Campana",
                                 "Plaza", "S. Miguel", "Palos", "Francos", "Jesús Tres Caídas", "Pl. Cristo de Burgos",
                                 "Bustos Tavera", "San Luis", "Entrada"]),
         "paso": filas("8:30", ["Salida", "San Luis", "Relator", "Alameda", "Conde de Barajas", "J. del Gran Poder", "Campana",
                                 "Plaza", "S. Miguel", "Palos", "Placentines", "Cuesta del Rosario", "Sales y Ferré",
                                 "Doña Mª Coronel", "Pl. San Marcos", "San Luis", "Entrada"])},
}
MANUAL.update({"San Luis - Relator": ["Calle San Luis", "Calle Relator"], "Arco de la Macarena": V(37.40330, -5.98955), "Madre Mª Purísima": "Calle Madre María de la Purísima"})

HORA = re.compile(r"\(?\b\d{1,2}[:.]\d\d\)?")

def minutos(t):
    h, m = map(int, t.split(":"))
    return h * 60 + m

def eje_minutos(eje):
    """[(y, 'hh:mm')] -> [(y, minutos crecientes)] (pasa la medianoche)."""
    out, extra, prev = [], 0, None
    for y, t in eje:
        m = minutos(t) + extra
        if prev is not None and m < prev:
            extra += 1440; m += 1440
        out.append((y, m)); prev = m
    return out

def hora_de(y, eje):
    for (y0, m0), (y1, m1) in zip(eje, eje[1:]):
        if y0 <= y <= y1 or y < y0:
            return m0 + (m1 - m0) * (y - y0) / ((y1 - y0) or 1)
    (y0, m0), (y1, m1) = eje[-2], eje[-1]
    return m1 + (m1 - m0) * (y - y1) / ((y1 - y0) or 1)

CO = {"campana", "plaza", "s miguel", "smiguel", "san miguel", "p san miguel", "p palos", "ppalos", "palos", "sierpes", "avenida"}

def limpia(t):
    """Quita horas y las palabras Salida/Entrada; devuelve (texto, marca) con marca 'salida', 'entrada' o ''."""
    marca = ""
    t = HORA.sub("", t).replace("+ INFO", "").strip(" -")
    t = re.sub(r"\(\d{1,2}[’'.]\d\d\)", "", t).strip()                      # «Palio (2’15)»
    t = re.sub(r"^(Entrada|Entra)\s+(cruz|paso|palio)\b", "Entrada", t, flags=re.I)
    if plano(t) in {"palio", "paso", "cruz", "paroquia", "parroquia"}:
        return "", ""
    if re.match(r"^(Salida|Sale)\b", t):
        marca, t = "salida", re.sub(r"^(Salida|Sale)\s*-?\s*", "", t)
    if re.search(r"-?\s*(Entrada|Entra|Entrda)$", t) or re.match(r"^(Entrada|Entra|Entrda)\b", t):
        marca = "entrada"
        t = re.sub(r"\s*-?\s*(Entrada|Entra|Entrda)$", "", re.sub(r"^(Entrada|Entra|Entrda)\b\s*", "", t))
    return t.strip(" -"), marca

def es_co(t):
    return " ".join(re.sub(r"[^a-z ]", "", plano(t).replace(".", " ")).split()) in CO or plano(t).replace(" ", "") in {"s.miguel", "p.palos"}

def columna(celdas):
    """[(min, texto)] -> lista de (min, texto, tramo) con tramo 'ida', 'co' o 'vuelta'."""
    out, estado = [], "ida"
    idx_campana = next((k for k, (_, t) in enumerate(celdas) if plano(limpia(t)[0]) == "campana"), None)
    idx_palos = max((k for k, (_, t) in enumerate(celdas) if "palos" in plano(limpia(t)[0]) and len(limpia(t)[0]) <= 8), default=None)
    for k, (m, t) in enumerate(celdas):
        texto, marca = limpia(t)
        if idx_campana is not None and idx_palos is not None and idx_campana <= k <= idx_palos:
            if not es_co(texto):
                print("   ? celda dentro de la carrera oficial ignorada:", t)
            out.append((m, "", "co")); continue
        tramo = "ida" if idx_campana is None or k < idx_campana else "vuelta"
        if texto:
            out.append((m, texto, tramo))
    return out

AREAS = {}   # nombre -> centro, de calles y plazas que OSM solo dibuja como superficie

def cargar_areas(ruta_osm):
    osm = json.load(open(ruta_osm))
    nodos = {e["id"]: (e["lat"], e["lon"]) for e in osm["elements"] if e["type"] == "node"}
    for e in osm["elements"]:
        t = e.get("tags", {})
        if e["type"] == "way" and "name" in t and (t.get("area") == "yes" or "area:highway" in t):
            pts = [nodos[n] for n in e["nodes"] if n in nodos]
            if pts:
                AREAS.setdefault(t["name"], []).extend(pts)
    for n, pts in AREAS.items():
        AREAS[n] = [round(sum(p[0] for p in pts) / len(pts), 6), round(sum(p[1] for p in pts) / len(pts), 6)]

def destino(texto, nombres_osm, faltan):
    if texto in MANUAL:
        d = MANUAL[texto]
        return [] if d is None else (d if isinstance(d, list) else [d])
    m, top = mejor(texto, nombres_osm)
    if not m:
        a, _ = mejor(texto, sorted(AREAS))
        if a:
            return [{"via": AREAS[a], "nombre": a}]
        faltan.append(texto); return []
    calle = next((n for n in top if n.startswith("Calle ")), top[0])
    return [calle]

_puntos = {}

def puntos_de(d, zona):
    """Puntos (hasta 80) que representan una calle o un punto de paso, solo cerca de la zona del recorrido."""
    clave = (json.dumps(d, ensure_ascii=False), tuple(zona) if zona else None)
    if clave not in _puntos:
        if isinstance(d, dict):
            pts = [tuple(d["via"])]
        else:
            ns = T.por_calle.get(T.norm(d), set()) & T.principal
            pts = [T.nodos[n] for n in ns]
            if zona:
                cerca = [q for q in pts if T.dist(q, zona) < 4000]
                pts = cerca or pts
        paso = max(1, len(pts) // 80)
        _puntos[clave] = sorted(pts)[::paso]
    return _puntos[clave]

def separacion(a, b, zona):
    if a is None or b is None:
        return 0
    pa = puntos_de(a, zona) if not isinstance(a, list) else [tuple(a)]
    pb = puntos_de(b, zona) if not isinstance(b, list) else [tuple(b)]
    if not pa or not pb:
        return 0
    return min(T.dist(x, y) for x in pa for y in pb)

def intercalar(A, B, inicio, fin, zona):
    """Une las listas de cruz (A) y paso (B), cada una en su orden, para que el camino sea lo más corto posible.
    Si las dos columnas nombran el mismo punto seguido, cuenta una vez. No deja adelantar más de una hora."""
    import functools
    clave = lambda d: json.dumps(d, ensure_ascii=False)
    @functools.lru_cache(None)
    def mejor_desde(i, j, ultimo):
        prev = inicio if ultimo is None else ultimo_obj[ultimo]
        if i == len(A) and j == len(B):
            return separacion(prev, fin, zona), ()
        opciones = []
        if i < len(A) and j < len(B) and clave(A[i][1]) == clave(B[j][1]):
            c, r = mejor_desde(i + 1, j + 1, ("A", i))
            opciones.append((separacion(prev, A[i][1], zona) + c, ((A[i][1], "AB"),) + r))
        if i < len(A) and not (j < len(B) and B[j][0] + 60 < A[i][0]):
            c, r = mejor_desde(i + 1, j, ("A", i))
            opciones.append((separacion(prev, A[i][1], zona) + c, ((A[i][1], "A"),) + r))
        if j < len(B) and not (i < len(A) and A[i][0] + 60 < B[j][0]):
            c, r = mejor_desde(i, j + 1, ("B", j))
            opciones.append((separacion(prev, B[j][1], zona) + c, ((B[j][1], "B"),) + r))
        return min(opciones, key=lambda o: o[0])
    ultimo_obj = {}
    for k, (_, d) in enumerate(A): ultimo_obj[("A", k)] = d
    for k, (_, d) in enumerate(B): ultimo_obj[("B", k)] = d
    return list(mejor_desde(0, 0, None)[1])

CAMPANA, PALOS = [37.39261, -5.99517], [37.38605, -5.99254]

def ordenar(cruz, paso, templo, nombres_osm, faltan):
    """Une cruz y paso de un programa en dos listas de destinos (ida y vuelta)."""
    c, p = columna(cruz), columna(paso)
    def primera(col, tramo):
        return next((m for m, _, tr in col if tr == tramo), None)
    if primera(c, "co") is not None and primera(p, "co") is not None:
        retraso = primera(p, "co") - primera(c, "co")   # lo que tarda el paso en llegar donde estaba la cruz
    else:
        retraso = (paso[0][0] - cruz[0][0]) if paso and cruz else 30
    def objetivos(col, desfase, tramo):
        out = []
        for m, t, tr in col:
            if tr == tramo:
                out += [(m - desfase, d) for d in destino(t, nombres_osm, faltan)]
        return out
    hay_co = any(tr == "co" for _, _, tr in c + p)
    ida = intercalar(objetivos(c, 0, "ida"), objetivos(p, retraso, "ida"), templo, CAMPANA if hay_co else templo, templo)
    vuelta = intercalar(objetivos(c, 0, "vuelta"), objetivos(p, retraso, "vuelta"), PALOS, templo, templo) if hay_co else []
    return ida, vuelta, hay_co, retraso

def rellenar(base, extra, anadidos):
    """Mete puntos de `extra` (Llamador 2025) entre dos puntos seguidos de `base` (programa 2026),
    solo si los dos aparecen también en `extra` y en el mismo orden. El principio y el final del tramo
    cuentan como puntos comunes. Así no se cuela un cambio de recorrido de 2025."""
    k = lambda x: json.dumps(x[0], ensure_ascii=False)
    ke = [k(d) for d in extra]
    anclas = [(-1, None)]
    pos = -1
    for d in base:
        try:
            pos2 = ke.index(k(d), pos + 1)
        except ValueError:
            anclas.append((None, d)); continue
        anclas.append((pos2, d)); pos = pos2
    anclas.append((len(extra), None))
    ya = {k(d) for d in base}
    out = []
    for (pa, da), (pb, db) in zip(anclas, anclas[1:]):
        if da is not None:
            out.append(da)
        if pa is not None and pb is not None and pb > pa + 1:
            for d in extra[pa + 1:pb]:
                if k(d) not in ya:
                    out.append((d[0], "L")); anadidos.append(d[0]); ya.add(k(d))
    return out

def cargar_llamador(rutas):
    """Columnas del Llamador 2025 con la hora de su fila (minutos, pasando la medianoche).
    En Vísperas el Llamador da una sola columna: va como cruz de guía y el paso queda vacío."""
    out = []
    grupos = [g for r in rutas for g in json.load(open(r))]
    for g in grupos:
        if not g["paso"] and JORNADA_LL.get(g["pagina"]) not in ("Viernes de Dolores", "Sábado de Pasión"):
            continue
        textos = [t for _, t in g["cruz"][1:] + g["paso"][1:]]
        if any(re.search(r"(CAMPANA|PLAZA|PALOS).*(CAMPANA|PLAZA|PALOS)|Salida", t) for t in textos):
            print("Llamador: columna descartada por ir mezclada con la vecina:", g["cabecera"][:50])
            continue
        for sub in ("cruz", "paso"):
            celdas, extra, prev = [], 0, None
            for h, t in g[sub]:
                m = minutos(h) + extra
                if prev is not None and m < prev - 600:
                    extra += 1440; m += 1440
                celdas.append((m, t)); prev = m
            g[sub] = celdas
        out.append(g)
    return out

JORNADA_LL = {8: "Viernes de Dolores", 14: "Sábado de Pasión", 15: "Sábado de Pasión", 22: "Domingo de Ramos", 23: "Domingo de Ramos", 24: "Domingo de Ramos", 31: "Lunes Santo", 32: "Lunes Santo",
              33: "Lunes Santo", 40: "Martes Santo", 41: "Martes Santo", 42: "Martes Santo", 49: "Miércoles Santo",
              50: "Miércoles Santo", 51: "Miércoles Santo", 58: "Jueves Santo", 59: "Jueves Santo", 60: "Jueves Santo",
              65: "Madrugada", 66: "Madrugada", 67: "Madrugada", 74: "Viernes Santo", 75: "Viernes Santo",
              76: "Viernes Santo", 80: "Sábado Santo", 81: "Sábado Santo", 82: "Domingo de Resurrección"}
OTRO_NOMBRE = {"Monte-Sión": "MONTESION", "La Soledad|Viernes Santo": "SAN BUENAVENTURA", "La Sagrada Mortaja": "LA MORTAJA",
               "Las Penas": "LA PENAS", "Cristo de la Corona": "CORONA", "Alcosa": "DIVINO PERDON",
               "S. José Obrero": "SAN JOSE OBRERO"}

def buscar_llamador(llamador, nombre, jornada):
    clave = OTRO_NOMBRE.get("%s|%s" % (nombre, jornada), OTRO_NOMBRE.get(nombre, nombre))
    q = {w for w in re.findall(r"[a-z]+", plano(clave)) if w not in {"el", "la", "los", "las", "de", "del", "y"}}
    for g in llamador:
        if JORNADA_LL.get(g["pagina"]) != jornada:
            continue
        cab = set(re.findall(r"[a-z]+", plano(g["cabecera"])))
        if q and q <= cab:
            return g
    return None

def coste(rec):
    """Metros del trazado más un castigo fuerte por cada metro de media vuelta."""
    sal, _ = T.trazar(rec)
    if sal is None:
        return 1e12
    linea = sal["features"][0]["geometry"]["coordinates"]
    _, vueltas = T.medias_vueltas(linea)
    return sal["features"][0]["properties"]["metros"] + 5 * vueltas

def mejorar_orden(rec, fuentes):
    """Prueba a cambiar de sitio dos puntos vecinos que vienen de columnas distintas (cruz / paso / Llamador)
    y se queda con el cambio si el trazado sale más corto y con menos medias vueltas.
    El orden dentro de cada columna no se toca."""
    pasos, fuentes, cambios = list(rec["pasos"]), list(fuentes), []
    mejor = coste(rec)
    for _ in range(3):
        mejora = False
        for k in range(len(pasos) - 1):
            fa, fb = fuentes[k], fuentes[k + 1]
            if "CO" in (fa, fb) or fa == fb or (set(fa) & set(fb) and "L" not in (fa, fb)):
                continue
            prueba = pasos[:k] + [pasos[k + 1], pasos[k]] + pasos[k + 2:]
            c = coste(dict(rec, pasos=prueba))
            if c < mejor - 1:
                nombre = lambda d: d if isinstance(d, str) else d.get("nombre", "punto")
                cambios.append("%s ↔ %s (%d → %d)" % (nombre(pasos[k]), nombre(pasos[k + 1]), mejor, c))
                pasos, mejor, mejora = prueba, c, True
                fuentes = fuentes[:k] + [fb, fa] + fuentes[k + 2:]
        if not mejora:
            break
    return pasos, cambios

def templos_osm(gs):
    """Templo de cada hermandad por su sede en la cabecera, contra los templos de OSM."""
    from nombres import fichas
    tem = [(e["tags"]["name"], (e.get("center") or e)["lat"], (e.get("center") or e)["lon"])
           for e in json.load(open(os.path.join(os.path.dirname(sys.argv[2]), "templos.json")))["elements"]]
    genericas = {"iglesia", "parroquia", "parr", "capilla", "cap", "basilica", "real", "colegial", "san", "santa",
                 "nuestra", "senora", "ntra", "sra"}
    for g in gs:
        partes = [p for p in g["cabecera"].split(" | ") if p.upper() != p]
        q = {p for p, _ in fichas(" ".join(partes[1:])) if p and p not in genericas}
        m = max(tem, key=lambda x: len(q & {p for p, _ in fichas(x[0])}))
        g["templo"] = [round(m[1], 5), round(m[2], 5)] if q & {p for p, _ in fichas(m[0])} else None
        g["templo_osm"] = m[0]

def main():
    gs = json.load(open(sys.argv[1]))
    templos_osm(gs)
    T.cargar(sys.argv[2])
    nombres_osm = sorted({n for vec in T.grafo.values() for _, _, _, n in vec if n and not n.startswith("[")})
    cargar_areas(sys.argv[2])
    os.makedirs(sys.argv[3], exist_ok=True)
    llamador = cargar_llamador(sys.argv[4:])
    indice = []
    for i, g in enumerate(gs):
        partes = [p for p in g["cabecera"].split(" | ") if p.upper() != p and not p.isdigit()]
        nombre = partes[0] if not partes[0].endswith(" y") else partes[0] + " " + partes[1]
        if i == 57: nombre = "La Esperanza de Triana"
        jornada = JORNADAS[g["pagina"]]
        if g["pagina"] == 2 and i >= 6: jornada = "Sábado de Pasión"
        if i == 71: jornada = "Domingo de Resurrección"
        if i in CORREGIDAS:
            cruz, paso = CORREGIDAS[i]["cruz"], CORREGIDAS[i]["paso"]
        else:
            eje = eje_minutos(g["eje"])
            cruz = [(hora_de(y, eje), t) for y, t in zip(g["cruz_y"], g["cruz"])]
            paso = [(hora_de(y, eje), t) for y, t in zip(g["paso_y"], g["paso"])]
        print("·", i, nombre, "·", jornada)
        clave_t = nombre if nombre in TEMPLOS else "%s|%d" % (nombre, g["pagina"])
        templo = TEMPLOS.get(clave_t, TEMPLOS.get(nombre, "osm"))
        if templo == "osm":
            templo = g.get("templo")
        faltan, faltan_ll = [], []
        ida, vuelta, hay_co, retraso = ordenar(cruz, paso, templo, nombres_osm, faltan)
        anadidos = []
        ll = buscar_llamador(llamador, nombre, jornada)
        if ll:
            ll_ida, ll_vuelta, ll_co, _ = ordenar(ll["cruz"], ll["paso"], templo, nombres_osm, faltan_ll)
            if ll_co == hay_co:
                ida = rellenar(ida, ll_ida, anadidos)
                vuelta = rellenar(vuelta, ll_vuelta, anadidos)
        pasos, fuentes = [], []
        for tramo, orden in (("ida", ida), ("vuelta", vuelta)):
            if tramo == "vuelta":
                if not hay_co:
                    break
                pasos += CARRERA; fuentes += ["CO"] * len(CARRERA)
            recientes = [json.dumps("Plaza de San Francisco")] if tramo == "vuelta" else []
            for d, fuente in orden:
                clave = json.dumps(d, ensure_ascii=False)
                if clave in recientes[-3:]:
                    continue
                pasos.append(d); fuentes.append(fuente); recientes.append(clave)
        rec = {"nombre": "%s · %s" % (nombre, jornada), "inicio": templo, "fin": templo, "pasos": pasos}
        if not templo:   # sin templo conocido: empieza y acaba en la primera calle
            rec["inicio"] = rec["fin"] = None
        rec["pasos"], cambios = mejorar_orden(rec, fuentes)
        pasos = rec["pasos"]
        if cambios:
            print("   orden corregido:", "; ".join(cambios))
        indice.append({"i": i, "nombre": nombre, "jornada": jornada, "pasos": pasos, "sin_casar": faltan,
                       "inicio": rec["inicio"], "retraso": retraso,
                       "llamador": {"cruz": [t for _, t in ll["cruz"]], "paso": [t for _, t in ll["paso"]]} if ll else None,
                       "anadidos_llamador": anadidos})
        if ll:
            print("   Llamador:", ll["cabecera"][:50], "· añadidos:", [d if isinstance(d, str) else d.get("nombre", "punto") for d in anadidos])
        else:
            print("   Llamador: no está")
        revisado = os.path.join(os.path.dirname(os.path.abspath(__file__)), "revisados", "%02d.json" % i)
        if os.path.exists(revisado):   # recorrido ya revisado a mano: manda sobre el generado
            rec = json.load(open(revisado)); indice[-1]["revisado"] = rec.get("revisado", True)
        json.dump(rec, open(os.path.join(sys.argv[3], "%02d.json" % i), "w"), ensure_ascii=False)
        if faltan:
            print("   sin casar:", faltan)
    json.dump(indice, open(os.path.join(sys.argv[3], "indice.json"), "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main()
