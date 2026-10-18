<?php
declare(strict_types=1);

require_once __DIR__ . '/database.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function respond(array $data, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requestData(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== 0) {
        respond(['error' => 'La solicitud debe enviarse como JSON.'], 415);
    }

    $data = json_decode(file_get_contents('php://input'), true);
    if (!is_array($data)) {
        respond(['error' => 'El contenido de la solicitud no es válido.'], 400);
    }

    return $data;
}

function currentUser(PDO $db): ?array
{
    $userId = $_SESSION['user_id'] ?? null;
    if (!is_int($userId)) {
        return null;
    }

    $query = $db->prepare('SELECT id_usuario, nombre, correo FROM usuarios WHERE id_usuario = ?');
    $query->execute([$userId]);
    $user = $query->fetch();

    return $user ?: null;
}

function requireUser(PDO $db): array
{
    $user = currentUser($db);
    if (!$user) {
        respond(['error' => 'Inicia sesión para continuar.'], 401);
    }

    return $user;
}

function userData(PDO $db, int $userId): array
{
    $query = $db->prepare(
        'SELECT p.slug FROM favoritos f JOIN productos p ON p.id_producto = f.id_producto WHERE f.id_usuario = ?'
    );
    $query->execute([$userId]);
    $favorites = array_column($query->fetchAll(), 'slug');

    $query = $db->prepare(
        'SELECT p.slug AS id, c.cantidad AS qty FROM carrito c JOIN productos p ON p.id_producto = c.id_producto WHERE c.id_usuario = ?'
    );
    $query->execute([$userId]);

    return ['favorites' => $favorites, 'cart' => $query->fetchAll()];
}

function normalizeCart(array $items): array
{
    $cart = [];
    foreach ($items as $item) {
        if (!is_array($item) || !isset($item['id'], $item['qty']) || !is_string($item['id'])) {
            respond(['error' => 'El carrito contiene un producto no válido.'], 400);
        }
        $qty = filter_var($item['qty'], FILTER_VALIDATE_INT);
        if ($qty === false || $qty < 1 || $qty > 10) {
            respond(['error' => 'Cada producto permite entre 1 y 10 unidades.'], 400);
        }
        $cart[$item['id']] = min(10, ($cart[$item['id']] ?? 0) + $qty);
    }

    return $cart;
}

