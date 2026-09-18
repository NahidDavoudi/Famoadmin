<?php
/**
 * Comprehensive API Test - Runs multiple actions in one script
 * Run from admin directory: php test_comprehensive.php
 */

// Suppress output during tests
ob_start();

// Start session
session_start();

// Test 1: check_auth (no session)
$_GET = ['action' => 'check_auth'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 1 (check_auth): $out";

// Test 2: login (invalid credentials)
$_GET = ['action' => 'login'];
$_POST = ['username' => 'nonexistent', 'password' => 'wrong'];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'POST';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 2 (login invalid): $out";

// Test 3: get_topic_children (requires auth)
$_GET = ['action' => 'get_topic_children', 'parent_id' => 1];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SESSION['admin_id'] = 1;
$_SESSION['admin_role'] = 'admin';
$_SESSION['admin_username'] = 'test';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 3 (get_topic_children): $out";

// Test 4: search_topics
$_GET = ['action' => 'search_topics', 'q' => 'ریاضی'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 4 (search_topics): $out";

// Test 5: get_reports
$_GET = ['action' => 'get_reports'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 5 (get_reports): $out";

// Test 6: get_student_list
$_GET = ['action' => 'get_student_list'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 6 (get_student_list): $out";

// Test 7: get_files
$_GET = ['action' => 'get_files'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 7 (get_files): $out";

// Test 8: courses_list
$_GET = ['action' => 'courses_list'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 8 (courses_list): $out";

// Test 9: instructors_list
$_GET = ['action' => 'instructors_list'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 9 (instructors_list): $out";

// Test 10: get_blog_posts
$_GET = ['action' => 'get_blog_posts'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 10 (get_blog_posts): $out";

// Test 11: get_supporters
$_GET = ['action' => 'get_supporters'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 11 (get_supporters): $out";

// Test 11: get_students
$_GET = ['action' => 'get_students'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 12 (get_students): $out";

// Test 12: get_weekly_plan
$_GET = ['action' => 'get_weekly_plan', 'student_id' => 1];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 13 (get_weekly_plan): $out";

// Test 13: get_plan_templates
$_GET = ['action' => 'get_plan_templates'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 14 (get_plan_templates): $out";

// Test 14: get_exam_dates
$_GET = ['action' => 'get_exam_dates'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 15 (get_exam_dates): $out";

// Test 15: get_exam_students
$_GET = ['action' => 'get_exam_students', 'exam_date' => '2024-01-01'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 16 (get_exam_students): $out";

// Test 16: get_exams (legacy)
$_GET = ['action' => 'get_exams'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 17 (get_exams): $out";

// Test 17: invalid action
$_GET = ['action' => 'invalid_action'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 18 (invalid_action): $out";

// Test 18: get_topic_path
$_GET = ['action' => 'get_topic_path', 'id' => 1];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 19 (get_topic_path): $out";

// Test 19: get_subjects_for_grade
$_GET = ['action' => 'get_subjects_for_grade', 'grade' => '7'];
$_POST = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';
ob_start();
require_once 'api/api.php';
$out = ob_get_clean();
$results[] = "Test 20 (get_subjects_for_grade): $out";

// Clean up output buffer
ob_end_clean();

// Print results
echo "=== Famo Admin API Test Results ===\n\n";
foreach ($results as $result) {
    echo $result . "\n";
}
echo "\n=== All Tests Completed ===\n";