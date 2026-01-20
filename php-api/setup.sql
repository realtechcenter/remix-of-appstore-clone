-- Run this SQL in your Hostinger phpMyAdmin to create the tables

CREATE TABLE IF NOT EXISTS apps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    name_km VARCHAR(255),
    description TEXT,
    description_km TEXT,
    category ENUM('programs', 'games', 'extensions', 'os') DEFAULT 'programs',
    icon_url VARCHAR(500),
    developer VARCHAR(255),
    website VARCHAR(500),
    is_featured BOOLEAN DEFAULT FALSE,
    download_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_versions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    app_id INT NOT NULL,
    version VARCHAR(50) NOT NULL,
    release_date DATE,
    changelog TEXT,
    changelog_km TEXT,
    file_size VARCHAR(50),
    download_url VARCHAR(500),
    is_latest BOOLEAN DEFAULT FALSE,
    min_os_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
    INDEX idx_app_id (app_id),
    INDEX idx_is_latest (is_latest)
);

CREATE TABLE IF NOT EXISTS app_screenshots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    app_id INT NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    auth_token VARCHAR(64) DEFAULT NULL,
    token_expiry DATETIME DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert a default admin (password: admin123)
-- Run this to create the admin user:
INSERT INTO admins (username, password_hash) VALUES 
('admin', '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGxJXaZTSHwmtqO1t0rQ6V1tm')
ON DUPLICATE KEY UPDATE username = username;
