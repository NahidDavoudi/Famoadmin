<?php
// weekly-plans.php - Weekly Plans API actions
// Extracted from api.php - 9 weekly plan actions + ensureWeeklyPlanTablesExist

// Auto-create tables if not exist
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

function weekly_plans_get_weekly_plan() {
    global $pdo;
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
}

function weekly_plans_save_weekly_plan_item() {
    global $pdo;
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
}

function weekly_plans_save_weekly_plan_bulk() {
    global $pdo;
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
}

function weekly_plans_clear_weekly_plan() {
    global $pdo;
    requireAuth();
    ensureWeeklyPlanTablesExist($pdo);
    
    $student_id = (int)($_POST['student_id'] ?? 0);
    if (!$student_id) {
        jsonResponse(['error' => 'شناسه دانش‌آموز الزامی است'], 400);
    }
    
    $pdo->prepare("DELETE FROM weekly_plans WHERE student_id = ?")->execute([$student_id]);
    jsonResponse(['success' => true]);
}

function weekly_plans_get_plan_templates() {
    global $pdo;
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
}

function weekly_plans_get_template_details() {
    global $pdo;
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
}

function weekly_plans_copy_plan_from_template() {
    global $pdo;
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
}

function weekly_plans_save_as_template() {
    global $pdo;
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
}

function weekly_plans_delete_template() {
    global $pdo;
    requireAdmin();
    ensureWeeklyPlanTablesExist($pdo);
    
    $template_name = trim($_POST['template_name'] ?? '');
    if (!$template_name) {
        jsonResponse(['error' => 'نام قالب الزامی است'], 400);
    }
    
    $pdo->prepare("DELETE FROM weekly_plan_templates WHERE name = ?")->execute([$template_name]);
    jsonResponse(['success' => true]);
}