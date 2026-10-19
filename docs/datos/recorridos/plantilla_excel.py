"""Crea el Excel para completar a mano los datos que no están en los PDF (nombre oficial, pasos, cifras, webs, templos).
Lo que ya tenemos va escrito en gris; los huecos que faltan, en amarillo.
Uso (con openpyxl): python -I plantilla_excel.py ../../ aportes/datos_pendientes_2026.xlsx"""
import csv, os, sys, collections
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

DATOS, SALIDA = sys.argv[1], sys.argv[2]
r = lambda t: list(csv.DictReader(open(os.path.join(DATOS, t + ".csv"), encoding="utf-8")))
H, P, T, G, S, J = r("hermandad"), r("paso"), r("templo"), r("punto_geografico"), r("salida_procesional"), r("jornada")
jornada = {s["hermandad_id"]: {j["id"]: j["nombre"] for j in J}[s["jornada_id"]] for s in S}
puntos = {g["id"]: g for g in G}
templos = {t["id"]: t for t in T}

AMARILLO = PatternFill("solid", fgColor="FFF2B3")
GRIS = PatternFill("solid", fgColor="EFEFEF")
CABECERA = PatternFill("solid", fgColor="7D1F2E")
fina = Side(style="thin", color="D0CCC6")
BORDE = Border(left=fina, right=fina, top=fina, bottom=fina)

wb = Workbook()

def hoja(nombre, columnas, filas, rellenar, anchos):
    """columnas: [(clave, título)]; rellenar: claves que se piden (amarillo si están vacías)."""
    ws = wb.create_sheet(nombre)
    for c, (_, titulo) in enumerate(columnas, 1):
        celda = ws.cell(row=1, column=c, value=titulo)
        celda.font = Font(bold=True, color="FFFFFF"); celda.fill = CABECERA
        celda.alignment = Alignment(wrap_text=True, vertical="center")
    for f, fila in enumerate(filas, 2):
        for c, (clave, _) in enumerate(columnas, 1):
            v = fila.get(clave, "")
            celda = ws.cell(row=f, column=c, value=int(v) if isinstance(v, str) and v.isdigit() and clave in
                            ("id", "orden", "hermandad_id", "templo_id", "numero_hermanos", "numero_nazarenos", "duracion_cortejo") else v)
            celda.border = BORDE
            celda.alignment = Alignment(wrap_text=True, vertical="top")
            if clave in rellenar and (v in ("", None)):
                celda.fill = AMARILLO
            elif clave not in rellenar:
                celda.fill = GRIS
    for c, ancho in enumerate(anchos, 1):
        ws.column_dimensions[get_column_letter(c)].width = ancho
    ws.freeze_panes = "C2"
    ws.row_dimensions[1].height = 32
    return ws

# 1. Instrucciones
ws = wb.active
ws.title = "Cómo rellenar"
texto = [
    ("Datos que faltan · Cofradar 2026", True),
    ("", False),
    ("Rellena solo las celdas AMARILLAS. Lo gris ya lo tenemos (del programa del Consejo y del Llamador 2025): no hace falta tocarlo,", False),
    ("pero si ves algo mal, corrígelo y escribe en «Notas» qué has cambiado.", False),
    ("", False),
    ("Si no encuentras un dato, déjalo en blanco. Mejor vacío que inventado.", False),
    ("En «Fuente» pon de dónde sale (la web de la hermandad, el Consejo, un periódico…). Si son varias, sepáralas con «;».", False),
    ("", False),
    ("Hojas:", True),
    ("1. Hermandades · el nombre oficial de las 72 (obligatorio) y los datos que faltan de algunas.", False),
    ("2. Pasos · el nombre de cada paso y sus imágenes titulares, en el orden en que salen.", False),
    ("     Las hermandades que no tienen pasos traen tres filas vacías: usa las que necesites y deja el resto en blanco.", False),
    ("     Si sobra o falta una fila de una hermandad, añádela o bórrala sin miedo.", False),
    ("3. Templos · la dirección y la ubicación de los templos que no están en el mapa.", False),
    ("     Para la ubicación: en Google Maps, clic derecho sobre la puerta → se copian los dos números (ej.: 37.39008, -5.99267).", False),
    ("4. Lugares (opcional) · puntos del programa que no encuentro en el mapa.", False),
    ("", False),
    ("Ejemplos:", True),
    ("Nombre oficial: «Pontificia, Real e Ilustre Hermandad Sacramental y Cofradía de Nazarenos de …»", False),
    ("Paso: nombre «Paso de misterio» · titulares «Nuestro Padre Jesús de la Sagrada Entrada en Jerusalén»", False),
    ("Duración del cortejo: los minutos que tarda en pasar entero por un mismo sitio (ej.: 45).", False),
    ("", False),
    ("Cuando acabes, guarda el archivo con el mismo nombre y avisa: los datos se cargan solos en los CSV.", False),
]
for f, (t, negrita) in enumerate(texto, 1):
    c = ws.cell(row=f, column=1, value=t)
    c.font = Font(bold=negrita, size=14 if f == 1 else 11)
