<?php
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$pdo = getDB();

// Token-based authentication for write operations
if (in_array($method, ['POST', 'PUT', 'DELETE'])) {
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
}

switch ($method) {
    case 'GET':
        $appId = $_GET['app_id'] ?? null;
        
        if (!$appId) {
            jsonResponse(['error' => 'App ID required'], 400);
        }
        
        $stmt = $pdo->prepare("SELECT * FROM app_versions WHERE app_id = ? ORDER BY created_at DESC");
        $stmt->execute([$appId]);
        jsonResponse($stmt->fetchAll());
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        // If this is marked as latest, unmark others
        if ($data['is_latest'] ?? false) {
            $stmt = $pdo->prepare("UPDATE app_versions SET is_latest = 0 WHERE app_id = ?");
            $stmt->execute([$data['app_id']]);
        }
        
        $stmt = $pdo->prepare("INSERT INTO app_versions (app_id, version, release_date, changelog, changelog_km, file_size, download_url, is_latest, min_os_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['app_id'],
            $data['version'] ?? '',
            $data['release_date'] ?? date('Y-m-d'),
            $data['changelog'] ?? null,
            $data['changelog_km'] ?? null,
            $data['file_size'] ?? null,
            $data['download_url'] ?? null,
            $data['is_latest'] ?? false,
            $data['min_os_version'] ?? null
        ]);
        
        $versionId = $pdo->lastInsertId();
        jsonResponse(['id' => $versionId, 'message' => 'Version created successfully'], 201);
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            jsonResponse(['error' => 'Version ID required'], 400);
        }
        
        // If this is marked as latest, unmark others
        if ($data['is_latest'] ?? false) {
            // Get app_id first
            $stmt = $pdo->prepare("SELECT app_id FROM app_versions WHERE id = ?");
            $stmt->execute([$id]);
            $version = $stmt->fetch();
            
            if ($version) {
                $stmt = $pdo->prepare("UPDATE app_versions SET is_latest = 0 WHERE app_id = ?");
                $stmt->execute([$version['app_id']]);
            }
        }
        
        $stmt = $pdo->prepare("UPDATE app_versions SET version = ?, release_date = ?, changelog = ?, changelog_km = ?, file_size = ?, download_url = ?, is_latest = ?, min_os_version = ? WHERE id = ?");
        $stmt->execute([
            $data['version'] ?? '',
            $data['release_date'] ?? date('Y-m-d'),
            $data['changelog'] ?? null,
            $data['changelog_km'] ?? null,
            $data['file_size'] ?? null,
            $data['download_url'] ?? null,
            $data['is_latest'] ?? false,
            $data['min_os_version'] ?? null,
            $id
        ]);
        
        jsonResponse(['message' => 'Version updated successfully']);
        break;
        
    case 'DELETE':
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            jsonResponse(['error' => 'Version ID required'], 400);
        }
        
        $stmt = $pdo->prepare("DELETE FROM app_versions WHERE id = ?");
        $stmt->execute([$id]);
        
        jsonResponse(['message' => 'Version deleted successfully']);
        break;
        
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
?>
