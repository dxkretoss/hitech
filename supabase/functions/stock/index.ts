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

      case 'adjust':
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

      case 'transfer':
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

        await supabase
          .from('stock_items')
          .update({ quantity: sourceItem.quantity - transferQty })
          .eq('id', id);

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

      default:
        return new Response(JSON.stringify({ error: `Unknown stock action: ${action}` }), {
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
