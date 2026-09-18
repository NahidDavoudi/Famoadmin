<?php
/**
 * Test from admin directory
 */
$_GET = ['action' => 'check_auth'];
$_POST = [];
$_SESSION = [];
$_FILES = [];
$_SERVER['REQUEST_METHOD'] = 'GET';

ob_start();

try {
    require_once __DIR__ . '/api/api.php';
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