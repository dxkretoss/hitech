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
    const userName = (user?.name || '').toLowerCase().trim();

    let result: any = null;

    switch (action) {
      case 'get':
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

      case 'add_sale':
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
            notes: 'Initial commissioning service.'
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

      case 'delete':
      case 'delete_customer': {
        const { id } = payload;
        await supabase.from('services').delete().eq('customer_id', id);
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;
        result = { success: true };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown customer action: ${action}` }), {
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
