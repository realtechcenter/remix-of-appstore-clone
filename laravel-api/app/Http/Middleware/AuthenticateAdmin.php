<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthenticateAdmin
{
    /**
     * Handle an incoming request.
     * Accepts both legacy admin tokens and user JWT tokens (for users with admin/moderator roles).
     * 
     * Pass 'admin_only' as parameter to restrict to admin role only.
     * Pass 'admin_or_moderator' (default) to allow both.
     */
    public function handle(Request $request, Closure $next, string $level = 'admin_or_moderator')
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        // First, try legacy admin token
        $admin = Admin::where('auth_token', $token)
            ->where('token_expiry', '>', now())
            ->first();

        if ($admin) {
            $request->setUserResolver(function () use ($admin) {
                return $admin;
            });
            // Legacy admin has full access
            $request->attributes->set('admin_role', 'admin');
            return $next($request);
        }

        // Try user JWT token
        try {
            $decoded = JWT::decode($token, new Key(config('app.jwt_secret'), 'HS256'));
            
            $user = User::with(['roles', 'status'])->find($decoded->user_id);

            if (!$user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            // Check if user is banned or suspended
            if ($user->status) {
                if ($user->status->status === 'banned') {
                    return response()->json(['error' => 'Your account has been banned.', 'status' => 'banned'], 403);
                }
                if ($user->status->status === 'suspended' && $user->status->suspended_until && now()->lt($user->status->suspended_until)) {
                    return response()->json(['error' => 'Your account is suspended.', 'status' => 'suspended'], 403);
                }
            }

            // Check user roles
            $userRoles = $user->roles->pluck('role')->toArray();
            $isAdmin = in_array('admin', $userRoles);
            $isModerator = in_array('moderator', $userRoles);

            if ($level === 'admin_only' && !$isAdmin) {
                return response()->json(['error' => 'Admin access required'], 403);
            }

            if (!$isAdmin && !$isModerator) {
                return response()->json(['error' => 'You do not have permission to access this resource'], 403);
            }

            $request->setUserResolver(function () use ($user) {
                return $user;
            });
            $request->attributes->set('admin_role', $isAdmin ? 'admin' : 'moderator');

            return $next($request);

        } catch (\Exception $e) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
    }
}
