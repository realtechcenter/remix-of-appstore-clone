<?php
// KHQR Payment API - ABA PayWay Integration
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'config.php';

// ABA PayWay Gateway - Replace with your actual PayWay link
define('PAYWAY_URL', 'https://link.payway.com.kh/ABAPAYGJ288488t');
define('PAYWAY_SECRET', '123456789');

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
            
            // Generate QR using ABA PayWay
            $qrResult = getQRString($amount, $orderId);
            
            // Update order with payment session data
            $stmt = $pdo->prepare("UPDATE orders SET payment_md5 = ?, bakong_transaction_id = ? WHERE id = ?");
            $stmt->execute([
                json_encode([
                    'hash' => $qrResult['hash'],
                    'client_id' => $qrResult['client_id'],
                    'device_id' => $qrResult['device_id'],
                    'request_time' => $qrResult['request_time']
                ]),
                $qrResult['tran_id'],
                $orderId
            ]);
            
            // Convert to KHR for display (1 USD ≈ 4100 KHR)
            $amountKHR = round($amount * 4100);
            
            echo json_encode([
                'success' => true,
                'qr_string' => $qrResult['qr_string'],
                'md5' => $qrResult['hash'],
                'tran_id' => $qrResult['tran_id'],
                'amount' => $amountKHR,
                'currency' => 'KHR'
            ]);
            break;
            
        case 'verify':
            $orderId = $input['order_id'] ?? null;
            $md5 = $input['md5'] ?? null;
            
            if (!$orderId) {
                throw new Exception('Order ID required');
            }
            
            // Get order details
            $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$order) {
                throw new Exception('Order not found');
            }
            
            // Already paid
            if ($order['status'] === 'paid') {
                echo json_encode(['success' => true, 'status' => 'paid']);
                exit;
            }
            
            // Check if expired
            if ($order['expires_at'] && strtotime($order['expires_at']) < time()) {
                $stmt = $pdo->prepare("UPDATE orders SET status = 'expired' WHERE id = ?");
                $stmt->execute([$orderId]);
                echo json_encode(['success' => true, 'status' => 'expired']);
                exit;
            }
            
            // Check payment status with ABA API
            $paymentData = json_decode($order['payment_md5'], true);
            
            if ($paymentData && isset($paymentData['client_id'])) {
                $result = checkPaymentStatus($paymentData);
                
                if ($result['status'] === 'approved') {
                    $stmt = $pdo->prepare("UPDATE orders SET status = 'paid', paid_at = NOW() WHERE id = ?");
                    $stmt->execute([$orderId]);
                    echo json_encode(['success' => true, 'status' => 'paid']);
                    exit;
                }
            }
            
            echo json_encode([
                'success' => true,
                'status' => 'pending',
                'message' => 'Payment not yet received'
            ]);
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

/**
 * Get QR String from ABA PayWay
 */
function getQRString($amount, $orderId) {
    // Step 1: Fetch aba_data from PayWay URL
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => PAYWAY_URL,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 30
    ]);
    $response = curl_exec($ch);
    
    if (curl_errno($ch)) {
        throw new Exception('Curl error: ' . curl_error($ch));
    }
    curl_close($ch);
    
    $response = str_replace("\\u002F", "/", $response);
    
    // Extract aba_data and request_time
    preg_match('/aba_data="([^"]+)"/', $response, $abaMatches);
    preg_match('/request_time:"([^"]+)"/', $response, $timeMatches);
    
    if (empty($abaMatches[1]) || empty($timeMatches[1])) {
        throw new Exception('aba_data or request_time not found');
    }
    
    $abaData = $abaMatches[1];
    $requestTime = $timeMatches[1];
    
    // Step 2: Prepare additional fields
    $additionalFields = json_encode([
        "amount" => $amount,
        "remark" => "Order: " . substr($orderId, 0, 8),
        "full_name" => "",
        "email" => "",
        "phone" => ""
    ]);
    
    // Step 3: Generate hash
    $hashString = $requestTime . $abaData . $additionalFields;
    $hash = hash('sha512', $hashString);
    
    // Step 4: Call ABA API to get QR string
    $postData = json_encode([
        "additional_fields" => $additionalFields,
        "request_time" => $requestTime,
        "aba_data" => $abaData,
        "hash" => $hash
    ]);
    
    $ch2 = curl_init();
    curl_setopt_array($ch2, [
        CURLOPT_URL => 'https://pwapp.ababank.com/api/pw-app/v1/payment/gateway/list-payment-options',
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postData,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json']
    ]);
    
    $response2 = curl_exec($ch2);
    $httpCode = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
    
    if (curl_errno($ch2)) {
        throw new Exception('API error: ' . curl_error($ch2));
    }
    curl_close($ch2);
    
    if ($httpCode !== 200) {
        throw new Exception('API returned status: ' . $httpCode);
    }
    
    $jsonResponse = json_decode($response2, true);
    
    if (empty($jsonResponse['qr_string'])) {
        throw new Exception('No QR string in response: ' . $response2);
    }
    
    // Generate device_id and client hash for status checking
    $deviceId = generateDeviceId(10);
    $clientId = $jsonResponse['client_id'];
    $hashData = $clientId . $deviceId . $requestTime;
    $statusHash = hash_hmac('sha512', $hashData, PAYWAY_SECRET);
    
    return [
        'tran_id' => $jsonResponse['status']['tran_id'] ?? '',
        'qr_string' => $jsonResponse['qr_string'],
        'client_id' => $clientId,
        'device_id' => $deviceId,
        'request_time' => $requestTime,
        'hash' => $statusHash
    ];
}

/**
 * Check payment status with ABA API
 */
function checkPaymentStatus($paymentData) {
    $postData = json_encode([
        "device_id" => $paymentData['device_id'],
        "client_id" => $paymentData['client_id'],
        "hash" => $paymentData['hash'],
        "request_time" => $paymentData['request_time']
    ]);
    
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => 'https://pwapp.ababank.com/api/core/v1/check-payment-status',
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postData,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json']
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        return ['status' => 'pending'];
    }
    
    $jsonResponse = json_decode($response, true);
    $status = $jsonResponse['data']['action'] ?? 'pending';
    
    return ['status' => $status];
}

/**
 * Generate random device ID
 */
function generateDeviceId($length = 10) {
    $characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[random_int(0, strlen($characters) - 1)];
    }
    return $randomString;
}
?>
