import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Hi-Tech Air Technology CRM - Unified Supabase Edge Function API
 * 
 * Handles all core business logic, role-based scoping, multi-user isolation,
 * lifecycle automation (lead to customer, auto-generated service schedules,
 * stock adjustments, notifications, and analytics).
 */

serve(async (req: Request) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || supabaseAnonKey;

    // Use service role if available for complete backend authorization, fallback to anon
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

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
      // =========================================================================
      // 1. LEADS
      // =========================================================================
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

        // Auto-create future opportunity if status is 'Future Requirement'
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

      case 'delete_lead': {
        const { id } = payload;
        const { error } = await supabase.from('leads').delete().eq('id', id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      case 'convert_lead_to_customer': {
        const { leadId, assignedEngineer = 'Sanjay Patel' } = payload;
        const { data: lead, error: leadErr } = await supabase.from('leads').select('*').eq('id', leadId).single();
        if (leadErr || !lead) throw new Error('Lead not found');

        // Mark lead won
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

        // Auto-generate initial commissioning service
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
          notes: 'Initial commissioning service. Engineer to log work done / parts changed and schedule next service date.'
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

      // =========================================================================
      // 2. FUTURE OPPORTUNITIES
      // =========================================================================
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

      case 'delete_future_opportunity': {
        const { id } = payload;
        const { error } = await supabase.from('future_opportunities').delete().eq('id', id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // =========================================================================
      // 3. CUSTOMERS & DIRECT SALES
      // =========================================================================
      case 'get_customers': {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        let customers = (data || []).map((c: any) => ({
          id: c.id,
          customerName: c.customer_name,
          company: c.company,
          phone: c.phone,
          branch: c.branch || 'Surat',
          category: c.category || (c.purchased_product?.toLowerCase().includes('filter') || c.purchased_product?.toLowerCase().includes('oil') || c.purchased_product?.toLowerCase().includes('spare') || c.assigned_engineer === 'Direct Spare Part Sale' ? 'Spare Part' : 'Machine'),
          purchasedProduct: c.purchased_product,
          quantity: Number(c.quantity) || 1,
          unitPrice: Number(c.unit_price) || 0,
          serialNumber: c.serial_number || '',
          installationDate: c.installation_date,
          assignedEngineer: c.assigned_engineer,
          address: c.address,
          salesPersonId: c.sales_person_id,
          salesPersonName: c.sales_person_name,
          createdAt: c.created_at
        }));

        if (isSales && !isOwner) {
          customers = customers.filter((c: any) => {
            const sId = c.salesPersonId;
            const sName = (c.salesPersonName || '').toLowerCase().trim();
            return (
              (userId && sId === userId) ||
              (userName && sName && (sName === userName || sName.includes(userName) || userName.includes(sName)))
            );
          });
        } else if (isEngineer && !isOwner) {
          customers = customers.filter((c: any) => {
            const eng = (c.assignedEngineer || '').toLowerCase().trim();
            return (
              (userName && eng && (eng === userName || eng.includes(userName) || userName.includes(eng))) ||
              eng === 'direct spare part sale'
            );
          });
        }

        result = customers;
        break;
      }

      case 'add_customer_sale': {
        const saleData = payload;
        const custId = saleData.id || `CUST-${Date.now().toString().slice(-4)}`;
        const installDate = saleData.installationDate || new Date().toISOString().split('T')[0];
        const salesPersonName = saleData.salesPersonName || user?.name || 'Ravi Patel';
        const salesPersonId = saleData.salesPersonId || user?.id || 'S-101';
        const engineer = saleData.assignedEngineer || 'Sanjay Patel';
        const branch = saleData.dispatchBranch || saleData.branch || user?.branch || 'Surat';
        const category = saleData.category || (saleData.purchasedProduct?.toLowerCase().includes('filter') || saleData.purchasedProduct?.toLowerCase().includes('oil') || saleData.purchasedProduct?.toLowerCase().includes('spare') ? 'Spare Part' : 'Machine');
        const quantity = Number(saleData.quantity) || 1;
        const unitPrice = Number(saleData.unitPrice) || 0;
        const serialNumber = saleData.serialNumber || '';

        const newCust = {
          id: custId,
          customer_name: saleData.customerName,
          company: saleData.company,
          phone: saleData.phone,
          branch,
          category,
          purchased_product: saleData.purchasedProduct,
          quantity,
          unit_price: unitPrice,
          serial_number: serialNumber,
          installation_date: installDate,
          assigned_engineer: engineer,
          address: saleData.address || `${saleData.company || saleData.customerName} Site, Gujarat`,
          sales_person_id: salesPersonId,
          sales_person_name: salesPersonName
        };

        const { error } = await supabase.from('customers').insert([newCust]);
        if (error) throw error;

        // Create initial service for machine sales
        if (category !== 'Spare Part' && engineer !== 'Direct Spare Part Sale') {
          const srvId = `SRV-${Date.now().toString().slice(-4)}`;
          await supabase.from('services').insert([{
            id: srvId,
            customer_id: custId,
            customer_name: newCust.customer_name,
            company: newCust.company,
            product: newCust.purchased_product,
            service_name: 'Service #1 (First Inspection & Commissioning)',
            scheduled_date: saleData.nextServiceDate || installDate,
            status: 'Upcoming',
            assigned_engineer: engineer,
            notes: 'Initial commissioning service. Engineer to log work done / parts changed.'
          }]);
        }

        result = {
          id: custId,
          customerName: newCust.customer_name,
          company: newCust.company,
          phone: newCust.phone,
          branch,
          category,
          purchasedProduct: newCust.purchased_product,
          quantity,
          unitPrice,
          serialNumber,
          installationDate: installDate,
          assignedEngineer: engineer,
          address: newCust.address,
          salesPersonId,
          salesPersonName
        };
        break;
      }

      case 'delete_customer': {
        const { id } = payload;
        await supabase.from('services').delete().eq('customer_id', id);
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      // =========================================================================
      // 4. SERVICES
      // =========================================================================
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

        // Auto-generate next service cycle if nextServiceDate provided
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

      // =========================================================================
      // 5. STOCK / INVENTORY
      // =========================================================================
      case 'get_stock': {
        const { data, error } = await supabase
          .from('stock_items')
          .select('*')
          .order('item_name', { ascending: true });

        if (error) throw error;

        result = (data || []).map((s: any) => ({
          id: s.id,
          itemName: s.item_name,
          category: s.category || 'Spare Part',
          partNumber: s.part_number,
          branch: s.branch || 'Surat',
          quantity: Number(s.quantity) || 0,
          unit: s.unit || 'Units',
          minAlertLevel: Number(s.min_alert_level) || 5,
          annualConsumption: Number(s.annual_consumption) || 0,
          unitPrice: Number(s.unit_price) || 0,
          compatibleModels: s.compatible_models || '',
          lastRestockedDate: s.last_restocked_date || new Date().toISOString().split('T')[0],
          notes: s.notes || ''
        }));
        break;
      }

      case 'adjust_stock_quantity': {
        const { id, adjustmentType, quantity, reason, notes } = payload;
        const qtyNum = Number(quantity) || 0;

        const { data: item, error: fetchErr } = await supabase
          .from('stock_items')
          .select('*')
          .eq('id', id)
          .single();

        if (fetchErr || !item) throw new Error('Stock item not found');

        let newQty = Number(item.quantity) || 0;
        if (adjustmentType === 'ADD') newQty += qtyNum;
        else if (adjustmentType === 'DEDUCT') newQty = Math.max(0, newQty - qtyNum);
        else if (adjustmentType === 'SET') newQty = qtyNum;

        const { error: updErr } = await supabase
          .from('stock_items')
          .update({
            quantity: newQty,
            last_restocked_date: adjustmentType === 'ADD' ? new Date().toISOString().split('T')[0] : item.last_restocked_date
          })
          .eq('id', id);

        if (updErr) throw updErr;
        result = { id, quantity: newQty };
        break;
      }

      case 'transfer_stock': {
        const { id, fromBranch, toBranch, quantity, notes } = payload;
        const transferQty = Number(quantity) || 0;

        const { data: sourceItem, error: srcErr } = await supabase
          .from('stock_items')
          .select('*')
          .eq('id', id)
          .single();

        if (srcErr || !sourceItem) throw new Error('Source stock item not found');
        if (sourceItem.quantity < transferQty) throw new Error('Insufficient branch inventory');

        // Deduct from source
        await supabase
          .from('stock_items')
          .update({ quantity: sourceItem.quantity - transferQty })
          .eq('id', id);

        // Add or update target branch item
        const { data: targetItem } = await supabase
          .from('stock_items')
          .select('*')
          .eq('part_number', sourceItem.part_number)
          .eq('branch', toBranch)
          .maybeSingle();

        if (targetItem) {
          await supabase
            .from('stock_items')
            .update({ quantity: (targetItem.quantity || 0) + transferQty })
            .eq('id', targetItem.id);
        } else {
          const targetId = `STK-${sourceItem.part_number.replace(/\s+/g, '-')}-${toBranch.toUpperCase().slice(0, 3)}`;
          await supabase.from('stock_items').insert([{
            id: targetId,
            item_name: sourceItem.item_name,
            category: sourceItem.category,
            part_number: sourceItem.part_number,
            branch: toBranch,
            quantity: transferQty,
            unit: sourceItem.unit,
            min_alert_level: sourceItem.min_alert_level,
            annual_consumption: sourceItem.annual_consumption,
            unit_price: sourceItem.unit_price,
            compatible_models: sourceItem.compatible_models,
            notes: notes || `Transferred from ${fromBranch}`
          }]);
        }

        result = { success: true };
        break;
      }

      // =========================================================================
      // 6. PROFILES & TEAM
      // =========================================================================
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

      // =========================================================================
      // 7. NOTIFICATIONS (Single-Table with Read & Dismissal Arrays)
      // =========================================================================
      case 'get_notifications': {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const filtered = (data || [])
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

        result = filtered;
        break;
      }

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
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
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
