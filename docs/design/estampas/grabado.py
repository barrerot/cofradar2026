"""El titular de cada estampa, a grabado desde una foto (diseño aprobado el 12/11/2026).

Un mismo filtro para las 72, para que parezcan de la misma mano: los claros quedan en papel, la media
sombra en una tinta plana de cera y la sombra en trama de tinta a 45° (y cruzada a -45° en lo más
oscuro), con tres grosores. Sale un SVG con la ventana de la estampa, 156 × 170 u y arco de medio punto
arriba, que la app (frontend/src/rutas/Album.tsx) pone dentro del marco.

Las fotos y los SVG NO van en el repositorio, que es público (como los escudos):
  fotos  ~/.cofradar/titulares/   (el nombre de cada una, en grabados.csv)
  SVG    ~/.cofradar/grabados/<cofradia>.svg, que el servidor sirve en /api/grabados/

grabados.csv dice, por hermandad, la foto, el recorte (fracciones de la foto: x0, y0, x1, y1; la
ventana es casi cuadrada, 156:170) y la gamma (>1 oscurece: las Vírgenes, de cara muy clara, piden 1,5).

Uso:  ~/.cofradar/venv/bin/python -I docs/design/estampas/grabado.py [cofradia ...]
      (sin nombres, todas las de grabados.csv; hace falta numpy y pillow)
"""
import csv
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps

TINTA, CERA, PAPEL = "#1D1A16", "#DFD3BE", "#FDF9F1"
W, H, R = 156, 170, 78  # la ventana, en unidades; radio del arco
PX = 4  # muestras de la foto por unidad
Q = 4  # el SVG va en cuartos de unidad, con números enteros: pesa menos

PASO = 1.5  # separación de la trama
CORTE_CERA = 0.62  # por debajo de esta luz, cera
CORTE_TRAMA = 0.50  # por debajo, trama
CORTE_CRUZ = 0.22  # por debajo, también la trama cruzada

AQUI = Path(__file__).resolve().parent
FOTOS = Path.home() / ".cofradar" / "titulares"
SALIDA = Path.home() / ".cofradar" / "grabados"


def luz(ruta, recorte, gamma):
    im = Image.open(ruta).convert("L")
    w, h = im.size
    x0, y0, x1, y1 = recorte
    im = im.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
    im = im.resize((W * PX, H * PX), Image.LANCZOS)
    im = ImageOps.autocontrast(im, cutoff=2)
    im = im.filter(ImageFilter.GaussianBlur(PX * 0.35))
    return (np.asarray(im, dtype=np.float32) / 255.0) ** gamma


def muestra(a, x, y):
    return a[min(max(int(y * PX), 0), a.shape[0] - 1), min(max(int(x * PX), 0), a.shape[1] - 1)]


def dentro(x, y):
    if x < 0 or x > W or y > H:
        return False
    return y >= R or (x - R) ** 2 + (y - R) ** 2 <= R**2


def q(v):
    return round(v * Q)


def cera(a):
    """Tinta plana de cera, en tiras horizontales de media unidad."""
    paso, trozos = 0.5, []
    y = 0.0
    while y < H:
        x, ini = 0.0, None
        while x <= W + paso:
            on = x <= W and dentro(x, y + paso / 2) and muestra(a, x, y + paso / 2) < CORTE_CERA
            if on and ini is None:
                ini = x
            elif not on and ini is not None:
                trozos.append(f"M{q(ini)} {q(y)}h{q(x - ini)}v{q(paso)}h{-q(x - ini)}z")
                ini = None
            x += paso
        y += paso
    return f'<path d="{"".join(trozos)}" fill="{CERA}"/>'


def trama(a, angulo, corte, grosor):
    """Rayas paralelas que engordan con la sombra, en tres grosores."""
    c, s = math.cos(math.radians(angulo)), math.sin(math.radians(angulo))
    niveles = {1: [], 2: [], 3: []}
    diag = math.hypot(W, H)
    k = -diag
    while k < diag:
        bx, by = W / 2 - s * k, H / 2 + c * k
        t, actual, ini, fin = -diag, 0, None, None
        while t <= diag + 0.5:
            x, y = bx + c * t, by + s * t
            n = 0
            if t <= diag and dentro(x, y):
                l = muestra(a, x, y)
                if l < corte:
                    f = (corte - l) / corte
                    n = 1 if f < 0.33 else 2 if f < 0.66 else 3
            if n != actual:
                if actual:
                    niveles[actual].append(f"M{q(ini[0])} {q(ini[1])}l{q(fin[0]) - q(ini[0])} {q(fin[1]) - q(ini[1])}")
                actual, ini = n, (x, y)
            fin = (x, y)
            t += 0.5
        k += PASO
    return "".join(
        f'<path d="{"".join(d)}" fill="none" stroke="{TINTA}" stroke-width="{grosor * n / 3 * Q:.2f}" stroke-linecap="round"/>'
        for n, d in niveles.items()
        if d
    )


def grabado(foto, recorte, gamma):
    a = luz(foto, recorte, gamma)
    cuerpo = cera(a) + trama(a, 45, CORTE_TRAMA, PASO * 0.62) + trama(a, -45, CORTE_CRUZ, PASO * 0.45)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}">'
        f'<path d="M0 {H}V{R}A{R} {R} 0 0 1 {W} {R}V{H}Z" fill="{PAPEL}"/>'
        f'<g transform="scale({1 / Q})">{cuerpo}</g></svg>'
    )


def main():
    pedidas = set(sys.argv[1:])
    SALIDA.mkdir(parents=True, exist_ok=True)
    with open(AQUI / "grabados.csv", newline="") as f:
        for fila in csv.DictReader(f):
            if pedidas and fila["cofradia"] not in pedidas:
                continue
            recorte = tuple(float(fila[k]) for k in ("x0", "y0", "x1", "y1"))
            svg = grabado(FOTOS / fila["foto"], recorte, float(fila["gamma"]))
            destino = SALIDA / f"{fila['cofradia']}.svg"
            destino.write_text(svg)
            print(f"{destino.name}: {len(svg) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
