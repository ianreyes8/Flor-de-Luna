# Flor de Luna 🌸

Catálogo web de perfumería hecho con HTML, CSS y JavaScript sin frameworks. La tienda funciona de forma estática, sin conexión a PHP ni a una base de datos.

## Funciones

- Catálogo de ocho fragancias con búsqueda y filtros.
- Carrito, favoritos, perfil de demostración e historial de pedidos guardados en el navegador (`localStorage`).
- Checkout de demostración con validación de los datos y resumen del pedido. No procesa pagos.
- Formulario de contacto validado en la página; no envía mensajes.
- Temas claro y oscuro, diseño adaptable y controles accesibles.

## Ejecución

Abre `index.html` directamente en el navegador o publica los archivos estáticos en un hosting web. No requiere XAMPP, PHP ni MySQL.

El inicio de sesión y el registro son solo una demostración: no verifican ni almacenan contraseñas. Los datos locales permanecen en el navegador y no se sincronizan con otros dispositivos.

## Archivos principales

- `index.html`: contenido de la página y diálogos.
- `estilos.css`: estilos y temas.
- `script.js`: catálogo y funciones locales de la tienda.
- `Flor de luna/`: imágenes.

Las carpetas `Base/` y `Conection/` son componentes de la versión con base de datos; esta página no las utiliza.
