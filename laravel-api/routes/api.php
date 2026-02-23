<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AppController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\VersionController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\OtpController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\UserStatusController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\AppSubmissionController;
use App\Http\Controllers\AIChatController;
use App\Http\Controllers\ReceiptController;
use App\Http\Controllers\MailTestController;
use App\Http\Controllers\CouponController;
use App\Http\Controllers\SystemSettingController;
use App\Http\Controllers\BunnyStorageController;
use App\Http\Controllers\DownloadController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [UserController::class, 'register']);
Route::post('/users/login', [UserController::class, 'login']);

// OTP routes (public)
Route::post('/otp/send-registration', [OtpController::class, 'sendRegistrationOtp']);
Route::post('/otp/verify-registration', [OtpController::class, 'verifyRegistrationOtp']);
Route::post('/otp/send-password-reset', [OtpController::class, 'sendPasswordResetOtp']);
Route::post('/otp/verify-password-reset', [OtpController::class, 'verifyPasswordResetOtp']);
Route::post('/otp/verify-reset-code', [OtpController::class, 'verifyResetCode']);
Route::post('/otp/resend', [OtpController::class, 'resendOtp']);

// Apps (public read)
Route::get('/apps', [AppController::class, 'index']);
Route::get('/apps/{id}', [AppController::class, 'show']);
Route::get('/versions', [VersionController::class, 'index']);

// Public maintenance check
Route::get('/admin/settings/maintenance', [SystemSettingController::class, 'maintenanceStatus']);

Route::post('/ai/chat', [AIChatController::class, 'chat']);
Route::post('/ai/chat/stream', [AIChatController::class, 'streamChat']);

// Protected admin routes (admin + moderator)
Route::middleware('auth.admin')->group(function () {
    // App management (moderators can create/edit but NOT delete)
    Route::post('/apps', [AppController::class, 'store']);
    Route::put('/apps/{id}', [AppController::class, 'update']);
    
    Route::post('/versions', [VersionController::class, 'store']);
    Route::put('/versions/{id}', [VersionController::class, 'update']);
    Route::patch('/versions/{id}/toggle-visibility', [VersionController::class, 'toggleVisibility']);
    
    Route::post('/upload', [UploadController::class, 'store']);
    
    // Notifications (moderators can manage)
    Route::get('/admin/notifications', [NotificationController::class, 'index']);
    Route::post('/admin/notifications', [NotificationController::class, 'store']);
    Route::put('/admin/notifications/{id}', [NotificationController::class, 'update']);
    Route::delete('/admin/notifications/{id}', [NotificationController::class, 'destroy']);
    
    // App submissions/review (moderators can review)
    Route::get('/admin/submissions', [AppSubmissionController::class, 'index']);
    Route::put('/admin/submissions/{id}', [AppSubmissionController::class, 'update']);
    
    // Activity logs (moderators can view)
    Route::get('/admin/activity-logs', [ActivityLogController::class, 'index']);

    // Bunny Storage
    Route::get('/bunny/config', [BunnyStorageController::class, 'config']);
    Route::put('/bunny/config', [BunnyStorageController::class, 'updateConfig']);
    Route::get('/bunny/test', [BunnyStorageController::class, 'test']);
    Route::get('/bunny/credentials', [BunnyStorageController::class, 'credentials']);
    Route::get('/bunny/files', [BunnyStorageController::class, 'listFiles']);
    Route::post('/bunny/files/upload', [BunnyStorageController::class, 'uploadFile']);
    Route::post('/bunny/files/folder', [BunnyStorageController::class, 'createFolder']);
    Route::delete('/bunny/files', [BunnyStorageController::class, 'deleteFile']);
});

