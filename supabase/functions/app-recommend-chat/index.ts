/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LARAVEL_API_URL = Deno.env.get("LARAVEL_API_URL") || "https://pehapneqirglznwqzppd.supabase.co";

interface App {
  id: number;
  name: string;
  name_km?: string;
  description?: string;
  description_km?: string;
  icon_url?: string;
  price?: number;
  version?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header from the incoming request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const { messages } = await req.json();
    
    // Fetch apps from Laravel API
    let apps: App[] = [];
    try {
      const appsResponse = await fetch(`${LARAVEL_API_URL}/api/apps?limit=100`);
      if (appsResponse.ok) {
        const data = await appsResponse.json();
        apps = data.data || [];
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
      version: app.version || "1.0"
    }));

    const systemPrompt = `You are a helpful assistant for "Style Ghost" app store. Your job is to recommend apps based on user needs.

Available apps in our store (JSON format):
${JSON.stringify(appsContext, null, 2)}

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

Both are excellent choices for professional photography work!"`;

    console.log("Calling AI Gateway with model: google/gemini-3-flash-preview");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": authHeader
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
