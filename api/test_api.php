<?php
/**
 * API Test Script - Tests all API actions directly
 * Run from api/ directory: php test_api.php
 */

// Mock $_GET, $_POST, $_SESSION, $_FILES for testing
$_GET = ['action' => 'check_auth'];
$_POST = [];
$_SESSION = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';

// Capture output
ob_start();

try {
    // Include the main API
    require_once 'api.php';
} catch (Throwable $e) {
    $output = ob_get_clean();
    echo "FATAL ERROR: " . $e->getMessage() . "\n";
    echo "In: " . $e->getFile() . ":" . $e->getLine() . "\n";
    exit(1);
}

$output = ob_get_clean();

if (strlen($output) > 0) {
    echo "Output captured:\n$output\n";
} else {
    echo "Script executed without output (likely jsonResponse called exit)\n";
}