"""Borrador de los ocho CSV del modelo (docs/datos/*.csv) a partir del programa de mano y de las fichas del Llamador.

Se ejecuta dentro de la carpeta de trabajo, después de rehacer.sh (usa programa.json, osm/ y geo/).
Uso: venv/bin/python -I ../generar_csv.py programa.json LLAMADOR.pdf osm/sevilla.json AÑO ../.. (carpeta de los CSV)

Qué sale de dónde:
- punto_itinerario: solo del programa del Consejo (la fuente oficial). Cada celda de la columna de cruz de guía o
  de paso es un punto. Hora escrita en la celda («Campana 15:35») → hora_publicada = si; si no, la de su fila
  de media hora → hora_publicada = no.
- punto_geografico: cada lugar de esas celdas, una sola vez, con el punto de la calle por donde pasan los
  recorridos; más los templos y las dos puertas de la Catedral.
- hermandad, paso y templo: nombres del programa; el resto de las fichas del Llamador 2025 (sede, dirección,
  fundación, historia, web, nazarenos, minutos, hermanos y, por paso, imágenes, capataz y música).
  nombre_oficial no está en ningún PDF: se queda vacío para rellenarlo a mano.
"""
import csv, json, os, re, sys, glob, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generar as G
import trazador as T
from nombres import plano

PROGRAMA, LLAMADOR, OSM, ANIO, SALIDA = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), sys.argv[5]

# Fechas de 2026 (para otro año, cambiarlas)
FECHAS = {"Viernes de Dolores": "2026-03-27", "Sábado de Pasión": "2026-03-28", "Domingo de Ramos": "2026-03-29",
          "Lunes Santo": "2026-03-30", "Martes Santo": "2026-03-31", "Miércoles Santo": "2026-04-01",
          "Jueves Santo": "2026-04-02", "Madrugada": "2026-04-03", "Viernes Santo": "2026-04-03",
          "Sábado Santo": "2026-04-04", "Domingo de Resurrección": "2026-04-05"}
JORNADA_ID = {"Viernes de Dolores": 1, "Sábado de Pasión": 2, "Domingo de Ramos": 3, "Lunes Santo": 4,
              "Martes Santo": 5, "Miércoles Santo": 6, "Jueves Santo": 7, "Madrugada": 8, "Viernes Santo": 9,
              "Sábado Santo": 10, "Domingo de Resurrección": 11}
# Nombre popular cuando el programa repite o abrevia
NOMBRE = {"S. José Obrero": "San José Obrero", "La Soledad|Viernes Santo": "La Soledad de San Buenaventura",
          "La Soledad|Sábado Santo": "La Soledad de San Lorenzo", "La Sagrada Mortaja": "La Sagrada Mortaja"}
# Puntos de paso sin calle en OSM: su nombre
NOMBRE_VIA = {(37.38526, -5.99497): "Postigo del Aceite", (37.38437, -5.98677): "Jardines de Murillo",
              (37.37718, -5.97077): "Parque de María Luisa · Parque García Lorca", (37.38257, -6.00093): "Plazuela de Santa Ana",
              (37.37787, -5.98805): "Plaza de España (Torre Norte)", (37.37588, -5.98684): "Plaza de España (Torre Sur)",
              (37.37721, -5.9866): "Plaza de España", (37.39361, -5.98809): "Plaza de los Terceros",
              (37.38786, -5.99795): "Plaza de Molviedro", (37.39393, -5.99376): "Plaza de San Andrés",
              (37.38497, -5.98415): "Puente de San Bernardo", (37.4033, -5.98955): "Arco de la Macarena",
              (37.39261, -5.99517): "La Campana"}
NOMBRE_VIA[(37.37718, -5.97077)] = "Parque Federico García Lorca"
# Erratas del programa: (columna, salida, texto de la celda) -> hora corregida. Se anotan aquí y la hora queda
# como no publicada (hora_publicada = no), para no sobrescribir el documento en silencio.
ERRATAS = {(34, "ultimo_paso", "Plaza 20:26"): ("22:26", "entre la Campana a las 21:49 y San Miguel a las 22:51")}

