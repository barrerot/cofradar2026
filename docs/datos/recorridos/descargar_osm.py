"""Descarga una vez el callejero de Sevilla desde Overpass. Uso: descargar_osm.py salida.json [bbox]"""
import json, sys, time, urllib.request, urllib.parse
BBOX = sys.argv[2] if len(sys.argv) > 2 else "37.32,-6.03,37.44,-5.86"  # sur,oeste,norte,este: toda Sevilla
Q = f"""[out:json][timeout:120];
(way["highway"]["highway"!~"motorway|motorway_link|trunk|trunk_link|construction|proposed|service|track|steps|bus_guideway|raceway"]({BBOX});
 way["building"]["name"~"Catedral",i]({BBOX});
 way["area:highway"]({BBOX}););
(._;>;);
out body;"""
SERV = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
espera = 5
for intento in range(8):
    url = SERV[intento % len(SERV)]
    try:
        req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": Q}).encode(),
                                     headers={"User-Agent": "Cofradar-prueba/0.1"})
        datos = json.load(urllib.request.urlopen(req, timeout=180))
        json.dump(datos, open(sys.argv[1], "w"))
        print("ok", url, len(datos["elements"]), "elementos"); break
    except Exception as e:
        print("fallo", url, str(e)[:80]); time.sleep(espera); espera *= 2
