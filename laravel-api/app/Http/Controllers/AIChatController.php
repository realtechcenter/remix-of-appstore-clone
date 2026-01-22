<?php

namespace App\Http\Controllers;

use App\Models\App;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIChatController extends Controller
{
    private string $geminiApiUrl;
    private string $apiKey;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key');
        $this->geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
    }

    /**
     * Handle AI chat request
     */
    public function chat(Request $request)
    {
        $request->validate([
            'messages' => 'required|array',
            'messages.*.role' => 'required|string|in:user,assistant',
            'messages.*.content' => 'required|string',
        ]);

        try {
            // Fetch apps from database for context
            $apps = $this->getAppsFromDatabase();

            // Build system prompt with app context
            $systemPrompt = $this->buildSystemPrompt($apps->toArray());

            // Convert messages to Gemini format
            $geminiContents = $this->convertToGeminiFormat($request->messages, $systemPrompt);

            // Call Gemini API
            $response = Http::timeout(60)->post("{$this->geminiApiUrl}?key={$this->apiKey}", [
                'contents' => $geminiContents,
                'generationConfig' => [
                    'temperature' => 0.7,
                    'topK' => 40,
                    'topP' => 0.95,
                    'maxOutputTokens' => 1024,
                ],
                'safetySettings' => [
                    [
                        'category' => 'HARM_CATEGORY_HARASSMENT',
                        'threshold' => 'BLOCK_MEDIUM_AND_ABOVE',
                    ],
                    [
                        'category' => 'HARM_CATEGORY_HATE_SPEECH',
                        'threshold' => 'BLOCK_MEDIUM_AND_ABOVE',
                    ],
                ],
            ]);

            if (!$response->successful()) {
                Log::error('Gemini API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                
                return response()->json([
                    'error' => 'Failed to get AI response',
                    'details' => $response->json()['error']['message'] ?? 'Unknown error',
                ], 500);
            }

            $responseData = $response->json();
            $aiResponse = $responseData['candidates'][0]['content']['parts'][0]['text'] ?? '';

            // Parse app recommendations from the response
            $parsedResponse = $this->parseAppRecommendations($aiResponse, $apps->toArray());

            // If no apps found, try internet search fallback
            if (empty($parsedResponse['apps'])) {
                $userMessage = end($request->messages)['content'] ?? '';
                $fallbackResult = $this->searchInternetAndMatchApps($userMessage, $apps->toArray());
                
                if (!empty($fallbackResult['apps'])) {
                    return response()->json([
                        'success' => true,
                        'response' => $fallbackResult['response'],
                        'apps' => $fallbackResult['apps'],
                        'source' => 'internet_search',
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'response' => $aiResponse,
                'apps' => $parsedResponse['apps'],
            ]);

        } catch (\Exception $e) {
            Log::error('AI Chat error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'An error occurred while processing your request',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Stream AI chat response
     */
    public function streamChat(Request $request)
    {
        $request->validate([
            'messages' => 'required|array',
            'messages.*.role' => 'required|string|in:user,assistant',
            'messages.*.content' => 'required|string',
        ]);

        // Fetch apps from database for context
        $apps = $this->getAppsFromDatabase();

        // Build system prompt with enhanced internet search capability
        $systemPrompt = $this->buildEnhancedSystemPrompt($apps->toArray());

        // Convert messages to Gemini format
        $geminiContents = $this->convertToGeminiFormat($request->messages, $systemPrompt);

        $streamUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key={$this->apiKey}&alt=sse";

        return response()->stream(function () use ($geminiContents, $streamUrl) {
            $ch = curl_init();
            
            curl_setopt_array($ch, [
                CURLOPT_URL => $streamUrl,
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => json_encode([
                    'contents' => $geminiContents,
                    'generationConfig' => [
                        'temperature' => 0.7,
                        'topK' => 40,
                        'topP' => 0.95,
                        'maxOutputTokens' => 1024,
                    ],
                ]),
                CURLOPT_HTTPHEADER => [
                    'Content-Type: application/json',
                ],
                CURLOPT_RETURNTRANSFER => false,
                CURLOPT_WRITEFUNCTION => function ($ch, $data) {
                    echo $data;
                    ob_flush();
                    flush();
                    return strlen($data);
                },
            ]);

            curl_exec($ch);
            curl_close($ch);
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    /**
     * Get apps from database
     */
    private function getAppsFromDatabase()
    {
        return App::select(['id', 'name', 'name_km', 'description', 'description_km', 'icon_url', 'price', 'category'])
            ->limit(100)
            ->get()
            ->map(function ($app) {
                return [
                    'id' => $app->id,
                    'name' => $app->name,
                    'name_km' => $app->name_km ?? $app->name,
                    'description' => $app->description ?? '',
                    'description_km' => $app->description_km ?? $app->description ?? '',
                    'icon_url' => $app->icon_url ?? '',
                    'price' => $app->price ?? 0,
                    'category' => $app->category ?? 'programs',
                ];
            });
    }

    /**
     * Search internet for apps and match with database
     */
    private function searchInternetAndMatchApps(string $userQuery, array $apps): array
    {
        try {
            // Use Gemini to search and suggest app names based on user query
            $searchPrompt = $this->buildSearchPrompt($userQuery);
            
            $response = Http::timeout(30)->post("{$this->geminiApiUrl}?key={$this->apiKey}", [
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [['text' => $searchPrompt]],
                    ],
                ],
                'generationConfig' => [
                    'temperature' => 0.3,
                    'maxOutputTokens' => 512,
                ],
            ]);

            if (!$response->successful()) {
                Log::error('Internet search Gemini error', ['body' => $response->body()]);
                return ['apps' => [], 'response' => ''];
            }

            $searchResult = $response->json()['candidates'][0]['content']['parts'][0]['text'] ?? '';
            
            // Parse suggested app names from search result
            $suggestedApps = $this->parseSuggestedApps($searchResult);
            
            // Match suggested apps with our database
            $matchedApps = $this->matchAppsWithDatabase($suggestedApps, $apps);
            
            if (!empty($matchedApps)) {
                // Generate response with matched apps
                $responseText = $this->generateMatchedAppsResponse($userQuery, $matchedApps, $suggestedApps);
                
                return [
                    'apps' => $matchedApps,
                    'response' => $responseText,
                ];
            }
            
            return ['apps' => [], 'response' => ''];

        } catch (\Exception $e) {
            Log::error('Internet search error', ['message' => $e->getMessage()]);
            return ['apps' => [], 'response' => ''];
        }
    }

    /**
     * Build search prompt for internet search
     */
    private function buildSearchPrompt(string $userQuery): string
    {
        return <<<PROMPT
Based on this user request: "{$userQuery}"

Please search your knowledge and suggest popular software/apps that could help with this task.

Return ONLY a JSON array of app names (common software names), like:
["App Name 1", "App Name 2", "App Name 3", "App Name 4", "App Name 5"]

Focus on:
- Popular desktop software
- Well-known applications
- Common software solutions
- Alternative names/versions of apps

Return at least 5-10 app name suggestions. Only return the JSON array, nothing else.
PROMPT;
    }

    /**
     * Parse suggested apps from Gemini response
     */
    private function parseSuggestedApps(string $response): array
    {
        // Try to extract JSON array
        preg_match('/\[.*\]/s', $response, $matches);
        
        if (!empty($matches[0])) {
            try {
                $apps = json_decode($matches[0], true);
                if (is_array($apps)) {
                    return array_filter($apps, 'is_string');
                }
            } catch (\Exception $e) {
                Log::warning('Failed to parse suggested apps JSON', ['response' => $response]);
            }
        }
        
        // Fallback: extract app names from text
        $lines = explode("\n", $response);
        $apps = [];
        foreach ($lines as $line) {
            $line = trim($line, " \t\n\r\0\x0B-*•");
            if (!empty($line) && strlen($line) < 100) {
                $apps[] = $line;
            }
        }
        
        return array_slice($apps, 0, 10);
    }

    /**
     * Match suggested apps with database using fuzzy matching
     */
    private function matchAppsWithDatabase(array $suggestedApps, array $dbApps): array
    {
        $matchedApps = [];
        $matchedIds = [];
        
        foreach ($suggestedApps as $suggestedName) {
            $suggestedLower = strtolower(trim($suggestedName));
            
            foreach ($dbApps as $dbApp) {
                if (in_array($dbApp['id'], $matchedIds)) {
                    continue;
                }
                
                $dbNameLower = strtolower($dbApp['name']);
                $dbNameKmLower = strtolower($dbApp['name_km'] ?? '');
                
                // Exact match
                if ($dbNameLower === $suggestedLower || $dbNameKmLower === $suggestedLower) {
                    $matchedApps[] = $this->formatMatchedApp($dbApp, $suggestedName);
                    $matchedIds[] = $dbApp['id'];
                    continue;
                }
                
                // Partial match (contains)
                if (
                    str_contains($dbNameLower, $suggestedLower) || 
                    str_contains($suggestedLower, $dbNameLower) ||
                    str_contains($dbNameKmLower, $suggestedLower) ||
                    str_contains($suggestedLower, $dbNameKmLower)
                ) {
                    $matchedApps[] = $this->formatMatchedApp($dbApp, $suggestedName);
                    $matchedIds[] = $dbApp['id'];
                    continue;
                }
                
                // Word-based matching
                $suggestedWords = explode(' ', $suggestedLower);
                $dbWords = explode(' ', $dbNameLower);
                
                foreach ($suggestedWords as $word) {
                    if (strlen($word) >= 3 && in_array($word, $dbWords)) {
                        $matchedApps[] = $this->formatMatchedApp($dbApp, $suggestedName);
                        $matchedIds[] = $dbApp['id'];
                        break 2;
                    }
                }
                
                // Levenshtein distance for typo tolerance
                $distance = levenshtein($suggestedLower, $dbNameLower);
                $threshold = max(3, strlen($dbNameLower) * 0.3);
                
                if ($distance <= $threshold) {
                    $matchedApps[] = $this->formatMatchedApp($dbApp, $suggestedName);
                    $matchedIds[] = $dbApp['id'];
                }
            }
        }
        
        return array_slice($matchedApps, 0, 4);
    }

    /**
     * Format matched app for response
     */
    private function formatMatchedApp(array $app, string $searchTerm): array
    {
        return [
            'id' => $app['id'],
            'name' => $app['name'],
            'description' => $app['description'] ?: "Found based on your search for '{$searchTerm}'",
            'icon_url' => $app['icon_url'],
            'price' => $app['price'],
            'matched_from' => $searchTerm,
        ];
    }

    /**
     * Generate response for matched apps from internet search
     */
    private function generateMatchedAppsResponse(string $userQuery, array $matchedApps, array $suggestedApps): string
    {
        $appTags = array_map(function ($app) {
            $desc = substr($app['description'], 0, 100);
            return "[APP:{$app['id']}:{$app['name']}:{$desc}]";
        }, $matchedApps);
        
        $appTagsStr = implode("\n", $appTags);
        $matchCount = count($matchedApps);
        
        $response = "Based on your request, I searched for relevant apps and found {$matchCount} in our store:\n\n{$appTagsStr}\n\n";
        
        // Mention other suggested apps that weren't found
        $foundNames = array_column($matchedApps, 'name');
        $notFound = array_filter($suggestedApps, function ($name) use ($foundNames) {
            foreach ($foundNames as $found) {
                if (stripos($found, $name) !== false || stripos($name, $found) !== false) {
                    return false;
                }
            }
            return true;
        });
        
        if (!empty($notFound) && count($notFound) > 0) {
            $notFoundList = implode(', ', array_slice($notFound, 0, 3));
            $response .= "Other popular alternatives like {$notFoundList} are not currently available in our store, but check back later!";
        }
        
        return $response;
    }

    /**
     * Build system prompt with app context
     */
    private function buildSystemPrompt(array $apps): string
    {
        $appsJson = json_encode($apps, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
You are a helpful assistant for "Style Ghost" app store. Your job is to recommend apps based on user needs.

Available apps in our store (JSON format):
{$appsJson}

IMPORTANT INSTRUCTIONS:
1. When recommending apps, you MUST include them in a special format that our UI can parse.
2. For each recommended app, use this exact format on its own line:
   [APP:id:name:description]
   
   Example: [APP:5:Photoshop:Professional photo editing software]

3. You can add text before or after the app cards, but each [APP:...] tag must be on its own line.
4. Recommend 1-4 most relevant apps based on user needs.
5. Support both English and Khmer languages based on user's message.
6. Be friendly and helpful in your responses.
7. If no apps match the user's needs exactly, try to find similar or related apps.
8. IMPORTANT: Always try to recommend at least one app if there's any possible relation to the user's request.

Example response:
"Based on your needs for photo editing, I recommend:

[APP:5:Photoshop:Professional photo editing with layers and filters]
[APP:12:Lightroom:Great for photo enhancement and color grading]

Both are excellent choices for professional photography work!"
PROMPT;
    }

    /**
     * Build enhanced system prompt with internet search awareness
     */
    private function buildEnhancedSystemPrompt(array $apps): string
    {
        $appsJson = json_encode($apps, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
You are a helpful assistant for "Style Ghost" app store. Your job is to recommend apps based on user needs.

Available apps in our store (JSON format):
{$appsJson}

IMPORTANT INSTRUCTIONS:
1. When recommending apps, you MUST include them in a special format that our UI can parse.
2. For each recommended app, use this exact format on its own line:
   [APP:id:name:description]
   
   Example: [APP:5:Photoshop:Professional photo editing software]

3. You can add text before or after the app cards, but each [APP:...] tag must be on its own line.
4. Recommend 1-4 most relevant apps based on user needs.
5. Support both English and Khmer languages based on user's message.
6. Be friendly and helpful in your responses.

SMART MATCHING:
- If the user asks for a specific type of software, search through ALL apps in the list.
- Match based on app descriptions, categories, and functionality - not just names.
- For example, if user wants "video downloader", look for apps with download features, media tools, etc.
- If user asks for a specific app by name (e.g., "IDM", "Photoshop"), find exact or similar apps.
- Always try to find at least one relevant app from the available list.
- Consider alternative apps that serve the same purpose.

If absolutely NO apps can help the user:
- Apologize briefly
- Suggest they browse the store categories
- DO NOT include any [APP:...] tags

Example response:
"Based on your needs for photo editing, I recommend:

[APP:5:Photoshop:Professional photo editing with layers and filters]
[APP:12:Lightroom:Great for photo enhancement and color grading]

Both are excellent choices for professional photography work!"
PROMPT;
    }

    /**
     * Convert chat messages to Gemini API format
     */
    private function convertToGeminiFormat(array $messages, string $systemPrompt): array
    {
        $contents = [];

        // Add system prompt as first user message
        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $systemPrompt]],
        ];
        $contents[] = [
            'role' => 'model',
            'parts' => [['text' => 'I understand. I will help users find the best apps from the Style Ghost store based on their needs, and I will format my recommendations using the [APP:id:name:description] format. I will search through all available apps and match based on functionality, not just names.']],
        ];

        // Add conversation messages
        foreach ($messages as $message) {
            $contents[] = [
                'role' => $message['role'] === 'user' ? 'user' : 'model',
                'parts' => [['text' => $message['content']]],
            ];
        }

        return $contents;
    }

    /**
     * Parse app recommendations from AI response
     */
    private function parseAppRecommendations(string $response, array $apps): array
    {
        $recommendedApps = [];
        
        // Match [APP:id:name:description] pattern
        preg_match_all('/\[APP:(\d+):([^:]+):([^\]]+)\]/', $response, $matches, PREG_SET_ORDER);

        foreach ($matches as $match) {
            $appId = (int) $match[1];
            
            // Find the app in our apps list
            $appData = collect($apps)->firstWhere('id', $appId);
            
            if ($appData) {
                $recommendedApps[] = [
                    'id' => $appId,
                    'name' => $match[2],
                    'description' => $match[3],
                    'icon_url' => $appData['icon_url'],
                    'price' => $appData['price'],
                ];
            } else {
                $recommendedApps[] = [
                    'id' => $appId,
                    'name' => $match[2],
                    'description' => $match[3],
                    'icon_url' => null,
                    'price' => null,
                ];
            }
        }

        return [
            'apps' => $recommendedApps,
            'raw_response' => $response,
        ];
    }
}
