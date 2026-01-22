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
  is_popular?: boolean;
  download_count?: number;
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
        category: app.category || "programs",
        is_popular: app.is_popular || false,
        download_count: app.download_count || 0
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
- Always use the EXACT app ID, icon_url, is_popular, and download_count from the available apps list above

## RESPONSE FORMAT - ALL 7 FIELDS ARE MANDATORY:
[APP:id:name:icon_url:is_popular:download_count:description]

**CRITICAL - THE DESCRIPTION FIELD MUST NEVER BE EMPTY!**
- Always include a description - use the app's description from the data
- If the app has no description in the data, write a helpful 1-2 sentence description based on the app name
- The tag MUST end with actual descriptive text, never with just a colon or empty

✅ CORRECT: [APP:2054:Downie 4:https://api.realtechcomputer.com/icons/downie_4.png:false:0:Downie 4 is a powerful video downloader for Mac that supports YouTube, Facebook, Vimeo and thousands of other sites with high quality downloads.]
❌ WRONG: [APP:2054:Downie 4:https://api.realtechcomputer.com/icons/downie_4.png:false:0:]

## CRITICAL RULES:
1. **ONLY recommend apps that exist in the list above** - use their exact ID, icon_url, is_popular, and download_count
2. Find 1-4 relevant apps
3. **DESCRIPTION IS MANDATORY** - Never leave it empty! If no description exists, write one based on the app name and category
4. Match user's language (English/Khmer)
5. If truly no match exists, apologize without any [APP:...] tags

Example response:
"Based on your needs, I recommend:

[APP:5:IDM:https://api.example.com/icons/idm.png:true:25000:Internet Download Manager is a powerful tool designed for high-speed file downloads with resume capability and browser integration.]

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
