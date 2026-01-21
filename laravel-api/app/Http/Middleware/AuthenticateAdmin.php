<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;

class AuthenticateAdmin
{
    public function handle(Request $request, Closure $next)
    {
        $token = $request->bearerToken();

        if (!$token) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $admin = Admin::where('auth_token', $token)
            ->where('token_expiry', '>', now())
            ->first();

        if (!$admin) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $request->setUserResolver(function () use ($admin) {
            return $admin;
        });

        return $next($request);
    }
}
