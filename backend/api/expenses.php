<?php
require_once '../config/session.php';
start_app_session();
require_once '../config/db.php';

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized.']);
    exit;
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

function ensure_receipt_column($pdo) {
    static $checked = false;

    if ($checked) {
        return;
    }

    $stmt = $pdo->query("SHOW COLUMNS FROM expenses LIKE 'receipt_path'");
    if (!$stmt->fetch()) {
        $pdo->exec('ALTER TABLE expenses ADD COLUMN receipt_path VARCHAR(255) NULL AFTER description');
    }

    $checked = true;
}

function get_receipts_dir() {
    return realpath(__DIR__ . '/..') . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'receipts';
}

function save_uploaded_receipt($file) {
    if (!isset($file) || !isset($file['tmp_name']) || $file['error'] !== UPLOAD_ERR_OK) {
        return [null, null];
    }

    $allowed_mimes = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $mime = mime_content_type($file['tmp_name']);

    if (!isset($allowed_mimes[$mime])) {
        throw new RuntimeException('Only JPG, PNG, or WEBP files are allowed.');
    }

    $max_bytes = 5 * 1024 * 1024;
    if (($file['size'] ?? 0) > $max_bytes) {
        throw new RuntimeException('Receipt image must be less than 5 MB.');
    }

    $dir = get_receipts_dir();
    if (!is_dir($dir) && !mkdir($dir, 0777, true) && !is_dir($dir)) {
        throw new RuntimeException('Failed to create receipt upload directory.');
    }

    $name = 'receipt_' . bin2hex(random_bytes(10)) . '.' . $allowed_mimes[$mime];
    $target = $dir . DIRECTORY_SEPARATOR . $name;

    if (!move_uploaded_file($file['tmp_name'], $target)) {
        throw new RuntimeException('Failed to save uploaded receipt image.');
    }

    $relative = 'uploads/receipts/' . $name;
    return [$relative, $target];
}

function receipt_public_url($relative_path) {
    if (empty($relative_path)) {
        return null;
    }

    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    return $scheme . '://' . $host . '/expense-tracker/backend/' . ltrim($relative_path, '/');
}

function delete_receipt_file($relative_path) {
    if (empty($relative_path)) {
        return;
    }

    $full = realpath(__DIR__ . '/..') . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relative_path);
    if (is_file($full)) {
        @unlink($full);
    }
}

ensure_receipt_column($pdo);

