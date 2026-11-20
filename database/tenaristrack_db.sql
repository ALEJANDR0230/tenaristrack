-- =====================================================================
-- TenarisTrack · Script completo (esquema + datos simulados) · MySQL 8.0.13+
-- Uso rápido en desarrollo:  mysql -u root -p < tenaristrack_db.sql
-- Es la unión de esquema.sql y datos_demo.sql. Para producción usa esquema.sql.
-- ATENCIÓN: borra y vuelve a crear la base `tenaristrack`.
-- =====================================================================

DROP DATABASE IF EXISTS tenaristrack;
CREATE DATABASE tenaristrack CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE tenaristrack;


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


INSERT INTO usuarios (nombre, correo, password_hash, rol, area) VALUES
 ('Admin TenarisTrack','admin@tenaristrack.mx','$2b$10$REEMPLAZAR_CON_HASH_BCRYPT','administrador','Desarrollo'),
 ('Product Owner','po@tenaristrack.mx','$2b$10$REEMPLAZAR_CON_HASH_BCRYPT','product_owner','Desarrollo'),
 ('Coord. Transporte','transporte@tenaristrack.mx','$2b$10$REEMPLAZAR_CON_HASH_BCRYPT','coordinador','Transporte'),
 ('Operador Almacenes','almacenes@tenaristrack.mx','$2b$10$REEMPLAZAR_CON_HASH_BCRYPT','operador','Almacenes');

INSERT INTO nodos (codigo, nombre, tipo, capacidad_max, pos_x, pos_y) VALUES
 ('T1','Tamsa 1','complejo',6176,90,70),
 ('T2','Tamsa 2','complejo',5741,90,180),
 ('T3','Tamsa 3','complejo',6914,90,290),
 ('PA','Patio A','patio',8961,290,110),
 ('PB','Patio B','patio',7755,290,260),
 ('PV','Puerto Veracruz','puerto',3387,520,90),
 ('RE','Frontera Reynosa','frontera',2571,520,200),
 ('CO','Coatzacoalcos','terminal',3409,520,310);

-- Distancias y tiempos ilustrativos; ajustar con datos reales de Transporte.
INSERT INTO rutas (nodo_origen_id, nodo_destino_id, distancia_km, tiempo_est_horas, medio)
SELECT o.id, d.id, v.km, v.h, v.medio FROM (
  SELECT 'T1' o,'PA' d, 3.0 km, 0.3 h,'camion' medio UNION ALL
  SELECT 'T2','PA',4.0,0.4,'camion' UNION ALL
  SELECT 'T2','PB',5.0,0.5,'camion' UNION ALL
  SELECT 'T3','PB',3.5,0.4,'camion' UNION ALL
  SELECT 'PA','PV',25.0,1.0,'mixto' UNION ALL
  SELECT 'PA','RE',950.0,14.0,'ferrocarril' UNION ALL
  SELECT 'PB','CO',320.0,5.5,'camion' UNION ALL
  SELECT 'PB','RE',960.0,15.0,'camion'
) v JOIN nodos o ON o.codigo = v.o JOIN nodos d ON d.codigo = v.d;

INSERT INTO productos (descripcion, familia) VALUES
 ('Tubería OCTG 9 5/8"','OCTG'),
 ('Línea API 5L','Line Pipe'),
 ('Casing P110','Casing'),
 ('Tubería OCTG 7"','OCTG'),
 ('Tubo sin costura','Sin costura'),
 ('Casing N80','Casing'),
 ('Tubería OCTG 5 1/2"','OCTG');

INSERT INTO inventarios (nodo_id, producto_id, cantidad_tubos)
SELECT n.id, p.id, v.q FROM (
  SELECT 'T1' c,'Tubería OCTG 9 5/8"' p, 4200 q UNION ALL
  SELECT 'T2','Línea API 5L',3100 UNION ALL
  SELECT 'T3','Casing P110',5600 UNION ALL
  SELECT 'PA','Casing N80',6900 UNION ALL
  SELECT 'PB','Tubo sin costura',3800 UNION ALL
  SELECT 'PV','Tubería OCTG 7"',2100 UNION ALL
  SELECT 'RE','Línea API 5L',900 UNION ALL
  SELECT 'CO','Casing P110',1500
) v JOIN nodos n ON n.codigo = v.c JOIN productos p ON p.descripcion = v.p;

