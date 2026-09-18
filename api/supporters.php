<?php
// supporters.php - Supporters API actions
// Extracted from api.php - get_supporters, add_supporter, update_supporter, delete_supporter

function supporters_get_supporters() {
    global $pdo;
    requireAdmin();
    
    // لیست پشتیبان‌ها با آمار (فیلتر id=0 که معتبر نیست)
    $stmt = $pdo->query("
        SELECT 
            sup.id, sup.name, sup.grade, sup.field, sup.chat_id,
            COUNT(rs.id) as total_reports,
            SUM(CASE WHEN rs.status = 'replied' THEN 1 ELSE 0 END) as replied_count,
            SUM(CASE WHEN rs.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
            ROUND(AVG(TIMESTAMPDIFF(HOUR, rs.created_at, rs.replied_at)), 1) as avg_response_hours
        FROM supporters sup
        LEFT JOIN reports_status rs ON sup.id = rs.supporter_id
        WHERE sup.id > 0
        GROUP BY sup.id
        ORDER BY sup.name
    ");
    $supporters = $stmt->fetchAll();
    
    // آمار کلی (فیلتر id=0)
    $stats = $pdo->query("
        SELECT 
            COUNT(DISTINCT sup.id) as total,
            COALESCE(SUM(CASE WHEN rs.status = 'replied' THEN 1 ELSE 0 END), 0) as replied,
            COALESCE(SUM(CASE WHEN rs.status = 'pending' THEN 1 ELSE 0 END), 0) as pending
        FROM supporters sup
        LEFT JOIN reports_status rs ON sup.id = rs.supporter_id
        WHERE sup.id > 0
    ")->fetch();
    
    jsonResponse([
        'supporters' => $supporters,
        'stats' => $stats
    ]);
}

function supporters_add_supporter() {
    global $pdo;
    requireAdmin();
    
    $name = trim($_POST['name'] ?? '');
    $grade = (int)($_POST['grade'] ?? 0);
    $field = trim($_POST['field'] ?? '');
    $chat_id = trim($_POST['chat_id'] ?? '') ?: null;
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    
    // اعتبارسنجی
    if (!$name || !$grade || !$field) {
        jsonResponse(['error' => 'نام، پایه و رشته الزامی است'], 400);
    }
    if (!$username || strlen($password) < 4) {
        jsonResponse(['error' => 'نام کاربری و رمز عبور (حداقل ۴ کاراکتر) الزامی است'], 400);
    }
    
    // چک تکراری نبودن نام کاربری
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'این نام کاربری قبلاً استفاده شده است'], 400);
    }
    
    $pdo->beginTransaction();
    try {
        // ثبت در جدول supporters
        $stmt = $pdo->prepare("INSERT INTO supporters (name, grade, field, chat_id) VALUES (?, ?, ?, ?)");
        $stmt->execute([$name, $grade, $field, $chat_id]);
        $supporter_id = $pdo->lastInsertId();
        
        // ثبت در جدول users
        $password_hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, role, linked_id) VALUES (?, ?, 'supporter', ?)");
        $stmt->execute([$username, $password_hash, $supporter_id]);
        
        $pdo->commit();
        jsonResponse(['success' => true, 'id' => $supporter_id]);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(['error' => 'خطا در ثبت پشتیبان'], 500);
    }
}

function supporters_update_supporter() {
    global $pdo;
    requireAdmin();
    
    $id = (int)($_POST['id'] ?? 0);
    $name = trim($_POST['name'] ?? '');
    $grade = (int)($_POST['grade'] ?? 0);
    $field = trim($_POST['field'] ?? '');
    $chat_id = trim($_POST['chat_id'] ?? '') ?: null;
    $new_password = $_POST['new_password'] ?? '';
    
    if (!$id || !$name || !$grade || !$field) {
        jsonResponse(['error' => 'داده‌های ناقص'], 400);
    }
    
    $pdo->beginTransaction();
    try {
        // آپدیت supporters
        $stmt = $pdo->prepare("UPDATE supporters SET name = ?, grade = ?, field = ?, chat_id = ? WHERE id = ?");
        $stmt->execute([$name, $grade, $field, $chat_id, $id]);
        
        // آپدیت رمز عبور اگر وارد شده
        if (!empty($new_password) && strlen($new_password) >= 4) {
            $password_hash = password_hash($new_password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE role = 'supporter' AND linked_id = ?");
            $stmt->execute([$password_hash, $id]);
        }
        
        $pdo->commit();
        jsonResponse(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(['error' => 'خطا در بروزرسانی'], 500);
    }
}

function supporters_delete_supporter() {
    global $pdo;
    requireAdmin();
    
    $id = (int)($_POST['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'شناسه نامعتبر'], 400);
    
    $pdo->beginTransaction();
    try {
        // حذف از users
        $pdo->prepare("DELETE FROM users WHERE role = 'supporter' AND linked_id = ?")->execute([$id]);
        // حذف از supporters (گزارش‌ها با SET NULL باقی می‌مانند)
        $pdo->prepare("DELETE FROM supporters WHERE id = ?")->execute([$id]);
        
        $pdo->commit();
        jsonResponse(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(['error' => 'خطا در حذف پشتیبان'], 500);
    }
}