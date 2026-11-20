# TenarisTrack — Torre de control logística (aplicación web)

Proyecto completo: base de datos MySQL, API REST (Node.js + Express) y frontend (React + Vite).

> **Publicación como aplicación web:** ver [DEPLOY.md](DEPLOY.md). Las claves de la base son UUID (no secuenciales).

```
tenaristrack/
├── database/esquema.sql           Esquema, vistas y disparador (para producción)
├── database/datos_demo.sql        Datos simulados de demostración
├── database/tenaristrack_db.sql   Todo junto para desarrollo (borra y crea la base)
├── Dockerfile · docker-compose.yml  Publicación con Docker (API + interfaz + MySQL)
├── scripts/                       Respaldo, restauración y prueba de recuperación
├── DEPLOY.md                      Guía de publicación y de seguridad
├── backend/                       API REST (Express, mysql2, JWT, bcrypt)
└── frontend/                      Interfaz React (Vite)
```

## Requisitos
- Node.js 18 o superior
- MySQL 8.0 o superior

## Puesta en marcha

### 1. Base de datos
```bash
mysql -u root -p < database/tenaristrack_db.sql
```

### 2. Backend
```bash
cd backend
cp .env.example .env        # edita DB_PASSWORD y JWT_SECRET
npm install
npm run seed                # asigna la contraseña de ejemplo a los usuarios (solo desarrollo)
npm start                   # http://localhost:4000
```
Comprobación: abre http://localhost:4000/api/health. Debe responder `{"ok":true,"db":true}`.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```
El servidor de desarrollo redirige `/api` al backend (puerto 4000). En producción, la API sirve `frontend/dist` (después de `npm run build`) en el mismo puerto: no hace falta otro servidor.

## Usuarios de ejemplo
Contraseña de todos: `Tenaris2026!` (o el valor de `DEMO_PASSWORD` en `.env`).

| Correo                        | Rol           |
|-------------------------------|---------------|
| admin@tenaristrack.mx         | administrador |
| po@tenaristrack.mx            | product_owner |
| transporte@tenaristrack.mx    | coordinador   |
| almacenes@tenaristrack.mx     | operador      |

## Roles y permisos
Jerarquía del diagrama de casos de uso: cada rol incluye lo del anterior.

| Rol | Puede |
|-----|-------|
| consulta | Ver tablero, embarques, sensores e incidencias |
| operador | + Actualizar inventario, registrar lecturas e incidencias |
| coordinador | + Crear/actualizar embarques, asignar y resolver incidencias |
| product_owner | + Administrar nodos, rutas y productos |
| administrador | + Gestionar usuarios |

## Endpoints principales
Todos requieren `Authorization: Bearer <token>`, excepto el login y el health check.

| Método | Ruta | Descripción | Rol mínimo |
|--------|------|-------------|-----------|
| POST | /api/auth/login | Inicia sesión y devuelve el token | — |
| GET | /api/auth/me | Usuario actual | consulta |
| GET | /api/dashboard/kpis | Indicadores del tablero | consulta |
| GET | /api/nodos, /api/nodos/:id | Nodos con ocupación y detalle | consulta |
| POST/PUT | /api/nodos | Crear/editar nodos | product_owner |
| GET/POST | /api/rutas | Rutas | consulta / product_owner |
| GET/POST | /api/productos | Productos | consulta / product_owner |
| GET | /api/embarques?estado= | Lista de embarques | consulta |
| POST | /api/embarques | Crea embarque (folio aleatorio EMB-XXXXXXXX) | coordinador |
| PUT | /api/embarques/:id | Cambia estado/avance. Al pasar a *entregado* mueve el inventario y avisa si el origen no alcanza | coordinador |

Todos los `:id` son UUID; un valor que no lo sea responde 400.
| GET/PUT | /api/inventarios | Consulta / actualiza inventario | consulta / operador |
| GET | /api/sensores | Sensores con última lectura | consulta |
| POST | /api/sensores/:id/lecturas | Registra lectura; si excede el umbral abre una incidencia alta | operador |
| GET/POST | /api/incidencias | Lista / registra incidencias | consulta / operador |
| PUT | /api/incidencias/:id | Asigna, cambia prioridad o resuelve | coordinador |
| GET/POST | /api/usuarios | Gestión de usuarios | administrador |

## Notas
- Las lecturas de sensores se registran manualmente desde la interfaz. Para sensores reales, el dispositivo (o un gateway) debe llamar a `POST /api/sensores/:id/lecturas` con un token válido.
- Antes de desplegar, cambia `JWT_SECRET`, las contraseñas de ejemplo y restringe `CORS_ORIGIN`.
