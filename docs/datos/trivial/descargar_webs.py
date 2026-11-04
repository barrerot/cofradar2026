#!/usr/bin/env python3
"""
Descarga el texto de las webs de las hermandades, para escribir con él las preguntas del trivial.

El texto es solo FUENTE: de él se sacan datos para escribir preguntas propias, no se reproduce. Por
eso no va al repositorio (que es público): se guarda en el servidor, en ~/.cofradar/webs/ (o en
WEBS_DIR), como los escudos.

Con cuidado, porque muchas webs de hermandad están en servidores pequeños:
  - solo páginas de la propia web de cada hermandad (mismo dominio, con o sin www);
  - respeta su robots.txt, y su Crawl-delay si pide más de 1 s;
  - una petición por segundo a cada web, y como mucho MAX_PAGINAS páginas y MAX_PDF PDF por web;
  - varias webs a la vez (son servidores distintos), cada una de una en una.

Por cada hermandad, en <WEBS_DIR>/<id>-<slug>/:
  paginas.jsonl   una línea por página: { url, titulo, texto, descargada }
  pdf/            los PDF (reglas, boletines…), tal cual; el texto se saca aparte
  hecho.json      cuántas páginas y PDF, y los errores; si existe, esa web no se vuelve a bajar

  python3 docs/datos/trivial/descargar_webs.py [id ...]     (sin ids: todas las de hermandad.csv)
"""
import csv
import hashlib
import json
import os
import re
import sys
import threading
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

DATOS = Path(__file__).resolve().parent.parent
DESTINO = Path(os.environ.get("WEBS_DIR", Path.home() / ".cofradar" / "webs"))
AGENTE = "CofradarBot/1.0 (+https://www.cofradar.es)"
MAX_PAGINAS = 150
MAX_PDF = 30
MAX_PDF_BYTES = 15 * 1024 * 1024
ESPERA = 1.0
A_LA_VEZ = 6
# Lo que no es texto, o es la misma página de otra forma
SALTAR = re.compile(
    r"\.(jpe?g|png|gif|webp|svg|ico|css|js|mp[34]|avi|mov|zip|rar|docx?|xlsx?|pptx?)(\?|$)"
    r"|/(wp-json|feed|xmlrpc|wp-admin|wp-login|cart|carrito|checkout|my-account|mi-cuenta)(/|$)"
    r"|[?&](replytocom|share|print|format|ical|outlook-ical|tribe-bar-date|eventDisplay)=",
    re.I,
)

registro = threading.Lock()


def avisar(msg: str) -> None:
    with registro:
        print(msg, flush=True)


def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


