<?php
// courses.php - Courses Management API actions
// Extracted from api.php - courses_list, courses_add, courses_update, courses_delete

function courses_list() {
    global $pdo;
    requireAuth();
    $courses = $pdo->query("
        SELECT id, name, icon, gradient_color_from, gradient_color_to, 
               background_image_url, description, price, display_order, created_at
        FROM courses 
        ORDER BY display_order ASC, id ASC
    ")->fetchAll();
    jsonResponse($courses);
}

function courses_add() {
    global $pdo;
    requireAdmin();
    try {
        $name = trim($_POST['name'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $price = trim($_POST['price'] ?? '');
        $display_order = (int)($_POST['display_order'] ?? 0);
        $gradient_from = trim($_POST['gradient_color_from'] ?? '#445D84');
        $gradient_to = trim($_POST['gradient_color_to'] ?? '#5a779e');
        
        // فقط نام الزامی است
        if (empty($name)) {
            jsonResponse(['error' => 'نام دوره الزامی است'], 400);
        }
        
        // آپلود تصویر دوره
        $image_url = null;
        if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
            $upload_dir = __DIR__ . '/../uploads/courses/';
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
            $filename = 'course_' . time() . '_' . uniqid() . '.' . $file_ext;
            $filepath = $upload_dir . $filename;
            
            if (!move_uploaded_file($_FILES['image']['tmp_name'], $filepath)) {
                jsonResponse(['error' => 'خطا در آپلود تصویر'], 500);
            }
            
            $image_url = '../uploads/courses/' . $filename;
        }
        
        // اگر تصویر آپلود نشده، از آیکون پیش‌فرض استفاده کن
        $icon = 'fas fa-book';
        
        $stmt = $pdo->prepare("
            INSERT INTO courses (name, icon, gradient_color_from, gradient_color_to, background_image_url, description, price, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$name, $icon, $gradient_from, $gradient_to, $image_url, $description ?: null, $price ?: null, $display_order]);
        jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        error_log("Database error in courses_add: " . $e->getMessage());
        jsonResponse(['error' => 'خطا در ثبت دوره: ' . $e->getMessage()], 500);
    } catch (Exception $e) {
        error_log("Error in courses_add: " . $e->getMessage());
        jsonResponse(['error' => 'خطا در ثبت دوره'], 500);
    }
}

function courses_update() {
    global $pdo;
    requireAdmin();
    $id = (int)($_POST['id'] ?? 0);
    $name = trim($_POST['name'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $price = trim($_POST['price'] ?? '');
    $display_order = (int)($_POST['display_order'] ?? 0);
    $gradient_from = trim($_POST['gradient_color_from'] ?? '#445D84');
    $gradient_to = trim($_POST['gradient_color_to'] ?? '#5a779e');
    
    if (!$id || empty($name)) {
        jsonResponse(['error' => 'نام دوره و شناسه الزامی است'], 400);
    }
    
    // آپلود تصویر جدید (اختیاری)
    $new_image_url = null;
    if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK && $_FILES['image']['size'] > 0) {
        $upload_dir = __DIR__ . '/../uploads/courses/';
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
        $filename = 'course_' . $id . '_' . time() . '_' . uniqid() . '.' . $file_ext;
        $filepath = $upload_dir . $filename;
        
        if (!move_uploaded_file($_FILES['image']['tmp_name'], $filepath)) {
            jsonResponse(['error' => 'خطا در آپلود تصویر'], 500);
        }
        
        $new_image_url = '../uploads/courses/' . $filename;
    }
    
    // ساخت SQL برای آپدیت
    if ($new_image_url) {
        // با تصویر جدید
        $stmt = $pdo->prepare("
            UPDATE courses 
            SET name = ?, gradient_color_from = ?, gradient_color_to = ?, 
                background_image_url = ?, description = ?, price = ?, display_order = ?
            WHERE id = ?
        ");
        $stmt->execute([$name, $gradient_from, $gradient_to, $new_image_url, $description ?: null, $price ?: null, $display_order, $id]);
    } else {
        // بدون تغییر تصویر
        $stmt = $pdo->prepare("
            UPDATE courses 
            SET name = ?, gradient_color_from = ?, gradient_color_to = ?, 
                description = ?, price = ?, display_order = ?
            WHERE id = ?
        ");
        $stmt->execute([$name, $gradient_from, $gradient_to, $description ?: null, $price ?: null, $display_order, $id]);
    }
    
    jsonResponse(['success' => true]);
}

function courses_delete() {
    global $pdo;
    requireAdmin();
    $id = (int)($_POST['id'] ?? 0);
    if (!$id) {
        jsonResponse(['error' => 'شناسه دوره نامعتبر است'], 400);
    }
    $pdo->prepare("DELETE FROM courses WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true]);
}