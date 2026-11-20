#!/usr/bin/env bash
# Restaura un respaldo.  Uso:  ./scripts/restore.sh respaldos/tenaristrack_XXXX.sql.gz
# ATENCIÓN: reemplaza el contenido actual de la base tenaristrack.
set -euo pipefail
cd "$(dirname "$0")/.."
[ $# -eq 1 ] && [ -f "$1" ] || { echo "Uso: $0 archivo.sql.gz"; exit 1; }
read -r -p "Esto reemplazará la base actual. ¿Continuar? (escribe SI): " r
[ "$r" = "SI" ] || { echo "Cancelado."; exit 1; }
gunzip -c "$1" | docker compose exec -T db sh -c 'exec mysql -u root -p"$MYSQL_ROOT_PASSWORD"'
echo "Restauración terminada."
