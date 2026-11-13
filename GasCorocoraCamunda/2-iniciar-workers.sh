#!/usr/bin/env bash
# GAS COROCORA - Workers JavaScript (macOS / Linux)
cd "$(dirname "$0")/workers" || exit 1
command -v node >/dev/null || { echo "[ERROR] Instale Node.js LTS"; exit 1; }
[ -d node_modules ] || npm install || exit 1
URL="${CAMUNDA_URL:-http://localhost:8080/engine-rest}"
echo "Esperando a Camunda en $URL ..."
until curl -sf "$URL/engine" >/dev/null; do sleep 5; done
echo "[OK] Iniciando workers"
npm start
