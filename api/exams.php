<?php
// exams.php - Exams API actions
// Extracted from api.php - get_exam_dates, get_exam_students, get_exam_details, get_exams, save_exam

function exams_get_exam_dates() {
    global $pdo;
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
}

function exams_get_exam_students() {
    global $pdo;
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
}

function exams_get_exam_details() {
    global $pdo;
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
}

function exams_get_exams() {
    global $pdo;
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
}

function exams_save_exam() {
    global $pdo;
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
}