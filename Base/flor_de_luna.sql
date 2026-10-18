-- =====================================================================
--  FLOR DE LUNA — Base de datos (MySQL 8 / MariaDB 10.4+)
--
--  XAMPP (local):   phpMyAdmin > Importar > elegir este archivo > Continuar.
--  Railway (nube):  la base ya existe (se llama "railway"). Borra o comenta
--                   las 2 líneas del bloque "SOLO XAMPP" y ejecuta el resto.
--
--  Es seguro importarla más de una vez: no borra datos existentes.
-- =====================================================================

SET NAMES utf8mb4;

-- ----- SOLO XAMPP (omitir en Railway) --------------------------------
CREATE DATABASE IF NOT EXISTS flor_de_luna
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE flor_de_luna;
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
--  usuarios: cuentas creadas desde el registro.
--  La contraseña se guarda cifrada (password_hash / bcrypt), nunca en
--  texto plano.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id_usuario      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(100) NOT NULL,
  correo          VARCHAR(150) NOT NULL,
  clave_hash      VARCHAR(255) NOT NULL,
  fecha_registro  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_acceso   DATETIME     NULL,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuarios_correo (correo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  categorias: familias olfativas (los filtros de la tienda)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categorias (
  id_categoria  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre        VARCHAR(40)  NOT NULL,
  descripcion   VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (id_categoria),
  UNIQUE KEY uq_categorias_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  productos: catálogo. "slug" es el identificador corto que usa la
--  página (ej. 'petalo-de-luna'). "imagen" es el nombre del archivo.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS productos (
  id_producto      INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  id_categoria     INT UNSIGNED      NOT NULL,
  slug             VARCHAR(60)       NOT NULL,
  nombre           VARCHAR(80)       NOT NULL,
  presentacion_ml  SMALLINT UNSIGNED NOT NULL,
  precio           DECIMAL(8,2)      NOT NULL,
  notas            VARCHAR(200)      NOT NULL DEFAULT '',
  descripcion      VARCHAR(300)      NOT NULL DEFAULT '',
  imagen           VARCHAR(120)      NOT NULL,
  stock            INT UNSIGNED      NOT NULL DEFAULT 0,
  activo           TINYINT(1)        NOT NULL DEFAULT 1,
  fecha_creacion   DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_producto),
  UNIQUE KEY uq_productos_slug (slug),
  KEY idx_productos_categoria (id_categoria),
  CONSTRAINT fk_productos_categoria FOREIGN KEY (id_categoria)
    REFERENCES categorias (id_categoria) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  favoritos: perfumes marcados con corazón por cada usuario
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favoritos (
  id_usuario   INT UNSIGNED NOT NULL,
  id_producto  INT UNSIGNED NOT NULL,
  fecha        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario, id_producto),
  CONSTRAINT fk_favoritos_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuarios  (id_usuario)  ON DELETE CASCADE,
  CONSTRAINT fk_favoritos_producto FOREIGN KEY (id_producto) REFERENCES productos (id_producto) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  carrito: carrito guardado de cada usuario con sesión (máx. 10 por perfume)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carrito (
  id_usuario   INT UNSIGNED     NOT NULL,
  id_producto  INT UNSIGNED     NOT NULL,
  cantidad     TINYINT UNSIGNED NOT NULL DEFAULT 1,
  actualizado  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario, id_producto),
  CONSTRAINT fk_carrito_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuarios  (id_usuario)  ON DELETE CASCADE,
  CONSTRAINT fk_carrito_producto FOREIGN KEY (id_producto) REFERENCES productos (id_producto) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  pedidos: una fila por compra. Guarda una "foto" de los datos del
--  formulario de pago (contacto + entrega). NUNCA se guardan datos de
--  tarjeta.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pedidos (
  id_pedido        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo           VARCHAR(24)  NOT NULL,
  id_usuario       INT UNSIGNED NOT NULL,
  correo_contacto  VARCHAR(150) NOT NULL,
  nombre_cliente   VARCHAR(100) NOT NULL,
  telefono         VARCHAR(25)  NOT NULL,
  departamento     VARCHAR(40)  NOT NULL,
  municipio        VARCHAR(80)  NOT NULL,
  codigo_postal    VARCHAR(8)   NOT NULL DEFAULT '',
  direccion        VARCHAR(250) NOT NULL,
  referencia       VARCHAR(150) NOT NULL DEFAULT '',
  notas            VARCHAR(200) NOT NULL DEFAULT '',
  metodo_pago      ENUM('tarjeta','transferencia','contra_entrega') NOT NULL,
  subtotal         DECIMAL(9,2) NOT NULL,
  envio            DECIMAL(9,2) NOT NULL DEFAULT 0.00,
  total            DECIMAL(9,2) NOT NULL,
  estado           ENUM('pendiente','pagado','enviado','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  fecha_pedido     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_pedido),
  UNIQUE KEY uq_pedidos_codigo (codigo),
  KEY idx_pedidos_usuario (id_usuario, fecha_pedido),
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  detalle_pedido: perfumes de cada pedido. Se guardan el nombre y el
--  precio del momento de la compra, así el historial no cambia si luego
--  editas el catálogo.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detalle_pedido (
  id_detalle       INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  id_pedido        INT UNSIGNED     NOT NULL,
  id_producto      INT UNSIGNED     NOT NULL,
  nombre_producto  VARCHAR(80)      NOT NULL,
  precio_unitario  DECIMAL(8,2)     NOT NULL,
  cantidad         TINYINT UNSIGNED NOT NULL,
  subtotal         DECIMAL(9,2)     NOT NULL,
  PRIMARY KEY (id_detalle),
  KEY idx_detalle_pedido (id_pedido),
  KEY idx_detalle_producto (id_producto),
  CONSTRAINT fk_detalle_pedido   FOREIGN KEY (id_pedido)   REFERENCES pedidos   (id_pedido)   ON DELETE CASCADE,
  CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto) REFERENCES productos (id_producto) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  mensajes_contacto: formulario de la sección Contacto
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mensajes_contacto (
  id_mensaje   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario   INT UNSIGNED NULL,
  nombre       VARCHAR(100) NOT NULL,
  correo       VARCHAR(150) NOT NULL,
  mensaje      TEXT         NOT NULL,
  leido        TINYINT(1)   NOT NULL DEFAULT 0,
  fecha_envio  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_mensaje),
  KEY idx_mensajes_leido (leido, fecha_envio),
  CONSTRAINT fk_mensajes_usuario FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  DATOS INICIALES (el catálogo real de tu página; edítalo desde
--  phpMyAdmin o con UPDATE). El stock inicial es de ejemplo.
-- =====================================================================
INSERT IGNORE INTO categorias (id_categoria, nombre, descripcion) VALUES
  (1, 'Floral',    'Flores finas, delicado y luminoso.'),
  (2, 'Fresco',    'Ligero y natural, ideal para el día.'),
  (3, 'Oriental',  'Vainilla y notas cálidas, envolvente.');

DELETE FROM categorias
WHERE nombre = 'Amaderado'
  AND NOT EXISTS (
    SELECT 1 FROM productos
    WHERE productos.id_categoria = categorias.id_categoria
  );

INSERT IGNORE INTO productos
  (id_producto, id_categoria, slug, nombre, presentacion_ml, precio, notas, descripcion, imagen, stock, activo) VALUES
  (1, 1, 'amatista',       'Amatista',       50,  55.49, 'Aromas finos · Elegancia · Esencia',
      'Loción perfumada sofisticada y envolvente que refleja tu personalidad.',
      'Amatista.png',        50, 1),
  (2, 1, 'petalo-de-luna', 'Pétalo de Luna', 50,  65.99, 'Notas florales · Delicado · Larga duración',
      'Una fragancia única que despierta emociones y crea recuerdos inolvidables.',
      'Petalo_de_Luna.jpeg', 50, 1),
  (3, 2, 'besos-lavanda',  'Besos Lavanda',  50,  55.00, 'Lavanda · Esencia natural · Confort',
      'Tu esencia, tu sueño, tu historia en una loción perfumada única.',
      'Besos_Lavanda.jpeg',  50, 1),
  (4, 3, 'dulce-aurora',   'Dulce Aurora',   100, 50.59, 'Vainilla · Notas dulces · Sensorial',
      'Perfuma tus sueños, enamora tus sentidos con gran durabilidad.',
      'Dulce_Aurora.jpeg',   50, 1),
  (5, 3, 'luz-de-estrella','Luz de Estrella',50,  52.59, 'Vainilla dulce · Notas cálidas',
      'La belleza se admira, la esencia se recuerda bajo la luz de la luna.',
      'Luz_de_Estrella.jpeg',50, 1),
  (6, 1, 'sweet-lily',     'Sweet Lily',     50,  65.99, 'Lirio · Flores finas · Suavidad',
      'Una fragancia delicada que puede cambiarlo todo en tu día.',
      'Sweet_Lily.jpeg',     50, 1),
  (7, 3, 'luna-violeta',   'Luna Violeta',   100, 60.00, 'Violeta · Notas profundas',
      'Una esencia que enamora con elegancia y carácter nocturno.',
      'Luna_Violeta.jpeg',   50, 1),
  (8, 1, 'flor-nocturna',  'Flor Nocturna',  50,  49.99, 'Notas nocturnas · Misterio · Estela',
      'Deja que tu esencia hable por ti con esta loción perfumada.',
      'Flor_Nocturna.jpeg',  50, 1);
