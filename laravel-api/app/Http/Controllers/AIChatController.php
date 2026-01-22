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
        try {
            $request->validate([
                'messages' => 'required|array',
                'messages.*.role' => 'required|string|in:user,assistant',
                'messages.*.content' => 'required|string',
            ]);

            // Check if API key is configured
            if (empty($this->apiKey)) {
                Log::error('Gemini API key is not configured');
                return response()->json([
                    'error' => 'AI service is not configured properly',
                ], 500);
            }

            // Fetch apps from database for context
            $apps = $this->getAppsFromDatabase();

            // Build system prompt with enhanced internet search capability
            $systemPrompt = $this->buildEnhancedSystemPrompt($apps->toArray());

            // Convert messages to Gemini format
            $geminiContents = $this->convertToGeminiFormat($request->messages, $systemPrompt);

            $streamUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key={$this->apiKey}&alt=sse";

            $headers = [
                'Content-Type' => 'text/event-stream',
                'Cache-Control' => 'no-cache',
                'Connection' => 'keep-alive',
                'X-Accel-Buffering' => 'no',
                'Access-Control-Allow-Origin' => '*',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization',
            ];

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
                        // Transform Gemini SSE format to OpenAI-compatible format
                        $lines = explode("\n", $data);
                        
                        foreach ($lines as $line) {
                            $line = trim($line);
                            
                            if (empty($line)) {
                                continue;
                            }
                            
                            // Handle SSE data lines
                            if (str_starts_with($line, 'data: ')) {
                                $jsonStr = substr($line, 6);
                                
                                if ($jsonStr === '[DONE]') {
                                    echo "data: [DONE]\n\n";
                                    continue;
                                }
                                
                                try {
                                    $geminiData = json_decode($jsonStr, true);
                                    
                                    if ($geminiData && isset($geminiData['candidates'][0]['content']['parts'][0]['text'])) {
                                        $text = $geminiData['candidates'][0]['content']['parts'][0]['text'];
                                        
                                        // Convert to OpenAI-compatible format
                                        $openAIFormat = [
                                            'choices' => [
                                                [
                                                    'delta' => [
                                                        'content' => $text
                                                    ],
                                                    'index' => 0,
                                                    'finish_reason' => null
                                                ]
                                            ]
                                        ];
                                        
                                        // Check if this is the final chunk
                                        if (isset($geminiData['candidates'][0]['finishReason'])) {
                                            $openAIFormat['choices'][0]['finish_reason'] = strtolower($geminiData['candidates'][0]['finishReason']);
                                        }
                                        
                                        echo "data: " . json_encode($openAIFormat) . "\n\n";
                                    }
                                } catch (\Exception $e) {
                                    // Log parse errors but continue
                                    Log::warning('Failed to parse Gemini chunk', ['data' => $jsonStr]);
                                }
                            }
                        }
                        
                        if (ob_get_level() > 0) {
                            ob_flush();
                        }
                        flush();
                        return strlen($data);
                    },
                ]);

                $result = curl_exec($ch);
                
                if ($result === false) {
                    $error = curl_error($ch);
                    Log::error('Gemini streaming curl error', ['error' => $error]);
                    echo "data: " . json_encode(['error' => 'Failed to connect to AI service']) . "\n\n";
                }
                
                // Send [DONE] at the end
                echo "data: [DONE]\n\n";
                if (ob_get_level() > 0) {
                    ob_flush();
                }
                flush();
                
                curl_close($ch);
            }, 200, $headers);

        } catch (\Exception $e) {
            Log::error('AI Chat stream error', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'An error occurred while processing your request',
                'message' => config('app.debug') ? $e->getMessage() : 'Server error',
            ], 500);
        }
    }

    /**
     * Get apps from database
     */
    private function getAppsFromDatabase()
    {
        // Fetch up to 2000 apps to ensure AI can recommend most apps while preventing timeout
        return App::select(['id', 'name', 'name_km', 'description', 'description_km', 'icon_url', 'price', 'category', 'is_popular', 'download_count'])
            ->orderBy('download_count', 'desc')
            ->limit(2000)
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
                    'is_popular' => $app->is_popular ?? false,
                    'download_count' => $app->download_count ?? 0,
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
     * Build system prompt with smart intent understanding
     */
    private function buildSystemPrompt(array $apps): string
    {
        $appsJson = json_encode($apps, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
You are an intelligent assistant for "Style Ghost" app store. Your mission is to UNDERSTAND user needs and recommend MATCHING apps.

Available apps in our store:
{$appsJson}

## UNDERSTANDING USER REQUESTS:
- **Direct**: "I need Photoshop" → find Photoshop or photo editors
- **Task-based**: "edit videos" → video editing software  
- **Problem-based**: "computer is slow" → system optimizers, cleaners
- **Vague**: Ask clarifying questions OR suggest related apps

## SMART MATCHING:
- Match by NAME: "IDM" → Internet Download Manager
- Match by FUNCTION: "download YouTube videos" → video downloaders
- Match by CATEGORY: "antivirus" → security tools
- Match ALTERNATIVES: If exact app missing, suggest similar ones
- Match KEYWORDS in descriptions: edit, download, convert, protect, etc.

## RESPONSE FORMAT:
[APP:id:name:description]

## RULES:
1. Find 1-4 relevant apps
2. Explain WHY each app helps
3. Match user's language (English/Khmer)
4. Always try to find at least ONE relevant app
5. Only say "no match" if truly nothing can help

Example:
"For video editing, I recommend:

[APP:5:DaVinci Resolve:Professional video editor with color grading]
[APP:8:Filmora:Easy-to-use video editor for beginners]"
PROMPT;
    }

    /**
     * Build enhanced system prompt with smart intent understanding
     */
    private function buildEnhancedSystemPrompt(array $apps): string
    {
        $appsJson = json_encode($apps, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return <<<PROMPT
You are an intelligent assistant for "Style Ghost" app store. Your job is to UNDERSTAND what users need and recommend the BEST matching apps.

Available apps in our store (JSON format with id, name, description, icon_url, is_popular, download_count):
{$appsJson}

## YOUR CORE MISSION:
Deeply understand what the user is trying to accomplish, then find ALL relevant apps that can help them. Always recommend MULTIPLE options when available.

## UNDERSTANDING USER INTENT:
When a user says something, think about:
1. **Direct requests**: "I need Photoshop" → find Photoshop AND similar photo editors
2. **Task-based requests**: "I want to download videos" → find ALL video downloaders available
3. **Problem-based requests**: "My computer is slow" → find system optimizers, cleaners, AND antivirus
4. **Category requests**: "Show me games" → find multiple apps in games category
5. **Vague requests**: "I need something for work" → suggest multiple productivity apps

## SMART MATCHING STRATEGIES:
- **Name matching**: "IDM" → Internet Download Manager AND other download managers
- **Function matching**: "download videos from social media" → ALL video downloaders, media download tools
- **Category matching**: "antivirus" → ALL security software, system protection tools
- **Alternative matching**: Suggest similar apps as alternatives
- **Keyword matching**: Look for keywords in descriptions (edit, download, convert, protect, clean, video, etc.)

## CRITICAL RESPONSE FORMAT:
You MUST use this EXACT 7-part format for EACH app recommendation (all on one line):
[APP:id:name:icon_url:is_popular:download_count:description]

Where:
- id = the app's numeric ID from the database
- name = the app's name
- icon_url = the app's icon_url from the database
- is_popular = true or false (from database)
- download_count = number (from database)
- description = short description (max 100 chars, NO colons allowed in description)

## RESPONSE GUIDELINES:
1. **ALWAYS recommend 2-4 apps** when multiple relevant apps exist
2. Prioritize popular apps (is_popular=true) and high download counts
3. Explain WHY each app matches their need
4. Support English and Khmer (respond in user's language)
5. Be friendly and helpful

## WHEN NO EXACT MATCH EXISTS:
- Suggest the closest alternatives from available apps
- Never say "we don't have that" - always find something similar
- Explain what the alternatives can do

## EXAMPLE INTERACTIONS:

User: "I need to download videos from Facebook"
Response: "Great choice! Here are the best video downloaders in our store:

[APP:15:Internet Download Manager:https://example.com/idm.png:true:50000:Powerful download manager for all file types including videos]
[APP:23:4K Video Downloader:https://example.com/4k.png:true:35000:Download videos from YouTube Facebook and Instagram]
[APP:31:JDownloader:https://example.com/jd.png:false:12000:Free open-source download manager with browser integration]

All of these can help you save videos from social media!"

User: "កម្មវិធីកែរូប"
Response: "នេះជាកម្មវិធីកែរូបដ៏ល្អៗ:

[APP:5:Adobe Photoshop:https://example.com/ps.png:true:80000:កម្មវិធីកែរូបវិជ្ជាជីវៈលំដាប់ពិភពលោក]
[APP:12:Lightroom:https://example.com/lr.png:true:45000:កែពណ៌និងភាពភ្លឺសម្រាប់រូបថត]
[APP:18:GIMP:https://example.com/gimp.png:false:25000:កម្មវិធីកែរូបឥតគិតថ្លៃ]"

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