INSERT INTO embarques (folio, nodo_origen_id, nodo_destino_id, producto_id, cantidad_tubos, avance_pct, estado, salida_en, eta, creado_por)
SELECT v.f, o.id, d.id, p.id, v.q, v.a, v.e, NOW(), DATE_ADD(NOW(), INTERVAL v.h HOUR),
       (SELECT id FROM usuarios WHERE correo = 'transporte@tenaristrack.mx') FROM (
  SELECT 'EMB-1021' f,'T1' o,'PV' d,'Tubería OCTG 9 5/8"' p,420 q,72 a,'en_ruta' e,6 h UNION ALL
  SELECT 'EMB-1022','T2','RE','Línea API 5L',310,40,'en_ruta',9 UNION ALL
  SELECT 'EMB-1023','T3','CO','Casing P110',560,15,'retrasado',20 UNION ALL
  SELECT 'EMB-1024','PA','PV','Tubería OCTG 7"',380,90,'en_aduana',3 UNION ALL
  SELECT 'EMB-1025','T3','PB','Tubo sin costura',250,100,'en_patio',0 UNION ALL
  SELECT 'EMB-1026','PB','RE','Línea API 5L',300,55,'en_ruta',8 UNION ALL
  SELECT 'EMB-1027','T1','PA','Casing N80',470,100,'en_patio',0 UNION ALL
  SELECT 'EMB-1028','PA','RE','Tubería OCTG 5 1/2"',340,28,'retrasado',30
) v JOIN nodos o ON o.codigo = v.o JOIN nodos d ON d.codigo = v.d
    JOIN productos p ON p.descripcion = v.p;

INSERT INTO sensores (nodo_id, embarque_id, nombre, tipo, unidad, umbral_min, umbral_max) VALUES
 ((SELECT id FROM nodos WHERE codigo='PA'), NULL,'Temperatura patio A','temperatura','°C',5,40),
 ((SELECT id FROM nodos WHERE codigo='T2'), NULL,'Vibración transportador T2','vibracion','mm/s',0,4.5),
 ((SELECT id FROM nodos WHERE codigo='T3'), NULL,'Humedad almacén T3','humedad','%',30,70),
 (NULL,(SELECT id FROM embarques WHERE folio='EMB-1022'),'GPS camión EMB-1022','gps','km/h',0,90);

INSERT INTO lecturas (sensor_id, valor)
SELECT s.id, v.valor FROM (
  SELECT 'Temperatura patio A' n, 32.4 valor UNION ALL SELECT 'Temperatura patio A',32.9 UNION ALL
  SELECT 'Vibración transportador T2',3.1 UNION ALL SELECT 'Vibración transportador T2',3.4 UNION ALL
  SELECT 'Humedad almacén T3',58.0 UNION ALL SELECT 'Humedad almacén T3',57.2 UNION ALL
  SELECT 'GPS camión EMB-1022',64.0 UNION ALL SELECT 'GPS camión EMB-1022',61.5
) v JOIN sensores s ON s.nombre = v.n;

INSERT INTO incidencias (titulo, descripcion, prioridad, estado, nodo_id, embarque_id, reportada_por, asignada_a) VALUES
 ('Retraso en EMB-1023: falla en tractocamión','Unidad detenida; se requiere sustitución.','alta','abierta',
   (SELECT id FROM nodos WHERE codigo='T3'),(SELECT id FROM embarques WHERE folio='EMB-1023'),
   (SELECT id FROM usuarios WHERE correo='almacenes@tenaristrack.mx'),(SELECT id FROM usuarios WHERE correo='transporte@tenaristrack.mx')),
 ('Congestión en Patio A: ocupación 77%','Reubicar inventario hacia Patio B.','media','en_atencion',
   (SELECT id FROM nodos WHERE codigo='PA'),NULL,
   (SELECT id FROM usuarios WHERE correo='almacenes@tenaristrack.mx'),(SELECT id FROM usuarios WHERE correo='transporte@tenaristrack.mx')),
 ('Documentación pendiente en aduana EMB-1024','Falta pedimento firmado.','media','abierta',
   (SELECT id FROM nodos WHERE codigo='PV'),(SELECT id FROM embarques WHERE folio='EMB-1024'),
   (SELECT id FROM usuarios WHERE correo='transporte@tenaristrack.mx'),(SELECT id FROM usuarios WHERE correo='transporte@tenaristrack.mx'));
