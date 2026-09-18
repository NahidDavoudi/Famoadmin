<?php
/**
 * Famo Admin Panel - API & Router
 * پنل مدیریت فامو - لاجیک PHP
 */

// Turn off error display, log errors instead
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

session_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

try {
    $pdo = getDB();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'خطا در اتصال به دیتابیس: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
    exit;
}

// ===================== Auto-create tables if not exist =====================
function ensureWeeklyPlanTablesExist($pdo) {
    // جدول برنامه هفتگی
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS weekly_plans (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            day_of_week TINYINT NOT NULL COMMENT '0=شنبه, 1=یکشنبه, ..., 6=جمعه',
            time_slot VARCHAR(20) NOT NULL COMMENT 'مثلاً 08:00-09:00',
            subject VARCHAR(100) NOT NULL,
            description TEXT NULL,
            color VARCHAR(20) DEFAULT '#445D84',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            UNIQUE KEY unique_plan (student_id, day_of_week, time_slot)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    
    // جدول قالب‌های برنامه هفتگی (برای کپی کردن)
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS weekly_plan_templates (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            grade TINYINT NULL,
            field VARCHAR(50) NULL,
            day_of_week TINYINT NOT NULL,
            time_slot VARCHAR(20) NOT NULL,
            subject VARCHAR(100) NOT NULL,
            description TEXT NULL,
            color VARCHAR(20) DEFAULT '#445D84',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
}

// ===================== Helper Functions =====================
function jsonResponse($data, $status = 200) {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function requireAuth() {
    if (!isset($_SESSION['admin_id'])) {
        jsonResponse(['error' => 'unauthorized'], 401);
    }
}

function requireAdmin() {
    requireAuth();
    if ($_SESSION['admin_role'] !== 'admin') {
        jsonResponse(['error' => 'forbidden'], 403);
    }
}

// ===================== Router =====================
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
switch ($action) {
    
    // ==================== Auth ====================
    case 'login':
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
        break;
        
    case 'logout':
        session_destroy();
        jsonResponse(['success' => true]);
        break;
        
    case 'check_auth':
        if (isset($_SESSION['admin_id'])) {
            jsonResponse([
                'authenticated' => true,
                'role' => $_SESSION['admin_role'],
                'username' => $_SESSION['admin_username']
            ]);
        }
        jsonResponse(['authenticated' => false]);
        break;
    
    // ==================== Dashboard Stats ====================
    case 'get_stats':
        requireAuth();
        
        $stats = [];
        $stats['students_count'] = (int)$pdo->query("SELECT COUNT(*) FROM students")->fetchColumn();
        
        $week_start = date('Y-m-d', strtotime('saturday last week'));
        $stmt = $pdo->prepare("SELECT COUNT(DISTINCT exam_date) FROM exam_results WHERE exam_date >= ?");
        $stmt->execute([$week_start]);
        $stats['exams_this_week'] = (int)$stmt->fetchColumn();
        
        $stats['students_no_exam'] = (int)$pdo->query("SELECT COUNT(DISTINCT s.id) FROM students s LEFT JOIN exam_results er ON s.id = er.student_id WHERE er.id IS NULL")->fetchColumn();
        $stats['pending_reports'] = (int)$pdo->query("SELECT COUNT(*) FROM reports_status WHERE status = 'pending'")->fetchColumn();
        
        $stats['avg_by_field'] = $pdo->query("
            SELECT s.field, 
                   ROUND(AVG(er.percentage), 1) as avg_percentage, 
                   COUNT(DISTINCT s.id) as student_count 
            FROM students s 
            INNER JOIN exam_results er ON s.id = er.student_id 
            GROUP BY s.field
        ")->fetchAll();
        
        jsonResponse($stats);
        break;
    
    // ==================== Students ====================
    case 'get_students':
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
        break;
        
    case 'add_student':
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
        break;
        
    case 'update_student':
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
        break;
        
    case 'delete_student':
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
        break;
    
    // ایجاد حساب کاربری برای دانش‌آموزان قدیمی (که حساب ندارند)
    case 'create_student_account':
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
        break;
    
    // بازنشانی رمز عبور دانش‌آموز
    case 'reset_student_password':
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
        break;
    
    // ==================== Supporters ====================
    case 'get_supporters':
        requireAdmin();
        
        // لیست پشتیبان‌ها با آمار
        $stmt = $pdo->query("
            SELECT 
                sup.id, sup.name, sup.grade, sup.field, sup.chat_id,
                COUNT(rs.id) as total_reports,
                SUM(CASE WHEN rs.status = 'replied' THEN 1 ELSE 0 END) as replied_count,
                SUM(CASE WHEN rs.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                ROUND(AVG(TIMESTAMPDIFF(HOUR, rs.created_at, rs.replied_at)), 1) as avg_response_hours
            FROM supporters sup
            LEFT JOIN reports_status rs ON sup.id = rs.supporter_id
            GROUP BY sup.id
            ORDER BY sup.name
        ");
        $supporters = $stmt->fetchAll();
        
        // آمار کلی
        $stats = $pdo->query("
            SELECT 
                COUNT(DISTINCT sup.id) as total,
                COALESCE(SUM(CASE WHEN rs.status = 'replied' THEN 1 ELSE 0 END), 0) as replied,
                COALESCE(SUM(CASE WHEN rs.status = 'pending' THEN 1 ELSE 0 END), 0) as pending
            FROM supporters sup
            LEFT JOIN reports_status rs ON sup.id = rs.supporter_id
        ")->fetch();
        
        jsonResponse([
            'supporters' => $supporters,
            'stats' => $stats
        ]);
        break;
    
    case 'add_supporter':
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
        break;
    
    case 'update_supporter':
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
        break;
    
    case 'delete_supporter':
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
        break;
    
    // ==================== Weekly Plans ====================
    case 'get_weekly_plan':
        requireAuth();
        ensureWeeklyPlanTablesExist($pdo);
        
        $student_id = (int)($_GET['student_id'] ?? 0);
        if (!$student_id) {
            jsonResponse(['error' => 'شناسه دانش‌آموز الزامی است'], 400);
        }
        
        $stmt = $pdo->prepare("
            SELECT id, day_of_week, time_slot, subject, description, color
            FROM weekly_plans
            WHERE student_id = ?
            ORDER BY day_of_week, time_slot
        ");
        $stmt->execute([$student_id]);
        $plans = $stmt->fetchAll();
        
        // گروه‌بندی بر اساس روز و ساعت
        $grouped = [];
        foreach ($plans as $plan) {
            $key = $plan['day_of_week'] . '_' . $plan['time_slot'];
            $grouped[$key] = $plan;
        }
        
        jsonResponse([
            'plans' => $plans,
            'grouped' => $grouped
        ]);
        break;
    
    case 'save_weekly_plan_item':
        requireAuth();
        ensureWeeklyPlanTablesExist($pdo);
        
        $student_id = (int)($_POST['student_id'] ?? 0);
        $day_of_week = (int)($_POST['day_of_week'] ?? -1);
        $time_slot = trim($_POST['time_slot'] ?? '');
        $subject = trim($_POST['subject'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $color = trim($_POST['color'] ?? '#445D84');
        
        if (!$student_id || $day_of_week < 0 || $day_of_week > 6 || !$time_slot) {
            jsonResponse(['error' => 'داده‌های ناقص'], 400);
        }
        
        // اگر subject خالی است، یعنی حذف کن
        if (empty($subject)) {
            $stmt = $pdo->prepare("DELETE FROM weekly_plans WHERE student_id = ? AND day_of_week = ? AND time_slot = ?");
            $stmt->execute([$student_id, $day_of_week, $time_slot]);
            jsonResponse(['success' => true, 'action' => 'deleted']);
        }
        
        // INSERT یا UPDATE با ON DUPLICATE KEY
        $stmt = $pdo->prepare("
            INSERT INTO weekly_plans (student_id, day_of_week, time_slot, subject, description, color)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE subject = VALUES(subject), description = VALUES(description), color = VALUES(color)
        ");
        $stmt->execute([$student_id, $day_of_week, $time_slot, $subject, $description, $color]);
        
        jsonResponse(['success' => true, 'action' => 'saved']);
        break;
    
    case 'save_weekly_plan_bulk':
        requireAuth();
        ensureWeeklyPlanTablesExist($pdo);
        
        $student_id = (int)($_POST['student_id'] ?? 0);
        $plans = json_decode($_POST['plans'] ?? '[]', true);
        
        if (!$student_id) {
            jsonResponse(['error' => 'شناسه دانش‌آموز الزامی است'], 400);
        }
        
        $pdo->beginTransaction();
        try {
            // حذف برنامه‌های قبلی
            $pdo->prepare("DELETE FROM weekly_plans WHERE student_id = ?")->execute([$student_id]);
            
            // درج برنامه‌های جدید
            $stmt = $pdo->prepare("
                INSERT INTO weekly_plans (student_id, day_of_week, time_slot, subject, description, color)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $inserted = 0;
            foreach ($plans as $plan) {
                if (!empty($plan['subject'])) {
                    $stmt->execute([
                        $student_id,
                        (int)$plan['day_of_week'],
                        $plan['time_slot'],
                        $plan['subject'],
                        $plan['description'] ?? '',
                        $plan['color'] ?? '#445D84'
                    ]);
                    $inserted++;
                }
            }
            
            $pdo->commit();
            jsonResponse(['success' => true, 'inserted' => $inserted]);
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(['error' => 'خطا در ذخیره برنامه: ' . $e->getMessage()], 500);
        }
        break;
    
    case 'clear_weekly_plan':
        requireAuth();
        ensureWeeklyPlanTablesExist($pdo);
        
        $student_id = (int)($_POST['student_id'] ?? 0);
        if (!$student_id) {
            jsonResponse(['error' => 'شناسه دانش‌آموز الزامی است'], 400);
        }
        
        $pdo->prepare("DELETE FROM weekly_plans WHERE student_id = ?")->execute([$student_id]);
        jsonResponse(['success' => true]);
        break;
    
    case 'get_plan_templates':
        requireAuth();
        ensureWeeklyPlanTablesExist($pdo);
        
        $grade = $_GET['grade'] ?? '';
        $field = $_GET['field'] ?? '';
        
        $sql = "SELECT DISTINCT name, grade, field FROM weekly_plan_templates WHERE 1=1";
        $params = [];
        
        if ($grade) { $sql .= " AND (grade = ? OR grade IS NULL)"; $params[] = $grade; }
        if ($field) { $sql .= " AND (field = ? OR field IS NULL)"; $params[] = $field; }
        
        $sql .= " ORDER BY name";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        jsonResponse($stmt->fetchAll());
        break;
    
    case 'get_template_details':
        requireAuth();
        ensureWeeklyPlanTablesExist($pdo);
        
        $template_name = trim($_GET['name'] ?? '');
        if (!$template_name) {
            jsonResponse(['error' => 'نام قالب الزامی است'], 400);
        }
        
        $stmt = $pdo->prepare("
            SELECT day_of_week, time_slot, subject, description, color
            FROM weekly_plan_templates
            WHERE name = ?
            ORDER BY day_of_week, time_slot
        ");
        $stmt->execute([$template_name]);
        
        jsonResponse($stmt->fetchAll());
        break;
    
    case 'copy_plan_from_template':
        requireAuth();
        ensureWeeklyPlanTablesExist($pdo);
        
        $student_id = (int)($_POST['student_id'] ?? 0);
        $template_name = trim($_POST['template_name'] ?? '');
        
        if (!$student_id || !$template_name) {
            jsonResponse(['error' => 'داده‌های ناقص'], 400);
        }
        
        // دریافت برنامه‌های قالب
        $stmt = $pdo->prepare("
            SELECT day_of_week, time_slot, subject, description, color
            FROM weekly_plan_templates
            WHERE name = ?
        ");
        $stmt->execute([$template_name]);
        $template_plans = $stmt->fetchAll();
        
        if (empty($template_plans)) {
            jsonResponse(['error' => 'قالب یافت نشد'], 404);
        }
        
        $pdo->beginTransaction();
        try {
            // حذف برنامه‌های قبلی
            $pdo->prepare("DELETE FROM weekly_plans WHERE student_id = ?")->execute([$student_id]);
            
            // کپی از قالب
            $stmt = $pdo->prepare("
                INSERT INTO weekly_plans (student_id, day_of_week, time_slot, subject, description, color)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            foreach ($template_plans as $plan) {
                $stmt->execute([
                    $student_id,
                    $plan['day_of_week'],
                    $plan['time_slot'],
                    $plan['subject'],
                    $plan['description'],
                    $plan['color']
                ]);
            }
            
            $pdo->commit();
            jsonResponse(['success' => true, 'copied' => count($template_plans)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(['error' => 'خطا در کپی قالب'], 500);
        }
        break;
    
    case 'save_as_template':
        requireAdmin();
        ensureWeeklyPlanTablesExist($pdo);
        
        $student_id = (int)($_POST['student_id'] ?? 0);
        $template_name = trim($_POST['template_name'] ?? '');
        $grade = $_POST['grade'] ?? null;
        $field = $_POST['field'] ?? null;
        
        if (!$student_id || !$template_name) {
            jsonResponse(['error' => 'نام قالب و شناسه دانش‌آموز الزامی است'], 400);
        }
        
        // دریافت برنامه دانش‌آموز
        $stmt = $pdo->prepare("SELECT day_of_week, time_slot, subject, description, color FROM weekly_plans WHERE student_id = ?");
        $stmt->execute([$student_id]);
        $plans = $stmt->fetchAll();
        
        if (empty($plans)) {
            jsonResponse(['error' => 'برنامه‌ای برای این دانش‌آموز وجود ندارد'], 400);
        }
        
        $pdo->beginTransaction();
        try {
            // حذف قالب قبلی با همین نام
            $pdo->prepare("DELETE FROM weekly_plan_templates WHERE name = ?")->execute([$template_name]);
            
            // ذخیره قالب جدید
            $stmt = $pdo->prepare("
                INSERT INTO weekly_plan_templates (name, grade, field, day_of_week, time_slot, subject, description, color)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            
            foreach ($plans as $plan) {
                $stmt->execute([
                    $template_name,
                    $grade,
                    $field,
                    $plan['day_of_week'],
                    $plan['time_slot'],
                    $plan['subject'],
                    $plan['description'],
                    $plan['color']
                ]);
            }
            
            $pdo->commit();
            jsonResponse(['success' => true, 'saved' => count($plans)]);
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(['error' => 'خطا در ذخیره قالب'], 500);
        }
        break;
    
    case 'delete_template':
        requireAdmin();
        ensureWeeklyPlanTablesExist($pdo);
        
        $template_name = trim($_POST['template_name'] ?? '');
        if (!$template_name) {
            jsonResponse(['error' => 'نام قالب الزامی است'], 400);
        }
        
        $pdo->prepare("DELETE FROM weekly_plan_templates WHERE name = ?")->execute([$template_name]);
        jsonResponse(['success' => true]);
        break;
    
    // ==================== Exams ====================
    
    // لیست آزمون‌ها گروه‌بندی شده بر اساس تاریخ
    case 'get_exam_dates':
        requireAuth();
        
        $stmt = $pdo->query("
            SELECT 
                exam_date,
                COUNT(DISTINCT student_id) as student_count,
                COUNT(DISTINCT subject) as subject_count,
                ROUND(AVG(percentage), 1) as avg_percentage
            FROM exam_results
            GROUP BY exam_date
            ORDER BY exam_date DESC
            LIMIT 50
        ");
        jsonResponse($stmt->fetchAll());
        break;
    
    // لیست دانش‌آموزان یک آزمون خاص
    case 'get_exam_students':
        requireAuth();
        
        $exam_date = $_GET['exam_date'] ?? '';
        if (!$exam_date) jsonResponse(['error' => 'تاریخ الزامی است'], 400);
        
        $stmt = $pdo->prepare("
            SELECT 
                s.id as student_id,
                s.name,
                s.grade,
                s.field,
                COUNT(er.id) as subject_count,
                ROUND(AVG(er.percentage), 1) as avg_percentage
            FROM students s
            INNER JOIN exam_results er ON s.id = er.student_id
            WHERE er.exam_date = ?
            GROUP BY s.id, s.name, s.grade, s.field
            ORDER BY s.name
        ");
        $stmt->execute([$exam_date]);
        jsonResponse($stmt->fetchAll());
        break;
    
    // جزئیات نتایج یک دانش‌آموز در یک آزمون
    case 'get_exam_details':
        requireAuth();
        
        $exam_date = $_GET['exam_date'] ?? '';
        $student_id = (int)($_GET['student_id'] ?? 0);
        
        if (!$exam_date || !$student_id) {
            jsonResponse(['error' => 'پارامترها ناقص است'], 400);
        }
        
        // اطلاعات دانش‌آموز
        $stmt = $pdo->prepare("SELECT id, name, grade, field FROM students WHERE id = ?");
        $stmt->execute([$student_id]);
        $student = $stmt->fetch();
        
        if (!$student) {
            jsonResponse(['error' => 'دانش‌آموز یافت نشد'], 404);
        }
        
        // نتایج درس به درس
        $stmt = $pdo->prepare("
            SELECT subject, chapter, total_q, correct, wrong, skipped, percentage
            FROM exam_results
            WHERE student_id = ? AND exam_date = ?
            ORDER BY subject
        ");
        $stmt->execute([$student_id, $exam_date]);
        $subjects = $stmt->fetchAll();
        
        // میانگین کل
        $stmt = $pdo->prepare("SELECT ROUND(AVG(percentage), 1) as avg FROM exam_results WHERE student_id = ? AND exam_date = ?");
        $stmt->execute([$student_id, $exam_date]);
        $avg = $stmt->fetchColumn();
        
        jsonResponse([
            'student' => $student,
            'subjects' => $subjects,
            'avg_percentage' => $avg
        ]);
        break;
    
    // API قدیمی برای سازگاری
    case 'get_exams':
        requireAuth();
        
        $student_id = $_GET['student_id'] ?? '';
        $date_from = $_GET['date_from'] ?? '';
        $date_to = $_GET['date_to'] ?? '';
        
        $sql = "SELECT er.*, s.name as student_name, s.field, s.grade, f.file_path 
                FROM exam_results er 
                JOIN students s ON er.student_id = s.id 
                LEFT JOIN files f ON er.file_id = f.id 
                WHERE 1=1";
        $params = [];
        
        if ($student_id) { $sql .= " AND er.student_id = ?"; $params[] = $student_id; }
        if ($date_from) { $sql .= " AND er.exam_date >= ?"; $params[] = $date_from; }
        if ($date_to) { $sql .= " AND er.exam_date <= ?"; $params[] = $date_to; }
        
        $sql .= " ORDER BY er.exam_date DESC, s.name LIMIT 200";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        jsonResponse($stmt->fetchAll());
        break;
        
    case 'save_exam':
        requireAuth();
        
        $student_id = (int)($_POST['student_id'] ?? 0);
        $exam_date = $_POST['exam_date'] ?? '';
        $subjects = json_decode($_POST['subjects'] ?? '[]', true);
        
        if (!$student_id || !$exam_date || empty($subjects)) {
            jsonResponse(['error' => 'داده‌های ناقص'], 400);
        }
        
        // اعتبارسنجی سمت سرور
        foreach ($subjects as $subj) {
            if (!empty($subj['subject']) && isset($subj['total_q'])) {
                $total = (int)$subj['total_q'];
                $correct = (int)($subj['correct'] ?? 0);
                $wrong = (int)($subj['wrong'] ?? 0);
                $skipped = (int)($subj['skipped'] ?? 0);
                
                if ($correct > $total) {
                    jsonResponse(['error' => "درس «{$subj['subject']}»: تعداد صحیح نمی‌تواند بیشتر از کل سوالات باشد"], 400);
                }
                if ($wrong > $total) {
                    jsonResponse(['error' => "درس «{$subj['subject']}»: تعداد غلط نمی‌تواند بیشتر از کل سوالات باشد"], 400);
                }
                if ($skipped > $total) {
                    jsonResponse(['error' => "درس «{$subj['subject']}»: تعداد نزده نمی‌تواند بیشتر از کل سوالات باشد"], 400);
                }
                if ($correct + $wrong + $skipped > $total) {
                    jsonResponse(['error' => "درس «{$subj['subject']}»: مجموع صحیح+غلط+نزده بیشتر از کل سوالات است"], 400);
                }
            }
        }
        
        // Start transaction for data integrity
        $pdo->beginTransaction();
        try {
            $inserted = 0;
            foreach ($subjects as $subj) {
                if (!empty($subj['subject']) && isset($subj['total_q'])) {
                    $total = (int)$subj['total_q'];
                    $correct = (int)($subj['correct'] ?? 0);
                    $wrong = (int)($subj['wrong'] ?? 0);
                    $skipped = (int)($subj['skipped'] ?? 0);
                    
                    // ستون percentage به صورت خودکار توسط دیتابیس محاسبه میشود (Generated Column)
                    // فرمول: (correct * 3 - wrong) / (total_q * 3) * 100
                    $stmt = $pdo->prepare("
                        INSERT INTO exam_results (student_id, exam_date, subject, chapter, total_q, correct, wrong, skipped)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ");
                    $stmt->execute([
                        $student_id, $exam_date,
                        $subj['subject'],
                        $subj['chapter'] ?? null,
                        $total, $correct, $wrong, $skipped
                    ]);
                    $inserted++;
                }
            }
            
            // Commit transaction if all inserts succeeded
            $pdo->commit();
            jsonResponse(['success' => true, 'inserted' => $inserted]);
        } catch (Exception $e) {
            // Rollback transaction on any error
            $pdo->rollBack();
            error_log("Error in save_exam transaction: " . $e->getMessage());
            jsonResponse(['error' => 'خطا در ثبت نتایج آزمون: ' . $e->getMessage()], 500);
        }
        break;
    
    // ==================== Files ====================
    case 'get_files':
        requireAuth();
        
        $files = $pdo->query("
            SELECT f.*, s.name as student_name, 
                   SUBSTRING_INDEX(f.file_path, '/', -1) as filename 
            FROM files f 
            LEFT JOIN students s ON f.owner_type = 'student' AND f.owner_id = s.id 
            WHERE f.file_type = 'exam' 
            ORDER BY f.created_at DESC
        ")->fetchAll();
        
        jsonResponse($files);
        break;
        
    case 'upload_file':
        requireAuth();
        
        $student_id = $_POST['student_id'] ?? null;
        $exam_date = $_POST['exam_date'] ?? date('Y-m-d');
        $description = $_POST['description'] ?? '';
        
        if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
            jsonResponse(['error' => 'خطا در آپلود فایل'], 400);
        }
        
        $file = $_FILES['file'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        
        if (!in_array($ext, ALLOWED_EXAM_EXTENSIONS)) {
            jsonResponse(['error' => 'فرمت فایل مجاز نیست'], 400);
        }
        if ($file['size'] > MAX_FILE_SIZE) {
            jsonResponse(['error' => 'حجم فایل بیش از حد مجاز است'], 400);
        }
        
        $filename = 'exam_' . ($student_id ?: 'general') . '_' . date('Ymd_His') . '.' . $ext;
        $upload_path = EXAMS_PATH . '/' . $filename;
        
        if (!move_uploaded_file($file['tmp_name'], $upload_path)) {
            jsonResponse(['error' => 'خطا در ذخیره فایل'], 500);
        }
        
        $stmt = $pdo->prepare("
            INSERT INTO files (owner_type, owner_id, file_type, report_date, file_path, file_size, description) 
            VALUES (?, ?, 'exam', ?, ?, ?, ?)
        ");
        $stmt->execute([
            $student_id ? 'student' : 'admin',
            $student_id ?: $_SESSION['admin_id'],
            $exam_date,
            'uploads/exams/' . $filename,
            $file['size'],
            $description
        ]);
        
        jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
        break;
        
    case 'delete_file':
        requireAdmin();
        
        $id = (int)($_POST['id'] ?? 0);
        if (!$id) jsonResponse(['error' => 'شناسه نامعتبر'], 400);
        
        $stmt = $pdo->prepare("SELECT file_path FROM files WHERE id = ?");
        $stmt->execute([$id]);
        $file = $stmt->fetch();
        
        if ($file) {
            $fullPath = BASE_PATH . '/' . $file['file_path'];
            if (file_exists($fullPath)) unlink($fullPath);
            
            $pdo->prepare("UPDATE exam_results SET file_id = NULL WHERE file_id = ?")->execute([$id]);
            $pdo->prepare("DELETE FROM files WHERE id = ?")->execute([$id]);
        }
        
        jsonResponse(['success' => true]);
        break;
    
    // ==================== Reports ====================
    case 'get_reports':
        requireAuth();
        
        $date_from = $_GET['date_from'] ?? date('Y-m-01');
        $date_to = $_GET['date_to'] ?? date('Y-m-d');
        
        $stmt = $pdo->prepare("
            SELECT report_date, 
                   COUNT(*) as total, 
                   SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending, 
                   SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied 
            FROM reports_status 
            WHERE report_date BETWEEN ? AND ? 
            GROUP BY report_date 
            ORDER BY report_date
        ");
        $stmt->execute([$date_from, $date_to]);
        
        jsonResponse($stmt->fetchAll());
        break;
    
    // ==================== Student List (for dropdowns) ====================
    case 'get_student_list':
        requireAuth();
        $students = $pdo->query("SELECT id, name, grade, field FROM students ORDER BY name")->fetchAll();
        jsonResponse($students);
        break;
    
    // ==================== Courses Management ====================
case 'courses_list':
    requireAuth();
    $courses = $pdo->query("
        SELECT id, name, icon, gradient_color_from, gradient_color_to, 
               background_image_url, description, price, display_order, created_at
        FROM courses 
        ORDER BY display_order ASC, id ASC
    ")->fetchAll();
    jsonResponse($courses);
    break;

     case 'courses_add':
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
        break;

     case 'courses_update':
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
        break;

case 'courses_delete':
    requireAdmin();
    $id = (int)($_POST['id'] ?? 0);
    if (!$id) {
        jsonResponse(['error' => 'شناسه دوره نامعتبر است'], 400);
    }
    $pdo->prepare("DELETE FROM courses WHERE id = ?")->execute([$id]);
    jsonResponse(['success' => true]);
    break;
    
    // ==================== Instructors Management ====================
    case 'instructors_list':
        requireAuth();
        $instructors = $pdo->query("
            SELECT id, name, title, description, image_url, initial_letter, display_order, created_at
            FROM instructors 
            ORDER BY display_order ASC, id ASC
        ")->fetchAll();
        jsonResponse($instructors);
        break;
    
     case 'instructors_add':
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
        break;
    
     case 'instructors_update':
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
        break;
    
    case 'instructors_delete':
        requireAdmin();
        $id = (int)($_POST['id'] ?? 0);
        if (!$id) {
            jsonResponse(['error' => 'شناسه استاد نامعتبر است'], 400);
        }
        $pdo->prepare("DELETE FROM instructors WHERE id = ?")->execute([$id]);
        jsonResponse(['success' => true]);
        break;
    
    // ==================== Topic Tree (Subject Autocomplete) ====================
    
    // Get children of a specific node (for cascading autocomplete)
    case 'get_topic_children':
        requireAuth();
        
        $parent_id = isset($_GET['parent_id']) ? (int)$_GET['parent_id'] : null;
        $level = isset($_GET['level']) ? (int)$_GET['level'] : null;
        
        $sql = "SELECT id, parent_id, label, level, sort_order FROM topic_tree WHERE 1=1";
        $params = [];
        
        if ($parent_id !== null) {
            $sql .= " AND parent_id = ?";
            $params[] = $parent_id;
        } else {
            // If no parent specified, return root children (level 1)
            $sql .= " AND level = 1";
        }
        
        if ($level !== null) {
            $sql .= " AND level = ?";
            $params[] = $level;
        }
        
        $sql .= " ORDER BY sort_order ASC, label ASC";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse($stmt->fetchAll());
        break;
    
    // Search topics by label (for autocomplete text search)
    case 'search_topics':
        requireAuth();
        
        $query = trim($_GET['q'] ?? '');
        $level = isset($_GET['level']) ? (int)$_GET['level'] : null;
        $parent_id = isset($_GET['parent_id']) ? (int)$_GET['parent_id'] : null;
        
        if (empty($query) && $parent_id === null) {
            jsonResponse([]);
        }
        
        $sql = "SELECT id, parent_id, label, level, sort_order FROM topic_tree WHERE 1=1";
        $params = [];
        
        if (!empty($query)) {
            $sql .= " AND label LIKE ?";
            $params[] = "%{$query}%";
        }
        
        if ($level !== null) {
            $sql .= " AND level = ?";
            $params[] = $level;
        }
        
        if ($parent_id !== null) {
            $sql .= " AND parent_id = ?";
            $params[] = $parent_id;
        }
        
        $sql .= " ORDER BY level ASC, sort_order ASC, label ASC LIMIT 50";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        jsonResponse($stmt->fetchAll());
        break;
    
    // Get full path from a node to root (breadcrumb)
    case 'get_topic_path':
        requireAuth();
        
        $node_id = (int)($_GET['id'] ?? 0);
        if (!$node_id) {
            jsonResponse(['error' => 'شناسه گره الزامی است'], 400);
        }
        
        $path = [];
        $currentId = $node_id;
        $maxDepth = 10; // prevent infinite loop
        
        while ($currentId && $maxDepth > 0) {
            $stmt = $pdo->prepare("SELECT id, parent_id, label, level FROM topic_tree WHERE id = ?");
            $stmt->execute([$currentId]);
            $node = $stmt->fetch();
            
            if (!$node) break;
            
            array_unshift($path, $node);
            $currentId = $node['parent_id'];
            $maxDepth--;
        }
        
        jsonResponse($path);
        break;
    
    // Get subjects and chapters for a specific grade/field combination
    // This is optimized for the exam entry autocomplete
    case 'get_subjects_for_grade':
        requireAuth();
        
        $grade_label = trim($_GET['grade'] ?? '');
        $field_label = trim($_GET['field'] ?? '');
        
        if (empty($grade_label)) {
            jsonResponse(['error' => 'پایه تحصیلی الزامی است'], 400);
        }
        
        // Map grade number to label
        $gradeMap = [
            '7' => 'هفتم', '8' => 'هشتم', '9' => 'نهم',
            '10' => 'دهم', '11' => 'یازدهم', '12' => 'دوازدهم'
        ];
        
        $gradeName = $gradeMap[$grade_label] ?? $grade_label;
        
        // Map field to parent branch
        $fieldMap = [
            'ریاضی' => 'ریاضی و فیزیک',
            'تجربی' => 'علوم تجربی',
            'انسانی' => 'علوم انسانی'
        ];
        
        // For grades 7-9 (متوسطه ۱), grade is at level 2, subjects at level 3
        $gradeNum = (int)$grade_label;
        
        if ($gradeNum >= 7 && $gradeNum <= 9) {
            // متوسطه ۱: find grade node, then get its children (subjects)
            $stmt = $pdo->prepare("
                SELECT t.id, t.label, t.level
                FROM topic_tree t
                WHERE t.parent_id IN (
                    SELECT id FROM topic_tree WHERE label = ? AND level = 2
                )
                ORDER BY t.sort_order ASC
            ");
            $stmt->execute([$gradeName]);
            $subjects = $stmt->fetchAll();
            
            // For each subject, get chapters (level 5 children via level 4)
            $result = [];
            foreach ($subjects as $subj) {
                $chStmt = $pdo->prepare("
                    SELECT id, label FROM topic_tree 
                    WHERE parent_id = ? 
                    ORDER BY sort_order ASC
                ");
                $chStmt->execute([$subj['id']]);
                $chapters = $chStmt->fetchAll();
                
                $result[] = [
                    'id' => $subj['id'],
                    'subject' => $subj['label'],
                    'chapters' => $chapters
                ];
            }
            
            jsonResponse($result);
            
        } else {
            // متوسطه ۲: find field branch -> grade -> subjects -> chapters
            $fieldName = $fieldMap[$field_label] ?? $field_label;
            
            // Find the grade node under the field branch
            $stmt = $pdo->prepare("
                SELECT id FROM topic_tree 
                WHERE label = ? AND level = 3
                AND parent_id IN (
                    SELECT id FROM topic_tree WHERE label = ? AND level = 2
                )
            ");
            $stmt->execute([$gradeName, $fieldName]);
            $gradeNode = $stmt->fetch();
            
            if (!$gradeNode) {
                jsonResponse([]);
            }
            
            // Get subjects (level 4) under this grade
            $stmt = $pdo->prepare("
                SELECT id, label FROM topic_tree 
                WHERE parent_id = ? AND level = 4
                ORDER BY sort_order ASC
            ");
            $stmt->execute([$gradeNode['id']]);
            $subjects = $stmt->fetchAll();
            
            // For each subject, get chapters (level 5)
            $result = [];
            foreach ($subjects as $subj) {
                $chStmt = $pdo->prepare("
                    SELECT id, label FROM topic_tree 
                    WHERE parent_id = ? AND level = 5
                    ORDER BY sort_order ASC
                ");
                $chStmt->execute([$subj['id']]);
                $chapters = $chStmt->fetchAll();
                
                $result[] = [
                    'id' => $subj['id'],
                    'subject' => $subj['label'],
                    'chapters' => $chapters
                ];
            }
            
            jsonResponse($result);
        }
        break;
    
    // ==================== Default ====================
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

} catch (PDOException $e) {
    error_log("Database error: " . $e->getMessage());
    jsonResponse(['error' => 'خطا در دیتابیس: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    error_log("General error: " . $e->getMessage());
    jsonResponse(['error' => 'خطای سرور: ' . $e->getMessage()], 500);
}