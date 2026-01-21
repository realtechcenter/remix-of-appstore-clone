<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppVersion extends Model
{
    protected $fillable = [
        'app_id',
        'version',
        'release_date',
        'changelog',
        'changelog_km',
        'file_size',
        'download_url',
        'is_latest',
        'min_os_version',
    ];

    protected $casts = [
        'is_latest' => 'boolean',
        'release_date' => 'date',
    ];

    public function app(): BelongsTo
    {
        return $this->belongsTo(App::class);
    }
}
