<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\AppController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\VersionController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [UserController::class, 'register']);
Route::post('/users/login', [UserController::class, 'login']);

// Apps (public read)
Route::get('/apps', [AppController::class, 'index']);
Route::get('/apps/{id}', [AppController::class, 'show']);
Route::get('/versions', [VersionController::class, 'index']);

// Protected admin routes
Route::middleware('auth:admin')->group(function () {
    Route::post('/apps', [AppController::class, 'store']);
    Route::put('/apps/{id}', [AppController::class, 'update']);
    Route::delete('/apps/{id}', [AppController::class, 'destroy']);
    
    Route::post('/versions', [VersionController::class, 'store']);
    Route::put('/versions/{id}', [VersionController::class, 'update']);
    Route::delete('/versions/{id}', [VersionController::class, 'destroy']);
    
    Route::post('/upload', [UploadController::class, 'store']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
});

// Protected user routes
Route::middleware('auth:user')->group(function () {
    Route::get('/users/me', [UserController::class, 'me']);
    Route::put('/users/profile', [UserController::class, 'updateProfile']);
    
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/purchased', [OrderController::class, 'hasPurchased']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::put('/orders/{id}/confirm', [OrderController::class, 'confirm']);
});

// Payment routes (need user auth for some, public for webhooks)
Route::post('/payment/generate-qr', [PaymentController::class, 'generateQr'])->middleware('auth:user');
Route::post('/payment/verify', [PaymentController::class, 'verify'])->middleware('auth:user');
Route::post('/payment/confirm-manual', [PaymentController::class, 'confirmManual'])->middleware('auth:user');
Route::post('/payment/webhook', [PaymentController::class, 'webhook']); // Public webhook
