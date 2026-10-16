"""Templos y capillas de Sevilla con nombre (centro de cada uno) y el contorno de la Catedral, desde Overpass.
Uso: descargar_templos.py osm/templos.json osm/catedral.json"""
import json, sys, time, urllib.request, urllib.parse
BBOX = "37.32,-6.03,37.44,-5.86"
CONSULTAS = [(sys.argv[1], f"""[out:json][timeout:120];
nwr["amenity"="place_of_worship"]["name"]({BBOX});
out center tags;"""), (sys.argv[2], """[out:json][timeout:60];relation(5641600);out geom;""")]
SERV = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter",
        "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
for destino, Q in CONSULTAS:
    espera = 5
    for intento in range(8):
        url = SERV[intento % len(SERV)]
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": Q}).encode(),
                                         headers={"User-Agent": "Cofradar-prueba/0.1"})
            datos = json.load(urllib.request.urlopen(req, timeout=180))
            json.dump(datos, open(destino, "w"))
            print("ok", destino, len(datos["elements"]), "elementos"); break
        except Exception as e:
            print("fallo", url, str(e)[:80]); time.sleep(espera); espera *= 2
