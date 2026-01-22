/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LARAVEL_API_URL = Deno.env.get("LARAVEL_API_URL") || "https://api.realtechcomputer.com";

interface App {
  id: number;
  name: string;
  name_km?: string;
  description?: string;
  description_km?: string;
  icon_url?: string;
  price?: number;
  category?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    console.log("LOVABLE_API_KEY present:", !!LOVABLE_API_KEY);
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { messages } = await req.json();
    
    // Fetch apps from Laravel API
    let apps: App[] = [];
    try {
      console.log("Fetching apps from:", `${LARAVEL_API_URL}/api/apps?limit=100`);
      const appsResponse = await fetch(`${LARAVEL_API_URL}/api/apps?limit=100`);
      if (appsResponse.ok) {
        const data = await appsResponse.json();
        apps = data.data || data.apps || [];
        console.log("Fetched apps count:", apps.length);
      } else {
        console.error("Failed to fetch apps:", appsResponse.status);
      }
    } catch (e) {
      console.error("Failed to fetch apps:", e);
    }

    // Create a structured apps context for the AI
    const appsContext = apps.map(app => ({
      id: app.id,
      name: app.name,
      name_km: app.name_km || app.name,
      description: app.description || "",
      description_km: app.description_km || app.description || "",
      icon_url: app.icon_url || "",
      price: app.price || 0,
      category: app.category || "programs"
    }));

    const systemPrompt = `You are an intelligent assistant for "Style Ghost" app store. Your mission is to UNDERSTAND what users need and recommend the BEST matching apps.

Available apps in our store:
${JSON.stringify(appsContext, null, 2)}

## YOUR CORE MISSION:
Deeply understand what the user is trying to accomplish, then find apps that can help them.

## UNDERSTANDING USER INTENT:
When a user says something, think about:
1. **Direct requests**: "I need Photoshop" → find Photoshop or similar photo editors
2. **Task-based requests**: "I want to edit videos" → find video editing software
3. **Problem-based requests**: "My computer is slow" → find system optimizers, cleaners
4. **Category requests**: "Show me games" → find apps in games category
5. **Download requests**: "download videos from YouTube/Facebook" → find download managers, video downloaders

## SMART MATCHING STRATEGIES:
- **Name matching**: "IDM" → Internet Download Manager, or any download manager
- **Function matching**: "download videos" → video downloaders, media tools, download managers
- **Category matching**: "antivirus" → security software, system protection
- **Alternative matching**: If exact app not available, suggest similar alternatives
- **Keyword matching**: Look for keywords in descriptions (edit, download, convert, protect, clean, etc.)

## RESPONSE FORMAT:
Use this EXACT format for each recommended app on its own line:
[APP:id:name:description]

Example: [APP:5:IDM:Internet Download Manager - download videos and files fast]

## RESPONSE GUIDELINES:
1. **ALWAYS try to find at least 1-2 relevant apps** - be creative with matching!
2. Maximum 4 app recommendations per response
3. Explain WHY each app matches their need
4. Support English and Khmer (respond in user's language)
5. Be friendly and helpful

## MATCHING EXAMPLES:
- User wants "video downloader" → Match: IDM, 4K Video Downloader, any download tool
- User wants "photo editor" → Match: Photoshop, Lightroom, GIMP, any image tool  
- User wants "office apps" → Match: Microsoft Office, LibreOffice, WPS Office
- User wants "antivirus" → Match: Any security/protection software

## WHEN TRULY NO MATCH EXISTS:
- Apologize and suggest browsing store categories
- DO NOT include any [APP:...] tags

Example response:
"Based on your needs, I recommend:

[APP:5:IDM:Powerful download manager for videos and files]
[APP:12:4K Downloader:Download videos from YouTube and social media]

Both are excellent for downloading videos from social media platforms!"`;

    console.log("Calling AI Gateway with improved intent understanding");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
