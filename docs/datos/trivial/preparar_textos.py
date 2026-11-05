#!/usr/bin/env python3
"""
Del texto descargado de cada web (descargar_webs.py) saca lo que sirve para escribir preguntas.

Por cada hermandad en ~/.cofradar/webs/<id>-<slug>/ (o WEBS_DIR) escribe `limpio.md`:
  - quita las líneas que se repiten en muchas páginas de la misma web (menú, pie, redes sociales);
  - quita las páginas de la junta de gobierno y de contacto, y las que se quedan casi vacías: las
    preguntas no van sobre personas vivas;
  - añade el texto de los PDF (reglas, boletines), si hay un lector de PDF (pypdf);
  - cada trozo lleva su dirección, que será la fuente de la pregunta.
Las páginas de historia, titulares, reglas y patrimonio van primero.

  ~/.cofradar/venv/bin/python docs/datos/trivial/preparar_textos.py
"""
import json
import os
import re
from collections import Counter
from pathlib import Path

DESTINO = Path(os.environ.get("WEBS_DIR", Path.home() / ".cofradar" / "webs"))
FUERA = re.compile(r"junta de gobierno|hermano mayor|contacto|aviso legal|privacidad|cookies|tienda|carrito|login|iniciar sesi", re.I)
PRIMERO = re.compile(r"historia|titular|imagen|imágenes|reglas|estatutos|patrimonio|paso|cortejo|hábito|túnica|sede|capilla|templo|bord|orfebr|imaginer|música|marcha|efeméride|curiosidad", re.I)

try:
    from pypdf import PdfReader
except ImportError:
    PdfReader = None


def texto_pdf(ruta: Path) -> str:
    if PdfReader is None:
        return ""
    try:
        lector = PdfReader(str(ruta))
        return "\n".join((p.extract_text() or "") for p in lector.pages[:80])
    except Exception:
        return ""


def preparar(carpeta: Path) -> dict:
    paginas = [json.loads(l) for l in open(carpeta / "paginas.jsonl", encoding="utf-8")] if (carpeta / "paginas.jsonl").exists() else []
    # Líneas de plantilla: las que salen en más del 30 % de las páginas de esa web (y en al menos 3)
    veces = Counter(l for p in paginas for l in set(p["texto"].split("\n")))
    tope = max(3, int(len(paginas) * 0.3))
    plantilla = {l for l, n in veces.items() if n >= tope}
    trozos = []
    for p in paginas:
        if FUERA.search(p["titulo"]) or FUERA.search(p["url"]):
            continue
        lineas = [l for l in p["texto"].split("\n") if l not in plantilla]
        texto = "\n".join(lineas).strip()
        if len(texto) < 300:
            continue
        trozos.append((0 if PRIMERO.search(p["titulo"] + " " + p["url"]) else 1, p["titulo"], p["url"], texto))
    pdfs = 0
    for ruta in sorted((carpeta / "pdf").glob("*.pdf")):
        texto = re.sub(r"[ \t]+", " ", texto_pdf(ruta)).strip()
        if len(texto) < 300:
            continue
        url = ruta.with_suffix(".url").read_text(encoding="utf-8").strip() if ruta.with_suffix(".url").exists() else ruta.name
        trozos.append((0 if PRIMERO.search(ruta.name) else 2, f"PDF · {ruta.stem}", url, texto))
        pdfs += 1
    trozos.sort(key=lambda t: t[0])
    with open(carpeta / "limpio.md", "w", encoding="utf-8") as f:
        for _, titulo, url, texto in trozos:
            f.write(f"## {titulo}\nFuente: {url}\n\n{texto}\n\n")
    return {"carpeta": carpeta.name, "trozos": len(trozos), "pdf_con_texto": pdfs, "caracteres": sum(len(t[3]) for t in trozos)}


def main() -> None:
    for carpeta in sorted(DESTINO.iterdir(), key=lambda c: int(c.name.split("-")[0]) if c.name.split("-")[0].isdigit() else 0):
        if (carpeta / "hecho.json").exists():
            r = preparar(carpeta)
            print(f"{r['carpeta']}: {r['trozos']} trozos, {r['pdf_con_texto']} PDF con texto, {r['caracteres'] // 1000} mil caracteres")


if __name__ == "__main__":
    main()
