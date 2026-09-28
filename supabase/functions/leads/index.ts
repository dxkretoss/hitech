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
    const userId = user?.id || '';
    const userEmail = (user?.email || '').toLowerCase().trim();
    const userName = (user?.name || '').toLowerCase().trim();

    let result: any = null;

    switch (action) {
      case 'get':
      case 'get_leads': {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        let leads = (data || []).map((l: any) => ({
          id: l.id,
          customerName: l.customer_name,
          company: l.company,
          phone: l.phone,
          branch: l.branch || 'Surat',
          leadType: l.lead_type || 'Hot Lead',
          interestedProduct: l.interested_product,
          requirement: l.requirement,
          status: l.status || 'New',
          lossReason: l.loss_reason || '',
          lossRemark: l.loss_remark || '',
          lossDate: l.loss_date || '',
          followUpDate: l.follow_up_date || new Date().toISOString().split('T')[0],
          notes: l.notes || '',
          userId: l.user_id || '',
          salesPersonId: l.sales_person_id || '',
          salesPersonName: l.sales_person_name || '',
          salesPersonEmail: l.sales_person_email || '',
          createdBy: l.created_by || ''
        }));

        if (isSales && !isOwner) {
          leads = leads.filter((l: any) => {
            const sId = l.salesPersonId || l.userId;
            const sEmail = (l.salesPersonEmail || l.createdBy || '').toLowerCase().trim();
            const sName = (l.salesPersonName || '').toLowerCase().trim();
            return (
              (userId && sId === userId) ||
              (userEmail && sEmail && sEmail === userEmail) ||
              (userName && sName && (sName === userName || sName.includes(userName) || userName.includes(sName)))
            );
          });
        } else if (isEngineer && !isOwner) {
          leads = [];
        }

        result = leads;
        break;
      }

      case 'add':
      case 'add_lead': {
        const lead = payload;
        const id = lead.id || `LD-${Date.now().toString().slice(-4)}`;
        const salesPersonName = lead.salesPersonName || user?.name || 'Sales Rep';
        const salesPersonId = lead.salesPersonId || user?.id || 'S-101';
        const salesPersonEmail = lead.salesPersonEmail || user?.email || '';
        const createdBy = user?.email || '';
        const leadType = lead.leadType || 'Hot Lead';
        const branch = lead.branch || user?.branch || 'Surat';

        const row = {
          id,
          customer_name: lead.customerName || lead.customer_name,
          company: lead.company || '',
          phone: lead.phone || '',
          branch,
          lead_type: leadType,
          interested_product: lead.interestedProduct || lead.interested_product || lead.requirement,
          requirement: lead.requirement,
          status: lead.status || 'New',
          loss_reason: lead.lossReason || null,
          loss_remark: lead.lossRemark || null,
          loss_date: lead.lossDate || null,
          follow_up_date: lead.followUpDate || lead.follow_up_date || new Date().toISOString().split('T')[0],
          notes: lead.notes || '',
          user_id: user?.id || null,
          sales_person_id: salesPersonId,
          sales_person_name: salesPersonName,
          sales_person_email: salesPersonEmail,
          created_by: createdBy
        };

        const { error } = await supabase.from('leads').insert([row]);
        if (error) throw error;

        if (row.status === 'Future Requirement') {
          const foId = `FO-${Date.now().toString().slice(-4)}`;
          await supabase.from('future_opportunities').insert([{
            id: foId,
            customer_name: row.customer_name,
            company: row.company,
            phone: row.phone,
            branch: row.branch,
            requirement: row.requirement,
            expected_purchase_month: lead.expectedPurchaseMonth || 'After 3 Months',
            reminder_date: row.follow_up_date,
            notes: row.notes || '',
            user_id: user?.id || null,
            sales_person_id: salesPersonId,
            sales_person_name: salesPersonName,
            sales_person_email: salesPersonEmail,
            created_by: createdBy
          }]);
        }

        result = {
          id,
          customerName: row.customer_name,
          company: row.company,
          phone: row.phone,
          branch,
          leadType,
          interestedProduct: row.interested_product,
          requirement: row.requirement,
          status: row.status,
          lossReason: row.loss_reason,
          lossRemark: row.loss_remark,
          lossDate: row.loss_date,
          followUpDate: row.follow_up_date,
          notes: row.notes,
          userId: user?.id || '',
          salesPersonId,
          salesPersonName,
          salesPersonEmail,
          createdBy
        };
        break;
      }

      case 'update':
      case 'update_lead': {
        const { id, ...updated } = payload;
        const dbPayload: any = {};
        if (updated.customerName) dbPayload.customer_name = updated.customerName;
        if (updated.company !== undefined) dbPayload.company = updated.company;
        if (updated.phone !== undefined) dbPayload.phone = updated.phone;
        if (updated.leadType) dbPayload.lead_type = updated.leadType;
        if (updated.interestedProduct) dbPayload.interested_product = updated.interestedProduct;
        if (updated.requirement) dbPayload.requirement = updated.requirement;
        if (updated.status) dbPayload.status = updated.status;
        if (updated.lossReason !== undefined) dbPayload.loss_reason = updated.lossReason || null;
        if (updated.lossRemark !== undefined) dbPayload.loss_remark = updated.lossRemark || null;
        if (updated.lossDate !== undefined) dbPayload.loss_date = updated.lossDate || null;
        if (updated.followUpDate !== undefined) dbPayload.follow_up_date = updated.followUpDate || null;
        if (updated.notes !== undefined) dbPayload.notes = updated.notes;
        if (updated.salesPersonName) dbPayload.sales_person_name = updated.salesPersonName;

        const { error } = await supabase.from('leads').update(dbPayload).eq('id', id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'delete':
      case 'delete_lead': {
        const { id } = payload;
        const { error } = await supabase.from('leads').delete().eq('id', id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'convert':
      case 'convert_lead_to_customer': {
        const { leadId, assignedEngineer = 'Sanjay Patel' } = payload;
        const { data: lead, error: leadErr } = await supabase.from('leads').select('*').eq('id', leadId).single();
        if (leadErr || !lead) throw new Error('Lead not found');

        await supabase.from('leads').update({ status: 'Won' }).eq('id', leadId);

        const custId = `CUST-${Date.now().toString().slice(-4)}`;
        const installDate = new Date().toISOString().split('T')[0];

        const newCust = {
          id: custId,
          customer_name: lead.customer_name,
          company: lead.company,
          phone: lead.phone,
          branch: lead.branch || 'Surat',
          purchased_product: lead.interested_product || lead.requirement,
          installation_date: installDate,
          assigned_engineer: assignedEngineer,
          address: lead.company ? `${lead.company} Plant, GIDC Estate, Gujarat` : 'GIDC Industrial Area, Surat',
          sales_person_id: lead.sales_person_id || 'S-101',
          sales_person_name: lead.sales_person_name || 'Vikram Mehta'
        };

        const { error: custErr } = await supabase.from('customers').insert([newCust]);
        if (custErr) throw custErr;

        const initialServiceId = `SRV-${Date.now().toString().slice(-4)}`;
        await supabase.from('services').insert([{
          id: initialServiceId,
          customer_id: custId,
          customer_name: newCust.customer_name,
          company: newCust.company,
          product: newCust.purchased_product,
          service_name: 'Service #1 (First Inspection & Commissioning)',
          scheduled_date: installDate,
          status: 'Upcoming',
          assigned_engineer: assignedEngineer,
          notes: 'Initial commissioning service.'
        }]);

        result = {
          id: custId,
          customerName: newCust.customer_name,
          company: newCust.company,
          phone: newCust.phone,
          branch: newCust.branch,
          purchasedProduct: newCust.purchased_product,
          installationDate: installDate,
          assignedEngineer,
          address: newCust.address,
          salesPersonId: newCust.sales_person_id,
          salesPersonName: newCust.sales_person_name
        };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown lead action: ${action}` }), {
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
