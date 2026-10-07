#!/usr/bin/env python3
"""Comprueba que el estado de las 02:40 es coherente con los horarios programados.

El fixture es inventado, pero no puede ser contradictorio: si una pantalla
muestra «Campana 03:05» y el horario dice 02:53, el +12 de retraso tiene que
cuadrar. Esto lo verifica.
"""
import csv, json, os, sys
BASE = os.path.dirname(os.path.abspath(__file__))
def leer(n): return list(csv.DictReader(open(os.path.join(BASE,n))))
def m(s): h,mi = s.split(":"); return int(h)*60+int(mi)

cof = {r["slug"]: r for r in leer("cofradias.csv")}
ele = {r["slug"]: r for r in leer("elementos.csv")}
cfg = leer("cofradia_elementos.csv")
pts = {r["slug"]: r for r in leer("puntos_control.csv")}
hor = leer("horarios.csv")
est = leer("estado_jornada.csv")
jor = leer("jornada.csv")[0]
ahora = m(jor["hora_referencia"])

# La jornada del fixture es la Madruga. cofradias.csv puede traer filas de otras
# jornadas que solo existen para ejercitar la configuracion por hermandad.
de_la_jornada = {k for k,v in cof.items() if v["jornada"] == jor["jornada"]}

conf = {}           # cofradia -> {elemento: localizable}
for r in cfg:
    conf.setdefault(r["cofradia"], {})[r["elemento"]] = (r["localizable"] == "si")
localizables = {c: [e for e,l in d.items() if l] for c,d in conf.items()}

prog = {}
for r in hor:
    if r["elemento"] == "cruz-guia":
        prog.setdefault((r["cofradia"], r["punto"]), []).append(m(r["hora"]))

errores, avisos = [], []

# --- configuracion de elementos por hermandad ---
for c in cof:
    if c not in conf:
        errores.append("%s: sin configuracion en cofradia_elementos.csv" % c)
for c,d in conf.items():
    if c not in cof:
        errores.append("cofradia_elementos.csv: %s no esta en cofradias.csv" % c)
    for e in d:
        if e not in ele:
            errores.append("%s: elemento %s no esta en la taxonomia" % (c,e))
    if not [e for e,l in d.items() if l]:
        errores.append("%s: ninguna elemento localizable" % c)

# El final del cortejo NO se localiza en el mapa (D34), en ninguna hermandad.
for c,d in conf.items():
    if d.get("final"):
        errores.append("%s: el final del cortejo no es localizable (D34)" % c)

# La configuracion tiene que variar de verdad: si todas las hermandades
# tuvieran los mismos elementos, el fixture no ejercitaria nada.
if len({len(v) for v in localizables.values()}) < 2:
    errores.append("todas las hermandades tienen el mismo numero de elementos localizables: "
                   "el fixture no ejercita la configuracion por hermandad")

# horarios.csv solo puede hablar de elementos configurados para esa cofradia
for r in hor:
    if r["cofradia"] in conf and r["elemento"] not in conf[r["cofradia"]]:
        errores.append("%s: horario de %s, que no esta configurado para ella" % (r["cofradia"],r["elemento"]))
