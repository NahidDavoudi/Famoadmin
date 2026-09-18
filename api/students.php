<?php
// students.php - Students API actions
// Extracted from api.php - get_students, add_student, update_student, delete_student, create_student_account, reset_student_password, get_student_list

function students_get_students() {
    global $pdo;
    requireAuth();
    
    $field = $_GET['field'] ?? '';
    $grade = $_GET['grade'] ?? '';
    $search = $_GET['q'] ?? '';
    
    $sql = "SELECT s.*, 
            (SELECT COUNT(*) FROM exam_results WHERE student_id = s.id) as exam_count, 
            (SELECT ROUND(AVG(percentage), 1) FROM exam_results WHERE student_id = s.id) as avg_percentage,
            (SELECT u.id FROM users u WHERE u.role = 'student' AND u.linked_id = s.id LIMIT 1) as has_account
            FROM students s WHERE 1=1";
    $params = [];
    
    if ($field) { $sql .= " AND s.field = ?"; $params[] = $field; }
    if ($grade) { $sql .= " AND s.grade = ?"; $params[] = $grade; }
    if ($search) { $sql .= " AND (s.name LIKE ? OR s.phone LIKE ? OR s.national_id LIKE ?)"; $params[] = "%$search%"; $params[] = "%$search%"; $params[] = "%$search%"; }
    
    $sql .= " ORDER BY s.name";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    jsonResponse($stmt->fetchAll());
}

function students_add_student() {
    global $pdo;
    requireAdmin();
    
    $name = trim($_POST['name'] ?? '');
    $grade = (int)($_POST['grade'] ?? 0);
    $field = trim($_POST['field'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $national_id = trim($_POST['national_id'] ?? '');
    
    // اعتبارسنجی فیلدهای الزامی
    if (!$name || !$grade || !$field) {
        jsonResponse(['error' => 'نام، پایه و رشته الزامی است'], 400);
    }
    if (!$phone || !preg_match('/^09\d{9}$/', $phone)) {
        jsonResponse(['error' => 'شماره موبایل نامعتبر است (فرمت: 09xxxxxxxxx)'], 400);
    }
    if (!$national_id || !preg_match('/^\d{10}$/', $national_id)) {
        jsonResponse(['error' => 'کد ملی باید ۱۰ رقم باشد'], 400);
    }
    
    // چک تکراری نبودن شماره موبایل
    $stmt = $pdo->prepare("SELECT id FROM students WHERE phone = ?");
    $stmt->execute([$phone]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'این شماره موبایل قبلاً ثبت شده است'], 400);
    }
    
    // چک تکراری نبودن کد ملی
    $stmt = $pdo->prepare("SELECT id FROM students WHERE national_id = ?");
    $stmt->execute([$national_id]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'این کد ملی قبلاً ثبت شده است'], 400);
    }
    
    // چک تکراری نبودن نام کاربری در users
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$phone]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'این شماره موبایل قبلاً به عنوان نام کاربری استفاده شده است'], 400);
    }
    
    $pdo->beginTransaction();
    try {
        // ۱. ثبت دانش‌آموز
        $stmt = $pdo->prepare("INSERT INTO students (name, phone, national_id, grade, field) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([$name, $phone, $national_id, $grade, $field]);
        $student_id = $pdo->lastInsertId();
        
        // ۲. ایجاد حساب کاربری با رمز پیش‌فرض 1234 (هش شده)
        $default_password = password_hash('1234', PASSWORD_DEFAULT);
        $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, role, linked_id, created_at) VALUES (?, ?, 'student', ?, NOW())");
        $stmt->execute([$phone, $default_password, $student_id]);
        
        $pdo->commit();
        jsonResponse(['success' => true, 'id' => $student_id, 'message' => 'دانش‌آموز ثبت و حساب کاربری ایجاد شد (رمز پیش‌فرض: 1234)']);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Error in add_student: " . $e->getMessage());
        jsonResponse(['error' => 'خطا در ثبت دانش‌آموز: ' . $e->getMessage()], 500);
    }
}

