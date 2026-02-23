<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Http;

class BunnyStorageController extends Controller
{
    /**
     * Return Bunny Storage configuration (non-sensitive).
     */
    public function config(): JsonResponse
    {
        return response()->json([
            'zone_name' => env('BUNNY_STORAGE_ZONE_NAME', ''),
            'storage_host' => env('BUNNY_STORAGE_HOSTNAME', ''),
            'cdn_host' => env('BUNNY_CDN_HOSTNAME', ''),
            'configured' => !empty(env('BUNNY_STORAGE_API_KEY')) && !empty(env('BUNNY_STORAGE_ZONE_NAME')) && !empty(env('BUNNY_STORAGE_HOSTNAME')),
        ]);
    }

    /**
     * Test connection by listing root directory.
     */
    public function test(): JsonResponse
    {
        $apiKey = env('BUNNY_STORAGE_API_KEY');
        $zoneName = env('BUNNY_STORAGE_ZONE_NAME');
        $storageHost = env('BUNNY_STORAGE_HOSTNAME');
        $cdnHost = env('BUNNY_CDN_HOSTNAME', '');

        if (empty($apiKey) || empty($zoneName) || empty($storageHost)) {
            return response()->json([
                'success' => false,
                'error' => 'Bunny Storage not configured. Please set BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_ZONE_NAME, and BUNNY_STORAGE_HOSTNAME in .env.',
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
