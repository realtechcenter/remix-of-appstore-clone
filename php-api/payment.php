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

// Include Composer autoload if using the bakong-khqr-image package
if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
}

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
            
            // Try using the KHQR PHP library first
            if (class_exists('KHQR\BakongKHQR')) {
                $qrResult = generateKHQRWithLibrary($amountKHR, $orderId, $order['app_name']);
            } else {
                // Fallback to manual KHQR generation with proper CRC16
                $qrResult = generateKHQRManual($amountKHR, $orderId, $order['app_name']);
            }
            
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
            
            // Check with Bakong API if token is configured
            if (defined('BAKONG_API_TOKEN') && BAKONG_API_TOKEN !== 'your-bakong-api-token') {
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
                    exit;
                }
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
 * Generate KHQR using the bakong-khqr-image PHP library
 */
function generateKHQRWithLibrary($amountKHR, $orderId, $appName) {
    $individualInfo = new \KHQR\Models\IndividualInfo(
        bakongAccountID: BAKONG_ACCOUNT_ID,
        merchantName: 'AppsTorrent',
        merchantCity: 'Phnom Penh',
        storeLabel: 'Order-' . substr($orderId, 0, 8),
        currency: \KHQR\Helpers\KHQRData::CURRENCY_KHR,
        amount: $amountKHR
    );
    
    $result = \KHQR\BakongKHQR::generateIndividual($individualInfo);
    
    if ($result->status['code'] === 0) {
        return [
            'qr' => $result->data['qr'],
            'md5' => $result->data['md5']
        ];
    }
    
    throw new Exception('Failed to generate KHQR');
}

/**
 * Generate KHQR manually with proper EMVCo format and CRC16 checksum
 */
function generateKHQRManual($amountKHR, $orderId, $appName) {
    // EMVCo QR Code structure
    $data = '';
    
    // Payload Format Indicator (ID 00)
    $data .= tlv('00', '01');
    
    // Point of Initiation Method (ID 01) - Dynamic QR
    $data .= tlv('01', '12');
    
    // Merchant Account Information (ID 29) - Bakong
    $accountId = defined('BAKONG_ACCOUNT_ID') ? BAKONG_ACCOUNT_ID : 'merchant@bank';
    $merchantAccount = tlv('00', $accountId);
    $data .= tlv('29', $merchantAccount);
    
    // Merchant Category Code (ID 52)
    $data .= tlv('52', '5999');
    
    // Transaction Currency (ID 53) - 116 = KHR
    $data .= tlv('53', '116');
    
    // Transaction Amount (ID 54)
    $data .= tlv('54', strval($amountKHR));
    
    // Country Code (ID 58)
    $data .= tlv('58', 'KH');
    
    // Merchant Name (ID 59)
    $data .= tlv('59', 'AppsTorrent');
    
    // Merchant City (ID 60)
    $data .= tlv('60', 'Phnom Penh');
    
    // Additional Data Field Template (ID 62)
    $additionalData = tlv('05', 'Order-' . substr($orderId, 0, 8));
    $data .= tlv('62', $additionalData);
    
    // Timestamp for uniqueness (ID 99)
    $timestamp = tlv('00', strval(time()));
    $data .= tlv('99', $timestamp);
    
    // CRC placeholder (ID 63) - 4 hex chars
    $data .= '6304';
    
    // Calculate CRC16-CCITT
    $crc = calculateCRC16($data);
    $data .= strtoupper(sprintf('%04X', $crc));
    
    // Generate MD5 for payment verification
    $md5 = md5($data);
    
    return [
        'qr' => $data,
        'md5' => $md5
    ];
}

/**
 * Create TLV (Tag-Length-Value) format
 */
function tlv($tag, $value) {
    $length = strlen($value);
    return $tag . sprintf('%02d', $length) . $value;
}

/**
 * Calculate CRC16-CCITT checksum
 */
function calculateCRC16($data) {
    $crc = 0xFFFF;
    $polynomial = 0x1021;
    
    for ($i = 0; $i < strlen($data); $i++) {
        $crc ^= (ord($data[$i]) << 8);
        for ($j = 0; $j < 8; $j++) {
            if ($crc & 0x8000) {
                $crc = (($crc << 1) ^ $polynomial) & 0xFFFF;
            } else {
                $crc = ($crc << 1) & 0xFFFF;
            }
        }
    }
    
    return $crc;
}

/**
 * Helper function to call Bakong API
 */
function callBakongAPI($action, $data) {
    $endpoints = [
        'generate' => 'https://api-bakong.nbc.gov.kh/v1/generate_deeplink_by_qr',
        'check' => 'https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5'
    ];
    
    $url = $endpoints[$action] ?? null;
    if (!$url) return null;
    
    if (!defined('BAKONG_API_TOKEN') || BAKONG_API_TOKEN === 'your-bakong-api-token') {
        return null;
    }
    
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
