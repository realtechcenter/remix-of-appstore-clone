<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\AppVersion;
use App\Models\AppDownloadLink;
use App\Models\Order;
use App\Models\Admin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class VersionController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'app_id' => 'required|integer',
        ]);

        $appId = $request->app_id;
        
        // Check if app is paid and if user has purchased it
        $app = App::find($appId);
        $canAccessDownloads = false;
        $isAdmin = false;
        
        // Try to identify user from Bearer token
        $token = $request->bearerToken();
        $userId = null;
        
        if ($token) {
            // Check if admin
            $admin = Admin::where('auth_token', $token)->first();
            if ($admin) {
                $isAdmin = true;
                $canAccessDownloads = true;
            } else {
                // Try to decode as user JWT
                try {
                    $decoded = JWT::decode($token, new Key(config('app.jwt_secret'), 'HS256'));
                    $userId = $decoded->user_id ?? null;
                } catch (\Exception $e) {
                    // Invalid token, continue as guest
                }
            }
        }
        
        if ($app && !$isAdmin) {
            // Free apps allow downloads
            if (!$app->price || $app->price == 0) {
                $canAccessDownloads = true;
            } elseif ($userId) {
                // For paid apps, check if user has purchased
                $hasPurchased = Order::where('user_id', $userId)
                    ->where('app_id', $appId)
                    ->whereIn('status', ['paid', 'approved'])
                    ->exists();
                $canAccessDownloads = $hasPurchased;
            }
        }

        $query = AppVersion::with('download_links')
            ->where('app_id', $appId);

        // Non-admin users only see visible versions
        if (!$isAdmin) {
            $query->where('is_visible', true);
        }

        $versions = $query->orderByDesc('is_latest')
            ->orderByDesc('id')
            ->get();

        // If user cannot access downloads, hide the URLs
        if (!$canAccessDownloads) {
            $versions = $versions->map(function ($version) {
                $version->download_url = null;
                $version->download_links = $version->download_links->map(function ($link) {
                    $link->url = null;
                    return $link;
                });
                return $version;
            });
        }

        return response()->json(['versions' => $versions]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'app_id' => 'required|integer|exists:apps,id',
            'version' => 'required|string|max:50',
        ]);

        DB::beginTransaction();
        try {
            // If this is marked as latest, unmark others
            if ($request->is_latest) {
                AppVersion::where('app_id', $request->app_id)
                    ->update(['is_latest' => false]);
            }

            $version = AppVersion::create([
                'app_id' => $request->app_id,
                'version' => $request->version,
                'release_date' => $request->release_date,
                'changelog' => $request->changelog,
                'changelog_km' => $request->changelog_km,
                'file_size' => $request->file_size,
                'download_url' => $request->download_url,
                'is_latest' => $request->is_latest ?? false,
                'is_visible' => $request->is_visible ?? true,
                'min_os_version' => $request->min_os_version,
                'architecture' => $request->architecture,
            ]);

            // Handle download links
            if ($request->has('download_links') && is_array($request->download_links)) {
                foreach ($request->download_links as $link) {
                    if (!empty($link['title']) && !empty($link['url'])) {
                        AppDownloadLink::create([
                            'app_version_id' => $version->id,
                            'title' => $link['title'],
                            'url' => $link['url'],
                            'link_type' => $link['link_type'] ?? 'direct',
                            'sort_order' => $link['sort_order'] ?? 0,
                        ]);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'id' => $version->id,
                'message' => 'Version created successfully',
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to create version: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $version = AppVersion::find($id);

        if (!$version) {
            return response()->json(['error' => 'Version not found'], 404);
        }

        DB::beginTransaction();
        try {
            // If marking as latest, unmark others
            if ($request->is_latest && !$version->is_latest) {
                AppVersion::where('app_id', $version->app_id)
                    ->where('id', '!=', $id)
                    ->update(['is_latest' => false]);
            }

            $version->update([
                'version' => $request->version ?? $version->version,
                'release_date' => $request->release_date ?? $version->release_date,
                'changelog' => $request->changelog ?? $version->changelog,
                'changelog_km' => $request->changelog_km ?? $version->changelog_km,
                'file_size' => $request->file_size ?? $version->file_size,
                'download_url' => $request->download_url ?? $version->download_url,
                'is_latest' => $request->is_latest ?? $version->is_latest,
                'is_visible' => $request->has('is_visible') ? $request->is_visible : $version->is_visible,
                'min_os_version' => $request->min_os_version ?? $version->min_os_version,
                'architecture' => $request->architecture ?? $version->architecture,
            ]);

            // Handle download links if provided
            if ($request->has('download_links') && is_array($request->download_links)) {
                // Get existing link IDs from the request
                $existingIds = collect($request->download_links)
                    ->filter(fn($link) => isset($link['id']))
                    ->pluck('id')
                    ->toArray();

                // Delete links that are no longer in the list
                AppDownloadLink::where('app_version_id', $version->id)
                    ->whereNotIn('id', $existingIds)
                    ->delete();

                // Update or create links
                foreach ($request->download_links as $link) {
                    if (!empty($link['title']) && !empty($link['url'])) {
                        if (isset($link['id'])) {
                            // Update existing link
                            AppDownloadLink::where('id', $link['id'])
                                ->where('app_version_id', $version->id)
                                ->update([
                                    'title' => $link['title'],
                                    'url' => $link['url'],
                                    'link_type' => $link['link_type'] ?? 'direct',
                                    'sort_order' => $link['sort_order'] ?? 0,
                                ]);
                        } else {
                            // Create new link
                            AppDownloadLink::create([
                                'app_version_id' => $version->id,
                                'title' => $link['title'],
                                'url' => $link['url'],
                                'link_type' => $link['link_type'] ?? 'direct',
                                'sort_order' => $link['sort_order'] ?? 0,
                            ]);
                        }
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Version updated successfully',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['error' => 'Failed to update version: ' . $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        $version = AppVersion::find($id);

        if (!$version) {
            return response()->json(['error' => 'Version not found'], 404);
        }

        // Download links will be deleted by cascade
        $version->delete();

        return response()->json([
            'success' => true,
            'message' => 'Version deleted successfully',
        ]);
    }

    public function toggleVisibility($id)
    {
        $version = AppVersion::find($id);

        if (!$version) {
            return response()->json(['error' => 'Version not found'], 404);
        }

        $newValue = !$version->is_visible;
        $version->is_visible = $newValue;
        $version->save();

        return response()->json([
            'success' => true,
            'is_visible' => $newValue,
            'message' => $version->is_visible ? 'Version is now visible' : 'Version is now hidden',
        ]);
    }
}
