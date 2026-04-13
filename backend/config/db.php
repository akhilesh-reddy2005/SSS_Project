<?php
$app_env = getenv('APP_ENV') ?: 'development';
$is_production = $app_env === 'production';

if ($is_production) {
    error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED & ~E_STRICT);
    ini_set('display_errors', 0);
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}

// CORS configuration
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$frontend_url = getenv('FRONTEND_URL') ?: '';

if (!empty($origin)) {
    if (!$is_production) {
        header("Access-Control-Allow-Origin: {$origin}");
    } elseif (!empty($frontend_url) && rtrim($origin, '/') === rtrim($frontend_url, '/')) {
        header("Access-Control-Allow-Origin: {$origin}");
    }

    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'])) {
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
    }
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'])) {
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    }
    exit(0);
}

// Database connection
$host = getenv('DB_HOST') ?: 'localhost';
$port = getenv('DB_PORT') ?: '3306';
$db = getenv('DB_NAME') ?: 'expense_tracker';
$user = getenv('DB_USER') ?: 'root';
$pass = getenv('DB_PASS') ?: '';
$charset = getenv('DB_CHARSET') ?: 'utf8mb4';

$dsn = "mysql:host={$host};port={$port};dbname={$db};charset={$charset}";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    $message = $is_production ? 'Database connection failed.' : ('Connection failed: ' . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => $message]);
    exit;
}

?>
