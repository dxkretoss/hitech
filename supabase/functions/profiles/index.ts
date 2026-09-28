import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    const body = await req.json().catch(() => ({}));
    const { action, payload = {} } = body;

    let result: any = null;

    switch (action) {
      case 'get':
      case 'get_profiles': {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        result = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name || p.email?.split('@')[0] || 'Team Member',
          email: p.email,
          role: p.role || 'Sales',
          branch: p.branch || 'Surat',
          canViewStock: p.can_view_stock !== null && p.can_view_stock !== undefined
            ? p.can_view_stock === true
            : (p.role === 'Engineer'),
          status: 'Active',
          date: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
        }));
        break;
      }

      case 'update_stock_access':
      case 'update_profile_stock_access': {
        const { profileId, canViewStock } = payload;
        const { error } = await supabase
          .from('profiles')
          .update({ can_view_stock: canViewStock })
          .eq('id', profileId);

        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown profile action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
