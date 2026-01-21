<?php
// Database configuration - UPDATE THESE VALUES
define('DB_HOST', 'localhost'); // Usually 'localhost' on Hostinger
define('DB_NAME', 'your_database_name');
define('DB_USER', 'your_username');
define('DB_PASS', 'your_password');

// JWT Secret for user authentication - CHANGE THIS TO A RANDOM STRING!
define('JWT_SECRET', 'your-super-secret-jwt-key-change-this');

// Bakong API configuration
define('BAKONG_API_TOKEN', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiYmMxYmJhYzUzMmZiNDlkOCJ9LCJpYXQiOjE3NjkwMDgxODAsImV4cCI6MTc3Njc4NDE4MH0.3Jdd8dQQGId7skxZOpV3r1zOf3L9vyF-RRaXECUSOXg');
define('BAKONG_ACCOUNT_ID', 'mengleang_san@aclb');

// CORS settings - Update with your Lovable app URL
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Database connection
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit();
}

function getDB() {
    global $pdo;
    return $pdo;
}

// Simple API key authentication for admin
define('API_KEY', 'your-secure-api-key-here'); // Change this!

function authenticate() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if ($authHeader !== 'Bearer ' . API_KEY) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized']);
        exit();
    }
}

// Helper function to send JSON response
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit();
}
?>
