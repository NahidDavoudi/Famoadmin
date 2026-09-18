<?php
// files.php - Files API actions
// Extracted from api.php - get_files, upload_file, delete_file

function files_get_files() {
    global $pdo;
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
}

function files_upload_file() {
    global $pdo;
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
}

function files_delete_file() {
    global $pdo;
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
}