PUERTA_SAN_MIGUEL = ("Catedral · Puerta de San Miguel", [37.38551, -5.99381])
PUERTA_PALOS = ("Catedral · Puerta de los Palos", [37.38605, -5.99254])

# ---------- aportaciones a mano (docs/datos/recorridos/aportes/) ----------
AQUI = os.path.dirname(os.path.abspath(__file__))
APORTE_HERMANDADES = os.path.join(AQUI, "aportes", "hermandades_carlos.csv")
# Datos de la aportación que no se usan, tras revisarla con Carlos (19/10/2026)
DESCARTAR = {("La Paz", "historia"): "es la misma que la de La Hiniesta (copiar y pegar)",
             ("El Amor", "numero_nazarenos"): "son las cifras de la Borriquita", ("El Amor", "duracion_cortejo"): "ídem",
             ("Bendición y Esperanza", "templo"): "es una frase, no el nombre del templo"}
# Hermandades que en 2026 no salen de su sede: la hermandad lleva la sede y el itinerario el templo de salida.
# Coordenadas de la sede, de OpenStreetMap.
SEDE_DISTINTA = {"Las Cigarreras": [37.37758, -5.99550], "La Hiniesta": [37.39880, -5.98522],
                 "Pasión y Muerte": [37.38058, -6.00765]}
WEB = {"divinoperdon.es": "https://divinoperdon.es", "hermandadlosnegritos.or": "https://hermandadlosnegritos.org"}

def nombre_templo(t):
    """Limpia el nombre de templo pegado a mano: saltos de línea, punto final y dos nombres pegados
    («Iglesia de San Antonio AbadReal Iglesia de San Antonio Abad» → el más largo)."""
    t = limpio(t.replace("\n", " "))
    partes = [p for p in re.split(r"(?<=[a-zá-úñ\.])(?=(?:Real |Iglesia|Basílica|Capilla|Parroquia|Convento)\b)", t) if p.strip()]
    if len(partes) > 1:
        t = max((limpio(p) for p in partes), key=len)
    return t

def aporte_hermandades():
    """{(id, nombre del generador): {campo: valor}} de la pestaña «Hermandades» que rellenó Carlos."""
    if not os.path.exists(APORTE_HERMANDADES):
        return {}
    col = {"Hermandad": "nombre", "Templo": "templo", "Nombre oficial": "nombre_oficial", "Web": "web",
           "Fundación (año)": "fundacion", "Nº de hermanos": "numero_hermanos", "Nº de nazarenos": "numero_nazarenos",
           "Duración del cortejo (minutos)": "duracion_cortejo", "Historia (2 o 3 frases)": "historia",
           "Fuente": "fuente", "Notas": "notas"}
    out = {}
    for f in csv.DictReader(open(APORTE_HERMANDADES, encoding="utf-8-sig")):
        d = {c: limpio(f.get(k) or "") for k, c in col.items()}
        out[(f["Nº"].strip(), plano(d["nombre"]))] = d
    return out

def limpio(s):
    return re.sub(r"\s+", " ", s).strip(" .")

