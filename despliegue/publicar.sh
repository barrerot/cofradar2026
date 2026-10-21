#!/usr/bin/env bash
# Compila Cofradar y (re)arranca la web y la API en 127.0.0.1:3010, el puerto
# al que reenvía Apache (despliegue/cofradar.buluu.es.conf).
#
# Uso: despliegue/publicar.sh            compila y reinicia
#      despliegue/publicar.sh --arrancar  solo arranca lo ya compilado (al reiniciar el servidor)
#
# El proceso sigue vivo al cerrar la sesión. Al reiniciar el servidor lo
# levanta esta línea del crontab del usuario dev (puesta el 19/10/2026):
#   @reboot /home/dev/projects/cofradar2026/despliegue/publicar.sh --arrancar >> /home/dev/.cofradar/web.log 2>&1
# Registro en ~/.cofradar/web.log.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
ESTADO="$HOME/.cofradar"
PUERTO=3010
mkdir -p "$ESTADO"

if [[ "${1:-}" != "--arrancar" ]]; then
  echo "· Compilando"
  (cd "$RAIZ" && npm run build -w backend >/dev/null && npm run build -w frontend >/dev/null)
fi

if [[ -f "$ESTADO/web.pid" ]] && kill -0 "$(cat "$ESTADO/web.pid")" 2>/dev/null; then
  echo "· Parando el proceso anterior"
  kill "$(cat "$ESTADO/web.pid")"
  sleep 1
fi

echo "· Arrancando en 127.0.0.1:$PUERTO"
cd "$RAIZ/backend"
# RELOJ_DE_PRUEBA=1: se puede dar fe con ?ahora= (marcadas de_prueba). QUITAR ANTES DEL LANZAMIENTO
RELOJ_DE_PRUEBA=1 SERVIR_WEB=1 HOST=127.0.0.1 PORT=$PUERTO nohup node dist/index.js >>"$ESTADO/web.log" 2>&1 &
echo $! >"$ESTADO/web.pid"

for _ in $(seq 20); do
  if curl -fs "http://127.0.0.1:$PUERTO/api/salud" >/dev/null; then
    echo "· Listo: $(curl -s "http://127.0.0.1:$PUERTO/api/jornadas" | grep -o '"id"' | wc -l) jornadas"
    exit 0
  fi
  sleep 1
done
echo "No arranca: mira $ESTADO/web.log" >&2
exit 1
