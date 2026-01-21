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
            
            // Generate KHQR with proper format
            $qrResult = generateKHQR($amountKHR, $orderId, $order['app_name']);
            
            // Update order with MD5 for verification
            $stmt = $pdo->prepare("UPDATE orders SET payment_md5 = ? WHERE id = ?");
            $stmt->execute([$qrResult['md5'], $orderId]);
            
            echo json_encode([
                'success' => true,
                'qr_string' => $qrResult['qr'],
                'md5' => $qrResult['md5'],
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
            
            // Check with Bakong API
            $bakongResponse = checkBakongPayment($md5);
            
            if ($bakongResponse && $bakongResponse['status'] === 'paid') {
                // Payment confirmed by Bakong
                $stmt = $pdo->prepare("UPDATE orders SET status = 'paid', paid_at = NOW(), bakong_transaction_id = ? WHERE id = ?");
                $stmt->execute([$bakongResponse['hash'] ?? '', $orderId]);
                
                echo json_encode([
                    'success' => true,
                    'status' => 'paid',
                    'transaction_id' => $bakongResponse['hash'] ?? null
                ]);
                exit;
            }
            
            // Check local order status
            $stmt = $pdo->prepare("SELECT status FROM orders WHERE id = ?");
            $stmt->execute([$orderId]);
            $orderStatus = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($orderStatus && $orderStatus['status'] === 'paid') {
                echo json_encode([
                    'success' => true,
                    'status' => 'paid'
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

/**
 * Generate KHQR with proper EMVCo format
 */
function generateKHQR($amountKHR, $orderId, $appName) {
    $accountId = BAKONG_ACCOUNT_ID;
    $merchantName = 'AppsTorrent';
    $merchantCity = 'Phnom Penh';
    $billNumber = substr($orderId, 0, 8);
    
    // Build EMVCo QR Code data
    $qr = '';
    
    // ID 00 - Payload Format Indicator
    $qr .= '000201';
    
    // ID 01 - Point of Initiation Method (12 = Dynamic)
    $qr .= '010212';
    
    // ID 29 - Merchant Account Information (Bakong)
    $accountInfo = '0004KHQR0118' . sprintf('%02d', strlen($accountId)) . $accountId;
    $qr .= '29' . sprintf('%02d', strlen($accountInfo)) . $accountInfo;
    
    // ID 52 - Merchant Category Code
    $qr .= '52045999';
    
    // ID 53 - Transaction Currency (116 = KHR)
    $qr .= '5303116';
    
    // ID 54 - Transaction Amount
    $amountStr = strval($amountKHR);
    $qr .= '54' . sprintf('%02d', strlen($amountStr)) . $amountStr;
    
    // ID 58 - Country Code
    $qr .= '5802KH';
    
    // ID 59 - Merchant Name
    $qr .= '59' . sprintf('%02d', strlen($merchantName)) . $merchantName;
    
    // ID 60 - Merchant City
    $qr .= '60' . sprintf('%02d', strlen($merchantCity)) . $merchantCity;
    
    // ID 62 - Additional Data Field
    $billNumberField = '01' . sprintf('%02d', strlen($billNumber)) . $billNumber;
    $qr .= '62' . sprintf('%02d', strlen($billNumberField)) . $billNumberField;
    
    // ID 99 - Timestamp for uniqueness
    $timestamp = strval(time());
    $timestampField = '00' . sprintf('%02d', strlen($timestamp)) . $timestamp;
    $qr .= '99' . sprintf('%02d', strlen($timestampField)) . $timestampField;
    
    // Add CRC placeholder
    $qr .= '6304';
    
    // Calculate and append CRC16
    $crc = crc16($qr);
    $qr .= strtoupper(sprintf('%04X', $crc));
    
    // Generate MD5
    $md5 = md5($qr);
    
    return [
        'qr' => $qr,
        'md5' => $md5
    ];
}

/**
 * CRC16-CCITT calculation
 */
function crc16($data) {
    $crc = 0xFFFF;
    $polynomial = 0x1021;
    
    for ($i = 0; $i < strlen($data); $i++) {
        $crc ^= (ord($data[$i]) << 8);
        for ($j = 0; $j < 8; $j++) {
            if (($crc & 0x8000) != 0) {
                $crc = (($crc << 1) ^ $polynomial) & 0xFFFF;
            } else {
                $crc = ($crc << 1) & 0xFFFF;
            }
        }
    }
    
    return $crc;
}

/**
 * Check payment status with Bakong API
 */
function checkBakongPayment($md5) {
    if (empty($md5)) {
        return null;
    }
    
    $url = 'https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5';
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode(['md5' => $md5]),
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
    
    $data = json_decode($response, true);
    
    // Check if payment is confirmed
    if ($data && isset($data['responseCode']) && $data['responseCode'] === 0) {
        return [
            'status' => 'paid',
            'hash' => $data['data']['hash'] ?? null
        ];
    }
    
    return null;
}
?>