# ---------- fichas del Llamador ----------
def fichas_llamador(ruta):
    """Fichas de las hermandades del Llamador. El PDF se lee entero como un solo texto, columna a columna,
    y se parte en cada «Sede:»: así una ficha que sigue en la página siguiente no pierde sus datos."""
    import fitz
    d = fitz.open(ruta)
    dias = ["VIERNES DE DOLORES", "SÁBADO DE PASIÓN", "DOMINGO DE RAMOS", "LUNES SANTO", "MARTES SANTO",
            "MIÉRCOLES SANTO", "JUEVES SANTO", "MADRUGADA", "VIERNES SANTO", "SÁBADO SANTO", "DOMINGO DE RESURRECCIÓN"]
    trozos = []   # (página, jornada, cabeceras, texto) en orden de lectura
    for p in d:
        t = p.get_text()
        dia = next((x for x in sorted(dias, key=len, reverse=True) if x in t), None)
        jornada = next((j for j in JORNADA_ID if plano(j) == plano(dia or "")), None)
        cabeceras = [l.strip() for l in t.splitlines() if l.strip() and l.strip().upper() == l.strip()
                     and re.search(r"[A-ZÁÉÍÓÚÑ]{3}", l) and not re.search(r"\d", l)]
        W = p.rect.width
        bloques = sorted(p.get_text("blocks"), key=lambda b: (round(b[0] / (W / 3)), b[1]))
        texto = re.sub(r"-\n", "", "\n".join(b[4] for b in bloques)).replace("\n", " ")
        trozos.append((p.number + 1, jornada, cabeceras, texto))
    out = []
    actual = None
    for pagina, jornada, cabeceras, texto in trozos:
        partes = re.split(r"(?=Sede:)", texto)
        if actual is not None:
            actual["texto"] += " " + partes[0]
        for parte in partes[1:]:
            actual = {"pagina": pagina, "jornada": jornada, "cabeceras": cabeceras, "texto": parte}
            out.append(actual)
    for f in out:
        bloque = f.pop("texto")
        m = re.search(r"Sede:\s*(.+?)\s*(?:Dirección:|Año (?:de )?fundación:)", bloque)
        f["sede"] = limpio(re.split(r"\.\s+Sale\b", m.group(1))[0]) if m else ""
        m = re.search(r"Dirección:\s*(.+?)\s*(?:Año (?:de )?fundación:|Síntesis)", bloque)
        f["direccion"] = limpio(m.group(1)) if m else ""
        m = re.search(r"Año (?:de )?fundación:\s*(.+?)\.(?:\s|$)", bloque); f["fundacion"] = limpio(m.group(1)) if m else ""
        m = re.search(r"Síntesis histórica:\s*(.+?)(?=Música|Primer paso|Un paso|1 paso|$)", bloque)
        f["historia"] = limpio(m.group(1)) if m else ""
        m = re.search(r"([\d.]+)\s*nazarenos[^/]{0,45}/\s*(\d+)\s*mi(?:nutos|n|\.)?\s*/\s*([\d.]+)\s*(?:hermanos|hnos)", bloque)
        if m:
            f["nazarenos"], f["minutos"], f["hermanos"] = m.group(1).replace(".", ""), m.group(2), m.group(3).replace(".", "")
        m = re.search(r"Página web:\s*(\S+)", bloque); f["web"] = m.group(1).rstrip(".") if m else ""
        partes = re.split(r"((?:Primer|Segundo|Tercer|Un|1)\s+[Pp]aso\s*/\s*\d+\s*costaleros\.?)", bloque)
        pasos = []
        for k in range(1, len(partes), 2):
            cuerpo = re.split(r"(?:Estrenos|De interés|[\d.]+\s*nazarenos|HORAS)", partes[k + 1])[0]
            capataz = re.search(r"Capata(?:z|ces):\s*(.+?)\.(?:\s|$)", cuerpo)
            musica = re.search(r"Música:\s*(.+?)\.(?:\s|$)", cuerpo)
            autor = re.split(r"Capata(?:z|ces):|Música:", cuerpo)[0]
            autor = limpio(re.sub(r"^Autor de las imágenes:\s*", "", limpio(autor)))
            pasos.append({"costaleros": re.search(r"(\d+)\s*costaleros", partes[k]).group(1), "autor": autor,
                          "capataz": limpio(capataz.group(1)) if capataz else "",
                          "musica": limpio(musica.group(1)) if musica else ""})
        f["pasos"] = pasos
    return out

