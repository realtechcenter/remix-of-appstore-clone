<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AdminUserController extends Controller
{
    /**
     * List all users with pagination
     */
    public function index(Request $request)
    {
        $query = User::query();
        
        if ($request->search) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                  ->orWhere('full_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }
        
        $perPage = $request->limit ?? 20;
        $users = $query->withCount(['orders as paid_orders_count' => function($q) {
            $q->where('status', 'paid');
        }])
        ->orderBy('created_at', 'desc')
        ->paginate($perPage);
        
        return response()->json([
            'users' => $users->items(),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'total_pages' => $users->lastPage(),
                'total' => $users->total(),
                'per_page' => $users->perPage(),
            ],
        ]);
    }

    /**
     * Get a single user with their orders
     */
    public function show($id)
    {
        $user = User::with(['orders' => function($q) {
            $q->orderBy('created_at', 'desc');
        }])->findOrFail($id);
        
        return response()->json([
            'user' => $user,
            'orders' => $user->orders,
        ]);
    }

    /**
     * Get user's orders/purchase history
     */
    public function orders($id)
    {
        $user = User::findOrFail($id);
        
        $orders = Order::where('user_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();
        
        return response()->json([
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'full_name' => $user->full_name,
            ],
            'orders' => $orders,
        ]);
    }

    /**
     * Grant app access to a user (create a paid order)
     */
    public function grantApp(Request $request, $userId)
    {
        $request->validate([
            'app_id' => 'required|integer',
            'app_name' => 'required|string',
            'amount' => 'nullable|numeric|min:0',
        ]);
        
        $user = User::findOrFail($userId);
        
        // Check if already has access
        $existingPaid = Order::where('user_id', $userId)
            ->where('app_id', $request->app_id)
            ->where('status', 'paid')
            ->first();
        
        if ($existingPaid) {
            return response()->json([
                'error' => 'User already has access to this app',
            ], 400);
        }
        
        // Create a paid order (granted by admin)
        $order = Order::create([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'app_id' => $request->app_id,
            'app_name' => $request->app_name,
            'amount' => $request->amount ?? 0,
            'currency' => 'USD',
            'status' => 'paid',
            'paid_at' => now(),
            'bakong_transaction_id' => 'ADMIN_GRANTED_' . time(),
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'App access granted successfully',
            'order' => $order,
        ]);
    }

    /**
     * Revoke app access from a user
     */
    public function revokeApp(Request $request, $userId, $appId)
    {
        $user = User::findOrFail($userId);
        
        $order = Order::where('user_id', $userId)
            ->where('app_id', $appId)
            ->where('status', 'paid')
            ->first();
        
        if (!$order) {
            return response()->json([
                'error' => 'User does not have access to this app',
            ], 404);
        }
        
        // Delete the order to revoke access
        $order->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'App access revoked successfully',
        ]);
    }

    /**
     * Manually approve a pending or expired order
     */
    public function approveOrder(Request $request, $orderId)
    {
        $order = Order::findOrFail($orderId);
        
        if ($order->status === 'paid') {
            return response()->json([
                'error' => 'Order is already paid',
            ], 400);
        }
        
        $order->update([
            'status' => 'paid',
            'paid_at' => now(),
            'bakong_transaction_id' => 'ADMIN_APPROVED_' . time(),
        ]);
        
        return response()->json([
            'success' => true,
            'message' => 'Order approved successfully',
            'order' => $order,
        ]);
    }

    /**
     * Delete an order
     */
    public function deleteOrder(Request $request, $orderId)
    {
        $order = Order::findOrFail($orderId);
        
        $order->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Order deleted successfully',
        ]);
    }

    /**
     * Get all orders (payment history) across all users
     */
    public function allOrders(Request $request)
    {
        $query = Order::with(['user:id,email,full_name']);
        
        if ($request->status) {
            $query->where('status', $request->status);
        }
        
        if ($request->user_id) {
            $query->where('user_id', $request->user_id);
        }
        
        $perPage = $request->limit ?? 20;
        $orders = $query->orderBy('created_at', 'desc')->paginate($perPage);
        
        return response()->json([
            'orders' => $orders->items(),
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'total_pages' => $orders->lastPage(),
                'total' => $orders->total(),
                'per_page' => $orders->perPage(),
            ],
        ]);
    }
}
