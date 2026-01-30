<?php

namespace App\Http\Controllers;

use App\Models\App;
use App\Models\AppScreenshot;
use App\Models\Order;
use Illuminate\Http\Request;

class AppController extends Controller
{
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

        // For app list, always hide download URLs (security)
        $apps = $apps->map(function ($app) {
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
        $app = App::with(['versions.download_links', 'screenshots'])->find($id);

        if (!$app) {
            return response()->json(['error' => 'App not found'], 404);
        }

        // Check if user has access to download URLs
        $canAccessDownloads = false;
        
        // Free apps allow downloads
        if (!$app->price || $app->price == 0) {
            $canAccessDownloads = true;
        } else {
            // For paid apps, verify user authentication via JWT token
            $token = $request->bearerToken();
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
                    // Invalid or missing token - user cannot access paid downloads
                    $canAccessDownloads = false;
                }
            }
        }

        // If user cannot access downloads, hide the URLs
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
        }

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

        return response()->json([
            'success' => true,
            'message' => 'App updated successfully',
        ]);
    }

    public function destroy($id)
    {
        $app = App::find($id);

        if (!$app) {
            return response()->json(['error' => 'App not found'], 404);
        }

        $app->delete();

        return response()->json([
            'success' => true,
            'message' => 'App deleted successfully',
        ]);
    }
}
