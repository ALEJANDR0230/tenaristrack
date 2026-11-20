# TenarisTrack · Guía de publicación

La aplicación se publica como **un solo servicio** (API + interfaz compilada) más una base MySQL 8.
No hay que servir el frontend por separado: la API entrega la interfaz web.

```
Navegador ──HTTPS──► Caddy ──► app (Node.js: API + interfaz) ──► MySQL 8 (red interna, sin puerto público)
```

## Opción A · Servidor con Docker (recomendada)

Requisitos: un servidor Linux (VPS) con Docker y Docker Compose, y un dominio que apunte a su IP.

```bash
# 1. Copiar el proyecto al servidor y entrar a la carpeta
cd tenaristrack

# 2. Crear el archivo de variables y completarlo
cp .env.example .env
openssl rand -base64 24    # úsalo para DB_PASSWORD y otra vez para DB_ROOT_PASSWORD
openssl rand -hex 48       # úsalo para JWT_SECRET
nano .env                  # completa DB_PASSWORD, DB_ROOT_PASSWORD, JWT_SECRET y DOMINIO

# 3. Levantar todo con HTTPS automático
docker compose --profile https up -d --build

# 4. Comprobar
docker compose ps
curl https://TU-DOMINIO/api/health      # {"ok":true,"db":true}

# 5. Crear el primer administrador (la base nace vacía, sin usuarios de demostración)
docker compose exec -e ADMIN_CORREO=tu@correo.com -e ADMIN_PASSWORD='una-contraseña-de-12+-caracteres' app npm run crear-admin
```

Pruebas sin dominio: `docker compose up -d --build` y abre http://localhost:4000 (solo local).

### Demostración con datos simulados
Quita el comentario de la línea `datos_demo.sql` en `docker-compose.yml`, usa `DEMO_MODE=true` en `.env` y
borra el volumen (`docker compose down -v`) para que la base se cree de nuevo. Luego:
`docker compose exec app npm run seed` asigna la contraseña de ejemplo a los usuarios de demostración.
La interfaz mostrará el aviso «Datos simulados». **No lo uses con datos reales.**

## Opción B · Sin Docker (Node.js + MySQL gestionado)

Sirve para Render, Railway, un VPS sin Docker, etc. Necesitas Node.js 18+ y una base MySQL 8.0.13+.

```bash
mysql -h HOST -u USUARIO -p NOMBRE_BD < database/esquema.sql      # crea tablas, vistas y disparador

cd frontend && npm ci && npm run build && cd ..                    # genera frontend/dist
cd backend && npm ci --omit=dev
export NODE_ENV=production PORT=4000 TRUST_PROXY=1
export DB_HOST=... DB_USER=... DB_PASSWORD=... DB_NAME=...
export JWT_SECRET=$(openssl rand -hex 48)
ADMIN_CORREO=tu@correo.com ADMIN_PASSWORD='contraseña-larga' npm run crear-admin
npm start
```
En plataformas como Render o Railway se puede usar el `Dockerfile` de la raíz directamente y definir las
variables del paso anterior en su panel. El HTTPS lo pone la plataforma o un proxy (Caddy, Nginx).

## Respaldos y recuperación (riesgo R08)

```bash
./scripts/backup.sh                 # crea respaldos/tenaristrack_AAAAMMDD_HHMMSS.sql.gz (guarda los últimos 14)
./scripts/probar-recuperacion.sh    # restaura el último respaldo en una base temporal y compara las 10 tablas
./scripts/restore.sh respaldos/ARCHIVO.sql.gz   # restaura de verdad (pide confirmación)
```
Respaldo diario automático (cron del servidor, 02:00):
`0 2 * * * cd /ruta/tenaristrack && ./scripts/backup.sh >> respaldos/backup.log 2>&1`
Copia la carpeta `respaldos/` fuera del servidor. Ejecuta `probar-recuperacion.sh` al menos una vez por Sprint.

## Actualizar a una versión nueva
```bash
git pull   # o copia los archivos nuevos
docker compose --profile https up -d --build
```
Los datos viven en el volumen `db_data`: reconstruir la imagen no los borra. Haz un respaldo antes.

## Controles de seguridad incluidos y su relación con los documentos

| Riesgo / requisito | Control en el proyecto |
|---|---|
| Base **no incremental** (seguridad) | Todas las claves primarias son UUID v4 `CHAR(36)`; no hay `AUTO_INCREMENT`. El folio del embarque (`EMB-XXXXXXXX`) es aleatorio, no un contador. Los ids recibidos se validan como UUID (400 si no lo son). |
| R06 · Acceso y seguridad (RNF-03) | Contraseñas con bcrypt (costo 12 en altas nuevas); token JWT de 8 h con algoritmo fijo HS256; roles jerárquicos en cada ruta; límite de 10 intentos de login por 15 min; mismo mensaje y tiempo parecido si el correo no existe; consultas SQL parametrizadas. |
| R06 · Navegador | Política de seguridad (CSP) estricta sin recursos externos (la fuente Merriweather se incluye en la aplicación), HSTS, `nosniff`, sin `X-Powered-By`, CORS cerrado salvo que se configure `CORS_ORIGIN`. |
| Secretos | En producción la API **no arranca** con un `JWT_SECRET` de menos de 32 caracteres. `.env` no se incluye en el paquete ni en Git. `npm run seed` se niega a ejecutarse en producción. |
| R01 · Datos simulados identificados | Con `DEMO_MODE=true` la interfaz muestra «Datos simulados con fines académicos». En producción no se cargan datos de demostración. |
| R10 · Consistencia de datos | Validaciones de estados, cantidades y relaciones; nodos, productos y usuarios inexistentes devuelven un error claro (ya no un 500); el cambio a «entregado» es transaccional y avisa si el inventario del origen no alcanza. |
| R11 · Alertas | Una lectura fuera de umbral abre una incidencia de prioridad alta y no la duplica mientras haya una abierta. |
| R08 · Pérdida de datos | Scripts de respaldo, restauración y **prueba de recuperación**; volumen persistente de MySQL. |
| RNF-01 · Disponibilidad | `restart: unless-stopped`, comprobaciones de salud de la base y de la API (`/api/health`), cierre ordenado del servidor. |
| RNF-02 · Tiempo de respuesta ≤ 3 s | Medido en pruebas: unos 2 ms en las consultas principales con los datos de ejemplo. |

## Limitaciones conocidas
- La sesión se guarda en el navegador (`localStorage`). La CSP estricta reduce el riesgo de XSS, pero para un uso
  industrial conviene pasar a cookies `HttpOnly` y agregar doble factor de autenticación.
- **HTTPS es obligatorio** en publicación (usa el perfil `https` o el de tu plataforma).
- HU-08 (actualizar inventarios) sigue sin pantalla: solo existe el servicio `PUT /api/inventarios`.
- Los archivos de Docker se probaron como configuración (sintaxis), no se construyó la imagen en el entorno de
  desarrollo. El código, la base de datos, la compilación de la interfaz y el arranque en modo producción sí se
  probaron (47 comprobaciones automáticas).
- Usar datos reales de TenarisTamsa requiere autorización de la empresa (riesgo R01).