def casar_fichas(fichas, salidas):
    """Cada salida del programa con su ficha del Llamador: misma jornada, sede parecida (comparada sin espacios
    ni guiones, «Monte-Sión» = «Montesión») y el nombre en la cabecera de la página. Se asignan primero las parejas
    más claras, para que una ficha no se la quede otra hermandad de la misma página."""
    genericas = {"iglesia", "parroquia", "parr", "capilla", "cap", "basilica", "colegial", "santa", "senora",
                 "nuestra", "ntra", "sra", "san", "real", "del", "los", "las", "conventual", "convento"}
    candidatas = []
    for si, s in enumerate(salidas):
        q = [w for w in re.findall(r"[a-z]+", plano(s["sede"])) if w not in genericas and len(w) > 1]
        nom = [w for w in re.findall(r"[a-z]+", plano(G.OTRO_NOMBRE.get(s["nombre_programa"], s["nombre_programa"])))
               if w not in {"el", "la", "los", "las", "del", "de", "y"}]
        for k, f in enumerate(fichas):
            if f["jornada"] != s["jornada"]:
                continue
            sede = re.sub(r"[^a-z]", "", plano(f["sede"]))
            cab = re.sub(r"[^a-z]", "", plano(" ".join(f["cabeceras"])))
            p = 2 * sum(1 for w in q if w in sede) + (3 if nom and "".join(nom) in cab else 0)
            if p > 0:
                candidatas.append((p, si, k))
    usadas_s, usadas_f = set(), set()
    for p, si, k in sorted(candidatas, reverse=True):
        if si in usadas_s or k in usadas_f:
            continue
        salidas[si]["ficha"] = fichas[k]; usadas_s.add(si); usadas_f.add(k)
    for si, s in enumerate(salidas):
        if si not in usadas_s:
            s["ficha"] = None
    return [f for k, f in enumerate(fichas) if k not in usadas_f]

def expandir(s):
    s = re.sub(r"\b[Pp]arrq?\.\s*", "Parroquia de ", s)
    s = re.sub(r"\bNtra\.\s*Sra\.\s*", "Nuestra Señora ", s)
    s = re.sub(r"\b[Cc]ap\.\s*", "Capilla ", s)
    s = re.sub(r"\bS\.\s+(?=[A-ZÁÉÍÓÚ])", "San ", s)
    return re.sub(r"\bde del\b", "del", re.sub(r"\s+", " ", s)).strip()

# ---------- puntos geográficos ----------
TIPO = [(r"^(plaza|plazuela|glorieta|pza)", "plaza"), (r"^puente", "puente"), (r"^(calle|avenida|paseo|ronda|pasaje|travesia|carretera|callejon)", "calle")]
def tipo_de(nombre):
    p = plano(nombre)
    return next((t for r, t in TIPO if re.match(r, p)), "otro")

def nombre_punto(d):
    if isinstance(d, str):
        return re.sub(r"^Calle ", "", d)
    clave = (round(d["via"][0], 5), round(d["via"][1], 5))
    return d.get("nombre") or NOMBRE_VIA.get(clave) or "Punto %.5f, %.5f" % clave

