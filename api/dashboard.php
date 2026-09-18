<?php
// dashboard.php - Dashboard stats API actions
// Extracted from api.php - lines 121-146

// Ensure shared dependencies are available
// $pdo, requireAuth() are required from api.php

function dashboard_get_stats() {
    global $pdo;
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
}