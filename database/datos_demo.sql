-- =====================================================================
-- TenarisTrack · DATOS SIMULADOS DE DEMOSTRACIÓN
-- Son datos ficticios con fines académicos; no provienen de TenarisTamsa.
-- Los ids se generan solos (UUID v4). Los hashes de contraseña son marcadores:
-- ejecuta `npm run seed` en el backend para asignar una contraseña real.
-- NO cargar en producción real: usa `npm run crear-admin` en su lugar.
-- =====================================================================

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
