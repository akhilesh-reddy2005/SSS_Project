<?php
require_once '../config/session.php';
start_app_session();
require_once '../config/db.php';
require_once '../config/firebase.php';

header('Content-Type: application/json');

function firebase_http_post_json($url, $payload) {
    $options = [
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\n",
            'content' => json_encode($payload),
            'ignore_errors' => true,
            'timeout' => 15,
        ]
    ];

    $context = stream_context_create($options);
    $raw = @file_get_contents($url, false, $context);

    if ($raw === false) {
        return [
            'ok' => false,
            'status' => 0,
            'data' => null,
        ];
    }

    $status_code = 0;
    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $header_line) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $header_line, $matches)) {
                $status_code = (int)$matches[1];
                break;
            }
        }
    }

    return [
        'ok' => $status_code >= 200 && $status_code < 300,
        'status' => $status_code,
        'data' => json_decode($raw, true),
    ];
}

function verify_firebase_id_token($id_token) {
    if (empty($id_token)) {
        return ['ok' => false, 'message' => 'Firebase ID token is required.'];
    }

    $settings = firebase_settings();
    $api_key = $settings['web_api_key'];

    if (empty($api_key)) {
        return ['ok' => false, 'message' => 'Firebase API key missing in backend config.'];
    }

    $lookup_url = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' . urlencode($api_key);
    $result = firebase_http_post_json($lookup_url, ['idToken' => $id_token]);

    if (!$result['ok'] || !is_array($result['data'])) {
        return ['ok' => false, 'message' => 'Invalid Firebase ID token.'];
    }

    $users = $result['data']['users'] ?? [];
    if (!is_array($users) || count($users) === 0) {
        return ['ok' => false, 'message' => 'No Firebase user found for token.'];
    }

    $firebase_user = $users[0];
    $uid = $firebase_user['localId'] ?? '';
    $email = $firebase_user['email'] ?? '';
    $email_verified = (bool)($firebase_user['emailVerified'] ?? false);
    $name = $firebase_user['displayName'] ?? '';

    if (empty($uid) || empty($email)) {
        return ['ok' => false, 'message' => 'Firebase token is missing required user data.'];
    }

    if (!$email_verified) {
        return ['ok' => false, 'message' => 'Firebase account email is not verified.'];
    }

    return [
        'ok' => true,
        'uid' => $uid,
        'email' => $email,
        'name' => !empty($name) ? $name : strtok($email, '@')
    ];
}

function send_firebase_password_reset_email($email) {
    $settings = firebase_settings();
    $api_key = $settings['web_api_key'];

    if (empty($api_key)) {
        return ['ok' => false, 'message' => 'Firebase API key missing in backend config.'];
    }

    $url = 'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=' . urlencode($api_key);
    $payload = [
        'requestType' => 'PASSWORD_RESET',
        'email' => $email,
    ];

    $result = firebase_http_post_json($url, $payload);

    if ($result['ok']) {
        return ['ok' => true];
    }

    $firebase_error = $result['data']['error']['message'] ?? 'Unable to send password reset email.';

    // Do not expose internals to the UI; this is useful for server logs/debugging.
    return ['ok' => false, 'message' => $firebase_error];
}

function ensure_firebase_uid_column($pdo) {
    static $checked = false;

    if ($checked) {
        return;
    }

    $check_stmt = $pdo->query("SHOW COLUMNS FROM users LIKE 'firebase_uid'");
    $column_exists = $check_stmt->fetch();

    if (!$column_exists) {
        $pdo->exec('ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(128) NULL UNIQUE AFTER email');
    }

    $checked = true;
}

