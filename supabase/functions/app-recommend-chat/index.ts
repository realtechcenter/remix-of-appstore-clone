/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LARAVEL_API_URL = (Deno.env.get("LARAVEL_API_URL") || "https://api.realtechcomputer.com").replace(/\/$/, '');

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

    // Create a structured apps context for the AI with full icon URLs
    const appsContext = apps.map(app => {
      let iconUrl = app.icon_url || "";
      // Convert relative paths to full URLs
      if (iconUrl && !iconUrl.startsWith('http')) {
        iconUrl = `${LARAVEL_API_URL}${iconUrl.startsWith('/') ? '' : '/'}${iconUrl}`;
      }
      return {
        id: app.id,
        name: app.name,
        name_km: app.name_km || app.name,
        description: app.description || "",
        description_km: app.description_km || app.description || "",
        icon_url: iconUrl,
        price: app.price || 0,
        category: app.category || "programs"
      };
    });

    const systemPrompt = `You are an intelligent assistant for "Style Ghost" app store. Your mission is to UNDERSTAND what users need and recommend the BEST matching apps.

Available apps in our store:
${JSON.stringify(appsContext, null, 2)}

## YOUR CORE MISSION:
Deeply understand what the user is trying to accomplish, then find apps that can help them.

## UNDERSTANDING USER INTENT:
1. **Direct requests**: "I need Photoshop" → find Photoshop or similar photo editors
2. **Task-based requests**: "I want to edit videos" → find video editing software
3. **Problem-based requests**: "My computer is slow" → find system optimizers
4. **Download requests**: "download videos from YouTube/Facebook" → find download managers

## SMART MATCHING:
- Match by NAME, FUNCTION, CATEGORY, or KEYWORDS in descriptions
- If exact app not available, suggest similar alternatives
- Always use the EXACT app ID and icon_url from the available apps list above

## RESPONSE FORMAT:
Use this EXACT format for each recommended app (include the icon_url from the app data):
[APP:id:name:icon_url:description]

Example: [APP:5:IDM:https://example.com/icon.png:Internet Download Manager for fast downloads]

## CRITICAL RULES:
1. **ONLY recommend apps that exist in the list above** - use their exact ID and icon_url
2. Find 1-4 relevant apps
3. Explain WHY each app helps
4. Match user's language (English/Khmer)
5. If truly no match exists, apologize without any [APP:...] tags

Example response:
"Based on your needs, I recommend:

[APP:5:IDM:https://api.example.com/icons/idm.png:Powerful download manager for videos and files]

This is excellent for downloading videos from social media!"`;

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
