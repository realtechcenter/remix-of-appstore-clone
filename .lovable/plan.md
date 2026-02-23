

## Refactor Bunny Storage Setup to Use Laravel API

The current Bunny Storage setup component calls a Supabase edge function. Since your project uses a Laravel backend exclusively, this needs to be refactored to use your Laravel API instead.

### Changes

**1. Add Laravel Controller: `laravel-api/app/Http/Controllers/BunnyStorageController.php`**
- `GET /api/bunny/config` - Returns storage zone name, hostname, CDN host, and configured status (reads from Laravel `.env`)
- `GET /api/bunny/test` - Tests connection by listing files from Bunny Storage API, returns success/failure with details
- Protected by admin authentication middleware

**2. Add Laravel Routes: `laravel-api/routes/api.php`**
- Add `GET /bunny/config` and `GET /bunny/test` routes under the admin middleware group

**3. Update Laravel `.env.example`**
- Add `BUNNY_STORAGE_API_KEY`, `BUNNY_STORAGE_ZONE_NAME`, `BUNNY_STORAGE_HOSTNAME`, `BUNNY_CDN_HOSTNAME` entries

**4. Update `src/lib/api.ts`**
- Add a `bunnyApi` object with `getConfig()` and `testConnection()` methods that call the Laravel endpoints

**5. Update `src/components/admin/BunnyStorageSetup.tsx`**
- Remove all Supabase imports and calls
- Use the new `bunnyApi` methods from `api.ts` instead

**6. Delete `supabase/functions/bunny-storage/index.ts`**
- Remove the Supabase edge function since it's no longer needed

### Technical Details

**Laravel Controller logic:**
```php
// config endpoint
public function config() {
    return response()->json([
        'zone_name' => env('BUNNY_STORAGE_ZONE_NAME', ''),
        'storage_host' => env('BUNNY_STORAGE_HOSTNAME', ''),
        'cdn_host' => env('BUNNY_CDN_HOSTNAME', ''),
        'configured' => !empty(env('BUNNY_STORAGE_API_KEY')) && !empty(env('BUNNY_STORAGE_ZONE_NAME')),
    ]);
}

// test endpoint - calls Bunny API to list root directory
public function test() {
    $response = Http::withHeaders(['AccessKey' => env('BUNNY_STORAGE_API_KEY')])
        ->get("https://" . env('BUNNY_STORAGE_HOSTNAME') . "/" . env('BUNNY_STORAGE_ZONE_NAME') . "/");
    // Returns success with file_count, or error message
}
```

**Frontend API methods:**
```typescript
export const bunnyApi = {
  getConfig: () => apiRequest<BunnyConfig>('bunny/config'),
  testConnection: () => apiRequest<TestResult>('bunny/test'),
};
```

The component UI stays exactly the same -- only the data fetching layer changes from Supabase to Laravel.

