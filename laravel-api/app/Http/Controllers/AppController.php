<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\AppScreenshot;
use App\Models\AppVideo;
use App\Models\Order;
use App\Traits\LogsAdminActivity;
use Illuminate\Http\Request;

class AppController extends Controller
{
    use LogsAdminActivity;

    public function index(Request $request)
    {
        $query = App::with(['versions' => function ($q) {
            $q->where('is_latest', true);
        }, 'screenshots']);

        // Filter by category
        if ($request->has('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        // Search
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('name_km', 'like', "%{$search}%")
                  ->orWhere('developer', 'like', "%{$search}%");
            });
        }

        // Featured filter
        if ($request->has('featured') && $request->featured === 'true') {
            $query->where('is_featured', true);
        }

        // Popular filter
        if ($request->has('popular') && $request->popular === 'true') {
            $query->where('is_popular', true);
        }

        // Price range filters
        if ($request->has('min_price') && is_numeric($request->min_price)) {
            $query->where('price', '>=', (float) $request->min_price);
        }

        if ($request->has('max_price') && is_numeric($request->max_price)) {
            $query->where('price', '<=', (float) $request->max_price);
        }

        // Free only filter
        if ($request->has('free_only') && $request->free_only === 'true') {
            $query->where(function ($q) {
                $q->whereNull('price')->orWhere('price', 0);
            });
        }

        // Pagination
        $page = (int) ($request->page ?? 1);
        $limit = (int) ($request->limit ?? 20);
        $offset = ($page - 1) * $limit;

        $total = $query->count();
        $apps = $query->skip($offset)->take($limit)->get();

        // Compute real download counts from paid orders using app_name
        $appNames = $apps->pluck('name')->filter()->unique()->values()->all();
        $orderCounts = \DB::table('orders')
            ->whereIn('app_name', $appNames)
            ->where('status', 'paid')
            ->selectRaw('app_name, COUNT(*) as cnt')
            ->groupBy('app_name')
            ->pluck('cnt', 'app_name');

        // For app list, always hide download URLs (security)
        $apps = $apps->map(function ($app) use ($orderCounts) {
            $count = (int) ($orderCounts[$app->name] ?? 0);
            $app->setAttribute('download_count', $count);
            $app->download_count = $count;
            if ($app->versions) {
                $app->versions = $app->versions->map(function ($version) {
                    $version->download_url = null;
                    return $version;
                });
            }
            return $app;
        });