if ($method === 'GET') {
    $start_date = isset($_GET['start_date']) ? trim($_GET['start_date']) : '';
    $end_date = isset($_GET['end_date']) ? trim($_GET['end_date']) : '';
    $category = isset($_GET['category']) ? trim($_GET['category']) : '';
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';

    $query = 'SELECT * FROM expenses WHERE user_id = ?';
    $params = [$user_id];

    if (!empty($start_date)) {
        $query .= ' AND expense_date >= ?';
        $params[] = $start_date;
    }

    if (!empty($end_date)) {
        $query .= ' AND expense_date <= ?';
        $params[] = $end_date;
    }

    if (!empty($category) && $category !== 'All') {
        $query .= ' AND category = ?';
        $params[] = $category;
    }

    if (!empty($search)) {
        $query .= ' AND description LIKE ?';
        $params[] = '%' . $search . '%';
    }

    $query .= ' ORDER BY expense_date DESC, id DESC';

    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    $expenses = $stmt->fetchAll();

    foreach ($expenses as &$expense) {
        $expense['receipt_url'] = receipt_public_url($expense['receipt_path'] ?? null);
    }
    unset($expense);
    
    echo json_encode(['status' => 'success', 'data' => $expenses]);
} elseif ($method === 'POST') {
    $is_multipart = stripos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false;
    $effective_method = $is_multipart ? strtoupper($_POST['_method'] ?? 'POST') : 'POST';

    if ($effective_method === 'POST') {
        $data = $is_multipart ? $_POST : (json_decode(file_get_contents("php://input"), true) ?? []);

        $amount = $data['amount'] ?? 0;
        $category = $data['category'] ?? '';
        $expense_date = $data['expense_date'] ?? date('Y-m-d');
        $description = $data['description'] ?? '';

        if (empty($amount) || empty($category) || empty($expense_date)) {
            echo json_encode(['status' => 'error', 'message' => 'Missing required fields.']);
            exit;
        }

        try {
            [$receipt_path, ] = $is_multipart ? save_uploaded_receipt($_FILES['receipt'] ?? null) : [null, null];
        } catch (Throwable $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            exit;
        }

        $stmt = $pdo->prepare('INSERT INTO expenses (user_id, amount, category, expense_date, description, receipt_path) VALUES (?, ?, ?, ?, ?, ?)');
        if ($stmt->execute([$user_id, $amount, $category, $expense_date, $description, $receipt_path])) {
            echo json_encode(['status' => 'success', 'message' => 'Expense added successfully.']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to add expense.']);
        }
    } elseif ($effective_method === 'PUT' && $is_multipart) {
        $id = $_POST['id'] ?? 0;
        $amount = $_POST['amount'] ?? 0;
        $category = $_POST['category'] ?? '';
        $expense_date = $_POST['expense_date'] ?? date('Y-m-d');
        $description = $_POST['description'] ?? '';

        if (empty($id) || empty($amount) || empty($category) || empty($expense_date)) {
            echo json_encode(['status' => 'error', 'message' => 'Missing required fields.']);
            exit;
        }

        $stmt = $pdo->prepare('SELECT receipt_path FROM expenses WHERE id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$id, $user_id]);
        $existing = $stmt->fetch();

        if (!$existing) {
            echo json_encode(['status' => 'error', 'message' => 'Expense not found.']);
            exit;
        }

        $receipt_path = $existing['receipt_path'] ?? null;
        try {
            [$new_receipt, ] = save_uploaded_receipt($_FILES['receipt'] ?? null);
            if ($new_receipt) {
                delete_receipt_file($receipt_path);
                $receipt_path = $new_receipt;
            }
        } catch (Throwable $e) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            exit;
        }

        $stmt = $pdo->prepare('UPDATE expenses SET amount = ?, category = ?, expense_date = ?, description = ?, receipt_path = ? WHERE id = ? AND user_id = ?');
        if ($stmt->execute([$amount, $category, $expense_date, $description, $receipt_path, $id, $user_id])) {
            echo json_encode(['status' => 'success', 'message' => 'Expense updated successfully.']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to update expense.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid action.']);
    }
} elseif ($method === 'PUT') {
    // Edit expense
    $data = json_decode(file_get_contents("php://input"), true);
    
    $id = $data['id'] ?? 0;
    $amount = $data['amount'] ?? 0;
    $category = $data['category'] ?? '';
    $expense_date = $data['expense_date'] ?? date('Y-m-d');
    $description = $data['description'] ?? '';

    if (empty($id) || empty($amount) || empty($category) || empty($expense_date)) {
        echo json_encode(['status' => 'error', 'message' => 'Missing required fields.']);
        exit;
    }

    $stmt = $pdo->prepare('UPDATE expenses SET amount = ?, category = ?, expense_date = ?, description = ? WHERE id = ? AND user_id = ?');
    if ($stmt->execute([$amount, $category, $expense_date, $description, $id, $user_id])) {
        echo json_encode(['status' => 'success', 'message' => 'Expense updated successfully.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to update expense.']);
    }
} elseif ($method === 'DELETE') {
    // Delete expense
    $data = json_decode(file_get_contents("php://input"), true);
    
    $id = $data['id'] ?? 0;
    
    if (empty($id)) {
        // Fallback to query param if needed
        $id = isset($_GET['id']) ? $_GET['id'] : 0;
    }

    if (empty($id)) {
        echo json_encode(['status' => 'error', 'message' => 'Expense ID required.']);
        exit;
    }

    $stmt = $pdo->prepare('SELECT receipt_path FROM expenses WHERE id = ? AND user_id = ? LIMIT 1');
    $stmt->execute([$id, $user_id]);
    $existing = $stmt->fetch();

    $stmt = $pdo->prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?');
    if ($stmt->execute([$id, $user_id])) {
        if ($existing && !empty($existing['receipt_path'])) {
            delete_receipt_file($existing['receipt_path']);
        }
        echo json_encode(['status' => 'success', 'message' => 'Expense deleted successfully.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Failed to delete expense.']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid method.']);
}
?>
