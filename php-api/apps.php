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
        if (isset($_GET['id'])) {
            // Get single app with versions
            $stmt = $pdo->prepare("SELECT * FROM apps WHERE id = ?");
            $stmt->execute([$_GET['id']]);
            $app = $stmt->fetch();
            
            if ($app) {
                // Get versions
                $stmt = $pdo->prepare("SELECT * FROM app_versions WHERE app_id = ? ORDER BY created_at DESC");
                $stmt->execute([$app['id']]);
                $app['versions'] = $stmt->fetchAll();
                
                // Get screenshots
                $stmt = $pdo->prepare("SELECT * FROM app_screenshots WHERE app_id = ? ORDER BY sort_order");
                $stmt->execute([$app['id']]);
                $app['screenshots'] = $stmt->fetchAll();
                
                jsonResponse($app);
            } else {
                jsonResponse(['error' => 'App not found'], 404);
            }
        } else {
            // Get all apps with optional filters and pagination
            $category = $_GET['category'] ?? null;
            $search = $_GET['search'] ?? null;
            $featured = isset($_GET['featured']);
            $page = max(1, intval($_GET['page'] ?? 1));
            $limit = max(1, min(100, intval($_GET['limit'] ?? 10)));
            $offset = ($page - 1) * $limit;
            
            // Base query for counting
            $countSql = "SELECT COUNT(*) FROM apps a WHERE 1=1";
            $params = [];
            
            if ($category) {
                $countSql .= " AND category = ?";
                $params[] = $category;
            }
            
            if ($search) {
                $countSql .= " AND (name LIKE ? OR name_km LIKE ? OR description LIKE ? OR developer LIKE ?)";
                $searchParam = "%$search%";
                $params[] = $searchParam;
                $params[] = $searchParam;
                $params[] = $searchParam;
                $params[] = $searchParam;
            }
            
            if ($featured) {
                $countSql .= " AND is_featured = 1";
            }
            
            // Get total count
            $stmt = $pdo->prepare($countSql);
            $stmt->execute($params);
            $total = (int)$stmt->fetchColumn();
            
            // Main query with pagination
            $sql = "SELECT a.*, 
                    (SELECT version FROM app_versions WHERE app_id = a.id AND is_latest = 1 LIMIT 1) as latest_version
                    FROM apps a WHERE 1=1";
            
            if ($category) {
                $sql .= " AND category = ?";
            }
            
            if ($search) {
                $sql .= " AND (name LIKE ? OR name_km LIKE ? OR description LIKE ? OR developer LIKE ?)";
            }
            
            if ($featured) {
                $sql .= " AND is_featured = 1";
            }
            
            $sql .= " ORDER BY created_at DESC LIMIT ? OFFSET ?";
            $params[] = $limit;
            $params[] = $offset;
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $apps = $stmt->fetchAll();
            
            jsonResponse([
                'data' => $apps,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $total,
                    'total_pages' => ceil($total / $limit)
                ]
            ]);
        }
        break;
        
    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        
        $stmt = $pdo->prepare("INSERT INTO apps (name, name_km, description, description_km, category, icon_url, developer, website, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['name'] ?? '',
            $data['name_km'] ?? null,
            $data['description'] ?? null,
            $data['description_km'] ?? null,
            $data['category'] ?? 'programs',
            $data['icon_url'] ?? null,
            $data['developer'] ?? null,
            $data['website'] ?? null,
            $data['is_featured'] ?? false
        ]);
        
        $appId = $pdo->lastInsertId();
        
        // Handle screenshots
        if (isset($data['screenshots']) && is_array($data['screenshots'])) {
            $screenshotStmt = $pdo->prepare("INSERT INTO app_screenshots (app_id, image_url, sort_order) VALUES (?, ?, ?)");
            foreach ($data['screenshots'] as $index => $url) {
                if (!empty($url)) {
                    $screenshotStmt->execute([$appId, $url, $index]);
                }
            }
        }
        
        jsonResponse(['id' => $appId, 'message' => 'App created successfully'], 201);
        break;
        
    case 'PUT':
        $data = json_decode(file_get_contents('php://input'), true);
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            jsonResponse(['error' => 'App ID required'], 400);
        }
        
        $stmt = $pdo->prepare("UPDATE apps SET name = ?, name_km = ?, description = ?, description_km = ?, category = ?, icon_url = ?, developer = ?, website = ?, is_featured = ? WHERE id = ?");
        $stmt->execute([
            $data['name'] ?? '',
            $data['name_km'] ?? null,
            $data['description'] ?? null,
            $data['description_km'] ?? null,
            $data['category'] ?? 'programs',
            $data['icon_url'] ?? null,
            $data['developer'] ?? null,
            $data['website'] ?? null,
            $data['is_featured'] ?? false,
            $id
        ]);
        
        // Handle screenshots - delete existing and re-insert
        if (isset($data['screenshots']) && is_array($data['screenshots'])) {
            $deleteStmt = $pdo->prepare("DELETE FROM app_screenshots WHERE app_id = ?");
            $deleteStmt->execute([$id]);
            
            $screenshotStmt = $pdo->prepare("INSERT INTO app_screenshots (app_id, image_url, sort_order) VALUES (?, ?, ?)");
            foreach ($data['screenshots'] as $index => $url) {
                if (!empty($url)) {
                    $screenshotStmt->execute([$id, $url, $index]);
                }
            }
        }
        
        jsonResponse(['message' => 'App updated successfully']);
        break;
        
    case 'DELETE':
        $id = $_GET['id'] ?? null;
        
        if (!$id) {
            jsonResponse(['error' => 'App ID required'], 400);
        }
        
        $stmt = $pdo->prepare("DELETE FROM apps WHERE id = ?");
        $stmt->execute([$id]);
        
        jsonResponse(['message' => 'App deleted successfully']);
        break;
        
    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
?>