ws.column_dimensions["A"].width = 130

# 2. Hermandades
filas = []
for h in H:
    filas.append(dict(h, jornada=jornada[h["id"]], templo=templos[h["templo_id"]]["nombre"], fuente="", notas=""))
hoja("1. Hermandades",
     [("id", "Nº"), ("nombre", "Hermandad"), ("jornada", "Jornada"), ("templo", "Templo"),
      ("nombre_oficial", "Nombre oficial"), ("web", "Web"), ("fundacion", "Fundación (año)"),
      ("numero_hermanos", "Nº de hermanos"), ("numero_nazarenos", "Nº de nazarenos"),
      ("duracion_cortejo", "Duración del cortejo (minutos)"), ("historia", "Historia (2 o 3 frases)"),
      ("fuente", "Fuente"), ("notas", "Notas")],
     filas,
     {"nombre_oficial", "web", "fundacion", "numero_hermanos", "numero_nazarenos", "duracion_cortejo", "historia", "fuente", "notas"},
     [5, 24, 18, 30, 50, 30, 12, 12, 12, 14, 60, 30, 30])

# 3. Pasos
por_h = collections.defaultdict(list)
for p in P:
    por_h[p["hermandad_id"]].append(p)
filas = []
for h in H:
    lista = por_h.get(h["id"])
    if lista:
        for p in lista:
            filas.append({"hermandad_id": h["id"], "hermandad": h["nombre"], "orden": p["orden"], "nombre": "",
                          "titulares": "", "pista": p["autor"], "capataz": p["capataz"], "musica": p["musica"]})
    else:
        for k in (1, 2, 3):
            filas.append({"hermandad_id": h["id"], "hermandad": h["nombre"], "orden": k, "nombre": "", "titulares": "",
                          "pista": "", "capataz": "", "musica": ""})
for f in filas:
    f["fuente"] = ""; f["notas"] = ""
hoja("2. Pasos",
     [("hermandad_id", "Nº"), ("hermandad", "Hermandad"), ("orden", "Orden (1 = el primero)"),
      ("nombre", "Nombre del paso"), ("titulares", "Imágenes titulares"),
      ("pista", "Lo que dice el Llamador (pista)"), ("capataz", "Capataz"), ("musica", "Música"),
      ("fuente", "Fuente"), ("notas", "Notas")],
     filas, {"nombre", "titulares", "capataz", "musica", "fuente", "notas"},
     [5, 24, 10, 24, 45, 60, 25, 30, 30, 30])

# 4. Templos sin situar o sin dirección
filas = []
for t in T:
    g = puntos[t["punto_geografico_id"]]
    if not g["latitud"] or not t["direccion"]:
        filas.append({"templo_id": t["id"], "nombre": t["nombre"],
                      "hermandad": ", ".join(h["nombre"] for h in H if h["templo_id"] == t["id"]),
                      "direccion": t["direccion"], "latitud": g["latitud"], "longitud": g["longitud"], "fuente": "", "notas": ""})
hoja("3. Templos",
     [("templo_id", "Nº"), ("nombre", "Templo"), ("hermandad", "Hermandad"), ("direccion", "Dirección"),
      ("latitud", "Latitud (ej. 37.39008)"), ("longitud", "Longitud (ej. -5.99267)"), ("fuente", "Fuente"), ("notas", "Notas")],
     filas, {"nombre", "direccion", "latitud", "longitud", "fuente", "notas"}, [5, 45, 22, 35, 16, 16, 30, 30])

# 5. Lugares del programa sin situar (opcional)
lugares = [("Bendición y Esperanza", "Rotonda Esqueleto"), ("Bendición y Esperanza", "Rotonda Hospital V. Rocío"),
           ("Bendición y Esperanza", "Parroquia Santa Genoveva"), ("Bellavista", "Pl. Retiro"), ("Bellavista", "Pl. Cadenas"),
           ("Torreblanca", "Acedo"), ("San Pablo", "Puente del Indio"),
           ("Santa Genoveva · Los Estudiantes", "Lonja Universid.")]
hoja("4. Lugares (opcional)",
     [("hermandad", "Hermandad"), ("lugar", "Lo que pone el programa"), ("nombre", "Qué lugar es (nombre completo)"),
      ("latitud", "Latitud"), ("longitud", "Longitud"), ("fuente", "Fuente"), ("notas", "Notas")],
     [{"hermandad": a, "lugar": b} for a, b in lugares], {"nombre", "latitud", "longitud", "fuente", "notas"},
     [30, 28, 40, 14, 14, 30, 30])

os.makedirs(os.path.dirname(SALIDA) or ".", exist_ok=True)
wb.save(SALIDA)
print("Excel:", SALIDA)
