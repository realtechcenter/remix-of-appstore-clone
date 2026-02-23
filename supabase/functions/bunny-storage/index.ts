import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || (roleData.role !== 'admin')) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    const apiKey = Deno.env.get('BUNNY_STORAGE_API_KEY');
    const zoneName = Deno.env.get('BUNNY_STORAGE_ZONE_NAME');
    const storageHost = Deno.env.get('BUNNY_STORAGE_HOSTNAME');
    const cdnHost = Deno.env.get('BUNNY_CDN_HOSTNAME');

    if (!apiKey || !zoneName || !storageHost) {
      return new Response(JSON.stringify({ 
        error: 'Bunny Storage not configured. Please set BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_ZONE_NAME, and BUNNY_STORAGE_HOSTNAME secrets.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Test connection - list root directory
    if (action === 'test') {
      const testUrl = `https://${storageHost}/${zoneName}/`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'AccessKey': apiKey },
      });

      if (response.ok) {
        const files = await response.json();
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Connection successful!',
          zone_name: zoneName,
          storage_host: storageHost,
          cdn_host: cdnHost || 'Not configured',
          file_count: Array.isArray(files) ? files.length : 0,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        const errorText = await response.text();
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Connection failed (${response.status}): ${errorText}`,
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get config info
    if (action === 'config') {
      return new Response(JSON.stringify({
        zone_name: zoneName,
        storage_host: storageHost,
        cdn_host: cdnHost || '',
        configured: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
