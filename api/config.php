<?php
require_once  '../vendor/autoload.php';
use App\Env;
Env::load();
// --- Environment Variables (DB credentials) ---
define('DB_HOST', Env::get('DB_HOST'));
define('DB_NAME', Env::get('DB_NAME'));
define('DB_USER', Env::get('DB_USER'));
define('DB_PASS', Env::get('DB_PASS'));

// چک اولیه: اگر متغیرهای حیاتی ست نشده باشن، صریح خطا بده به جای ادامه‌ی خاموش
if (empty(DB_NAME) || empty(DB_USER)) {
    error_log(date('Y-m-d H:i:s') . " Config Error: DB_NAME/DB_USER env vars are not set.\n", 3, __DIR__ . '/../error.log');
    http_response_code(500);
    die(json_encode(['status' => 'error', 'message' => 'خطای پیکربندی سرور'], JSON_UNESCAPED_UNICODE));
}

// --- Paths ---
define('BASE_PATH', dirname(__DIR__)); // website/ folder
define('UPLOADS_PATH', BASE_PATH . '/uploads');
define('EXAMS_PATH', UPLOADS_PATH . '/exams');

// --- File Upload Settings ---
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB
define('ALLOWED_EXAM_EXTENSIONS', ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']);

// --- Timezone ---
date_default_timezone_set('Asia/Tehran');

// --- Create directories if not exist ---
if (!file_exists(UPLOADS_PATH)) mkdir(UPLOADS_PATH, 0755, true);
if (!file_exists(EXAMS_PATH)) mkdir(EXAMS_PATH, 0755, true);

/**
 * Get PDO connection instance (Singleton)
 */
function getDB() {
    static $pdo = null;
    
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            error_log(date('Y-m-d H:i:s') . " DB Error: " . $e->getMessage() . "\n", 3, BASE_PATH . '/error.log');
            throw $e;
        }
    }
    
    return $pdo;
}