function students_update_student() {
    global $pdo;
    requireAuth();
    
    $id = (int)($_POST['id'] ?? 0);
    $name = trim($_POST['name'] ?? '');
    $grade = (int)($_POST['grade'] ?? 0);
    $field = trim($_POST['field'] ?? '');
    $phone = trim($_POST['phone'] ?? '');
    $national_id = trim($_POST['national_id'] ?? '');
    
    if (!$id || !$name || !$grade || !$field) {
        jsonResponse(['error' => 'داده‌های ناقص'], 400);
    }
    if (!$phone || !preg_match('/^09\d{9}$/', $phone)) {
        jsonResponse(['error' => 'شماره موبایل نامعتبر است (فرمت: 09xxxxxxxxx)'], 400);
    }
    if (!$national_id || !preg_match('/^\d{10}$/', $national_id)) {
        jsonResponse(['error' => 'کد ملی باید ۱۰ رقم باشد'], 400);
    }
    
    // چک تکراری نبودن شماره موبایل (غیر از خود دانش‌آموز)
    $stmt = $pdo->prepare("SELECT id FROM students WHERE phone = ? AND id != ?");
    $stmt->execute([$phone, $id]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'این شماره موبایل توسط دانش‌آموز دیگری استفاده شده است'], 400);
    }
    
    // چک تکراری نبودن کد ملی (غیر از خود دانش‌آموز)
    $stmt = $pdo->prepare("SELECT id FROM students WHERE national_id = ? AND id != ?");
    $stmt->execute([$national_id, $id]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'این کد ملی توسط دانش‌آموز دیگری استفاده شده است'], 400);
    }
    
    $pdo->beginTransaction();
    try {
        // دریافت شماره قدیمی برای آپدیت نام کاربری
        $stmt = $pdo->prepare("SELECT phone FROM students WHERE id = ?");
        $stmt->execute([$id]);
        $old_student = $stmt->fetch();
        $old_phone = $old_student ? $old_student['phone'] : null;
        
        // آپدیت اطلاعات دانش‌آموز
        $stmt = $pdo->prepare("UPDATE students SET name = ?, phone = ?, national_id = ?, grade = ?, field = ? WHERE id = ?");
        $stmt->execute([$name, $phone, $national_id, $grade, $field, $id]);
        
        // اگر شماره تغییر کرده، نام کاربری را هم آپدیت کن
        if ($old_phone && $old_phone !== $phone) {
            $stmt = $pdo->prepare("UPDATE users SET username = ? WHERE role = 'student' AND linked_id = ?");
            $stmt->execute([$phone, $id]);
        }
        
        $pdo->commit();
        jsonResponse(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Error in update_student: " . $e->getMessage());
        jsonResponse(['error' => 'خطا در بروزرسانی: ' . $e->getMessage()], 500);
    }
}

function students_delete_student() {
    global $pdo;
    requireAdmin();
    
    $id = (int)($_POST['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'شناسه نامعتبر'], 400);
    
    $pdo->beginTransaction();
    try {
        // حذف حساب کاربری مرتبط
        $pdo->prepare("DELETE FROM users WHERE role = 'student' AND linked_id = ?")->execute([$id]);
        // حذف دانش‌آموز (سایر وابستگی‌ها با CASCADE حذف می‌شوند)
        $pdo->prepare("DELETE FROM students WHERE id = ?")->execute([$id]);
        
        $pdo->commit();
        jsonResponse(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Error in delete_student: " . $e->getMessage());
        jsonResponse(['error' => 'خطا در حذف دانش‌آموز'], 500);
    }
}

function students_create_student_account() {
    global $pdo;
    requireAdmin();
    
    $id = (int)($_POST['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'شناسه نامعتبر'], 400);
    
    // دریافت اطلاعات دانش‌آموز
    $stmt = $pdo->prepare("SELECT id, phone FROM students WHERE id = ?");
    $stmt->execute([$id]);
    $student = $stmt->fetch();
    
    if (!$student) {
        jsonResponse(['error' => 'دانش‌آموز یافت نشد'], 404);
    }
    if (!$student['phone']) {
        jsonResponse(['error' => 'ابتدا شماره موبایل دانش‌آموز را ثبت کنید'], 400);
    }
    
    // چک اینکه حساب نداشته باشد
    $stmt = $pdo->prepare("SELECT id FROM users WHERE role = 'student' AND linked_id = ?");
    $stmt->execute([$id]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'این دانش‌آموز قبلاً حساب کاربری دارد'], 400);
    }
    
    // ایجاد حساب
    $default_password = password_hash('1234', PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (username, password_hash, role, linked_id, created_at) VALUES (?, ?, 'student', ?, NOW())");
    $stmt->execute([$student['phone'], $default_password, $id]);
    
    jsonResponse(['success' => true, 'message' => 'حساب کاربری ایجاد شد (رمز پیش‌فرض: 1234)']);
}

function students_reset_student_password() {
    global $pdo;
    requireAdmin();
    
    $id = (int)($_POST['id'] ?? 0);
    if (!$id) jsonResponse(['error' => 'شناسه نامعتبر'], 400);
    
    $default_password = password_hash('1234', PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE role = 'student' AND linked_id = ?");
    $stmt->execute([$default_password, $id]);
    
    if ($stmt->rowCount() === 0) {
        jsonResponse(['error' => 'حساب کاربری برای این دانش‌آموز یافت نشد'], 404);
    }
    
    jsonResponse(['success' => true, 'message' => 'رمز عبور به 1234 بازنشانی شد']);
}

function students_get_student_list() {
    global $pdo;
    requireAuth();
    $students = $pdo->query("SELECT id, name, grade, field FROM students ORDER BY name")->fetchAll();
    jsonResponse($students);
}