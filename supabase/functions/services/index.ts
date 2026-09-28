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
    const isEngineer = userRole === 'Engineer';
    const userId = user?.id || '';
    const userEmail = (user?.email || '').toLowerCase().trim();
    const userName = (user?.name || '').toLowerCase().trim();

    let result: any = null;

    switch (action) {
      case 'get':
      case 'get_services': {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('scheduled_date', { ascending: true });

        if (error) throw error;

        let services = (data || []).map((s: any) => ({
          id: s.id,
          customerId: s.customer_id,
          customerName: s.customer_name,
          company: s.company,
          product: s.product,
          serviceName: s.service_name,
          scheduledDate: s.scheduled_date,
          status: s.status || 'Upcoming',
          assignedEngineer: s.assigned_engineer,
          assignedEngineerId: s.assigned_engineer_id || '',
          assignedEngineerEmail: s.assigned_engineer_email || '',
          workDone: s.work_done || '',
          partsReplaced: s.parts_replaced || '',
          completionDate: s.completion_date || '',
          nextServiceDate: s.next_service_date || '',
          notes: s.notes || s.engineer_notes || ''
        }));

        if (isEngineer && !isOwner) {
          services = services.filter((s: any) => {
            const engId = s.assignedEngineerId;
            const engEmail = (s.assignedEngineerEmail || '').toLowerCase().trim();
            const engName = (s.assignedEngineer || '').toLowerCase().trim();
            return (
              (userId && engId === userId) ||
              (userEmail && engEmail && engEmail === userEmail) ||
              (userName && engName && (engName === userName || engName.includes(userName) || userName.includes(engName)))
            );
          });
        }

        result = services;
        break;
      }

      case 'complete':
      case 'complete_service': {
        const { serviceId, report = {} } = payload;
        const completionDate = report.completionDate || new Date().toISOString().split('T')[0];

        const { data: service, error: srvErr } = await supabase
          .from('services')
          .select('*')
          .eq('id', serviceId)
          .single();

        if (srvErr || !service) throw new Error('Service not found');

        const updatePayload = {
          status: 'Completed',
          work_done: report.workDone || 'General service completed',
          parts_replaced: report.partsReplaced || 'None',
          completion_date: completionDate,
          next_service_date: report.nextServiceDate || null,
          notes: report.engineerNotes || service.notes || ''
        };

        const { error: updErr } = await supabase
          .from('services')
          .update(updatePayload)
          .eq('id', serviceId);

        if (updErr) throw updErr;

        if (report.nextServiceDate) {
          const nextId = `SRV-${Date.now().toString().slice(-4)}`;
          const currentName = service.service_name || 'Service #1';
          const match = currentName.match(/Service #(\d+)/i);
          const nextNum = match ? parseInt(match[1], 10) + 1 : 2;

          await supabase.from('services').insert([{
            id: nextId,
            customer_id: service.customer_id,
            customer_name: service.customer_name,
            company: service.company,
            product: service.product,
            service_name: `Service #${nextNum} (Scheduled Maintenance)`,
            scheduled_date: report.nextServiceDate,
            status: 'Upcoming',
            assigned_engineer: service.assigned_engineer,
            notes: `Follow-up service scheduled after ${currentName} completion.`
          }]);
        }

        result = { success: true };
        break;
      }

      case 'add':
      case 'add_service': {
        const srv = payload;
        const id = srv.id || `SRV-${Date.now().toString().slice(-4)}`;
        const row = {
          id,
          customer_id: srv.customerId,
          customer_name: srv.customerName,
          company: srv.company,
          product: srv.product,
          service_name: srv.serviceName || 'Scheduled Maintenance Service',
          scheduled_date: srv.scheduledDate || new Date().toISOString().split('T')[0],
          status: srv.status || 'Upcoming',
          assigned_engineer: srv.assignedEngineer || 'Sanjay Patel',
          notes: srv.notes || ''
        };

        const { error } = await supabase.from('services').insert([row]);
        if (error) throw error;
        result = row;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown service action: ${action}` }), {
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
