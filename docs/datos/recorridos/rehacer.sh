#!/usr/bin/env bash
# Rehace los recorridos de un año de principio a fin. Ver LEEME.md antes de usarlo con un año nuevo.
#
# Uso: docs/datos/recorridos/rehacer.sh PROGRAMA.pdf LLAMADOR.pdf AÑO "texto de la fuente"
# Ejemplo (el de 2026):
#   docs/datos/recorridos/rehacer.sh docs/datos/Programa-de-Mano-del-Consejo.pdf \
#       docs/datos/llamador_2025_Sevilla.pdf 2026 "Programa de mano 2026 + Llamador 2025"
#
# Necesita un Python con PyMuPDF (pip install pymupdf) en $PY; por defecto, trabajo/venv.
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
PROGRAMA="$(realpath "$1")"; LLAMADOR="$(realpath "$2")"; ANIO="$3"; FUENTE="$4"
TRABAJO="$AQUI/trabajo"
mkdir -p "$TRABAJO/osm"
cd "$TRABAJO"
if [ ! -x venv/bin/python ]; then python3 -m venv venv && venv/bin/pip install -q pymupdf==1.24.14; fi
PY="${PY:-$TRABAJO/venv/bin/python}"

# 1. Callejero y templos de OSM (solo la primera vez, o si se borra trabajo/osm)
[ -s osm/sevilla.json ] || python3 -I "$AQUI/descargar_osm.py" osm/sevilla.json
[ -s osm/templos.json ] || python3 -I "$AQUI/descargar_templos.py" osm/templos.json osm/catedral.json

# 2. Tablas de los PDF (las páginas del Llamador cambian cada año: ver LEEME.md)
"$PY" -I "$AQUI/extraer_tablas.py" "$PROGRAMA" programa.json
"$PY" -I "$AQUI/extraer_llamador.py" "$LLAMADOR" llamador.json "${PAGINAS_LLAMADOR:-14,15,22,23,24,31,32,33,40,41,42,49,50,51,58,59,60,65,66,67,74,75,76,80,81,82}"
"$PY" -I "$AQUI/extraer_llamador_visperas.py" "$LLAMADOR" llamador_visperas.json "${PAGINAS_VISPERAS:-8,14,15}" > /dev/null
python3 -I "$AQUI/transcribir_llamador.py"

# 3. Puntos de cada hermandad, trazado, visor y exportación
python3 -I "$AQUI/generar.py" programa.json osm/sevilla.json rec llamador.json llamador_visperas.json llamador2025_transcritas.json > generar.log
python3 -I "$AQUI/trazar_todas.py" osm/sevilla.json > trazado.log
python3 -I "$AQUI/construir_visor.py" visor.html programa.json
python3 -I "$AQUI/exportar.py" "$AQUI/../itinerarios/$ANIO" "$ANIO" "$FUENTE"
echo "Hecho. Revisa trabajo/generar.log, trabajo/trazado.log y abre trabajo/visor.html."