        return response()->json([
            'apps' => $apps,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'total_pages' => ceil($total / $limit),
            ],
        ]);
    }

    public function show(Request $request, $id)
    {
        $app = App::with(['versions.download_links', 'screenshots', 'videos'])->find($id);

        if (!$app) {
            return response()->json(['error' => 'App not found'], 404);
        }

        // Check if user has access to download URLs
        $canAccessDownloads = false;
        
        // Check if request is from admin (admin can always access all data)
        $token = $request->bearerToken();
        if ($token) {
            $admin = \App\Models\Admin::where('auth_token', $token)
                ->where('token_expiry', '>', now())
                ->first();
            if ($admin) {
                $canAccessDownloads = true;
            }
        }

        // Free apps allow downloads
        if (!$canAccessDownloads && (!$app->price || $app->price == 0)) {
            $canAccessDownloads = true;
        }
        
        if (!$canAccessDownloads) {
            // For paid apps, verify user authentication via JWT token
            if ($token) {
                try {
                    $decoded = \Firebase\JWT\JWT::decode($token, new \Firebase\JWT\Key(config('app.jwt_secret'), 'HS256'));
                    $userId = $decoded->user_id;
                    
                    $hasPurchased = Order::where('user_id', $userId)
                        ->where('app_id', $id)
                        ->whereIn('status', ['paid', 'approved'])
                        ->exists();
                    $canAccessDownloads = $hasPurchased;
                } catch (\Exception $e) {
                    $canAccessDownloads = false;
                }
            }
        }

        // If user cannot access downloads, hide the URLs and videos
        if (!$canAccessDownloads && $app->versions) {
            $app->versions = $app->versions->map(function ($version) {
                $version->download_url = null;
                if ($version->download_links) {
                    $version->download_links = $version->download_links->map(function ($link) {
                        $link->url = null;
                        return $link;
                    });
                }
                return $version;
            });
            // Hide videos for paid apps that user hasn't purchased
            $app->setRelation('videos', collect([]));
        }

        // Compute real download count from paid orders
        // Compute real download count from paid orders using app_name
        $realCount = (int) \DB::table('orders')
            ->where('app_name', $app->name)
            ->where('status', 'paid')
            ->count();
        $app->setAttribute('download_count', $realCount);
        $app->download_count = $realCount;

        return response()->json(['app' => $app]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|in:programs,games,extensions,os',
        ]);

        $app = App::create([
            'name' => $request->name,
            'name_km' => $request->name_km,
            'description' => $request->description,
            'description_km' => $request->description_km,
            'category' => $request->category,
            'icon_url' => $request->icon_url,
            'developer' => $request->developer,
            'website' => $request->website,
            'is_featured' => $request->is_featured ?? false,
            'is_popular' => $request->is_popular ?? false,
            'price' => $request->price,
        ]);

        // Handle screenshots
        if ($request->has('screenshots') && is_array($request->screenshots)) {
            foreach ($request->screenshots as $index => $url) {
                AppScreenshot::create([
                    'app_id' => $app->id,
                    'image_url' => $url,
                    'sort_order' => $index,
                ]);
            }
        }

        // Handle videos
        if ($request->has('videos') && is_array($request->videos)) {
            foreach ($request->videos as $index => $video) {
                AppVideo::create([
                    'app_id' => $app->id,
                    'title' => $video['title'] ?? '',
                    'youtube_url' => $video['youtube_url'] ?? '',
                    'sort_order' => $index,
                ]);
            }
        }

        $this->logActivity($request, 'app_create', [
            'app_id' => $app->id,
            'app_name' => $app->name,
        ]);

        return response()->json([
            'success' => true,
            'id' => $app->id,
            'message' => 'App created successfully',
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $app = App::find($id);

        if (!$app) {
            return response()->json(['error' => 'App not found'], 404);
        }

        $app->update([
            'name' => $request->name ?? $app->name,
            'name_km' => $request->name_km ?? $app->name_km,
            'description' => $request->description ?? $app->description,
            'description_km' => $request->description_km ?? $app->description_km,
            'category' => $request->category ?? $app->category,
            'icon_url' => $request->icon_url ?? $app->icon_url,
            'developer' => $request->developer ?? $app->developer,
            'website' => $request->website ?? $app->website,
            'is_featured' => $request->is_featured ?? $app->is_featured,
            'is_popular' => $request->is_popular ?? $app->is_popular,
            'price' => $request->price ?? $app->price,
        ]);

        // Handle screenshots update
        if ($request->has('screenshots') && is_array($request->screenshots)) {
            $app->screenshots()->delete();
            foreach ($request->screenshots as $index => $url) {
                AppScreenshot::create([
                    'app_id' => $app->id,
                    'image_url' => $url,
                    'sort_order' => $index,
                ]);
            }
        }

        // Handle videos update
        if ($request->has('videos') && is_array($request->videos)) {
            $app->videos()->delete();
            foreach ($request->videos as $index => $video) {
                AppVideo::create([
                    'app_id' => $app->id,
                    'title' => $video['title'] ?? '',
                    'youtube_url' => $video['youtube_url'] ?? '',
                    'sort_order' => $index,
                ]);
            }
        }

        $this->logActivity($request, 'app_update', [
            'app_id' => $app->id,
            'app_name' => $app->name,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'App updated successfully',
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $app = App::find($id);

        if (!$app) {
            return response()->json(['error' => 'App not found'], 404);
        }

        $appName = $app->name;
        $app->delete();

        $this->logActivity($request, 'app_delete', [
            'app_id' => $id,
            'app_name' => $appName,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'App deleted successfully',
        ]);
    }
}