class Texto(HTMLParser):
    """El texto legible de una página (sin scripts, estilos ni menús) y sus enlaces."""

    FUERA = {"script", "style", "noscript", "svg", "nav", "form", "iframe", "template"}
    BLOQUE = {"p", "div", "br", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "section", "article", "blockquote", "td"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.trozos: list[str] = []
        self.enlaces: list[str] = []
        self.titulo = ""
        self._fuera = 0
        self._en_titulo = False

    def handle_starttag(self, tag, attrs):
        if tag in self.FUERA:
            self._fuera += 1
        if tag == "title":
            self._en_titulo = True
        if tag == "a":
            href = dict(attrs).get("href")
            if href:
                self.enlaces.append(href)
        if tag in self.BLOQUE:
            self.trozos.append("\n")

    def handle_endtag(self, tag):
        if tag in self.FUERA and self._fuera:
            self._fuera -= 1
        if tag == "title":
            self._en_titulo = False
        if tag in self.BLOQUE:
            self.trozos.append("\n")

    def handle_data(self, data):
        if self._en_titulo:
            self.titulo += data
        elif not self._fuera:
            self.trozos.append(data)

    def texto(self) -> str:
        t = "".join(self.trozos)
        t = re.sub(r"[ \t\r\f\v ]+", " ", t)
        lineas = [l.strip() for l in t.split("\n")]
        return "\n".join(l for l in lineas if l)


def pedir(url: str, maximo: int = 5 * 1024 * 1024):
    req = urllib.request.Request(url, headers={"User-Agent": AGENTE, "Accept-Language": "es-ES,es;q=0.9"})
    with urllib.request.urlopen(req, timeout=20) as r:
        tipo = r.headers.get("Content-Type", "")
        cuerpo = r.read(maximo + 1)
        return r.geturl(), tipo, cuerpo[: maximo + 1], len(cuerpo) > maximo


def decodificar(cuerpo: bytes, tipo: str) -> str:
    m = re.search(r"charset=([\w-]+)", tipo, re.I) or re.search(rb'<meta[^>]+charset=["\']?([\w-]+)', cuerpo[:2048], re.I)
    cs = m.group(1) if m else "utf-8"
    if isinstance(cs, bytes):
        cs = cs.decode("ascii", "ignore")
    try:
        return cuerpo.decode(cs, "replace")
    except LookupError:
        return cuerpo.decode("utf-8", "replace")


def anfitrion(url: str) -> str:
    h = urllib.parse.urlsplit(url).hostname or ""
    return h[4:] if h.startswith("www.") else h


def normalizar(base: str, href: str) -> str | None:
    href = href.strip()
    if not href or href.startswith(("mailto:", "tel:", "javascript:", "#", "whatsapp:")):
        return None
    u = urllib.parse.urljoin(base, href)
    u, _ = urllib.parse.urldefrag(u)
    p = urllib.parse.urlsplit(u)
    if p.scheme not in ("http", "https"):
        return None
    return urllib.parse.urlunsplit((p.scheme, p.netloc.lower(), p.path or "/", p.query, ""))


def descargar(h: dict) -> None:
    carpeta = DESTINO / f"{h['id']}-{slug(h['nombre'])}"
    if (carpeta / "hecho.json").exists():
        avisar(f"· {h['nombre']}: ya estaba")
        return
    (carpeta / "pdf").mkdir(parents=True, exist_ok=True)
    inicio = h["web"].strip()
    casa = anfitrion(inicio)
    errores: list[str] = []

    robots = urllib.robotparser.RobotFileParser()
    espera = ESPERA
    try:
        _, _, cuerpo, _ = pedir(urllib.parse.urljoin(inicio, "/robots.txt"), 512 * 1024)
        robots.parse(decodificar(cuerpo, "").splitlines())
        espera = max(ESPERA, float(robots.crawl_delay(AGENTE) or 0))
    except Exception:
        robots.parse([])  # sin robots.txt: todo permitido
    if espera > 10:
        errores.append(f"Crawl-delay de {espera:.0f} s: se usa 10")
        espera = 10

    cola = deque([normalizar(inicio, inicio)])
    vistas: set[str] = set()
    textos: set[str] = set()
    paginas = pdfs = 0
    with open(carpeta / "paginas.jsonl", "w", encoding="utf-8") as salida:
        while cola and paginas < MAX_PAGINAS:
            url = cola.popleft()
            if not url or url in vistas:
                continue
            vistas.add(url)
            if anfitrion(url) != casa or SALTAR.search(url) or not robots.can_fetch(AGENTE, url):
                continue
            es_pdf = urllib.parse.urlsplit(url).path.lower().endswith(".pdf")
            if es_pdf and pdfs >= MAX_PDF:
                continue
            time.sleep(espera)
            try:
                final, tipo, cuerpo, cortado = pedir(url, MAX_PDF_BYTES if es_pdf else 5 * 1024 * 1024)
            except urllib.error.HTTPError as e:
                errores.append(f"{e.code} {url}")
                continue
            except Exception as e:
                errores.append(f"{type(e).__name__} {url}")
                if len(errores) > 40 and paginas == 0:
                    break
                continue
            if anfitrion(final) != casa:
                continue
            if "pdf" in tipo or es_pdf:
                if cortado:
                    errores.append(f"PDF de más de {MAX_PDF_BYTES // 2**20} MB, no se guarda: {url}")
                    continue
                nombre = slug(urllib.parse.unquote(Path(urllib.parse.urlsplit(final).path).stem))[:80] or "documento"
                destino = carpeta / "pdf" / f"{nombre}-{hashlib.sha1(final.encode()).hexdigest()[:6]}.pdf"
                destino.write_bytes(cuerpo)
                (destino.with_suffix(".url")).write_text(final + "\n", encoding="utf-8")
                pdfs += 1
                continue
            if "html" not in tipo:
                continue
            p = Texto()
            try:
                p.feed(decodificar(cuerpo, tipo))
            except Exception:
                continue
            texto = p.texto()
            huella = hashlib.sha1(texto.encode()).hexdigest()
            if len(texto) > 200 and huella not in textos:
                textos.add(huella)
                fila = {"url": final, "titulo": p.titulo.strip(), "texto": texto, "descargada": datetime.now(timezone.utc).isoformat(timespec="seconds")}
                salida.write(json.dumps(fila, ensure_ascii=False) + "\n")
                paginas += 1
            for href in p.enlaces:
                n = normalizar(final, href)
                if n and n not in vistas and anfitrion(n) == casa:
                    cola.append(n)

    resumen = {"hermandad": h["nombre"], "web": inicio, "paginas": paginas, "pdf": pdfs, "sin_visitar": len(cola), "errores": errores[:100]}
    (carpeta / "hecho.json").write_text(json.dumps(resumen, ensure_ascii=False, indent=2), encoding="utf-8")
    avisar(f"✓ {h['nombre']}: {paginas} páginas, {pdfs} PDF, {len(errores)} errores")


def main() -> None:
    hermandades = list(csv.DictReader(open(DATOS / "hermandad.csv", encoding="utf-8")))
    pedidas = set(sys.argv[1:])
    if pedidas:
        hermandades = [h for h in hermandades if h["id"] in pedidas]
    hermandades = [h for h in hermandades if h["web"].strip()]
    # Una web que comparten dos hermandades (La Borriquita y El Amor) se baja una vez
    vistas: set[str] = set()
    unicas = []
    for h in hermandades:
        if anfitrion(h["web"]) not in vistas:
            vistas.add(anfitrion(h["web"]))
            unicas.append(h)
    DESTINO.mkdir(parents=True, exist_ok=True)
    avisar(f"{len(unicas)} webs a {DESTINO}")
    with ThreadPoolExecutor(A_LA_VEZ) as ex:
        list(ex.map(lambda h: _seguro(h), unicas))
    avisar("fin")


def _seguro(h: dict) -> None:
    try:
        descargar(h)
    except Exception as e:
        avisar(f"✗ {h['nombre']}: {type(e).__name__}: {e}")


if __name__ == "__main__":
    main()
