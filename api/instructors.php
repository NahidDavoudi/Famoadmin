<?php
// instructors.php - Instructors Management API actions
// Extracted from api.php - instructors_list, instructors_add, instructors_update, instructors_delete

function instructors_list() {
    global $pdo;
    requireAuth();
    $instructors = $pdo->query("
        SELECT id, name, title, description, image_url, initial_letter, display_order, created_at
        FROM instructors 
        ORDER BY display_order ASC, id ASC
    ")->fetchAll();
    jsonResponse($instructors);
}

function instructors_add() {
    global $pdo;
    requireAdmin();
    $name = trim($_POST['name'] ?? '');
    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $display_order = (int)($_POST['display_order'] ?? 0);
    $initial_letter = trim($_POST['initial_letter'] ?? '');
    
    if (empty($name) || empty($title)) {
        jsonResponse(['error' => 'نام و عنوان الزامی است'], 400);
    }
    
    // اگر initial_letter خالی است، از اولین حرف name استفاده کن
    if (empty($initial_letter) && !empty($name)) {
        $initial_letter = mb_substr($name, 0, 1, 'UTF-8');
    }
    
    // آپلود تصویر استاد
    $image_url = null;
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
        $upload_dir = __DIR__ . '/../uploads/instructors/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }
        
        $file_ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
        $allowed_ext = ['jpg', 'jpeg', 'png', 'webp'];
        
        if (!in_array($file_ext, $allowed_ext)) {
            jsonResponse(['error' => 'فرمت فایل مجاز نیست. فقط JPG, PNG, WEBP'], 400);
        }
        
        $max_size = 5 * 1024 * 1024; // 5MB
        if ($_FILES['image']['size'] > $max_size) {
            jsonResponse(['error' => 'حجم فایل نباید بیشتر از 5MB باشد'], 400);
        }
        
        // نام فایل unique با timestamp
        $filename = 'instructor_' . time() . '_' . uniqid() . '.' . $file_ext;
        $filepath = $upload_dir . $filename;
        
        if (!move_uploaded_file($_FILES['image']['tmp_name'], $filepath)) {
            jsonResponse(['error' => 'خطا در آپلود تصویر'], 500);
        }
        
        $image_url = '../uploads/instructors/' . $filename;
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO instructors (name, title, description, image_url, initial_letter, display_order)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$name, $title, $description ?: null, $image_url, $initial_letter, $display_order]);
    jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
}

function instructors_update() {
    global $pdo;
    requireAdmin();
    $id = (int)($_POST['id'] ?? 0);
    $name = trim($_POST['name'] ?? '');
    $title = trim($_POST['title'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $display_order = (int)($_POST['display_order'] ?? 0);
    $initial_letter = trim($_POST['initial_letter'] ?? '');
    
    if (!$id || empty($name) || empty($title)) {
        jsonResponse(['error' => 'داده‌های ناقص'], 400);
    }
    
    // اگر initial_letter خالی است، از اولین حرف name استفاده کن
    if (empty($initial_letter) && !empty($name)) {
        $initial_letter = mb_substr($name, 0, 1, 'UTF-8');
    }
    
    // آپلود تصویر جدید (اختیاری)
    $new_image_url = null;
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK && $_FILES['image']['size'] > 0) {
        $upload_dir = __DIR__ . '/../uploads/instructors/';
        if (!is_dir($upload_dir)) {
            mkdir($upload_dir, 0755, true);
        }
        
        $file_ext = strtolower(pathinfo($_FILES['image']['name'], PATHINFO_EXTENSION));
        $allowed_ext = ['jpg', 'jpeg', 'png', 'webp'];
        
        if (!in_array($file_ext, $allowed_ext)) {
            jsonResponse(['error' => 'فرمت فایل مجاز نیست. فقط JPG, PNG, WEBP'], 400);
        }
        
        $max_size = 5 * 1024 * 1024; // 5MB
        if ($_FILES['image']['size'] > $max_size) {
            jsonResponse(['error' => 'حجم فایل نباید بیشتر از 5MB باشد'], 400);
        }
        
        // نام فایل unique با timestamp
        $filename = 'instructor_' . $id . '_' . time() . '_' . uniqid() . '.' . $file_ext;
        $filepath = $upload_dir . $filename;
        
        if (!move_uploaded_file($_FILES['image']['tmp_name'], $filepath)) {
            jsonResponse(['error' => 'خطا در آپلود تصویر'], 500);
        }
        
        $new_image_url = '../uploads/instructors/' . $filename;
    }
    
    // ساخت SQL برای آپدیت
    if ($new_image_url) {
        // با تصویر جدید
        $stmt = $pdo->prepare("
            UPDATE instructors 
            SET name = ?, title = ?, description = ?, image_url = ?, 
                initial_letter = ?, display_order = ?
            WHERE id = ?
        ");
        $stmt->execute([$name, $title, $description ?: null, $new_image_url, $initial_letter, $display_order, $id]);
    } else {
        // بدون تغییر تصویر
        $stmt = $pdo->prepare("
            UPDATE instructors 
            SET name = ?, title = ?, description = ?, 
                initial_letter = ?, display_order = ?
            WHERE id = ?
        ");
        $stmt->execute([$name, $title, $description ?: null, $initial_letter, $display_order, $id]);
    }
    
    jsonResponse(['success' => true]);
}

function instructors_delete() {
    global $pdo;
    requireAdmin();
    $id = (int)($_POST['id'] ?? 0);
    if (!$id) {
        jsonResponse(['error' => 'شناسه استاد نامعتبر است'], 400);
    }
    $pdo->prepare("DELETE FROM instructors WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true]);
}