print("Jornada %s · hora de referencia %s · contexto %s\n" % (jor["nombre"], jor["hora_referencia"], jor["contexto"]))
print("%-20s %-12s %-15s %-22s %s" % ("cofradia","fase","confianza","proximo punto","programado vs publicado"))
print("-"*105)
for r in est:
    c = r["cofradia"]
    if c not in cof: errores.append("%s no esta en cofradias.csv" % c); continue
    for a in filter(None, r["alteraciones"].split("|")):
        if a in ("cancelada","no_procesiona"):
            errores.append("%s: %s no es una alteracion, es una fase, y solo la activa administracion" % (c,a))
    if r["fase"] in ("cancelada","no_procesiona"):
        errores.append("%s: ninguna aportacion puede inferir %s (solo administracion)" % (c,r["fase"]))
    cmp_ = "-"
    if r["proximo_punto"]:
        p = r["proximo_punto"]
        if p not in pts: errores.append("%s: punto %s desconocido" % (c,p)); continue
        pub = m(r["proximo_punto_hora"])
        cand = prog.get((c,p))
        if not cand:
            errores.append("%s: %s no esta en su itinerario programado" % (c,p))
        else:
            d = min(cand, key=lambda x: abs(x-pub))
            delta = pub - d
            cmp_ = "%s -> %s (%+d min)" % ("/".join("%02d:%02d"%(x//60,x%60) for x in cand), r["proximo_punto_hora"], delta)
            if delta and not r["alteraciones"]:
                errores.append("%s: desvio de %+d min sin ninguna alteracion que lo explique" % (c,delta))
            if pub <= ahora:
                errores.append("%s: el proximo punto (%s) ya ha pasado a las %s" % (c,r["proximo_punto_hora"],jor["hora_referencia"]))
            if 0 < pub-ahora < 5 :
                avisos.append("%s: el proximo punto esta a %d min; la regla de prudencia deberia ofrecer el siguiente" % (c,pub-ahora))
    elif r["fase"] not in ("finalizada","cancelada","no_procesiona"):
        errores.append("%s: fase %s sin proximo punto" % (c,r["fase"]))
    if r["confianza_fase"] == "desactualizado" and not r["ultima_observacion"]:
        errores.append("%s: desactualizado exige ultima_observacion" % c)
    if r["confianza_fase"] == "estimado" and r["ultima_observacion"]:
        errores.append("%s: estimado no deberia tener observacion (seria confirmado)" % c)
    # --- que elemento ancla la observacion (D34) ---
    eo = r["elemento_observado"]
    if eo and not r["ultima_observacion"]:
        errores.append("%s: elemento observado sin hora de observacion" % c)
    if eo and eo not in conf.get(c, {}):
        errores.append("%s: observo %s, que no esta configurado para ella" % (c,eo))
    print("%-20s %-12s %-15s %-22s %s" % (cof[c]["nombre_popular"], r["fase"], r["confianza_fase"], r["proximo_punto"] or "-", cmp_))

seg = json.load(open(os.path.join(BASE,"segmentos.geojson")))
con_seg = {f["properties"]["cofradia"] for f in seg["features"]}
conf_seg = {f["properties"]["cofradia"]: f["properties"]["confianza"] for f in seg["features"]}
for r in est:
    c = r["cofradia"]
    debe = r["fase"] in ("en_calle","interrumpida")
    tiene = c in con_seg
    if debe and not tiene: errores.append("%s: en calle y sin segmento en el mapa" % c)
    if tiene and not debe: errores.append("%s: tiene segmento pero su fase es %s" % (c,r["fase"]))
    # Una posicion confirmada exige que alguien haya nombrado un elemento
    # LOCALIZABLE: una aportacion generica da presencia y fase, no anclaje (D34).
    if conf_seg.get(c) == "confirmado":
        eo = r["elemento_observado"]
        if not eo:
            errores.append("%s: segmento confirmado sin elemento observado que lo ancle" % c)
        elif not conf.get(c, {}).get(eo):
            errores.append("%s: segmento confirmado anclado en %s, que no se localiza" % (c,eo))
for c in de_la_jornada:
    f = os.path.join(BASE,"itinerarios",c+".geojson")
    if not os.path.exists(f): errores.append("%s: sin itinerario" % c)

print("\nElementos localizables por hermandad: %s" % " · ".join(
      "%s %d" % (cof[c]["nombre_popular"], len(localizables[c])) for c in sorted(conf)))
print("Segmentos a las %s: %d de %d (sin segmento: %s)" % (jor["hora_referencia"], len(con_seg), len(est),
      ", ".join(sorted(de_la_jornada-con_seg))))
for a in avisos: print("  aviso: " + a)
if errores:
    print("\n%d INCOHERENCIAS:" % len(errores))
    for e in errores: print("  - " + e)
    sys.exit(1)
print("\nFixture coherente.")
