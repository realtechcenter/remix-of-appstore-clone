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

// Protected admin routes
Route::middleware('auth.admin')->group(function () {
    Route::post('/apps', [AppController::class, 'store']);
    Route::put('/apps/{id}', [AppController::class, 'update']);
    Route::delete('/apps/{id}', [AppController::class, 'destroy']);
    
    Route::post('/versions', [VersionController::class, 'store']);
    Route::put('/versions/{id}', [VersionController::class, 'update']);
    Route::delete('/versions/{id}', [VersionController::class, 'destroy']);
    
    Route::post('/upload', [UploadController::class, 'store']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    
    // Admin user management
    Route::get('/admin/users', [AdminUserController::class, 'index']);
    Route::get('/admin/users/{id}', [AdminUserController::class, 'show']);
    Route::get('/admin/users/{id}/orders', [AdminUserController::class, 'orders']);
    Route::post('/admin/users/{id}/grant-app', [AdminUserController::class, 'grantApp']);
    Route::delete('/admin/users/{userId}/revoke-app/{appId}', [AdminUserController::class, 'revokeApp']);
    Route::get('/admin/orders', [AdminUserController::class, 'allOrders']);
});

// Protected user routes
Route::middleware('auth.user')->group(function () {
    Route::get('/users/me', [UserController::class, 'me']);
    Route::put('/users/profile', [UserController::class, 'updateProfile']);
    Route::post('/users/change-password', [UserController::class, 'changePassword']);
    
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/purchased', [OrderController::class, 'hasPurchased']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::put('/orders/{id}/confirm', [OrderController::class, 'confirm']);
});

// Payment routes (need user auth for some, public for webhooks)
Route::post('/payment/generate-qr', [PaymentController::class, 'generateQr'])->middleware('auth.user');
Route::post('/payment/verify', [PaymentController::class, 'verify'])->middleware('auth.user');
Route::post('/payment/confirm-manual', [PaymentController::class, 'confirmManual'])->middleware('auth.user');
Route::post('/payment/webhook', [PaymentController::class, 'webhook']); // Public webhook