try {
    $db = database();
    $secureCookie = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_set_cookie_params([
        'httponly' => true,
        'secure' => $secureCookie,
        'samesite' => 'Strict',
        'path' => '/',
    ]);
    session_start();

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? '';

    if ($method === 'GET' && $action === 'session') {
        $user = currentUser($db);
        respond([
            'user' => $user ? ['name' => $user['nombre'], 'email' => $user['correo']] : null,
            'data' => $user ? userData($db, (int) $user['id_usuario']) : ['favorites' => [], 'cart' => []],
        ]);
    }

    if ($method === 'POST') {
        $data = requestData();
        $action = $data['action'] ?? '';

        if ($action === 'register') {
            $name = trim((string) ($data['name'] ?? ''));
            $email = strtolower(trim((string) ($data['email'] ?? '')));
            $password = (string) ($data['password'] ?? '');

            if (strlen($name) < 2 || !preg_match('/^[\p{L}]+(?:\s+[\p{L}]+)*$/u', $name)) {
                respond(['error' => 'Escribe un nombre válido.'], 422);
            }
            if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
                respond(['error' => 'Escribe un correo válido.'], 422);
            }
            if (strlen($password) < 8 || !preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
                respond(['error' => 'La contraseña debe tener 8 caracteres o más, con letras y números.'], 422);
            }

            $insert = $db->prepare('INSERT INTO usuarios (nombre, correo, clave_hash) VALUES (?, ?, ?)');
            try {
                $insert->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT)]);
            } catch (PDOException $error) {
                if ($error->getCode() === '23000') {
                    respond(['error' => 'Ya existe una cuenta con ese correo. Prueba iniciar sesión.'], 409);
                }
                throw $error;
            }

            session_regenerate_id(true);
            $_SESSION['user_id'] = (int) $db->lastInsertId();
            respond(['user' => ['name' => $name, 'email' => $email], 'data' => ['favorites' => [], 'cart' => []]], 201);
        }

        if ($action === 'login') {
            $email = strtolower(trim((string) ($data['email'] ?? '')));
            $password = (string) ($data['password'] ?? '');
            $query = $db->prepare('SELECT id_usuario, nombre, correo, clave_hash FROM usuarios WHERE correo = ?');
            $query->execute([$email]);
            $user = $query->fetch();
            if (!$user || !password_verify($password, $user['clave_hash'])) {
                respond(['error' => 'Correo o contraseña incorrectos.'], 401);
            }

            session_regenerate_id(true);
            $_SESSION['user_id'] = (int) $user['id_usuario'];
            $db->prepare('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = ?')->execute([$user['id_usuario']]);
            respond([
                'user' => ['name' => $user['nombre'], 'email' => $user['correo']],
                'data' => userData($db, (int) $user['id_usuario']),
            ]);
        }

        if ($action === 'logout') {
            $_SESSION = [];
            if (ini_get('session.use_cookies')) {
                $params = session_get_cookie_params();
                setcookie(session_name(), '', time() - 42000, $params['path'], '', $params['secure'], $params['httponly']);
            }
            session_destroy();
            respond(['ok' => true]);
        }

        if ($action === 'contact') {
            $name = trim((string) ($data['name'] ?? ''));
            $email = strtolower(trim((string) ($data['email'] ?? '')));
            $message = trim((string) ($data['message'] ?? ''));
            if (strlen($name) < 2 || strlen($name) > 100 || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150 || strlen($message) < 10) {
                respond(['error' => 'Revisa el nombre, el correo y el mensaje (mínimo 10 caracteres).'], 422);
            }

            $user = currentUser($db);
            $insert = $db->prepare('INSERT INTO mensajes_contacto (id_usuario, nombre, correo, mensaje) VALUES (?, ?, ?, ?)');
            $insert->execute([$user['id_usuario'] ?? null, $name, $email, $message]);
            respond(['ok' => true], 201);
        }

        if ($action === 'cart') {
            $user = requireUser($db);
            $cart = normalizeCart(is_array($data['items'] ?? null) ? $data['items'] : []);
            $db->beginTransaction();
            $db->prepare('DELETE FROM carrito WHERE id_usuario = ?')->execute([$user['id_usuario']]);
            $lookup = $db->prepare('SELECT id_producto FROM productos WHERE slug = ? AND activo = 1');
            $insert = $db->prepare('INSERT INTO carrito (id_usuario, id_producto, cantidad) VALUES (?, ?, ?)');
            foreach ($cart as $slug => $qty) {
                $lookup->execute([$slug]);
                $productId = $lookup->fetchColumn();
                if (!$productId) {
                    $db->rollBack();
                    respond(['error' => 'Uno de los productos del carrito ya no está disponible.'], 422);
                }
                $insert->execute([$user['id_usuario'], $productId, $qty]);
            }
            $db->commit();
            respond(['cart' => array_map(static fn(string $id, int $qty): array => ['id' => $id, 'qty' => $qty], array_keys($cart), array_values($cart))]);
        }

        if ($action === 'favorite') {
            $user = requireUser($db);
            $slug = (string) ($data['id'] ?? '');
            $lookup = $db->prepare('SELECT id_producto FROM productos WHERE slug = ? AND activo = 1');
            $lookup->execute([$slug]);
            $productId = $lookup->fetchColumn();
            if (!$productId) {
                respond(['error' => 'El producto no existe o está inactivo.'], 404);
            }

            $delete = $db->prepare('DELETE FROM favoritos WHERE id_usuario = ? AND id_producto = ?');
            $delete->execute([$user['id_usuario'], $productId]);
            if (!$delete->rowCount()) {
                $db->prepare('INSERT INTO favoritos (id_usuario, id_producto) VALUES (?, ?)')->execute([$user['id_usuario'], $productId]);
                $added = true;
            } else {
                $added = false;
            }
            respond(['added' => $added, 'favorites' => userData($db, (int) $user['id_usuario'])['favorites']]);
        }

        if ($action === 'order') {
            $user = requireUser($db);
            $allowedPayments = ['tarjeta', 'transferencia', 'contra_entrega'];
            $payment = (string) ($data['payment'] ?? '');
            $email = strtolower(trim((string) ($data['email'] ?? '')));
            $name = trim((string) ($data['name'] ?? ''));
            $phone = trim((string) ($data['phone'] ?? ''));
            $department = trim((string) ($data['department'] ?? ''));
            $city = trim((string) ($data['city'] ?? ''));
            $zip = trim((string) ($data['zip'] ?? ''));
            $address = trim((string) ($data['address'] ?? ''));
            $reference = trim((string) ($data['reference'] ?? ''));
            $notes = trim((string) ($data['notes'] ?? ''));

            $departments = ['Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad', 'La Paz', 'La Unión',
                'Morazán', 'San Miguel', 'San Salvador', 'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután'];

            if (!in_array($department, $departments, true) || !in_array($payment, $allowedPayments, true) || !filter_var($email, FILTER_VALIDATE_EMAIL)
                || strlen($name) < 3 || strlen($name) > 100 || strlen($phone) < 8 || strlen($phone) > 25 || strlen($department) < 2 || strlen($department) > 40
                || strlen($city) < 3 || strlen($city) > 80 || strlen($address) < 8 || strlen($address) > 250 || strlen($zip) > 8
                || strlen($reference) > 150 || strlen($notes) > 200) {
                respond(['error' => 'Los datos del pedido no son válidos. Revisa el formulario e inténtalo de nuevo.'], 422);
            }

            $db->beginTransaction();
            $cartQuery = $db->prepare(
                'SELECT p.id_producto, p.slug, p.nombre, p.precio, p.stock, c.cantidad FROM carrito c JOIN productos p ON p.id_producto = c.id_producto WHERE c.id_usuario = ? AND p.activo = 1 FOR UPDATE'
            );
            $cartQuery->execute([$user['id_usuario']]);
            $items = $cartQuery->fetchAll();
            if (!$items) {
                $db->rollBack();
                respond(['error' => 'Tu carrito está vacío.'], 422);
            }

            $subtotal = 0.0;
            foreach ($items as $item) {
                if ((int) $item['cantidad'] > (int) $item['stock']) {
                    $db->rollBack();
                    respond(['error' => 'No hay suficiente inventario de ' . $item['nombre'] . '. Ajusta el carrito.'], 409);
                }
                $subtotal += (float) $item['precio'] * (int) $item['cantidad'];
            }
            $shipping = $subtotal >= 60 ? 0.0 : 4.0;
            $total = $subtotal + $shipping;
            $code = 'FDL-' . strtoupper(bin2hex(random_bytes(5)));
            $insertOrder = $db->prepare(
                'INSERT INTO pedidos (codigo, id_usuario, correo_contacto, nombre_cliente, telefono, departamento, municipio, codigo_postal, direccion, referencia, notas, metodo_pago, subtotal, envio, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $insertOrder->execute([
                $code, $user['id_usuario'], $email, $name, $phone, $department, $city,
                $zip, $address, $reference, $notes, $payment, $subtotal, $shipping, $total,
            ]);
            $orderId = (int) $db->lastInsertId();
            $insertItem = $db->prepare(
                'INSERT INTO detalle_pedido (id_pedido, id_producto, nombre_producto, precio_unitario, cantidad, subtotal) VALUES (?, ?, ?, ?, ?, ?)'
            );
            $updateStock = $db->prepare('UPDATE productos SET stock = stock - ? WHERE id_producto = ?');
            foreach ($items as $item) {
                $lineSubtotal = (float) $item['precio'] * (int) $item['cantidad'];
                $insertItem->execute([$orderId, $item['id_producto'], $item['nombre'], $item['precio'], $item['cantidad'], $lineSubtotal]);
                $updateStock->execute([$item['cantidad'], $item['id_producto']]);
            }
            $db->prepare('DELETE FROM carrito WHERE id_usuario = ?')->execute([$user['id_usuario']]);
            $db->commit();
            respond(['id' => $code, 'email' => $email, 'total' => $total], 201);
        }
    }

    if ($method === 'GET' && $action === 'orders') {
        $user = requireUser($db);
        $ordersQuery = $db->prepare(
            'SELECT id_pedido, codigo, correo_contacto, total, fecha_pedido FROM pedidos WHERE id_usuario = ? ORDER BY fecha_pedido DESC'
        );
        $ordersQuery->execute([$user['id_usuario']]);
        $orders = $ordersQuery->fetchAll();
        $itemsQuery = $db->prepare(
            'SELECT nombre_producto AS name, cantidad AS qty FROM detalle_pedido WHERE id_pedido = ? ORDER BY id_detalle'
        );
        foreach ($orders as &$order) {
            $itemsQuery->execute([$order['id_pedido']]);
            $order['items'] = $itemsQuery->fetchAll();
        }
        unset($order);
        respond(['orders' => $orders]);
    }

    respond(['error' => 'La operación solicitada no existe.'], 404);
} catch (Throwable $error) {
    error_log('Flor de Luna API: ' . $error->getMessage());
    respond(['error' => 'No fue posible completar la operación. Verifica que MySQL esté iniciado y que la base flor_de_luna exista.'], 500);
}
