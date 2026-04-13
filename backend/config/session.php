<?php

function start_app_session() {
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $is_https = (
        (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
        (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
    );

    $cookie_params = [
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $is_https,
        'httponly' => true,
        'samesite' => $is_https ? 'None' : 'Lax',
    ];

    session_set_cookie_params($cookie_params);
    session_start();
}

?>