function upsert_firebase_user($pdo, $uid, $email, $name) {
    ensure_firebase_uid_column($pdo);

    $stmt = $pdo->prepare('SELECT id, name, email, firebase_uid FROM users WHERE firebase_uid = ? OR email = ? LIMIT 1');
    $stmt->execute([$uid, $email]);
    $user = $stmt->fetch();

    if ($user) {
        $update_stmt = $pdo->prepare('UPDATE users SET name = ?, firebase_uid = ? WHERE id = ?');
        $update_stmt->execute([$name, $uid, $user['id']]);

        return [
            'id' => $user['id'],
            'name' => $name,
            'email' => $email
        ];
    }

    $generated_password = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT);
    $insert_stmt = $pdo->prepare('INSERT INTO users (name, email, firebase_uid, password) VALUES (?, ?, ?, ?)');
    if (!$insert_stmt->execute([$name, $email, $uid, $generated_password])) {
        throw new RuntimeException('Unable to create user account.');
    }

    return [
        'id' => $pdo->lastInsertId(),
        'name' => $name,
        'email' => $email
    ];
}

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($method === 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);
    
    if ($action === 'register') {
        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($name) || empty($email) || empty($password)) {
            echo json_encode(['status' => 'error', 'message' => 'All fields are required.']);
            exit;
        }

        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            echo json_encode(['status' => 'error', 'message' => 'Email already registered.']);
            exit;
        }

        $hashed = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
        if ($stmt->execute([$name, $email, $hashed])) {
            $user_id = $pdo->lastInsertId();
            $_SESSION['user_id'] = $user_id;
            $_SESSION['name'] = $name;
            echo json_encode(['status' => 'success', 'message' => 'Registered successfully.', 'user' => ['id' => $user_id, 'name' => $name, 'email' => $email]]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Registration failed.']);
        }
    } elseif ($action === 'login') {
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($email) || empty($password)) {
            echo json_encode(['status' => 'error', 'message' => 'Email and password are required.']);
            exit;
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = ?');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['name'] = $user['name'];
            echo json_encode(['status' => 'success', 'message' => 'Logged in successfully.', 'user' => ['id' => $user['id'], 'name' => $user['name'], 'email' => $user['email']]]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid email or password.']);
        }
    } elseif ($action === 'google' || $action === 'firebase') {
        $id_token = $data['idToken'] ?? '';
        $verified = verify_firebase_id_token($id_token);

        if (!$verified['ok']) {
            echo json_encode(['status' => 'error', 'message' => $verified['message']]);
            exit;
        }

        try {
            $user = upsert_firebase_user($pdo, $verified['uid'], $verified['email'], $verified['name']);
        } catch (Throwable $e) {
            echo json_encode(['status' => 'error', 'message' => 'Unable to create account from Firebase profile.']);
            exit;
        }

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['name'] = $user['name'];

        echo json_encode([
            'status' => 'success',
            'message' => 'Firebase sign-in successful.',
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email']
            ]
        ]);
    } elseif ($action === 'forgot_password') {
        $email = trim($data['email'] ?? '');

        if (empty($email)) {
            echo json_encode(['status' => 'error', 'message' => 'Email is required.']);
            exit;
        }

        $reset_result = send_firebase_password_reset_email($email);

        // Keep this generic for safety regardless of email existence.
        echo json_encode([
            'status' => 'success',
            'message' => 'If the email exists, a password reset email has been sent.'
        ]);

        // Optional server-side diagnostics without exposing details to clients.
        if (!$reset_result['ok']) {
            error_log('Firebase forgot_password failed for ' . $email . ': ' . $reset_result['message']);
        }
    } elseif ($action === 'reset_password') {
        echo json_encode([
            'status' => 'error',
            'message' => 'This endpoint is deprecated. Use Firebase password reset link from email.'
        ]);
    } elseif ($action === 'change_password') {
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized.']);
            exit;
        }

        $current_password = $data['currentPassword'] ?? '';
        $new_password = $data['newPassword'] ?? '';

        if (empty($current_password) || empty($new_password)) {
            echo json_encode(['status' => 'error', 'message' => 'Current password and new password are required.']);
            exit;
        }

        if (strlen($new_password) < 6) {
            echo json_encode(['status' => 'error', 'message' => 'New password must be at least 6 characters.']);
            exit;
        }

        $stmt = $pdo->prepare('SELECT password FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($current_password, $user['password'])) {
            echo json_encode(['status' => 'error', 'message' => 'Current password is incorrect.']);
            exit;
        }

        $new_hash = password_hash($new_password, PASSWORD_DEFAULT);
        $update_stmt = $pdo->prepare('UPDATE users SET password = ? WHERE id = ?');
        $update_stmt->execute([$new_hash, $_SESSION['user_id']]);

        echo json_encode(['status' => 'success', 'message' => 'Password changed successfully.']);
    } elseif ($action === 'update_profile') {
        if (!isset($_SESSION['user_id'])) {
            echo json_encode(['status' => 'error', 'message' => 'Unauthorized.']);
            exit;
        }

        $name = trim($data['name'] ?? '');
        if (empty($name)) {
            echo json_encode(['status' => 'error', 'message' => 'Name is required.']);
            exit;
        }

        if (strlen($name) > 100) {
            echo json_encode(['status' => 'error', 'message' => 'Name is too long.']);
            exit;
        }

        $stmt = $pdo->prepare('UPDATE users SET name = ? WHERE id = ?');
        $stmt->execute([$name, $_SESSION['user_id']]);
        $_SESSION['name'] = $name;

        $user_stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ? LIMIT 1');
        $user_stmt->execute([$_SESSION['user_id']]);
        $user = $user_stmt->fetch();

        echo json_encode([
            'status' => 'success',
            'message' => 'Profile updated successfully.',
            'user' => $user
        ]);
    } elseif ($action === 'logout') {
        session_destroy();
        echo json_encode(['status' => 'success', 'message' => 'Logged out.']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid action.']);
    }
} elseif ($method === 'GET') {
    if ($action === 'me') {
        if (isset($_SESSION['user_id'])) {
            $stmt = $pdo->prepare('SELECT id, name, email FROM users WHERE id = ?');
            $stmt->execute([$_SESSION['user_id']]);
            $user = $stmt->fetch();
            if ($user) {
                echo json_encode(['status' => 'success', 'user' => $user]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'User not found.']);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Not authenticated.']);
        }
    }
}
?>
