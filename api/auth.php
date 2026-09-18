<?php
// auth.php - Authentication API actions
// Extracted from api.php - lines 86-119

// Ensure shared dependencies are available
// $pdo, session_start() are required from api.php

function auth_login() {
    global $pdo;
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND role IN ('admin', 'supporter')");
    $stmt->execute([$username]);
    $user = $stmt->fetch();
    
    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['admin_id'] = $user['id'];
        $_SESSION['admin_role'] = $user['role'];
        $_SESSION['admin_username'] = $user['username'];
        $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?")->execute([$user['id']]);
        jsonResponse(['success' => true, 'role' => $user['role'], 'username' => $user['username']]);
    }
    jsonResponse(['error' => 'نام کاربری یا رمز عبور اشتباه است'], 401);
}

function auth_logout() {
    session_destroy();
    jsonResponse(['success' => true]);
}

function auth_check() {
    if (isset($_SESSION['admin_id'])) {
        jsonResponse([
            'authenticated' => true,
            'role' => $_SESSION['admin_role'],
            'username' => $_SESSION['admin_username']
        ]);
    }
    jsonResponse(['authenticated' => false]);
}