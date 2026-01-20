<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? '';

$pdo = getDB();

switch ($action) {
    case 'login':
        $username = $data['username'] ?? '';
        $password = $data['password'] ?? '';
        
        if (empty($username) || empty($password)) {
            jsonResponse(['error' => 'Username and password required'], 400);
        }
        
        $stmt = $pdo->prepare("SELECT * FROM admins WHERE username = ?");
        $stmt->execute([$username]);
        $admin = $stmt->fetch();
        
        if ($admin && password_verify($password, $admin['password_hash'])) {
            // Generate a token and store it
            $token = bin2hex(random_bytes(32));
            $expiry = date('Y-m-d H:i:s', strtotime('+24 hours'));
            
            // Update or insert token in database
            $stmt = $pdo->prepare("UPDATE admins SET auth_token = ?, token_expiry = ? WHERE id = ?");
            $stmt->execute([$token, $expiry, $admin['id']]);
            
            jsonResponse([
                'success' => true,
                'token' => $token,
                'user' => [
                    'id' => $admin['id'],
                    'username' => $admin['username']
                ]
            ]);
        } else {
            jsonResponse(['error' => 'Invalid credentials'], 401);
        }
        break;
        
    case 'change_password':
        authenticateToken($pdo); // Require current auth
        
        $username = $data['username'] ?? '';
        $currentPassword = $data['current_password'] ?? '';
        $newPassword = $data['new_password'] ?? '';
        
        $stmt = $pdo->prepare("SELECT * FROM admins WHERE username = ?");
        $stmt->execute([$username]);
        $admin = $stmt->fetch();
        
        if ($admin && password_verify($currentPassword, $admin['password_hash'])) {
            $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE admins SET password_hash = ? WHERE id = ?");
            $stmt->execute([$newHash, $admin['id']]);
            
            jsonResponse(['success' => true, 'message' => 'Password changed successfully']);
        } else {
            jsonResponse(['error' => 'Invalid current password'], 401);
        }
        break;
        
    default:
        jsonResponse(['error' => 'Invalid action'], 400);
}

// Token-based authentication function
function authenticateToken($pdo) {
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
    
    return $admin;
}
?>
