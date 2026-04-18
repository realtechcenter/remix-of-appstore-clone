<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\AppVersion;
use App\Models\AppDownloadLink;
use App\Models\Order;
use App\Models\Admin;
use App\Models\SystemSetting;
use Illuminate\Http\Request;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class DownloadController extends Controller
{
    /**
     * Generate a signed Bunny CDN download URL.
     * Verifies user authorization before generating the link.
     */
    public function generateSignedUrl(Request $request)
    {
        $request->validate([
            'version_id' => 'required|integer',
            'link_id' => 'nullable|integer',
        ]);

        $version = AppVersion::with('app')->find($request->version_id);
        if (!$version) {
            return response()->json(['error' => 'Version not found'], 404);
        }

        $app = $version->app;
        if (!$app) {
            return response()->json(['error' => 'App not found'], 404);
        }

        // Authenticate and authorize
        $token = $request->bearerToken();
        $isAdmin = false;
        $userId = null;

        if ($token) {
            $admin = Admin::where('auth_token', $token)->first();
            if ($admin) {
                $isAdmin = true;
            } else {
                try {
                    $decoded = JWT::decode($token, new Key(config('app.jwt_secret'), 'HS256'));
                    $userId = $decoded->user_id ?? null;
                } catch (\Exception $e) {
                    return response()->json(['error' => 'Invalid authentication token'], 401);
                }
            }
        } else {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        // Check authorization
        if (!$isAdmin) {
            if ($app->price && $app->price > 0) {
                if (!$userId) {
                    return response()->json(['error' => 'Authentication required'], 401);
                }
                $hasPurchased = Order::where('user_id', $userId)
                    ->where('app_id', $app->id)
                    ->whereIn('status', ['paid', 'approved'])
                    ->exists();
                if (!$hasPurchased) {
                    return response()->json(['error' => 'Purchase required to download this app'], 403);
                }
            }
            // Free apps: allow download for any authenticated user
        }

        // Determine which URL to sign
        $originalUrl = null;
        if ($request->link_id) {
            $link = AppDownloadLink::where('id', $request->link_id)
                ->where('app_version_id', $version->id)
                ->first();
            if (!$link) {
                return response()->json(['error' => 'Download link not found'], 404);
            }
            $originalUrl = $link->url;
        } else {
            $originalUrl = $version->download_url;
        }

        if (!$originalUrl) {
            return response()->json(['error' => 'No download URL available'], 404);
        }

        // Increment download counter (skip for admins to avoid inflating stats during testing)
        if (!$isAdmin) {
            $app->increment('download_count');
        }

        // Check if Token Authentication is enabled
        $tokenAuthKey = SystemSetting::getValue('bunny_token_auth_key');
        $tokenExpiry = (int) SystemSetting::getValue('bunny_token_expiry', '3600'); // default 1 hour

        if ($tokenAuthKey) {
            $signedUrl = $this->signBunnyUrl($originalUrl, $tokenAuthKey, $tokenExpiry);
            return response()->json([
                'success' => true,
                'url' => $signedUrl,
                'expires_in' => $tokenExpiry,
            ]);
        }

        // No token auth configured — return original URL
        return response()->json([
            'success' => true,
            'url' => $originalUrl,
            'expires_in' => null,
        ]);
    }

    /**
     * Generate a signed Bunny CDN URL with token authentication.
     */
    private function signBunnyUrl(string $url, string $securityKey, int $expirationTime = 3600): string
    {
        $expires = time() + $expirationTime;
        $parsedUrl = parse_url($url);
        $path = $parsedUrl['path'] ?? '/';

        // Bunny CDN token generation
        $hashableBase = $securityKey . $path . $expires;
        $token = base64_encode(hash('sha256', $hashableBase, true));
        // Make URL-safe
        $token = strtr($token, '+/', '-_');
        $token = rtrim($token, '=');

        $separator = isset($parsedUrl['query']) ? '&' : '?';
        return $url . $separator . 'token=' . $token . '&expires=' . $expires;
    }
}