// Admin-only routes (no moderator access)
Route::middleware('auth.admin:admin_only')->group(function () {
    // App deletion (admin only)
    Route::delete('/apps/{id}', [AppController::class, 'destroy']);
    Route::delete('/versions/{id}', [VersionController::class, 'destroy']);
    
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    
    // Admin user management
    Route::get('/admin/users', [AdminUserController::class, 'index']);
    Route::get('/admin/users/{id}', [AdminUserController::class, 'show']);
    Route::get('/admin/users/{id}/orders', [AdminUserController::class, 'orders']);
    Route::post('/admin/users/{id}/grant-app', [AdminUserController::class, 'grantApp']);
    Route::delete('/admin/users/{userId}/revoke-app/{appId}', [AdminUserController::class, 'revokeApp']);
    Route::get('/admin/orders', [AdminUserController::class, 'allOrders']);
    Route::post('/admin/orders/{orderId}/approve', [AdminUserController::class, 'approveOrder']);
    Route::delete('/admin/orders/{orderId}', [AdminUserController::class, 'deleteOrder']);
    Route::post('/admin/orders/bulk-delete', [AdminUserController::class, 'bulkDeleteOrders']);
    
    // Analytics
    Route::get('/admin/analytics', [AnalyticsController::class, 'dashboard']);
    
    // Roles management
    Route::get('/admin/roles', [RoleController::class, 'index']);
    Route::post('/admin/roles', [RoleController::class, 'store']);
    Route::delete('/admin/roles', [RoleController::class, 'destroy']);
    
    // Permissions management
    Route::get('/admin/permissions', [RoleController::class, 'permissions']);
    Route::post('/admin/permissions/role', [RoleController::class, 'createRole']);
    Route::put('/admin/permissions/role', [RoleController::class, 'updateRolePermissions']);
    Route::delete('/admin/permissions/role/{role}', [RoleController::class, 'deleteRole']);
    
    // User status (ban/suspend)
    Route::get('/admin/user-status', [UserStatusController::class, 'index']);
    Route::post('/admin/user-status', [UserStatusController::class, 'update']);
    
    // Admin receipts
    Route::get('/admin/receipts', [ReceiptController::class, 'adminIndex']);
    
    // Coupon management
    Route::get('/admin/coupons', [CouponController::class, 'index']);
    Route::post('/admin/coupons', [CouponController::class, 'store']);
    Route::put('/admin/coupons/{id}', [CouponController::class, 'update']);
    Route::delete('/admin/coupons/{id}', [CouponController::class, 'destroy']);
    Route::post('/admin/coupons/{id}/assign', [CouponController::class, 'assignToUsers']);
    Route::get('/admin/coupons/{id}/users', [CouponController::class, 'getCouponUsers']);
    Route::delete('/admin/coupons/{couponId}/users/{userId}', [CouponController::class, 'removeFromUser']);

    // Mail test routes (admin-protected)
    Route::post('/test/send-receipt-email', [MailTestController::class, 'testReceiptEmail']);
    Route::get('/test/mail-config', [MailTestController::class, 'testMailConfig']);

    // System settings
    Route::get('/admin/settings', [SystemSettingController::class, 'index']);
    Route::put('/admin/settings', [SystemSettingController::class, 'update']);
});

// Protected user routes
Route::middleware('auth.user')->group(function () {
    Route::get('/users/me', [UserController::class, 'me']);
    Route::put('/users/profile', [UserController::class, 'updateProfile']);
    Route::post('/users/change-password', [UserController::class, 'changePassword']);
    Route::get('/users/permissions', [RoleController::class, 'myPermissions']);
    Route::post('/users/upload-avatar', [UploadController::class, 'uploadAvatar']);
    
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/purchased', [OrderController::class, 'hasPurchased']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::put('/orders/{id}/confirm', [OrderController::class, 'confirm']);
    
    // Receipts
    Route::get('/receipts', [ReceiptController::class, 'index']);
    Route::get('/receipts/{id}', [ReceiptController::class, 'show']);
    Route::post('/receipts/{id}/resend', [ReceiptController::class, 'resend']);
    
    // User notifications
    Route::get('/notifications', [NotificationController::class, 'userNotifications']);
    
    // App submission by users
    Route::post('/submissions', [AppSubmissionController::class, 'store']);
    
    // Activity tracking (download)
    Route::post('/track-download', [ActivityLogController::class, 'trackDownload']);
    
    // Secure download with signed URLs
    Route::post('/download/signed-url', [DownloadController::class, 'generateSignedUrl']);
    
    // User coupons
    Route::get('/coupons/my', [CouponController::class, 'myAvailableCoupons']);
    Route::get('/coupons/applicable', [CouponController::class, 'getApplicableCoupons']);
    Route::post('/coupons/apply', [CouponController::class, 'applyCoupon']);
});

// Payment routes (need user auth for some, public for webhooks)
Route::post('/payment/generate-qr', [PaymentController::class, 'generateQr'])->middleware('auth.user');
Route::post('/payment/verify', [PaymentController::class, 'verify'])->middleware('auth.user');
Route::post('/payment/confirm-manual', [PaymentController::class, 'confirmManual'])->middleware('auth.user');
Route::post('/payment/webhook', [PaymentController::class, 'webhook']); // Public webhook
