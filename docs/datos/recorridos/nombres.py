"""Relaciona los nombres abreviados de los programas con los nombres de calle de OSM."""
import re, unicodedata

VACIAS = {"de", "del", "la", "las", "el", "los", "y", "calle", "c", "c/"}
EXPANDIR = {"pl": "plaza", "pza": "plaza", "plza": "plaza", "avda": "avenida", "av": "avenida",
            "gt": "glorieta", "gta": "glorieta", "pte": "puente", "pta": "puerta", "card": "cardenal",
            "sta": "santa", "mª": "maria", "ma": "maria", "fco": "francisco", "dr": "doctor", "d": "",
            "s": "", "j": "", "p": "", "a": "", "m": "", "f": "", "t": "", "n": ""}

def plano(s):
    s = unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()
    return s

def fichas(s):
    """Lista de (palabra, es_abreviatura). Las abreviaturas acaban en punto."""
    s = s.replace("Mª", "Maria ").replace("´", "'")
    out = []
    for t in re.findall(r"[\wÁÉÍÓÚÜÑáéíóúüñ']+\.?", s):
        abrev = t.endswith(".")
        p = plano(t.rstrip("."))
        if p in VACIAS:
            continue
        if p in EXPANDIR:
            if not EXPANDIR[p]:
                out.append(("", True)); continue   # inicial suelta: comodín
            p, abrev = EXPANDIR[p], False
        out.append((p, abrev))
    return out

def casa(consulta, nombre):
    """Puntuación (mayor es mejor) o None si no casa. Todas las palabras de la consulta deben aparecer en orden."""
    q = fichas(consulta)
    n = [p for p, _ in fichas(nombre)]
    if not q or not n:
        return None
    i = 0
    usados = 0
    for p, abrev in q:
        while i < len(n):
            ok = (not p) or (n[i].startswith(p) if abrev or len(p) <= 3 else n[i] == p or (n[i].startswith(p) and abrev))
            i += 1
            if ok:
                usados += 1; break
        else:
            return None
    # prefiere nombres con pocas palabras sobrantes; plaza/avenida cuentan como tipo
    tipo = {"plaza", "avenida", "glorieta", "puente", "puerta", "paseo", "ronda", "pasaje", "plazuela"}
    sobrantes = len([x for x in n if x not in tipo]) - len([p for p, _ in q if p and p not in tipo])
    return -sobrantes

def mejor(consulta, nombres):
    puntos = [(casa(consulta, n), n) for n in nombres]
    puntos = [(s, n) for s, n in puntos if s is not None]
    if not puntos:
        return None, []
    puntos.sort(key=lambda x: -x[0])
    top = [n for s, n in puntos if s == puntos[0][0]]
    return top[0], top
