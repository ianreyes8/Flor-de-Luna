# Flor de Luna 🌙

Tienda web de lociones perfumadas con un diseño minimalista y moderno en **blanco, morado y dorado oscuro**, con modo oscuro, carrito de compras, cuentas de usuario y un checkout completo. Los datos se guardan en **MySQL** a través de una API en **PHP**.

> Proyecto en desarrollo. Por ahora funciona en local con **XAMPP**; el pago es una **simulación** (no se cobra nada).

## Características

- **Catálogo** con 8 fragancias, filtros por familia olfativa y búsqueda por nombre (con la lupa).
- **Cuentas de usuario:** registro e inicio de sesión. Sin sesión no se puede pagar ni guardar favoritos.
- **Carrito** de tamaño limitado, en morado pastel translúcido, con máximo de 10 unidades por perfume y envío gratis desde $60.
- **Favoritos** guardados por usuario.
- **Checkout completo:** contacto, dirección de entrega (departamentos de El Salvador), método de pago (tarjeta, transferencia o contra entrega) y resumen del pedido. Valida la tarjeta con el algoritmo de Luhn y **nunca envía ni guarda datos de tarjeta**.
- **Mis pedidos:** historial de compras de cada usuario.
- **Contacto:** los mensajes se guardan en la base de datos.
- **Modo claro y oscuro** que recuerda tu preferencia.
- Diseño adaptable a celular y accesible (etiquetas ARIA, foco visible, navegación con teclado).

## Tecnologías

HTML5 · CSS3 · JavaScript (sin frameworks) · PHP 8 (PDO) · MySQL / MariaDB · XAMPP

## Estructura del proyecto

```
Flor de Luna/
├── index.html            Página principal (inicio, productos, información, contacto, modales)
├── estilos.css           Estilos (modo claro y oscuro)
├── script.js             Lógica de la interfaz; se comunica con la API
├── Flor de luna/         Imágenes: logo, colección y frascos
├── Base/
│   └── flor_de_luna.sql  Script de la base de datos (tablas + catálogo inicial)
└── Conection/
    ├── database.php      Conexión a MySQL con PDO
    ├── index.php         API JSON (registro, login, carrito, favoritos, pedidos, contacto)
    └── README.md         Notas rápidas de conexión
```

## Cómo ejecutarlo en XAMPP

1. Instala [XAMPP](https://www.apachefriends.org/) y abre el **XAMPP Control Panel**.
2. Copia esta carpeta completa dentro de `C:\xampp\htdocs\`.
3. Enciende **Apache** y **MySQL**.
4. Abre **http://localhost/phpmyadmin** → pestaña **Importar** → elige `Base/flor_de_luna.sql` → **Continuar**. Crea la base `flor_de_luna` con sus tablas y los 8 perfumes. Se puede importar varias veces sin perder datos.
5. Abre el sitio desde el navegador: `http://localhost/Flor%20de%20Luna/` (ajusta el nombre si cambiaste el de la carpeta).

> No abras `index.html` con doble clic: PHP necesita pasar por Apache para funcionar.

### Configuración de la base de datos

Por defecto se conecta a `127.0.0.1:3306`, base `flor_de_luna`, usuario `root` y sin contraseña (lo normal en XAMPP). Si tu MySQL es distinto, puedes definir estas variables de entorno:

`FDL_DB_HOST` · `FDL_DB_PORT` · `FDL_DB_NAME` · `FDL_DB_USER` · `FDL_DB_PASSWORD`

## Base de datos

Ocho tablas en `flor_de_luna` (visibles en phpMyAdmin):

| Tabla | Contenido |
|---|---|
| `usuarios` | Cuentas (la contraseña se guarda cifrada con `password_hash`) |
| `categorias` | Familias olfativas: Floral, Fresco, Oriental, Amaderado |
| `productos` | Catálogo: nombre, ml, precio, stock, imagen. Con `activo = 0` se oculta un producto |
| `favoritos` | Perfumes marcados por cada usuario |
| `carrito` | Carrito guardado de cada usuario con sesión |
| `pedidos` | Cada compra, con los datos de contacto y entrega del formulario |
| `detalle_pedido` | Perfumes de cada pedido, con el nombre y precio del momento de la compra |
| `mensajes_contacto` | Mensajes enviados desde la sección Contacto |

## API

`Conection/index.php` responde en JSON. Las operaciones de escritura se envían por `POST` con `Content-Type: application/json` y un campo `action`:

| Acción | Método | Requiere sesión | Descripción |
|---|---|---|---|
| `session` | GET | No | Usuario actual, favoritos y carrito |
| `register` | POST | No | Crea una cuenta e inicia sesión |
| `login` | POST | No | Inicia sesión |
| `logout` | POST | No | Cierra sesión |
| `cart` | POST | Sí | Guarda el carrito completo |
| `favorite` | POST | Sí | Agrega o quita un favorito |
| `order` | POST | Sí | Crea un pedido con el carrito guardado |
| `orders` | GET | Sí | Historial de pedidos del usuario |
| `contact` | POST | No | Guarda un mensaje de contacto |

## Seguridad

- Consultas preparadas (PDO) en todas las operaciones.
- Contraseñas con `password_hash` / `password_verify`.
- Cookie de sesión `HttpOnly` y `SameSite=Strict`; se regenera el ID al iniciar sesión.
- Los **precios y el envío los calcula el servidor** desde la base de datos, nunca el navegador.
- El pedido se guarda en una **transacción** que bloquea las filas, revisa el stock y lo descuenta.
- Los datos de tarjeta no llegan al servidor.

## Limitaciones conocidas

- El pago es una demostración: no hay pasarela de pago real.
- El sitio se conecta a la base solo desde XAMPP. Vercel no ejecuta PHP, así que una versión publicada allí no podría usar la base de datos.
- Aún no hay límite de intentos de inicio de sesión ni protección anti-spam en el formulario de contacto.

## Autor

**Ian Reyes**
