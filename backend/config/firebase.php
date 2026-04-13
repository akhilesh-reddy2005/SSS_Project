<?php

function firebase_settings() {
    $default_credentials = __DIR__ . '/firebase-service-account.json';
    $local_config_path = __DIR__ . '/firebase.local.php';

    $settings = [
        'project_id' => getenv('FIREBASE_PROJECT_ID') ?: '',
        'credentials_path' => getenv('FIREBASE_CREDENTIALS') ?: $default_credentials,
        'web_api_key' => getenv('FIREBASE_WEB_API_KEY') ?: '',
    ];

    if (is_file($local_config_path)) {
        $local = require $local_config_path;
        if (is_array($local)) {
            if (!empty($local['project_id'])) {
                $settings['project_id'] = $local['project_id'];
            }

            if (!empty($local['credentials_path'])) {
                $settings['credentials_path'] = $local['credentials_path'];
            }

            if (!empty($local['web_api_key'])) {
                $settings['web_api_key'] = $local['web_api_key'];
            }
        }
    }

    return $settings;
}

?>
