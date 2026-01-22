<?php

namespace App\Http\Controllers;

use App\Models\UserStatus;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class UserStatusController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->input('status');

        // Get all users with their status
        $users = User::select('id', 'email', 'full_name', 'created_at')
            ->with('status')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($user) {
                return [
                    'user_id' => $user->id,
                    'full_name' => $user->full_name,
                    'email' => $user->email,
                    'created_at' => $user->created_at,
                    'status' => $user->status ? [
                        'id' => $user->status->id,
                        'status' => $user->status->status,
                        'reason' => $user->status->reason,
                        'suspended_until' => $user->status->suspended_until,
                        'updated_at' => $user->status->updated_at,
                    ] : null,
                ];
            });

        // Filter by status if specified
        if ($status && $status !== 'all') {
            $users = $users->filter(function ($user) use ($status) {
                if ($status === 'active') {
                    return !$user['status'] || $user['status']['status'] === 'active';
                }
                return $user['status'] && $user['status']['status'] === $status;
            })->values();
        }

        // Get counts
        $allUsers = User::with('status')->get();
        $stats = [
            'active' => $allUsers->filter(fn($u) => !$u->status || $u->status->status === 'active')->count(),
            'suspended' => $allUsers->filter(fn($u) => $u->status && $u->status->status === 'suspended')->count(),
            'banned' => $allUsers->filter(fn($u) => $u->status && $u->status->status === 'banned')->count(),
        ];

        return response()->json([
            'success' => true,
            'users' => $users,
            'stats' => $stats,
        ]);
    }

    public function update(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'status' => 'required|in:active,suspended,banned',
            'reason' => 'nullable|string',
            'suspended_until' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $adminId = $request->attributes->get('admin_id');

        $userStatus = UserStatus::updateOrCreate(
            ['user_id' => $request->user_id],
            [
                'status' => $request->status,
                'reason' => $request->reason,
                'suspended_until' => $request->status === 'suspended' ? $request->suspended_until : null,
                'updated_by' => $adminId,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => 'User status updated successfully',
            'status' => $userStatus,
        ]);
    }
}