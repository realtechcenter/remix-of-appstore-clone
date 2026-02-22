<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function dashboard(Request $request)
    {
        // Support from/to date range or fallback to days parameter
        $from = $request->input('from');
        $to = $request->input('to');

        if ($from && $to) {
            $startDate = \Carbon\Carbon::parse($from)->startOfDay();
            $endDate = \Carbon\Carbon::parse($to)->endOfDay();
        } else {
            $days = $request->input('days', 30);
            $startDate = now()->subDays($days)->startOfDay();
            $endDate = now()->endOfDay();
        }

        // Get order statistics
        $orders = Order::where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate)
            ->get();
        $paidOrders = $orders->where('status', 'paid');

        // Get user statistics
        $totalUsers = User::count();
        $newUsers = User::where('created_at', '>=', $startDate)->where('created_at', '<=', $endDate)->count();

        // Calculate stats
        $stats = [
            'total_users' => $totalUsers,
            'new_users' => $newUsers,
            'total_orders' => $orders->count(),
            'paid_orders' => $paidOrders->count(),
            'total_revenue' => $paidOrders->sum('amount'),
            'avg_order_value' => $paidOrders->count() > 0 ? $paidOrders->sum('amount') / $paidOrders->count() : 0,
            'conversion_rate' => $orders->count() > 0 ? ($paidOrders->count() / $orders->count()) * 100 : 0,
        ];

        // Revenue by date
        $revenueByDate = Order::where('status', 'paid')
            ->where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate)
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(amount) as revenue'),
                DB::raw('COUNT(*) as orders')
            )
            ->groupBy(DB::raw('DATE(created_at)'))
            ->orderBy('date')
            ->get();

        // Orders by status
        $ordersByStatus = Order::where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->get();

        // Recent orders
        $recentOrders = Order::with('user:id,email,full_name')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // Top apps by revenue
        $topApps = Order::where('status', 'paid')
            ->where('created_at', '>=', $startDate)
            ->where('created_at', '<=', $endDate)
            ->select('app_id', 'app_name', DB::raw('SUM(amount) as revenue'), DB::raw('COUNT(*) as sales'))
            ->groupBy('app_id', 'app_name')
            ->orderByDesc('revenue')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'stats' => $stats,
            'revenue_by_date' => $revenueByDate,
            'orders_by_status' => $ordersByStatus,
            'recent_orders' => $recentOrders,
            'top_apps' => $topApps,
        ]);
    }
}