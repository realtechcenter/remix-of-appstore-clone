# PHP API for Hostinger

## Setup Instructions

### 1. Upload Files to Hostinger

1. Log in to your Hostinger hPanel
2. Go to **File Manager** → `public_html`
3. Create a folder called `api`
4. Upload all PHP files from `php-api/` folder to `public_html/api/`

### 2. Configure Database

1. Open `api/config.php` in File Manager
2. Update these values with your credentials:
   ```php
   define('DB_HOST', 'localhost');
   define('DB_NAME', 'u839507206_api');
   define('DB_USER', 'u839507206_api');
   define('DB_PASS', 'your_password_here');
   ```

### 3. Create Database Tables

1. Go to **Databases** → **phpMyAdmin** in hPanel
2. Select your database
3. Click **SQL** tab
4. Copy and paste the contents of `setup.sql`
5. Click **Go** to run

### 4. Set API Key

1. Open `api/config.php`
2. Change the API key:
   ```php
   define('API_KEY', 'your-secure-random-key-here');
   ```

### 5. Update Frontend API URL

1. In your Lovable project, create a `.env` file or update `src/lib/api.ts`
2. Set your API URL:
   ```typescript
   const API_BASE_URL = 'https://your-domain.com/api';
   ```

### 6. Default Admin Login

- **Username:** admin
- **Password:** admin123

⚠️ **IMPORTANT:** Change the password immediately after first login!

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `apps.php` | GET | List all apps |
| `apps.php?id=1` | GET | Get single app |
| `apps.php` | POST | Create app |
| `apps.php?id=1` | PUT | Update app |
| `apps.php?id=1` | DELETE | Delete app |
| `versions.php?app_id=1` | GET | Get app versions |
| `versions.php` | POST | Create version |
| `versions.php?id=1` | PUT | Update version |
| `versions.php?id=1` | DELETE | Delete version |
| `auth.php` | POST | Login/Auth |

## Security Notes

1. Change default admin password
2. Use a strong API key
3. Enable HTTPS on your domain
4. Restrict CORS to your specific domain in production
