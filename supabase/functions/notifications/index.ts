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
    const { action, payload = {}, user = null } = body;

    const userRole = user?.role || 'Admin';
    const isOwner = userRole === 'Admin' || userRole === 'Owner' || userRole === 'SuperAdmin';
    const isSales = userRole === 'Sales';
    const isEngineer = userRole === 'Engineer';
    const userEmail = (user?.email || '').toLowerCase().trim();

    let result: any = null;

    switch (action) {
      case 'get':
      case 'get_notifications': {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        result = (data || [])
          .filter((n: any) => {
            const dismissedBy = Array.isArray(n.dismissed_by) ? n.dismissed_by : [];
            if (dismissedBy.includes(userEmail)) return false;

            if (!isOwner) {
              if (isEngineer && n.recipient_role !== 'Engineer' && n.recipient_role !== 'All') return false;
              if (isSales && n.recipient_role !== 'Sales' && n.recipient_role !== 'All') return false;
            }
            return true;
          })
          .map((n: any) => {
            const readBy = Array.isArray(n.read_by) ? n.read_by : [];
            return {
              id: n.id,
              title: n.title,
              message: n.message,
              type: n.type,
              severity: n.severity,
              isRead: readBy.includes(userEmail),
              recipientRole: n.recipient_role,
              recipientEmail: n.recipient_email,
              branch: n.branch,
              serviceId: n.service_id,
              leadId: n.lead_id,
              daysRemaining: n.days_remaining,
              date: n.date,
              createdAt: n.created_at
            };
          });
        break;
      }

      case 'mark_read':
      case 'mark_notification_read': {
        const { id } = payload;
        const { data: row } = await supabase.from('notifications').select('read_by').eq('id', id).single();
        const currentReadBy = Array.isArray(row?.read_by) ? row.read_by : [];
        if (!currentReadBy.includes(userEmail)) {
          await supabase.from('notifications').update({
            read_by: [...currentReadBy, userEmail]
          }).eq('id', id);
        }
        result = { success: true };
        break;
      }

      case 'delete':
      case 'delete_notification': {
        const { id } = payload;
        const { data: row } = await supabase.from('notifications').select('dismissed_by').eq('id', id).single();
        const currentDismissedBy = Array.isArray(row?.dismissed_by) ? row.dismissed_by : [];
        if (!currentDismissedBy.includes(userEmail)) {
          await supabase.from('notifications').update({
            dismissed_by: [...currentDismissedBy, userEmail]
          }).eq('id', id);
        }
        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown notification action: ${action}` }), {
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
