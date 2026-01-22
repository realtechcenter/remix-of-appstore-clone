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
            $apps = App::select(['id', 'name', 'name_km', 'description', 'description_km', 'icon_url', 'price', 'latest_version'])
                ->where('is_active', true)
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
                        'version' => $app->latest_version ?? '1.0',
                    ];
                });

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
        $apps = App::select(['id', 'name', 'name_km', 'description', 'description_km', 'icon_url', 'price', 'latest_version'])
            ->where('is_active', true)
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
                    'version' => $app->latest_version ?? '1.0',
                ];
            });

        // Build system prompt with app context
        $systemPrompt = $this->buildSystemPrompt($apps->toArray());

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
7. If no apps match the user's needs, apologize and suggest browsing the store.

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
            'parts' => [['text' => 'I understand. I will help users find the best apps from the Style Ghost store based on their needs, and I will format my recommendations using the [APP:id:name:description] format.']],
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
