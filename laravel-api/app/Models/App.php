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
        'youtube_url',
        'is_featured',
        'is_popular',
        'download_count',
        'price',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'is_popular' => 'boolean',
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

    public function videos(): HasMany
    {
        return $this->hasMany(AppVideo::class)->orderBy('sort_order');
    }

    public function latestVersion()
    {
        return $this->versions()->where('is_latest', true)->first();
    }
}
