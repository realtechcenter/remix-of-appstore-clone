<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use App\Models\UserCoupon;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CouponController extends Controller
{
    // Admin: Get all coupons
    public function index(Request $request)
    {
        $coupons = Coupon::withCount(['userCoupons', 'userCoupons as used_count' => function ($q) {
            $q->where('is_used', true);
        }])->orderBy('created_at', 'desc')->get();

        return response()->json(['coupons' => $coupons]);
    }

    // Admin: Create coupon
    public function store(Request $request)
    {
        $validated = $request->validate([
            'code' => 'nullable|string|max:50|unique:coupons,code',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'discount_type' => 'required|in:fixed,percentage',
            'discount_value' => 'required|numeric|min:0.01',
            'min_price' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'expires_at' => 'nullable|date',
            'is_active' => 'boolean',
        ]);

        // Generate code if not provided
        if (empty($validated['code'])) {
            $validated['code'] = strtoupper(Str::random(8));
        }

        $coupon = Coupon::create($validated);

        return response()->json(['coupon' => $coupon, 'message' => 'Coupon created successfully']);
    }

    // Admin: Update coupon
    public function update(Request $request, $id)
    {
        $coupon = Coupon::findOrFail($id);

        $validated = $request->validate([
            'code' => 'nullable|string|max:50|unique:coupons,code,' . $id,
            'name' => 'string|max:255',
            'description' => 'nullable|string',
            'discount_type' => 'in:fixed,percentage',
            'discount_value' => 'numeric|min:0.01',
            'min_price' => 'nullable|numeric|min:0',
            'max_discount' => 'nullable|numeric|min:0',
            'expires_at' => 'nullable|date',
            'is_active' => 'boolean',
        ]);

        $coupon->update($validated);

        return response()->json(['coupon' => $coupon, 'message' => 'Coupon updated successfully']);
    }

    // Admin: Delete coupon
    public function destroy($id)
    {
        $coupon = Coupon::findOrFail($id);
        $coupon->delete();

        return response()->json(['message' => 'Coupon deleted successfully']);
    }

    // Admin: Assign coupon to users
    public function assignToUsers(Request $request, $id)
    {
        $coupon = Coupon::findOrFail($id);

        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $assigned = 0;
        foreach ($validated['user_ids'] as $userId) {
            // Check if user already has this coupon
            $exists = UserCoupon::where('user_id', $userId)
                ->where('coupon_id', $coupon->id)
                ->exists();

            if (!$exists) {
                UserCoupon::create([
                    'user_id' => $userId,
                    'coupon_id' => $coupon->id,
                ]);
                $assigned++;
            }
        }

        return response()->json([
            'message' => "Coupon assigned to {$assigned} user(s)",
            'assigned_count' => $assigned,
        ]);
    }

    // Admin: Get users with specific coupon
    public function getCouponUsers($id)
    {
        $coupon = Coupon::findOrFail($id);
        
        $userCoupons = UserCoupon::where('coupon_id', $id)
            ->with('user:id,name,email')
            ->get();

        return response()->json(['user_coupons' => $userCoupons]);
    }

    // Admin: Remove coupon from user
    public function removeFromUser(Request $request, $couponId, $userId)
    {
        UserCoupon::where('coupon_id', $couponId)
            ->where('user_id', $userId)
            ->delete();

        return response()->json(['message' => 'Coupon removed from user']);
    }

    // User: Get my available coupons
    public function myAvailableCoupons(Request $request)
    {
        $user = $request->user();

        $coupons = UserCoupon::where('user_id', $user->id)
            ->where('is_used', false)
            ->with(['coupon' => function ($q) {
                $q->where('is_active', true)
                    ->where(function ($q2) {
                        $q2->whereNull('expires_at')
                            ->orWhere('expires_at', '>', now());
                    });
            }])
            ->get()
            ->filter(fn($uc) => $uc->coupon !== null)
            ->map(fn($uc) => [
                'id' => $uc->id,
                'coupon' => $uc->coupon,
            ]);

        return response()->json(['coupons' => $coupons->values()]);
    }

    // User: Get coupons applicable for a specific app price
    public function getApplicableCoupons(Request $request)
    {
        $user = $request->user();
        $price = $request->query('price', 0);

        $coupons = UserCoupon::where('user_id', $user->id)
            ->where('is_used', false)
            ->with(['coupon' => function ($q) use ($price) {
                $q->where('is_active', true)
                    ->where('min_price', '<=', $price)
                    ->where(function ($q2) {
                        $q2->whereNull('expires_at')
                            ->orWhere('expires_at', '>', now());
                    });
            }])
            ->get()
            ->filter(fn($uc) => $uc->coupon !== null)
            ->map(fn($uc) => [
                'id' => $uc->id,
                'coupon' => $uc->coupon,
                'discount_amount' => $uc->coupon->calculateDiscount($price),
            ]);

        return response()->json(['coupons' => $coupons->values()]);
    }

    // User: Apply coupon to order
    public function applyCoupon(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'user_coupon_id' => 'required|uuid',
            'order_id' => 'required|uuid',
        ]);

        $userCoupon = UserCoupon::where('id', $validated['user_coupon_id'])
            ->where('user_id', $user->id)
            ->where('is_used', false)
            ->with('coupon')
            ->first();

        if (!$userCoupon) {
            return response()->json(['error' => 'Coupon not found or already used'], 404);
        }

        if (!$userCoupon->coupon->isValid()) {
            return response()->json(['error' => 'Coupon is expired or inactive'], 400);
        }

        // Mark coupon as used
        $userCoupon->update([
            'is_used' => true,
            'used_on_order_id' => $validated['order_id'],
            'used_at' => now(),
        ]);

        return response()->json([
            'message' => 'Coupon applied successfully',
            'discount' => $userCoupon->coupon->calculateDiscount($request->input('price', 0)),
        ]);
    }
}
