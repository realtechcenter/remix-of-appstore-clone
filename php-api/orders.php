<?php
// Orders API - Purchase tracking
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

// Helper function to verify JWT token (same as users.php)
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

function getAuthUser() {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? '';
    
    if (preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
        return verifyToken($matches[1]);
    }
    return null;
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// Check authentication
$authUser = getAuthUser();
if (!$authUser) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$userId = $authUser['user_id'];

try {
    if ($method === 'GET') {
        // Get user's orders
        $appId = $_GET['app_id'] ?? null;
        
        if ($appId) {
            // Check if user has purchased specific app
            $stmt = $pdo->prepare("SELECT * FROM orders WHERE user_id = ? AND app_id = ? AND status = 'paid' LIMIT 1");
            $stmt->execute([$userId, $appId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'purchased' => $order ? true : false,
                'order' => $order
            ]);
        } else {
            // Get all orders
            $stmt = $pdo->prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC");
            $stmt->execute([$userId]);
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode(['success' => true, 'orders' => $orders]);
        }
        
    } elseif ($method === 'POST') {
        $action = $input['action'] ?? 'create';
        
        if ($action === 'create') {
            // Create new order
            $appId = $input['app_id'] ?? null;
            $appName = $input['app_name'] ?? '';
            $amount = floatval($input['amount'] ?? 0);
            
            if (!$appId || $amount <= 0) {
                throw new Exception('Invalid order data');
            }
            
            // Check if already purchased
            $stmt = $pdo->prepare("SELECT id FROM orders WHERE user_id = ? AND app_id = ? AND status = 'paid'");
            $stmt->execute([$userId, $appId]);
            if ($stmt->fetch()) {
                throw new Exception('You have already purchased this app');
            }
            
            // Create order
            $orderId = bin2hex(random_bytes(16));
            $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));
            
            $stmt = $pdo->prepare("
                INSERT INTO orders (id, user_id, app_id, app_name, amount, currency, status, expires_at, created_at) 
                VALUES (?, ?, ?, ?, ?, 'USD', 'pending', ?, NOW())
            ");
            $stmt->execute([$orderId, $userId, $appId, $appName, $amount, $expiresAt]);
            
            echo json_encode([
                'success' => true,
                'order' => [
                    'id' => $orderId,
                    'app_id' => $appId,
                    'app_name' => $appName,
                    'amount' => $amount,
                    'status' => 'pending',
                    'expires_at' => $expiresAt
                ]
            ]);
            
        } elseif ($action === 'confirm') {
            // Confirm payment (for testing or webhook)
            $orderId = $input['order_id'] ?? null;
            
            if (!$orderId) {
                throw new Exception('Order ID required');
            }
            
            $stmt = $pdo->prepare("UPDATE orders SET status = 'paid', paid_at = NOW() WHERE id = ? AND user_id = ?");
            $stmt->execute([$orderId, $userId]);
            
            if ($stmt->rowCount() === 0) {
                throw new Exception('Order not found');
            }
            
            echo json_encode(['success' => true, 'message' => 'Payment confirmed']);
        }
        
    } else {
        throw new Exception('Method not allowed');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
