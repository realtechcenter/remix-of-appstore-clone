<?php
// KHQR Payment API - Bakong Integration
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'generate-qr':
            $orderId = $input['order_id'] ?? null;
            $amount = floatval($input['amount'] ?? 0);
            
            if (!$orderId || $amount <= 0) {
                throw new Exception('Invalid request');
            }
            
            // Get order details
            $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$order) {
                throw new Exception('Order not found');
            }
            
            // Convert USD to KHR (1 USD ≈ 4100 KHR)
            $amountKHR = round($amount * 4100);
            
            // Generate KHQR using Bakong API
            $bakongResponse = callBakongAPI('generate', [
                'bank_account' => BAKONG_ACCOUNT_ID,
                'merchant_name' => 'AppsTorrent',
                'merchant_city' => 'Phnom Penh',
                'amount' => $amountKHR,
                'currency' => 'KHR',
                'store_label' => 'Order-' . substr($orderId, 0, 8),
                'terminal_label' => 'APP',
                'purpose_of_transaction' => 'Purchase: ' . $order['app_name']
            ]);
            
            if ($bakongResponse && isset($bakongResponse['qr'])) {
                // Update order with MD5 for verification
                $stmt = $pdo->prepare("UPDATE orders SET payment_md5 = ? WHERE id = ?");
                $stmt->execute([$bakongResponse['md5'], $orderId]);
                
                echo json_encode([
                    'success' => true,
                    'qr_string' => $bakongResponse['qr'],
                    'deeplink' => $bakongResponse['deeplink'] ?? null,
                    'md5' => $bakongResponse['md5'],
                    'amount' => $amountKHR,
                    'currency' => 'KHR'
                ]);
            } else {
                // Fallback: Generate simple QR data for testing
                $md5 = md5($orderId . time());
                $qrString = "00020101021229380014" . BAKONG_ACCOUNT_ID . "5303116540" . $amountKHR . "5802KH5912AppsTorrent6010PhnomPenh62070503" . substr($orderId, 0, 8) . "6304";
                
                $stmt = $pdo->prepare("UPDATE orders SET payment_md5 = ? WHERE id = ?");
                $stmt->execute([$md5, $orderId]);
                
                echo json_encode([
                    'success' => true,
                    'qr_string' => $qrString,
                    'md5' => $md5,
                    'amount' => $amountKHR,
                    'currency' => 'KHR'
                ]);
            }
            break;
            
        case 'verify':
            $orderId = $input['order_id'] ?? null;
            $md5 = $input['md5'] ?? null;
            
            if (!$orderId) {
                throw new Exception('Order ID required');
            }
            
            // Check with Bakong API
            $bakongResponse = callBakongAPI('check', ['md5' => $md5]);
            
            if ($bakongResponse && isset($bakongResponse['responseCode']) && $bakongResponse['responseCode'] === 0) {
                // Payment confirmed by Bakong
                $stmt = $pdo->prepare("UPDATE orders SET status = 'paid', paid_at = NOW(), bakong_transaction_id = ? WHERE id = ?");
                $stmt->execute([$bakongResponse['data']['hash'] ?? '', $orderId]);
                
                echo json_encode([
                    'success' => true,
                    'status' => 'paid',
                    'transaction_id' => $bakongResponse['data']['hash'] ?? null
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'status' => 'pending',
                    'message' => 'Payment not yet received'
                ]);
            }
            break;
            
        case 'confirm-manual':
            // Manual confirmation for testing
            $orderId = $input['order_id'] ?? null;
            
            if (!$orderId) {
                throw new Exception('Order ID required');
            }
            
            $stmt = $pdo->prepare("UPDATE orders SET status = 'paid', paid_at = NOW() WHERE id = ?");
            $stmt->execute([$orderId]);
            
            echo json_encode(['success' => true, 'message' => 'Payment confirmed']);
            break;
            
        default:
            throw new Exception('Invalid action');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}

// Helper function to call Bakong API
function callBakongAPI($action, $data) {
    $endpoints = [
        'generate' => 'https://api-bakong.nbc.gov.kh/v1/generate_deeplink_by_qr',
        'check' => 'https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5'
    ];
    
    $url = $endpoints[$action] ?? null;
    if (!$url) return null;
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . BAKONG_API_TOKEN
        ],
        CURLOPT_TIMEOUT => 30
    ]);
    
    $response = curl_exec($ch);
    $error = curl_error($ch);
    curl_close($ch);
    
    if ($error) {
        error_log("Bakong API error: $error");
        return null;
    }
    
    return json_decode($response, true);
}
?>
