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

// Include extracted API modules
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/dashboard.php';
require_once __DIR__ . '/reports.php';
require_once __DIR__ . '/topics.php';
require_once __DIR__ . '/files.php';
require_once __DIR__ . '/courses.php';
require_once __DIR__ . '/instructors.php';
require_once __DIR__ . '/blog.php';
require_once __DIR__ . '/supporters.php';
require_once __DIR__ . '/students.php';
require_once __DIR__ . '/weekly-plans.php';
require_once __DIR__ . '/exams.php';

// ===================== Router =====================
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
switch ($action) {
    
    // ==================== Auth ====================
    case 'login':
        auth_login();
        break;
        
    case 'logout':
        auth_logout();
        break;
        
    case 'check_auth':
        auth_check();
        break;
    
    // ==================== Dashboard Stats ====================
    case 'get_stats':
        dashboard_get_stats();
        break;
    
// ==================== Students ====================
    case 'get_students':
        students_get_students();
        break;

    case 'add_student':
        students_add_student();
        break;

    case 'update_student':
        students_update_student();
        break;

    case 'delete_student':
        students_delete_student();
        break;

    case 'create_student_account':
        students_create_student_account();
        break;

    case 'reset_student_password':
        students_reset_student_password();
        break;

    case 'get_student_list':
        students_get_student_list();
        break;

// ==================== Supporters ====================
    case 'get_supporters':
        supporters_get_supporters();
        break;

    case 'add_supporter':
        supporters_add_supporter();
        break;

    case 'update_supporter':
        supporters_update_supporter();
        break;

    case 'delete_supporter':
        supporters_delete_supporter();
        break;

    // ==================== Blog Posts ====================
    case 'get_blog_posts':
        blog_get_blog_posts();
        break;

    case 'get_blog_post':
        blog_get_blog_post();
        break;

    case 'add_blog_post':
        blog_add_blog_post();
        break;

    case 'update_blog_post':
        blog_update_blog_post();
        break;

    case 'delete_blog_post':
        blog_delete_blog_post();
        break;

    // ==================== Weekly Plans ====================
    case 'get_weekly_plan':
        weekly_plans_get_weekly_plan();
        break;

    case 'save_weekly_plan_item':
        weekly_plans_save_weekly_plan_item();
        break;

    case 'save_weekly_plan_bulk':
        weekly_plans_save_weekly_plan_bulk();
        break;

    case 'clear_weekly_plan':
        weekly_plans_clear_weekly_plan();
        break;

    case 'get_plan_templates':
        weekly_plans_get_plan_templates();
        break;

    case 'get_template_details':
        weekly_plans_get_template_details();
        break;

    case 'copy_plan_from_template':
        weekly_plans_copy_plan_from_template();
        break;

    case 'save_as_template':
        weekly_plans_save_as_template();
        break;

    case 'delete_template':
        weekly_plans_delete_template();
        break;
    
    // ==================== Exams ====================
    
    case 'get_exam_dates':
        exams_get_exam_dates();
        break;
    
    case 'get_exam_students':
        exams_get_exam_students();
        break;
    
    case 'get_exam_details':
        exams_get_exam_details();
        break;
    
    case 'get_exams':
        exams_get_exams();
        break;
    
case 'save_exam':
        exams_save_exam();
        break;
        
    // ==================== Files ====================
    case 'get_files':
        files_get_files();
        break;
        
    case 'upload_file':
        files_upload_file();
        break;
        
    case 'delete_file':
        files_delete_file();
        break;
    
    // ==================== Reports ====================
    case 'get_reports':
        reports_get_reports();
        break;
    
    // ==================== Student List (for dropdowns) ====================
    case 'get_student_list':
        students_get_student_list();
        break;
    
    // ==================== Courses Management ====================
    case 'courses_list':
        courses_list();
        break;

    case 'courses_add':
        courses_add();
        break;

    case 'courses_update':
        courses_update();
        break;

    case 'courses_delete':
        courses_delete();
        break;
    
    // ==================== Instructors Management ====================
    case 'instructors_list':
        instructors_list();
        break;

    case 'instructors_add':
        instructors_add();
        break;

    case 'instructors_update':
        instructors_update();
        break;

    case 'instructors_delete':
        instructors_delete();
        break;
    
    // ==================== Topic Tree (Subject Autocomplete) ====================
    
    case 'get_topic_children':
        topics_get_topic_children();
        break;
    
    case 'search_topics':
        topics_search_topics();
        break;
    
    case 'get_topic_path':
        topics_get_topic_path();
        break;
    
    case 'get_subjects_for_grade':
        topics_get_subjects_for_grade();
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