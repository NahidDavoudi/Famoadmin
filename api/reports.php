<?php
// reports.php - Reports API actions
// Extracted from api.php - lines 1220-1240

// Ensure shared dependencies are available
// $pdo, requireAuth() are required from api.php

function reports_get_reports() {
    global $pdo;
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
}