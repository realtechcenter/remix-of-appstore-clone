<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class App extends Model
{
    protected $fillable = [
        'name',
        'name_km',
        'description',
        'description_km',
        'category',
        'icon_url',
        'developer',
        'website',
        'is_featured',
        'download_count',
        'price',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'download_count' => 'integer',
        'price' => 'decimal:2',
    ];

    public function versions(): HasMany
    {
        return $this->hasMany(AppVersion::class);
    }

    public function screenshots(): HasMany
    {
        return $this->hasMany(AppScreenshot::class);
    }

    public function latestVersion()
    {
        return $this->versions()->where('is_latest', true)->first();
    }
}
