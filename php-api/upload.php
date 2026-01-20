<?php
require_once 'config.php';

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

// Token-based authentication
$pdo = getDB();
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

if (!preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

$token = $matches[1];

$stmt = $pdo->prepare("SELECT * FROM admins WHERE auth_token = ? AND token_expiry > NOW()");
$stmt->execute([$token]);
$admin = $stmt->fetch();

if (!$admin) {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

// Check if file was uploaded
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
        UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE',
        UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
        UPLOAD_ERR_NO_FILE => 'No file was uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION => 'Upload blocked by extension',
    ];
    $error = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
    jsonResponse(['error' => $errorMessages[$error] ?? 'Upload failed'], 400);
}

$file = $_FILES['file'];
$type = $_POST['type'] ?? 'general'; // icons, screenshots, versions

// Validate file type
$allowedTypes = [
    'icons' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    'screenshots' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    'versions' => ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed', 
                   'application/octet-stream', 'application/x-msdownload', 'application/x-apple-diskimage',
                   'application/gzip', 'application/x-tar'],
    'general' => ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
];

$allowed = $allowedTypes[$type] ?? $allowedTypes['general'];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mimeType = $finfo->file($file['tmp_name']);

// For version files, be more lenient
if ($type !== 'versions' && !in_array($mimeType, $allowed)) {
    jsonResponse(['error' => 'File type not allowed: ' . $mimeType], 400);
}

// Max file size (50MB for versions, 5MB for images)
$maxSize = ($type === 'versions') ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
if ($file['size'] > $maxSize) {
    jsonResponse(['error' => 'File too large. Max: ' . ($maxSize / 1024 / 1024) . 'MB'], 400);
}

// Create upload directory
$uploadDir = __DIR__ . '/uploads/' . $type . '/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate unique filename
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = uniqid() . '_' . time() . '.' . $extension;
$filepath = $uploadDir . $filename;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    jsonResponse(['error' => 'Failed to save file'], 500);
}

// Generate URL
$protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'];
$baseUrl = $protocol . '://' . $host . dirname($_SERVER['SCRIPT_NAME']);
$fileUrl = $baseUrl . '/uploads/' . $type . '/' . $filename;

jsonResponse([
    'success' => true,
    'url' => $fileUrl,
    'filename' => $filename,
    'size' => $file['size'],
    'type' => $mimeType
]);
?>
