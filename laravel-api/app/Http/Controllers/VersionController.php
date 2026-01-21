<?php

namespace App\Http\Controllers;

use App\Models\AppVersion;
use Illuminate\Http\Request;

class VersionController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'app_id' => 'required|integer',
        ]);

        $versions = AppVersion::where('app_id', $request->app_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['versions' => $versions]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'app_id' => 'required|integer|exists:apps,id',
            'version' => 'required|string|max:50',
            'download_url' => 'required|string|max:500',
        ]);

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
            'min_os_version' => $request->min_os_version,
        ]);

        return response()->json([
            'success' => true,
            'id' => $version->id,
            'message' => 'Version created successfully',
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $version = AppVersion::find($id);

        if (!$version) {
            return response()->json(['error' => 'Version not found'], 404);
        }

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
            'min_os_version' => $request->min_os_version ?? $version->min_os_version,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Version updated successfully',
        ]);
    }

    public function destroy($id)
    {
        $version = AppVersion::find($id);

        if (!$version) {
            return response()->json(['error' => 'Version not found'], 404);
        }

        $version->delete();

        return response()->json([
            'success' => true,
            'message' => 'Version deleted successfully',
        ]);
    }
}
