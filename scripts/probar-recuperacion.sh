#!/usr/bin/env bash
# Prueba de recuperación (riesgo R08): restaura el último respaldo en una base temporal
# y compara el número de filas de cada tabla con la base real. No toca los datos reales.
set -euo pipefail
cd "$(dirname "$0")/.."
ultimo=$(ls -1t respaldos/tenaristrack_*.sql.gz 2>/dev/null | head -n 1 || true)
[ -n "$ultimo" ] || { echo "No hay respaldos. Ejecuta primero ./scripts/backup.sh"; exit 1; }
echo "Probando recuperación con: $ultimo"
SQL='mysql -u root -p"$MYSQL_ROOT_PASSWORD"'
docker compose exec -T db sh -c "$SQL -e 'DROP DATABASE IF EXISTS tenaristrack_prueba; CREATE DATABASE tenaristrack_prueba'"
gunzip -c "$ultimo" | sed 's/`tenaristrack`/`tenaristrack_prueba`/g; /^CREATE DATABASE/d; /^USE /d' | docker compose exec -T db sh -c "$SQL tenaristrack_prueba"
cuenta() { docker compose exec -T db sh -c "$SQL -N -B -e \"SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema='$1' AND table_type='BASE TABLE' ORDER BY 1\"" | tr -d '\r'; }
filas() { for t in usuarios nodos rutas productos embarques embarques_historial inventarios sensores lecturas incidencias; do
  n=$(docker compose exec -T db sh -c "$SQL -N -B -e 'SELECT COUNT(*) FROM $1.$t'" | tr -d '\r'); echo "$t $n"; done; }
a=$(filas tenaristrack); b=$(filas tenaristrack_prueba)
docker compose exec -T db sh -c "$SQL -e 'DROP DATABASE tenaristrack_prueba'"
if [ "$a" = "$b" ]; then echo "RECUPERACIÓN CORRECTA: las 10 tablas coinciden."; else echo "DIFERENCIAS ENCONTRADAS:"; diff <(echo "$a") <(echo "$b") || true; exit 1; fi
