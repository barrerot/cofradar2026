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
pts = {r["slug"]: r for r in leer("puntos_control.csv")}
hor = leer("horarios.csv")
est = leer("estado_jornada.csv")
jor = leer("jornada.csv")[0]
ahora = m(jor["hora_referencia"])

prog = {}
for r in hor:
    if r["elemento"] == "cruz-guia":
        prog.setdefault((r["cofradia"], r["punto"]), []).append(m(r["hora"]))

errores, avisos = [], []
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
    print("%-20s %-12s %-15s %-22s %s" % (cof[c]["nombre_popular"], r["fase"], r["confianza_fase"], r["proximo_punto"] or "-", cmp_))

seg = json.load(open(os.path.join(BASE,"segmentos.geojson")))
con_seg = {f["properties"]["cofradia"] for f in seg["features"]}
for r in est:
    debe = r["fase"] in ("en_calle","interrumpida")
    tiene = r["cofradia"] in con_seg
    if debe and not tiene: errores.append("%s: en calle y sin segmento en el mapa" % r["cofradia"])
    if tiene and not debe: errores.append("%s: tiene segmento pero su fase es %s" % (r["cofradia"],r["fase"]))
for c in cof:
    f = os.path.join(BASE,"itinerarios",c+".geojson")
    if not os.path.exists(f): errores.append("%s: sin itinerario" % c)

print("\nSegmentos a las %s: %d de %d (sin segmento: %s)" % (jor["hora_referencia"], len(con_seg), len(est),
      ", ".join(sorted(set(cof)-con_seg))))
for a in avisos: print("  aviso: " + a)
if errores:
    print("\n%d INCOHERENCIAS:" % len(errores))
    for e in errores: print("  - " + e)
    sys.exit(1)
print("\nFixture coherente.")
