<?php
// topics.php - Topic Tree API actions
// Extracted from api.php - lines 1554-1762

// Ensure shared dependencies are available
// $pdo, requireAuth() are required from api.php

// Get children of a specific node (for cascading autocomplete)
function topics_get_topic_children() {
    global $pdo;
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
}

// Search topics by label (for autocomplete text search)
function topics_search_topics() {
    global $pdo;
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
}

// Get full path from a node to root (breadcrumb)
function topics_get_topic_path() {
    global $pdo;
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
}

// Get subjects and chapters for a specific grade/field combination
function topics_get_subjects_for_grade() {
    global $pdo;
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
}