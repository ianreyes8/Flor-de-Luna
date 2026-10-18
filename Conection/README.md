# Conexión con MySQL en XAMPP

1. Inicia **Apache** y **MySQL** desde el panel de XAMPP.
2. Confirma en phpMyAdmin que exista la base de datos `flor_de_luna` y sus tablas.
3. Abre el sitio desde `http://localhost/Flor%20de%20Luna/`; no abras `index.html` directamente como archivo.

La API usa PDO y por defecto conecta a `127.0.0.1:3306`, base `flor_de_luna`, usuario `root` y contraseña vacía (configuración habitual de XAMPP). Si tu instalación usa otros datos, define `FDL_DB_HOST`, `FDL_DB_PORT`, `FDL_DB_NAME`, `FDL_DB_USER` y `FDL_DB_PASSWORD` en el entorno de Apache. No pongas credenciales en JavaScript.

La API está en `api/index.php`; la conexión PDO está en `api/database.php`. Si MySQL no conecta, revisa el registro de errores de PHP/Apache de XAMPP. Las contraseñas se guardan con `password_hash`; los números de tarjeta, vencimientos y CVV nunca se envían ni se almacenan.
