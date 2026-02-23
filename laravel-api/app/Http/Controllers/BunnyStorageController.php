<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class BunnyStorageController extends Controller
{
    /**
     * Get the effective value: system_settings first, then .env fallback.
     */
    private function getSetting(string $key, string $envKey, string $default = ''): string
    {
        $dbValue = SystemSetting::getValue($key);
        if ($dbValue !== null && $dbValue !== '') {
            return $dbValue;
        }
        return env($envKey, $default);
    }

    /**
     * Return Bunny Storage configuration (non-sensitive).
     */
    public function config(): JsonResponse
    {
        $zoneName = $this->getSetting('bunny_zone_name', 'BUNNY_STORAGE_ZONE_NAME');
        $storageHost = $this->getSetting('bunny_storage_host', 'BUNNY_STORAGE_HOSTNAME');
        $cdnHost = $this->getSetting('bunny_cdn_host', 'BUNNY_CDN_HOSTNAME');
        $apiKey = $this->getSetting('bunny_api_key', 'BUNNY_STORAGE_API_KEY');

        return response()->json([
            'zone_name' => $zoneName,
            'storage_host' => $storageHost,
            'cdn_host' => $cdnHost,
            'configured' => !empty($apiKey) && !empty($zoneName) && !empty($storageHost),
        ]);
    }

    /**
     * Update Bunny Storage settings (saved to system_settings table).
     */
    public function updateConfig(Request $request): JsonResponse
    {
        $request->validate([
            'zone_name' => 'nullable|string|max:255',
            'storage_host' => 'nullable|string|max:255',
            'cdn_host' => 'nullable|string|max:255',
            'api_key' => 'nullable|string|max:500',
        ]);

        $mappings = [
            'zone_name' => 'bunny_zone_name',
            'storage_host' => 'bunny_storage_host',
            'cdn_host' => 'bunny_cdn_host',
            'api_key' => 'bunny_api_key',
        ];

        foreach ($mappings as $inputKey => $settingKey) {
            if ($request->has($inputKey)) {
                SystemSetting::setValue($settingKey, $request->input($inputKey));
            }
        }

        return response()->json(['message' => 'Bunny Storage settings updated successfully']);
    }

    /**
     * Test connection by listing root directory.
     */
    public function test(): JsonResponse
    {
        $apiKey = $this->getSetting('bunny_api_key', 'BUNNY_STORAGE_API_KEY');
        $zoneName = $this->getSetting('bunny_zone_name', 'BUNNY_STORAGE_ZONE_NAME');
        $storageHost = $this->getSetting('bunny_storage_host', 'BUNNY_STORAGE_HOSTNAME');
        $cdnHost = $this->getSetting('bunny_cdn_host', 'BUNNY_CDN_HOSTNAME');

        if (empty($apiKey) || empty($zoneName) || empty($storageHost)) {
            return response()->json([
                'success' => false,
                'error' => 'Bunny Storage not configured. Please set the API Key, Zone Name, and Storage Host.',
            ], 400);
        }

        try {
            $response = Http::withHeaders(['AccessKey' => $apiKey])
                ->get("https://{$storageHost}/{$zoneName}/");

            if ($response->successful()) {
                $files = $response->json();

                return response()->json([
                    'success' => true,
                    'message' => 'Connection successful!',
                    'zone_name' => $zoneName,
                    'storage_host' => $storageHost,
                    'cdn_host' => $cdnHost ?: 'Not configured',
                    'file_count' => is_array($files) ? count($files) : 0,
                ]);
            }

            return response()->json([
                'success' => false,
                'error' => "Connection failed ({$response->status()}): {$response->body()}",
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Connection test failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
