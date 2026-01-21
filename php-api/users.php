<?php
// User Authentication API
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? '';

// Helper function to generate JWT token
function generateToken($userId, $email) {
    $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload = base64_encode(json_encode([
        'user_id' => $userId,
        'email' => $email,
        'exp' => time() + (7 * 24 * 60 * 60) // 7 days
    ]));
    $signature = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$signature";
}

// Helper function to verify JWT token
function verifyToken($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    
    list($header, $payload, $signature) = $parts;
    $expectedSignature = base64_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    
    if ($signature !== $expectedSignature) return null;
    
    $data = json_decode(base64_decode($payload), true);
    if ($data['exp'] < time()) return null;
    
    return $data;
}

// Get authenticated user from token
function getAuthUser() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
        return verifyToken($matches[1]);
    }
    return null;
}

try {
    switch ($action) {
        case 'register':
            if ($method !== 'POST') {
                throw new Exception('Method not allowed');
            }
            
            $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
            $password = $input['password'] ?? '';
            $fullName = $input['full_name'] ?? '';
            
            if (!$email) {
                throw new Exception('Invalid email address');
            }
            if (strlen($password) < 6) {
                throw new Exception('Password must be at least 6 characters');
            }
            
            // Check if user exists
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                throw new Exception('Email already registered');
            }
            
            // Create user
            $passwordHash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, full_name, created_at) VALUES (?, ?, ?, NOW())");
            $stmt->execute([$email, $passwordHash, $fullName]);
            $userId = $pdo->lastInsertId();
            
            $token = generateToken($userId, $email);
            
            echo json_encode([
                'success' => true,
                'token' => $token,
                'user' => [
                    'id' => $userId,
                    'email' => $email,
                    'full_name' => $fullName
                ]
            ]);
            break;
            
        case 'login':
            if ($method !== 'POST') {
                throw new Exception('Method not allowed');
            }
            
            $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
            $password = $input['password'] ?? '';
            
            if (!$email || !$password) {
                throw new Exception('Email and password are required');
            }
            
            $stmt = $pdo->prepare("SELECT id, email, password_hash, full_name FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user || !password_verify($password, $user['password_hash'])) {
                throw new Exception('Invalid email or password');
            }
            
            $token = generateToken($user['id'], $user['email']);
            
            echo json_encode([
                'success' => true,
                'token' => $token,
                'user' => [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'full_name' => $user['full_name']
                ]
            ]);
            break;
            
        case 'me':
            $authUser = getAuthUser();
            if (!$authUser) {
                http_response_code(401);
                echo json_encode(['error' => 'Unauthorized']);
                exit;
            }
            
            $stmt = $pdo->prepare("SELECT id, email, full_name, phone, avatar_url, created_at FROM users WHERE id = ?");
            $stmt->execute([$authUser['user_id']]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                http_response_code(404);
                echo json_encode(['error' => 'User not found']);
                exit;
            }
            
            echo json_encode(['success' => true, 'user' => $user]);
            break;
            
        case 'update_profile':
            $authUser = getAuthUser();
            if (!$authUser) {
                http_response_code(401);
                echo json_encode(['error' => 'Unauthorized']);
                exit;
            }
            
            $fullName = $input['full_name'] ?? null;
            $phone = $input['phone'] ?? null;
            
            $updates = [];
            $params = [];
            
            if ($fullName !== null) {
                $updates[] = "full_name = ?";
                $params[] = $fullName;
            }
            if ($phone !== null) {
                $updates[] = "phone = ?";
                $params[] = $phone;
            }
            
            if (!empty($updates)) {
                $params[] = $authUser['user_id'];
                $sql = "UPDATE users SET " . implode(', ', $updates) . ", updated_at = NOW() WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
            }
            
            echo json_encode(['success' => true, 'message' => 'Profile updated']);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
