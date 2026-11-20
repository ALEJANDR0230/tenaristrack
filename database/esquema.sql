-- =====================================================================
-- TenarisTrack · Esquema de la base de datos (MySQL 8.0.13 o superior)
-- Torre de control logística con gemelo digital (Tamsa 1, 2 y 3)
--
-- Identificadores NO secuenciales: todas las claves primarias son UUID v4
-- (CHAR(36)). Así no se pueden adivinar ni enumerar contando 1, 2, 3...
-- Si una fila se inserta sin id, MySQL genera un UUID v4 con RANDOM_BYTES();
-- la API genera sus propios ids con crypto.randomUUID().
--
-- Uso: ejecutar con la base ya seleccionada, por ejemplo
--   mysql -u root -p tenaristrack < esquema.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. USUARIOS
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id  CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (LOWER(CONCAT(HEX(RANDOM_BYTES(4)),'-',HEX(RANDOM_BYTES(2)),'-4',SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',SUBSTR('89ab',1+(ORD(RANDOM_BYTES(1)) MOD 4),1),SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',HEX(RANDOM_BYTES(6))))) PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  correo         VARCHAR(120) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,           -- bcrypt, nunca texto plano
  rol            ENUM('administrador','product_owner','coordinador','operador','consulta')
                 NOT NULL DEFAULT 'consulta',
  area           ENUM('Demanda','Almacenes','Transporte','Comercio Exterior','Desarrollo') NULL,
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  creado_en      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. NODOS (complejos, patios, puertos, fronteras, terminales)
--    pos_x / pos_y: coordenadas del mapa del gemelo digital
-- ---------------------------------------------------------------------
CREATE TABLE nodos (
  id  CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (LOWER(CONCAT(HEX(RANDOM_BYTES(4)),'-',HEX(RANDOM_BYTES(2)),'-4',SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',SUBSTR('89ab',1+(ORD(RANDOM_BYTES(1)) MOD 4),1),SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',HEX(RANDOM_BYTES(6))))) PRIMARY KEY,
  codigo           VARCHAR(10)  NOT NULL UNIQUE,
  nombre           VARCHAR(80)  NOT NULL,
  tipo             ENUM('complejo','patio','puerto','frontera','terminal') NOT NULL,
  capacidad_max    INT UNSIGNED NOT NULL CHECK (capacidad_max > 0),   -- en tubos
  pos_x            SMALLINT NOT NULL DEFAULT 0,
  pos_y            SMALLINT NOT NULL DEFAULT 0,
  activo           TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. RUTAS (conexiones entre nodos)
-- ---------------------------------------------------------------------
CREATE TABLE rutas (
  id  CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (LOWER(CONCAT(HEX(RANDOM_BYTES(4)),'-',HEX(RANDOM_BYTES(2)),'-4',SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',SUBSTR('89ab',1+(ORD(RANDOM_BYTES(1)) MOD 4),1),SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',HEX(RANDOM_BYTES(6))))) PRIMARY KEY,
  nodo_origen_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nodo_destino_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  distancia_km     DECIMAL(8,1) NOT NULL,
  tiempo_est_horas DECIMAL(5,1) NOT NULL,
  medio            ENUM('camion','ferrocarril','mixto') NOT NULL DEFAULT 'camion',
  CONSTRAINT fk_ruta_origen  FOREIGN KEY (nodo_origen_id)  REFERENCES nodos(id),
  CONSTRAINT fk_ruta_destino FOREIGN KEY (nodo_destino_id) REFERENCES nodos(id),
  CONSTRAINT ck_ruta_distinta CHECK (nodo_origen_id <> nodo_destino_id),
  UNIQUE KEY uq_ruta (nodo_origen_id, nodo_destino_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. PRODUCTOS
-- ---------------------------------------------------------------------
CREATE TABLE productos (
  id  CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (LOWER(CONCAT(HEX(RANDOM_BYTES(4)),'-',HEX(RANDOM_BYTES(2)),'-4',SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',SUBSTR('89ab',1+(ORD(RANDOM_BYTES(1)) MOD 4),1),SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',HEX(RANDOM_BYTES(6))))) PRIMARY KEY,
  descripcion  VARCHAR(100) NOT NULL UNIQUE,
  familia      ENUM('OCTG','Line Pipe','Casing','Sin costura') NOT NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. EMBARQUES
--    El folio (EMB-XXXXXXXX) lo genera la API con caracteres aleatorios,
--    no con un contador.
-- ---------------------------------------------------------------------
CREATE TABLE embarques (
  id  CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (LOWER(CONCAT(HEX(RANDOM_BYTES(4)),'-',HEX(RANDOM_BYTES(2)),'-4',SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',SUBSTR('89ab',1+(ORD(RANDOM_BYTES(1)) MOD 4),1),SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',HEX(RANDOM_BYTES(6))))) PRIMARY KEY,
  folio            VARCHAR(15) NOT NULL UNIQUE,
  nodo_origen_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nodo_destino_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  ruta_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  producto_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  cantidad_tubos   INT UNSIGNED NOT NULL CHECK (cantidad_tubos > 0),
  avance_pct       TINYINT UNSIGNED NOT NULL DEFAULT 0 CHECK (avance_pct <= 100),
  estado           ENUM('en_ruta','en_patio','en_aduana','retrasado','entregado')
                   NOT NULL DEFAULT 'en_ruta',
  salida_en        DATETIME NULL,
  eta              DATETIME NULL,
  creado_por CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  creado_en        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  actualizado_en   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_emb_origen   FOREIGN KEY (nodo_origen_id)  REFERENCES nodos(id),
  CONSTRAINT fk_emb_destino  FOREIGN KEY (nodo_destino_id) REFERENCES nodos(id),
  CONSTRAINT fk_emb_ruta     FOREIGN KEY (ruta_id)         REFERENCES rutas(id),
  CONSTRAINT fk_emb_producto FOREIGN KEY (producto_id)     REFERENCES productos(id),
  CONSTRAINT fk_emb_usuario  FOREIGN KEY (creado_por)      REFERENCES usuarios(id),
  INDEX idx_emb_estado (estado),
  INDEX idx_emb_eta (eta),
  INDEX idx_emb_creado (creado_en)
) ENGINE=InnoDB;

-- Historial de cambios de estado (lo llena un trigger)
CREATE TABLE embarques_historial (
  id  CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (LOWER(CONCAT(HEX(RANDOM_BYTES(4)),'-',HEX(RANDOM_BYTES(2)),'-4',SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',SUBSTR('89ab',1+(ORD(RANDOM_BYTES(1)) MOD 4),1),SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',HEX(RANDOM_BYTES(6))))) PRIMARY KEY,
  embarque_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  estado_previo VARCHAR(20) NOT NULL,
  estado_nuevo  VARCHAR(20) NOT NULL,
  cambiado_en   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_hist_emb FOREIGN KEY (embarque_id) REFERENCES embarques(id) ON DELETE CASCADE,
  INDEX idx_hist_emb_fecha (embarque_id, cambiado_en)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. INVENTARIOS
-- ---------------------------------------------------------------------
CREATE TABLE inventarios (
  id  CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (LOWER(CONCAT(HEX(RANDOM_BYTES(4)),'-',HEX(RANDOM_BYTES(2)),'-4',SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',SUBSTR('89ab',1+(ORD(RANDOM_BYTES(1)) MOD 4),1),SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',HEX(RANDOM_BYTES(6))))) PRIMARY KEY,
  nodo_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  producto_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  cantidad_tubos  INT UNSIGNED NOT NULL DEFAULT 0,
  actualizado_en  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_inv_nodo     FOREIGN KEY (nodo_id)     REFERENCES nodos(id),
  CONSTRAINT fk_inv_producto FOREIGN KEY (producto_id) REFERENCES productos(id),
  UNIQUE KEY uq_inv (nodo_id, producto_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. SENSORES Y LECTURAS (IoT)
-- ---------------------------------------------------------------------
CREATE TABLE sensores (
  id  CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (LOWER(CONCAT(HEX(RANDOM_BYTES(4)),'-',HEX(RANDOM_BYTES(2)),'-4',SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',SUBSTR('89ab',1+(ORD(RANDOM_BYTES(1)) MOD 4),1),SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',HEX(RANDOM_BYTES(6))))) PRIMARY KEY,
  nodo_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  embarque_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,                 -- para GPS de unidades en tránsito
  nombre       VARCHAR(80) NOT NULL,
  tipo         ENUM('temperatura','vibracion','humedad','gps') NOT NULL,
  unidad       VARCHAR(10) NOT NULL,
  umbral_min   DECIMAL(8,2) NULL,
  umbral_max   DECIMAL(8,2) NULL,
  activo       TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_sen_nodo FOREIGN KEY (nodo_id)     REFERENCES nodos(id),
  CONSTRAINT fk_sen_emb  FOREIGN KEY (embarque_id) REFERENCES embarques(id)
) ENGINE=InnoDB;

CREATE TABLE lecturas (
  id  CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (LOWER(CONCAT(HEX(RANDOM_BYTES(4)),'-',HEX(RANDOM_BYTES(2)),'-4',SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',SUBSTR('89ab',1+(ORD(RANDOM_BYTES(1)) MOD 4),1),SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',HEX(RANDOM_BYTES(6))))) PRIMARY KEY,
  sensor_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  valor         DECIMAL(10,2) NOT NULL,
  registrada_en TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT fk_lec_sensor FOREIGN KEY (sensor_id) REFERENCES sensores(id) ON DELETE CASCADE,
  INDEX idx_lec_sensor_fecha (sensor_id, registrada_en)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. INCIDENCIAS
-- ---------------------------------------------------------------------
CREATE TABLE incidencias (
  id  CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT (LOWER(CONCAT(HEX(RANDOM_BYTES(4)),'-',HEX(RANDOM_BYTES(2)),'-4',SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',SUBSTR('89ab',1+(ORD(RANDOM_BYTES(1)) MOD 4),1),SUBSTR(HEX(RANDOM_BYTES(2)),2),'-',HEX(RANDOM_BYTES(6))))) PRIMARY KEY,
  titulo         VARCHAR(150) NOT NULL,
  descripcion    TEXT NULL,
  prioridad      ENUM('baja','media','alta') NOT NULL DEFAULT 'media',
  estado         ENUM('abierta','en_atencion','resuelta') NOT NULL DEFAULT 'abierta',
  nodo_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  embarque_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  reportada_por CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  asignada_a CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
  creada_en      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  resuelta_en    DATETIME NULL,
  CONSTRAINT fk_inc_nodo  FOREIGN KEY (nodo_id)       REFERENCES nodos(id),
  CONSTRAINT fk_inc_emb   FOREIGN KEY (embarque_id)   REFERENCES embarques(id),
  CONSTRAINT fk_inc_rep   FOREIGN KEY (reportada_por) REFERENCES usuarios(id),
  CONSTRAINT fk_inc_asig  FOREIGN KEY (asignada_a)    REFERENCES usuarios(id),
  INDEX idx_inc_estado_prio (estado, prioridad)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- TRIGGER: registrar cada cambio de estado de un embarque
-- ---------------------------------------------------------------------
DELIMITER $$
CREATE TRIGGER trg_embarque_estado
AFTER UPDATE ON embarques
FOR EACH ROW
BEGIN
  IF OLD.estado <> NEW.estado THEN
    INSERT INTO embarques_historial (embarque_id, estado_previo, estado_nuevo)
    VALUES (NEW.id, OLD.estado, NEW.estado);
  END IF;
END$$
DELIMITER ;

-- ---------------------------------------------------------------------
-- VISTAS que alimentan el tablero
-- ---------------------------------------------------------------------
CREATE VIEW v_ocupacion_nodos AS
SELECT n.id, n.codigo, n.nombre, n.tipo, n.pos_x, n.pos_y, n.capacidad_max,
       COALESCE(SUM(i.cantidad_tubos),0) AS inventario_tubos,
       ROUND(100 * COALESCE(SUM(i.cantidad_tubos),0) / n.capacidad_max) AS ocupacion_pct,
       CASE WHEN 100 * COALESCE(SUM(i.cantidad_tubos),0) / n.capacidad_max > 75 THEN 'rojo'
            WHEN 100 * COALESCE(SUM(i.cantidad_tubos),0) / n.capacidad_max > 60 THEN 'amarillo'
            ELSE 'verde' END AS semaforo
FROM nodos n
LEFT JOIN inventarios i ON i.nodo_id = n.id
GROUP BY n.id;

CREATE VIEW v_embarques_detalle AS
SELECT e.folio, o.nombre AS origen, d.nombre AS destino, p.descripcion AS producto,
       e.cantidad_tubos, e.avance_pct, e.estado, e.eta
FROM embarques e
JOIN nodos o ON o.id = e.nodo_origen_id
JOIN nodos d ON d.id = e.nodo_destino_id
JOIN productos p ON p.id = e.producto_id;

CREATE VIEW v_kpis AS
SELECT COUNT(*) AS embarques_activos,
       SUM(estado = 'retrasado') AS retrasados,
       ROUND(100 * (1 - SUM(estado = 'retrasado') / COUNT(*))) AS nivel_servicio_pct,
       (SELECT COALESCE(SUM(cantidad_tubos),0) FROM inventarios) AS inventario_total
FROM embarques
WHERE estado <> 'entregado';
