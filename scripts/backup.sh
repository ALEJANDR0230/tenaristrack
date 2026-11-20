#!/usr/bin/env bash
# Respaldo comprimido de la base de datos (riesgo R08: pérdida de datos).
# Uso:  ./scripts/backup.sh        (conserva los últimos 14 respaldos)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p respaldos
archivo="respaldos/tenaristrack_$(date +%Y%m%d_%H%M%S).sql.gz"
docker compose exec -T db sh -c 'exec mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers --no-tablespaces --databases tenaristrack' | gzip > "$archivo"
chmod 600 "$archivo"
echo "Respaldo creado: $archivo ($(du -h "$archivo" | cut -f1))"
ls -1t respaldos/tenaristrack_*.sql.gz | tail -n +15 | xargs -r rm --
