<?php

namespace App\Http\Controllers;

use App\Models\UserActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request)
    {
        $days = $request->input('days', 7);
        $action = $request->input('action');
        $limit = $request->input('limit', 100);

        $query = UserActivityLog::with('user:id,email,full_name')
            ->where('created_at', '>=', now()->subDays($days))
            ->orderBy('created_at', 'desc');

        if ($action && $action !== 'all') {
            $query->where('action', $action);
        }

        $logs = $query->limit($limit)->get();

        // Get unique actions for filter
        $uniqueActions = UserActivityLog::where('created_at', '>=', now()->subDays($days))
            ->distinct()
            ->pluck('action');

        // Get stats
        $stats = [
            'total' => $logs->count(),
            'logins' => $logs->where('action', 'login')->count(),
            'purchases' => $logs->where('action', 'purchase')->count(),
            'downloads' => $logs->where('action', 'download')->count(),
        ];

        return response()->json([
            'success' => true,
            'logs' => $logs,
            'actions' => $uniqueActions,
            'stats' => $stats,
        ]);
    }

    public function store(Request $request)
    {
        $log = UserActivityLog::create([
            'user_id' => $request->user_id,
            'action' => $request->action,
            'details' => $request->details,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'success' => true,
            'log' => $log,
        ]);
    }
}