def main():
    gs = json.load(open(PROGRAMA))
    sys.argv[2:3] = [OSM]   # templos_osm busca templos.json junto al callejero
    G.templos_osm(gs)
    T.cargar(OSM)
    nombres_osm = sorted({n for vec in T.grafo.values() for _, _, _, n in vec if n and not n.startswith("[")})
    G.cargar_areas(OSM)
    indice = {r["i"]: r for r in json.load(open("rec/indice.json"))}
    # vértices de los recorridos por calle, para elegir el punto representativo donde pasan las cofradías
    por_calle_ruta = {}
    for f in glob.glob("geo/[0-9]*.geojson"):
        for t in json.load(open(f))["tramos"]:
            por_calle_ruta.setdefault(t["properties"]["calle"], []).extend(t["geometry"]["coordinates"])

    # nodos donde se cruzan calles con nombres distintos
    cruce = {}
    for n, vec in T.grafo.items():
        nombres = {nom for _, _, nn, nom in vec if nn}
        if len(nombres) > 1:
            cruce[(round(T.nodos[n][0], 6), round(T.nodos[n][1], 6))] = True
    puntos, ids_punto = [], {}
    def punto(nombre, tipo, coords):
        clave = plano(nombre)
        if clave not in ids_punto:
            ids_punto[clave] = len(puntos) + 1
            puntos.append({"id": len(puntos) + 1, "nombre": nombre, "tipo": tipo,
                           "latitud": "%.5f" % coords[0] if coords else "", "longitud": "%.5f" % coords[1] if coords else ""})
        return ids_punto[clave]

    def punto_de_destino(d):
        if isinstance(d, str):
            vs = por_calle_ruta.get(d)
            if vs:   # el vértice del recorrido más cercano al centro de lo recorrido por esa calle,
                     # evitando los cruces (un nodo que comparten dos calles daría el mismo punto a las dos)
                propios = [v for v in vs if not cruce.get((round(v[1], 6), round(v[0], 6)))]
                vs = propios or vs
                c = (sum(v[1] for v in vs) / len(vs), sum(v[0] for v in vs) / len(vs))
                v = min(vs, key=lambda v: T.dist((v[1], v[0]), c))
                coords = (v[1], v[0])
            else:
                ns = [T.nodos[n] for n in T.por_calle.get(T.norm(d), ())]
                coords = min(ns, key=lambda q: T.dist(q, (sum(x[0] for x in ns) / len(ns), sum(x[1] for x in ns) / len(ns)))) if ns else None
            return punto(nombre_punto(d), tipo_de(d), coords)
        n = nombre_punto(d)
        return punto(n, tipo_de(n) if tipo_de(n) != "otro" else ("plaza" if "plaza" in plano(n) else "otro"), d["via"])

    # ---------- salidas del programa ----------
    salidas = []
    for i, g in enumerate(gs):
        meta = indice[i]
        nombre = NOMBRE.get("%s|%s" % (meta["nombre"], meta["jornada"]), NOMBRE.get(meta["nombre"], meta["nombre"]))
        partes = [p for p in g["cabecera"].split(" | ") if p.upper() != p and not p.isdigit()]
        sede = " ".join(partes[1:]) if not partes[0].endswith(" y") else " ".join(partes[2:])
        salidas.append({"i": i, "nombre": nombre, "nombre_programa": meta["nombre"], "jornada": meta["jornada"],
                        "sede": sede, "templo": meta["inicio"], "g": g})
    fichas = fichas_llamador(LLAMADOR)
    sobrantes = casar_fichas(fichas, salidas)

    # ---------- aportación de Carlos: casar cada fila con su salida ----------
    aporte = aporte_hermandades()
    for k, s in enumerate(salidas, 1):
        a = aporte.get((str(k), plano(s["nombre"])))
        if a is None:   # renombrada a mano («Salud y Clemencia (Padre Pío)») o sin número («El Carmen»)
            a = next((v for (n, nom), v in aporte.items() if n == str(k)), None) or \
                next((v for (n, nom), v in aporte.items() if nom == plano(s["nombre"])), None)
        s["aporte"] = a or {}
        for campo in list(s["aporte"]):
            if (s["nombre"], campo) in DESCARTAR:
                print("   aportación descartada: %s · %s (%s)" % (s["nombre"], campo, DESCARTAR[(s["nombre"], campo)]))
                s["aporte"][campo] = ""
        if s["aporte"].get("nombre") and s["aporte"]["nombre"] != s["nombre"]:
            print("   nombre cambiado a mano: %s → %s" % (s["nombre"], s["aporte"]["nombre"]))
            s["nombre"] = s["aporte"]["nombre"]

    # ---------- templos: la sede de cada hermandad y el templo del que sale en 2026 ----------
    templos, id_templo, nombres_t = [], {}, {}
    def templo(nombre_t, coords, direccion):
        clave = tuple(round(x, 4) for x in coords) if coords else plano(nombre_t)
        nombres_t.setdefault(clave, []).append(nombre_t)
        if clave not in id_templo:
            id_templo[clave] = len(templos) + 1
            templos.append({"id": len(templos) + 1, "nombre": nombre_t, "direccion": direccion, "coords": coords})
        elif direccion and not templos[id_templo[clave] - 1]["direccion"]:
            templos[id_templo[clave] - 1]["direccion"] = direccion
        return id_templo[clave]
    for s in salidas:
        f = s["ficha"]
        de_ficha = expandir((f["sede"][:1].upper() + f["sede"][1:]) if f and f["sede"] else s["sede"])
        direccion = (f["direccion"][:1].upper() + f["direccion"][1:]) if f and f["direccion"] else ""
        a_mano = nombre_templo(s["aporte"].get("templo", ""))
        if s["nombre"] in SEDE_DISTINTA or s["aporte"].get("nombre") in SEDE_DISTINTA:
            sede = SEDE_DISTINTA.get(s["nombre"])
            s["templo_id"] = templo(a_mano or de_ficha, sede, direccion)                        # la hermandad: su sede
            s["salida_templo_id"] = templo(expandir(s["sede"]), s["templo"], "")               # el itinerario: de donde sale
        else:
            s["templo_id"] = s["salida_templo_id"] = templo(a_mano or de_ficha, s["templo"], direccion)
    for t in templos:   # el nombre puesto a mano manda; si hay varios, el más largo
        clave = next(c for c, i in id_templo.items() if i == t["id"])
        t["nombre"] = max(nombres_t[clave], key=len)
        t["punto_geografico_id"] = punto(t["nombre"], "templo", t.pop("coords"))
    for s in salidas:
        s["templo_punto"] = templos[s["salida_templo_id"] - 1]["punto_geografico_id"]

    # ---------- hermandades, pasos, salidas ----------
    hermandades, pasos, salidas_csv = [], [], []
    for s in salidas:
        f = s["ficha"] or {}
        a = s["aporte"]
        hid = len(hermandades) + 1
        fila = {"id": hid, "nombre": s["nombre"], "nombre_oficial": "", "templo_id": s["templo_id"],
                "escudo": "", "web": f.get("web", ""), "historia": f.get("historia", ""),
                "fundacion": f.get("fundacion", ""), "numero_hermanos": f.get("hermanos", ""),
                "numero_nazarenos": f.get("nazarenos", ""), "duracion_cortejo": f.get("minutos", "")}
        for campo in ("nombre_oficial", "web", "historia", "fundacion", "numero_hermanos", "numero_nazarenos", "duracion_cortejo"):
            if a.get(campo):   # lo puesto a mano manda sobre el Llamador
                fila[campo] = a[campo]
        fila["web"] = WEB.get(fila["web"], fila["web"])
        hermandades.append(fila)
        lista = f.get("pasos", [])
        if len(lista) > 3:   # la ficha se ha mezclado con la de al lado: mejor vacío que mal
            print("   pasos sin rellenar (la ficha trae %d, mezclada con otra): %s" % (len(lista), s["nombre"]))
            lista = []
        for k, p in enumerate(lista, 1):
            nombre_p = "Paso" if len(lista) == 1 else ["Primer paso", "Segundo paso", "Tercer paso"][k - 1]
            pasos.append({"id": len(pasos) + 1, "hermandad_id": hid, "nombre": nombre_p, "orden": k,
                          "autor": p["autor"], "capataz": p["capataz"], "musica": p["musica"], "fotografia": ""})
        s["hermandad_id"] = hid
        s["salida_id"] = len(salidas_csv) + 1
        salidas_csv.append({"id": s["salida_id"], "hermandad_id": hid, "edicion_id": 1,
                            "jornada_id": JORNADA_ID[s["jornada"]], "estado": ""})

    # ---------- punto_itinerario ----------
    from datetime import datetime, timedelta
    itinerario, ignoradas = [], []
    p_campana = punto("La Campana", "plaza", [37.39261, -5.99517])
    p_sierpes = punto_de_destino("Calle Sierpes")
    p_plaza = punto_de_destino("Plaza de San Francisco")
    p_sanmiguel = punto(PUERTA_SAN_MIGUEL[0], "otro", PUERTA_SAN_MIGUEL[1])
    p_palos = punto(PUERTA_PALOS[0], "otro", PUERTA_PALOS[1])
    for s in salidas:
        g, i = s["g"], s["i"]
        if i in G.CORREGIDAS:
            columnas = {"cruz_guia": G.CORREGIDAS[i]["cruz"], "ultimo_paso": G.CORREGIDAS[i]["paso"]}
        else:
            eje = G.eje_minutos(g["eje"])
            columnas = {"cruz_guia": [(G.hora_de(y, eje), t) for y, t in zip(g["cruz_y"], g["cruz"])],
                        "ultimo_paso": [(G.hora_de(y, eje), t) for y, t in zip(g["paso_y"], g["paso"])]}
        base = datetime.strptime(FECHAS[s["jornada"]], "%Y-%m-%d")
        for ref, celdas in columnas.items():
            orden, ultimo, ultimo_mm = 0, None, None
            for m, texto in celdas:
                fila = round(m / 30) * 30
                hora = re.search(r"\b(\d{1,2})[:.](\d\d)\b", texto)
                errata = ERRATAS.get((i, ref, texto))
                if errata:
                    print("   errata corregida: %s, %s «%s» → %s (%s)" % (s["nombre"], ref, texto, errata[0], errata[1]))
                    texto_hora = errata[0]
                    hora = re.search(r"(\d{1,2}):(\d\d)", texto_hora)
                if hora:   # la hora escrita en la celda, en el día más cercano a su fila
                    mm = int(hora.group(1)) * 60 + int(hora.group(2))
                    mm = min((mm + k * 1440 for k in (-1, 0, 1, 2)), key=lambda x: abs(x - fila))
                    publicada = "no" if errata else "si"
                else:
                    # la hora de su fila; nunca antes que el punto anterior (la fila puede caer antes que una hora escrita)
                    mm, publicada = max(fila, ultimo_mm if ultimo_mm is not None else fila), "no"
                ultimo_mm = mm
                t, marca = G.limpia(texto)
                if not t and not marca:
                    continue   # «+ INFO» y celdas vacías
                plano_t = " ".join(re.sub(r"[^a-z ]", "", plano(t).replace(".", " ")).split())
                if marca in ("salida", "entrada") and not t:
                    ids = [s["templo_punto"]]
                elif plano_t == "campana": ids = [p_campana]
                elif plano_t == "sierpes": ids = [p_sierpes]
                elif plano_t == "plaza": ids = [p_plaza]
                elif plano_t in ("s miguel", "smiguel", "p san miguel") or (plano_t == "san miguel" and hora):
                    ids = [p_sanmiguel]   # «San Miguel» sin hora fuera de la carrera oficial es la calle
                elif plano_t in ("palos", "p palos", "ppalos"): ids = [p_palos]
                else:
                    falta = []
                    ids = [punto_de_destino(d) for d in G.destino(t, nombres_osm, falta)]
                    if marca in ("salida", "entrada"):
                        ids = [s["templo_punto"]] + ids if marca == "salida" else ids + [s["templo_punto"]]
                    if not ids:
                        ignoradas.append("%s · %s: «%s»" % (s["nombre"], ref, texto)); continue
                for pid in ids:
                    if ultimo == pid:
                        continue
                    orden += 1; ultimo = pid
                    fecha = base + timedelta(minutes=mm)
                    itinerario.append({"id": len(itinerario) + 1, "salida_procesional_id": s["salida_id"],
                                       "punto_geografico_id": pid, "referencia": ref,
                                       "fecha_hora": fecha.strftime("%Y-%m-%dT%H:%M"), "hora_publicada": publicada,
                                       "orden": orden})

    # ---------- escribir ----------
    tablas = {
        "punto_geografico": (["id", "nombre", "tipo", "latitud", "longitud"], puntos),
        "templo": (["id", "nombre", "direccion", "punto_geografico_id"], templos),
        "hermandad": (["id", "nombre", "nombre_oficial", "templo_id", "escudo", "web", "historia", "fundacion",
                       "numero_hermanos", "numero_nazarenos", "duracion_cortejo"], hermandades),
        "paso": (["id", "hermandad_id", "nombre", "orden", "autor", "capataz", "musica", "fotografia"], pasos),
        "edicion": (["id", "anio"], [{"id": 1, "anio": ANIO}]),
        "salida_procesional": (["id", "hermandad_id", "edicion_id", "jornada_id", "estado"], salidas_csv),
        "punto_itinerario": (["id", "salida_procesional_id", "punto_geografico_id", "referencia", "fecha_hora",
                              "hora_publicada", "orden"], itinerario),
    }
    for t, (cols, filas) in tablas.items():
        with open(os.path.join(SALIDA, t + ".csv"), "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=cols, lineterminator="\n")
            w.writeheader(); w.writerows(filas)
        print("%-22s %5d filas" % (t + ".csv", len(filas)))
    sin_ficha = [s["nombre"] for s in salidas if not s["ficha"]]
    print("sin ficha del Llamador:", sin_ficha)
    print("fichas del Llamador sin salida en el programa:", [(f["jornada"], f["sede"][:40]) for f in sobrantes])
    print("celdas ignoradas:", len(ignoradas)); [print("  ", x) for x in ignoradas]
    print("puntos sin coordenadas:", [p["nombre"] for p in puntos if not p["latitud"]])

if __name__ == "__main__":
    main()
