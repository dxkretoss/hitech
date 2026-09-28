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
    const userId = user?.id || '';
    const userEmail = (user?.email || '').toLowerCase().trim();
    const userName = (user?.name || '').toLowerCase().trim();

    let result: any = null;

    switch (action) {
      case 'get':
      case 'get_future_opportunities': {
        const { data, error } = await supabase
          .from('future_opportunities')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        let opps = (data || []).map((o: any) => ({
          id: o.id,
          customerName: o.customer_name,
          company: o.company,
          phone: o.phone,
          branch: o.branch || 'Surat',
          requirement: o.requirement,
          expectedPurchaseMonth: o.expected_purchase_month,
          reminderDate: o.reminder_date,
          notes: o.notes,
          userId: o.user_id || '',
          salesPersonId: o.sales_person_id || '',
          salesPersonName: o.sales_person_name || '',
          salesPersonEmail: o.sales_person_email || '',
          createdBy: o.created_by || ''
        }));

        if (isSales && !isOwner) {
          opps = opps.filter((o: any) => {
            const sId = o.salesPersonId || o.userId;
            const sEmail = (o.salesPersonEmail || o.createdBy || '').toLowerCase().trim();
            const sName = (o.salesPersonName || '').toLowerCase().trim();
            return (
              (userId && sId === userId) ||
              (userEmail && sEmail && sEmail === userEmail) ||
              (userName && sName && (sName === userName || sName.includes(userName) || userName.includes(sName)))
            );
          });
        }

        result = opps;
        break;
      }

      case 'add':
      case 'add_future_opportunity': {
        const opp = payload;
        const id = opp.id || `FO-${Date.now().toString().slice(-4)}`;
        const salesPersonName = opp.salesPersonName || user?.name || 'Sales Rep';
        const salesPersonId = opp.salesPersonId || user?.id || 'S-101';
        const salesPersonEmail = opp.salesPersonEmail || user?.email || '';
        const createdBy = user?.email || '';
        const branch = opp.branch || user?.branch || 'Surat';

        const row = {
          id,
          customer_name: opp.customerName,
          company: opp.company,
          phone: opp.phone,
          branch,
          requirement: opp.requirement,
          expected_purchase_month: opp.expectedPurchaseMonth || '6 Months Later',
          reminder_date: opp.reminderDate || new Date().toISOString().split('T')[0],
          notes: opp.notes || '',
          user_id: user?.id || null,
          sales_person_id: salesPersonId,
          sales_person_name: salesPersonName,
          sales_person_email: salesPersonEmail,
          created_by: createdBy
        };

        const { error } = await supabase.from('future_opportunities').insert([row]);
        if (error) throw error;

        result = {
          id,
          customerName: row.customer_name,
          company: row.company,
          phone: row.phone,
          branch,
          requirement: row.requirement,
          expectedPurchaseMonth: row.expected_purchase_month,
          reminderDate: row.reminder_date,
          notes: row.notes,
          userId: user?.id || '',
          salesPersonId,
          salesPersonName,
          salesPersonEmail,
          createdBy
        };
        break;
      }

      case 'delete':
      case 'delete_future_opportunity': {
        const { id } = payload;
        const { error } = await supabase.from('future_opportunities').delete().eq('id', id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown future opp action: ${action}` }), {
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
