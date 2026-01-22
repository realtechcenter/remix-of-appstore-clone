<?php

namespace App\Http\Controllers;

use App\Models\UserRole;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        $roles = UserRole::with('user:id,email,full_name')
            ->orderBy('created_at', 'desc')
            ->get();

        // Group by user
        $usersWithRoles = $roles->groupBy('user_id')->map(function ($userRoles) {
            $firstRole = $userRoles->first();
            return [
                'user_id' => $firstRole->user_id,
                'full_name' => $firstRole->user->full_name ?? null,
                'email' => $firstRole->user->email ?? null,
                'roles' => $userRoles->pluck('role')->toArray(),
            ];
        })->values();

        return response()->json([
            'success' => true,
            'users' => $usersWithRoles,
        ]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'role' => 'required|in:admin,moderator,user',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        // Check if already exists
        $existing = UserRole::where('user_id', $request->user_id)
            ->where('role', $request->role)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'User already has this role'], 422);
        }

        $role = UserRole::create([
            'user_id' => $request->user_id,
            'role' => $request->role,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Role assigned successfully',
            'role' => $role,
        ]);
    }

    public function destroy(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'role' => 'required|in:admin,moderator,user',
        ]);

        if ($validator->fails()) {
            return response()->json(['error' => $validator->errors()->first()], 422);
        }

        $deleted = UserRole::where('user_id', $request->user_id)
            ->where('role', $request->role)
            ->delete();

        if (!$deleted) {
            return response()->json(['error' => 'Role not found'], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Role removed successfully',
        ]);
    }
}