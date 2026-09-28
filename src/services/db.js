import { supabase, isSupabaseConfigured } from './supabase.js';

/**
 * Real Supabase Database Adapter Layer
 * Handles async CRUD operations directly on Supabase tables:
 * - leads (with sales_person_id & sales_person_name)
 * - customers (with sales_person_name & purchased_product)
 * - future_opportunities (with sales_person_name)
 * - services (auto-scheduled 2m, 6m, 10m maintenance)
 * - profiles
 * - notifications
 */

class SupabaseDatabase {
  // Initial Mock Sales Persons seed if needed
  initialSalesPersons = [
    { id: 'S-101', name: 'Vikram Mehta', email: 'sales@hitechair.in' },
    { id: 'S-102', name: 'Anita Sharma', email: 'anita.sales@hitechair.in' },
    { id: 'S-103', name: 'Rahul Verma', email: 'rahul.sales@hitechair.in' }
  ];

  // --- LEADS ---
  async getLeads() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          return data.map(l => ({
            id: l.id,
            customerName: l.customer_name,
            company: l.company,
            phone: l.phone,
            branch: l.branch || l.city || 'Surat',
            leadType: l.lead_type || l.leadType || 'Hot Lead',
            interestedProduct: l.interested_product,
            requirement: l.requirement,
            status: l.status || 'New',
            lossReason: l.loss_reason || l.lossReason || '',
            lossRemark: l.loss_remark || l.lossRemark || '',
            lossDate: l.loss_date || l.lossDate || '',
            followUpDate: l.follow_up_date || new Date().toISOString().split('T')[0],
            notes: l.notes || '',
            salesPersonId: l.sales_person_id || '',
            salesPersonName: l.sales_person_name || ''
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch leads error, using local database fallback:', e);
      }
    }

    const fallbackLeads = [
      {
        id: 'LD-101',
        customerName: 'Rajesh Shah',
        company: 'Reliance Textiles Ltd',
        phone: '+91 98765-43210',
        leadType: 'Hot Lead',
        interestedProduct: '75 HP VFD Screw Compressor',
        requirement: 'Urgent replacement for main unit in Surat plant',
        status: 'New',
        followUpDate: '2026-09-02',
        notes: 'Decision maker visit scheduled. High budget allocation.',
        salesPersonId: 'S-101',
        salesPersonName: 'Vikram Mehta'
      },
      {
        id: 'LD-102',
        customerName: 'Kishore Patel',
        company: 'Patel Engineering & Tools',
        phone: '+91 98251-67890',
        leadType: 'Cold Lead',
        interestedProduct: '10-Ton Industrial Water Chiller',
        requirement: 'Expansion planned for next quarter',
        status: 'New',
        followUpDate: '2026-09-15',
        notes: 'Sent catalog and pricing. Will review in monthly meeting.',
        salesPersonId: 'S-101',
        salesPersonName: 'Vikram Mehta'
      },
      {
        id: 'LD-103',
        customerName: 'Anil Desai',
        company: 'Navsari Ceramics',
        phone: '+91 99799-17803',
        leadType: 'Hot Lead',
        interestedProduct: '50 HP Screw Air Compressor',
        requirement: 'New production line commissioning',
        status: 'Won',
        followUpDate: '2026-08-30',
        notes: 'PO received, advance payment processed.',
        salesPersonId: 'S-101',
        salesPersonName: 'Vikram Mehta'
      },
      {
        id: 'LD-104',
        customerName: 'Suresh Trivedi',
        company: 'Apex Plastics GIDC',
        phone: '+91 97234-56789',
        leadType: 'Hot Lead',
        interestedProduct: 'Refrigerated Air Dryer 100 CFM',
        requirement: 'Air moisture elimination in line 2',
        status: 'Lost',
        lossReason: 'Price too high / Competitor cheaper',
        lossRemark: 'Client chose a competitor who offered a 15% discount with immediate next-day delivery.',
        lossDate: '2026-08-28',
        followUpDate: '2026-08-28',
        notes: 'Lost to local vendor on pricing.',
        salesPersonId: 'S-101',
        salesPersonName: 'Vikram Mehta'
      }
    ];

    return this.getLocal('hitech_v2_leads', fallbackLeads);
  }

  async addLead(lead, currentUser = null) {
    const id = `LD-${Date.now().toString().slice(-4)}`;
    const salesPersonName = lead.salesPersonName || currentUser?.name || 'Vikram Mehta';
    const salesPersonId = lead.salesPersonId || currentUser?.id || 'S-101';
    const leadType = lead.leadType || 'Hot Lead';
    const branch = lead.branch || currentUser?.branch || 'Surat';

    const newLead = {
      id,
      customer_name: lead.customerName || lead.customer_name,
      company: lead.company || '',
      phone: lead.phone || '',
      branch: branch,
      lead_type: leadType,
      interested_product: lead.interestedProduct || lead.interested_product || lead.requirement,
      requirement: lead.requirement,
      status: lead.status || 'New',
      loss_reason: lead.lossReason || null,
      loss_remark: lead.lossRemark || null,
      loss_date: lead.lossDate ? lead.lossDate : null,
      follow_up_date: (lead.followUpDate || lead.follow_up_date || new Date().toISOString().split('T')[0]),
      notes: lead.notes || '',
      sales_person_id: salesPersonId,
      sales_person_name: salesPersonName
    };

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('leads').insert([newLead]);
        if (error) {
          console.error('Supabase add lead error:', error);
          throw error;
        }
      } catch (e) {
        console.error('Supabase add lead exception:', e);
      }
    }

    const formatted = {
      id,
      customerName: newLead.customer_name,
      company: newLead.company,
      phone: newLead.phone,
      branch: branch,
      leadType: leadType,
      interestedProduct: newLead.interested_product,
      requirement: newLead.requirement,
      status: newLead.status,
      lossReason: newLead.loss_reason,
      lossRemark: newLead.loss_remark,
      lossDate: newLead.loss_date,
      followUpDate: newLead.follow_up_date,
      notes: newLead.notes,
      salesPersonId: salesPersonId,
      salesPersonName: salesPersonName
    };

    const current = await this.getLeads();
    this.saveLocal('hitech_v2_leads', [formatted, ...current]);

    // If marked as Future Requirement, also save to Future Opportunities automatically
    if (lead.status === 'Future Requirement') {
      await this.addFutureOpportunity({
        customerName: formatted.customerName,
        company: formatted.company,
        phone: formatted.phone,
        requirement: formatted.requirement,
        expectedPurchaseMonth: lead.expectedPurchaseMonth || 'After 3 Months',
        reminderDate: formatted.followUpDate,
        notes: formatted.notes,
        salesPersonId: salesPersonId,
        salesPersonName: salesPersonName
      });
    }

    return formatted;
  }

  async updateLead(id, updated) {
    if (isSupabaseConfigured()) {
      try {
        const payload = {};
        if (updated.customerName) payload.customer_name = updated.customerName;
        if (updated.company) payload.company = updated.company;
        if (updated.phone) payload.phone = updated.phone;
        if (updated.leadType) payload.lead_type = updated.leadType;
        if (updated.interestedProduct) payload.interested_product = updated.interestedProduct;
        if (updated.requirement) payload.requirement = updated.requirement;
        if (updated.status) payload.status = updated.status;
        if (updated.lossReason !== undefined) payload.loss_reason = updated.lossReason || null;
        if (updated.lossRemark !== undefined) payload.loss_remark = updated.lossRemark || null;
        if (updated.lossDate !== undefined) payload.loss_date = updated.lossDate ? updated.lossDate : null;
        if (updated.followUpDate !== undefined) payload.follow_up_date = updated.followUpDate ? updated.followUpDate : null;
        if (updated.notes !== undefined) payload.notes = updated.notes;
        if (updated.salesPersonName) payload.sales_person_name = updated.salesPersonName;

        await supabase.from('leads').update(payload).eq('id', id);
      } catch (e) {
        console.error('Supabase update lead error:', e);
      }
    }

    const current = await this.getLeads();
    const updatedList = current.map(l => l.id === id ? { ...l, ...updated } : l);
    this.saveLocal('hitech_v2_leads', updatedList);
  }

  async markLeadAsLost(id, { lossReason, lossRemark }) {
    const today = new Date().toISOString().split('T')[0];
    await this.updateLead(id, {
      status: 'Lost',
      lossReason: lossReason || 'Other',
      lossRemark: lossRemark || '',
      lossDate: today
    });
  }

  async deleteLead(id) {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('leads').delete().eq('id', id);
      } catch (e) {
        console.error('Supabase delete lead error:', e);
      }
    }

    const current = await this.getLeads();
    this.saveLocal('hitech_v2_leads', current.filter(l => l.id !== id));
  }

  // Convert Lead to Customer & Auto-Generate 3 Service Reminders (+2m, +6m, +10m)
  async convertLeadToCustomer(leadId, assignedEngineer = 'Sanjay Patel') {
    const leads = await this.getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return null;

    await this.updateLead(leadId, { status: 'Won' });

    const custId = `CUST-${Date.now().toString().slice(-4)}`;
    const installDate = new Date().toISOString().split('T')[0];

    const newCust = {
      id: custId,
      customer_name: lead.customerName,
      company: lead.company,
      phone: lead.phone,
      purchased_product: lead.interestedProduct || lead.requirement,
      installation_date: installDate,
      assigned_engineer: assignedEngineer,
      address: lead.company ? `${lead.company} Plant, GIDC Estate, Gujarat` : 'GIDC Industrial Area, Surat',
      sales_person_id: lead.salesPersonId || 'S-101',
      sales_person_name: lead.salesPersonName || 'Vikram Mehta'
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('customers').insert([newCust]);
      } catch (e) {
        console.error('Supabase insert customer error:', e);
      }
    }

    const formattedCust = {
      id: custId,
      customerName: lead.customerName,
      company: lead.company,
      phone: lead.phone,
      purchasedProduct: lead.interestedProduct || lead.requirement,
      installationDate: installDate,
      assignedEngineer: assignedEngineer,
      address: newCust.address,
      salesPersonId: newCust.sales_person_id,
      salesPersonName: newCust.sales_person_name
    };

    const currentCusts = await this.getCustomers();
    this.saveLocal('hitech_v2_customers', [formattedCust, ...currentCusts]);

    // Create Initial Service for Field Engineer
    await this.generateInitialServiceForCustomer(formattedCust);

    return formattedCust;
  }

  // Save Direct Customer Sale (Creates initial service for Field Engineer)
  async addCustomerSale(saleData, currentUser = null) {
    const custId = `CUST-${Date.now().toString().slice(-4)}`;
    const installDate = saleData.installationDate || new Date().toISOString().split('T')[0];
    const salesPersonName = saleData.salesPersonName || currentUser?.name || 'Ravi Patel';
    const salesPersonId = saleData.salesPersonId || currentUser?.id || 'S-101';
    const engineer = saleData.assignedEngineer || 'Sanjay Patel';
    const branch = saleData.dispatchBranch || saleData.branch || currentUser?.branch || 'Surat';
    const category = saleData.category || (saleData.purchasedProduct?.toLowerCase().includes('filter') || saleData.purchasedProduct?.toLowerCase().includes('oil') || saleData.purchasedProduct?.toLowerCase().includes('spare') ? 'Spare Part' : 'Machine');
    const quantity = Number(saleData.quantity) || 1;
    const unitPrice = Number(saleData.unitPrice) || 0;
    const serialNumber = saleData.serialNumber || '';

    const newCust = {
      id: custId,
      customer_name: saleData.customerName,
      company: saleData.company,
      phone: saleData.phone,
      branch: branch,
      category: category,
      purchased_product: saleData.purchasedProduct,
      quantity: quantity,
      unit_price: unitPrice,
      serial_number: serialNumber,
      installation_date: installDate,
      assigned_engineer: engineer,
      address: saleData.address || `${saleData.company || saleData.customerName} Site, Gujarat`,
      sales_person_id: salesPersonId,
      sales_person_name: salesPersonName
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('customers').insert([newCust]);
      } catch (e) {
        console.error('Supabase insert direct customer error:', e);
      }
    }

    const formattedCust = {
      id: custId,
      customerName: saleData.customerName,
      company: saleData.company,
      phone: saleData.phone,
      branch: branch,
      category: category,
      purchasedProduct: saleData.purchasedProduct,
      quantity: quantity,
      unitPrice: unitPrice,
      serialNumber: serialNumber,
      installationDate: installDate,
      assignedEngineer: engineer,
      address: newCust.address,
      salesPersonId: salesPersonId,
      salesPersonName: salesPersonName
    };

    const currentCusts = await this.getCustomers();
    this.saveLocal('hitech_v2_customers', [formattedCust, ...currentCusts]);

    // Create Initial Service for Field Engineer (for machines)
    if (category !== 'Spare Part' && engineer !== 'Direct Spare Part Sale') {
      await this.generateInitialServiceForCustomer(formattedCust, saleData.nextServiceDate);
    }

    return formattedCust;
  }

  // Initial Service Creation (Dynamic Next Service cycle driven by Engineer)
  async generateInitialServiceForCustomer(customer, customServiceDate = null) {
    const installDate = customServiceDate || customer.installationDate || new Date().toISOString().split('T')[0];
    const initialId = `SRV-${Date.now().toString().slice(-4)}`;

    const initialService = {
      id: initialId,
      customer_id: customer.id,
      customer_name: customer.customerName,
      company: customer.company,
      product: customer.purchasedProduct,
      service_name: 'Service #1 (First Inspection & Commissioning)',
      scheduled_date: installDate,
      status: 'Upcoming',
      assigned_engineer: customer.assignedEngineer || 'Sanjay Patel',
      work_done: null,
      parts_replaced: null,
      completion_date: null,
      next_service_date: null,
      notes: 'Initial commissioning service. Engineer to log work done / parts changed and schedule next service date.'
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('services').insert([initialService]);
      } catch (e) {
        console.error('Supabase insert initial service error:', e);
      }
    }

    const formatted = {
      id: initialId,
      customerId: customer.id,
      customerName: customer.customerName,
      company: customer.company,
      product: customer.purchasedProduct,
      serviceName: initialService.service_name,
      scheduledDate: initialService.scheduled_date,
      status: 'Upcoming',
      assignedEngineer: initialService.assigned_engineer,
      workDone: '',
      partsReplaced: '',
      completionDate: '',
      nextServiceDate: '',
      notes: initialService.notes
    };

    const currentServices = await this.getServices();
    this.saveLocal('hitech_v2_services', [formatted, ...currentServices]);
    return [formatted];
  }

  // Save Lead to Future Opportunity Vault
  async saveLeadToFutureOpportunity(leadId, expectedMonth, reminderDate) {
    const leads = await this.getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return null;

    await this.updateLead(leadId, { status: 'Future Requirement' });

    return await this.addFutureOpportunity({
      customerName: lead.customerName,
      company: lead.company,
      phone: lead.phone,
      requirement: lead.requirement,
      expectedPurchaseMonth: expectedMonth || '6 Months Later',
      reminderDate: reminderDate || new Date().toISOString().split('T')[0],
      notes: lead.notes || 'Client deferred requirement.',
      salesPersonId: lead.salesPersonId,
      salesPersonName: lead.salesPersonName
    });
  }

  // --- FUTURE OPPORTUNITIES ---
  async getFutureOpportunities() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('future_opportunities')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          return data.map(o => ({
            id: o.id,
            customerName: o.customer_name,
            company: o.company,
            phone: o.phone,
            requirement: o.requirement,
            expectedPurchaseMonth: o.expected_purchase_month,
            reminderDate: o.reminder_date,
            notes: o.notes,
            salesPersonId: o.sales_person_id || 'S-101',
            salesPersonName: o.sales_person_name || 'Vikram Mehta'
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch future opps error:', e);
      }
    }
    return this.getLocal('hitech_v2_future_opps', []);
  }

  async addFutureOpportunity(opp, currentUser = null) {
    const id = `FO-${Date.now().toString().slice(-4)}`;
    const salesPersonName = opp.salesPersonName || currentUser?.name || 'Vikram Mehta';
    const salesPersonId = opp.salesPersonId || currentUser?.id || 'S-101';

    const newOpp = {
      id,
      customer_name: opp.customerName,
      company: opp.company,
      phone: opp.phone,
      requirement: opp.requirement,
      expected_purchase_month: opp.expectedPurchaseMonth || '6 Months Later',
      reminder_date: opp.reminderDate || new Date().toISOString().split('T')[0],
      notes: opp.notes || '',
      sales_person_id: salesPersonId,
      sales_person_name: salesPersonName
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('future_opportunities').insert([newOpp]);
      } catch (e) {
        console.error('Supabase add future opp error:', e);
      }
    }

    const formatted = {
      id,
      customerName: opp.customerName,
      company: opp.company,
      phone: opp.phone,
      requirement: opp.requirement,
      expectedPurchaseMonth: newOpp.expected_purchase_month,
      reminderDate: newOpp.reminder_date,
      notes: newOpp.notes,
      salesPersonId: salesPersonId,
      salesPersonName: salesPersonName
    };

    const current = await this.getFutureOpportunities();
    this.saveLocal('hitech_v2_future_opps', [formatted, ...current]);
    return formatted;
  }

  async deleteFutureOpportunity(id) {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('future_opportunities').delete().eq('id', id);
      } catch (e) {
        console.error('Supabase delete future opp error:', e);
      }
    }
    const current = await this.getFutureOpportunities();
    this.saveLocal('hitech_v2_future_opps', current.filter(o => o.id !== id));
  }

  // --- CUSTOMERS ---
  async getCustomers() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          return data.map(c => ({
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
            salesPersonId: c.sales_person_id || 'S-101',
            salesPersonName: c.sales_person_name || 'Vikram Mehta'
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch customers error:', e);
      }
    }

    const fallbackCustomers = [
      {
        id: 'CUST-801',
        customerName: 'Pravin Solanki',
        company: 'Surat Silk Prints & Fabrics',
        phone: '+91 98251 12345',
        branch: 'Surat',
        category: 'Machine',
        purchasedProduct: 'HAT 37 - 50 HP (37 kW) Rotary Screw Compressor',
        installationDate: '2026-08-10',
        assignedEngineer: 'Sanjay Patel',
        address: 'Plot 42, GIDC Sachin, Surat',
        salesPersonId: 'S-101',
        salesPersonName: 'Vikram Mehta'
      },
      {
        id: 'CUST-802',
        customerName: 'Haresh Patel',
        company: 'Morbi Ceramic Glazes Ltd',
        phone: '+91 98252 23456',
        branch: 'Morbi',
        category: 'Machine',
        purchasedProduct: 'HAT 75 - 100 HP (75 kW) Rotary Screw Compressor',
        installationDate: '2026-08-15',
        assignedEngineer: 'Rameshwar Joshi',
        address: '8-A National Highway, Morbi',
        salesPersonId: 'S-101',
        salesPersonName: 'Vikram Mehta'
      },
      {
        id: 'CUST-803',
        customerName: 'Dharmesh Vora',
        company: 'Rajkot Precision Forgings',
        phone: '+91 98253 34567',
        branch: 'Rajkot',
        category: 'Machine',
        purchasedProduct: 'HAT 22 - 30 HP (22 kW) Rotary Screw Compressor',
        installationDate: '2026-08-20',
        assignedEngineer: 'Ketan Solanki',
        address: 'Aji GIDC Industrial Area, Rajkot',
        salesPersonId: 'S-102',
        salesPersonName: 'Anita Sharma'
      },
      {
        id: 'CUST-804',
        customerName: 'Mahesh Balar',
        company: 'Diamond Laser Cutting Hub',
        phone: '+91 98254 45678',
        branch: 'Surat',
        category: 'Spare Part',
        purchasedProduct: 'Air Filter Cartridge (HAT 4 - HAT 11) (2 Units)',
        quantity: 2,
        unitPrice: 1800,
        installationDate: '2026-08-22',
        assignedEngineer: 'Direct Spare Part Sale',
        address: 'Katargam Diamond Zone, Surat',
        salesPersonId: 'S-101',
        salesPersonName: 'Vikram Mehta'
      },
      {
        id: 'CUST-805',
        customerName: 'Kishore Jadeja',
        company: 'Rotary Valves & Engineering',
        phone: '+91 98255 56789',
        branch: 'Morbi',
        category: 'Spare Part',
        purchasedProduct: 'Synthetic Compressor Lubricant (ISO VG 46 - 20L) (1 Pail)',
        quantity: 1,
        unitPrice: 7800,
        installationDate: '2026-08-25',
        assignedEngineer: 'Direct Spare Part Sale',
        address: 'Wankaner Road, Morbi',
        salesPersonId: 'S-101',
        salesPersonName: 'Vikram Mehta'
      }
    ];

    return this.getLocal('hitech_v2_customers', fallbackCustomers);
  }

  async getCustomerById(id) {
    const custs = await this.getCustomers();
    return custs.find(c => c.id === id) || null;
  }

  async deleteCustomer(id) {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('customers').delete().eq('id', id);
        await supabase.from('services').delete().eq('customer_id', id);
      } catch (e) {
        console.error('Supabase delete customer error:', e);
      }
    }
    const current = await this.getCustomers();
    this.saveLocal('hitech_v2_customers', current.filter(c => c.id !== id));

    const services = await this.getServices();
    this.saveLocal('hitech_v2_services', services.filter(s => s.customerId !== id));
  }

  // --- SERVICES ---
  async getServices() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('scheduled_date', { ascending: true });

        if (error) throw error;
        if (data) {
          return data.map(s => ({
            id: s.id,
            customerId: s.customer_id,
            customerName: s.customer_name,
            company: s.company,
            branch: s.branch || 'Surat',
            product: s.product,
            serviceName: s.service_name,
            scheduledDate: s.scheduled_date,
            status: s.status,
            assignedEngineer: s.assigned_engineer,
            workDone: s.work_done || s.workDone || '',
            partsReplaced: s.parts_replaced || s.partsReplaced || '',
            completionDate: s.completion_date || s.completionDate || '',
            nextServiceDate: s.next_service_date || s.nextServiceDate || '',
            engineerNotes: s.engineer_notes || s.engineerNotes || '',
            notes: s.notes || ''
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch services error:', e);
      }
    }

    const fallbackServices = [
      {
        id: 'SRV-101',
        customerId: 'CUST-101',
        customerName: 'Dharmesh Joshi',
        company: 'Surat Diamond Craft',
        product: '50 HP Screw Air Compressor',
        serviceName: 'Service #1 (First Inspection & Commissioning)',
        scheduledDate: '2026-08-25',
        completionDate: '2026-08-25',
        status: 'Completed',
        assignedEngineer: 'Sanjay Patel',
        workDone: 'Replaced primary air filter cartridge, checked discharge pressure (8.5 bar), flushed condensate drain.',
        partsReplaced: 'Air Filter Cartridge (Part #AF-50HP)',
        nextServiceDate: '2026-11-25',
        engineerNotes: 'Compressor operating within optimal temp (78°C). Advised customer on weekly filter cleaning.'
      },
      {
        id: 'SRV-102',
        customerId: 'CUST-101',
        customerName: 'Dharmesh Joshi',
        company: 'Surat Diamond Craft',
        product: '50 HP Screw Air Compressor',
        serviceName: 'Service #2 (Scheduled Maintenance)',
        scheduledDate: '2026-11-25',
        completionDate: '',
        status: 'Upcoming',
        assignedEngineer: 'Sanjay Patel',
        workDone: '',
        partsReplaced: '',
        nextServiceDate: '',
        notes: 'Next service scheduled by Sanjay Patel following Service #1. Focus: Oil filter change & belt tension check.'
      },
      {
        id: 'SRV-103',
        customerId: 'CUST-102',
        customerName: 'Rajesh Shah',
        company: 'Reliance Textiles Ltd',
        product: '75 HP VFD Screw Compressor',
        serviceName: 'Service #1 (First Inspection & Commissioning)',
        scheduledDate: '2026-09-05',
        completionDate: '',
        status: 'Upcoming',
        assignedEngineer: 'Sanjay Patel',
        workDone: '',
        partsReplaced: '',
        nextServiceDate: '',
        notes: 'Initial inspection upon installation. Engineer to log work done / parts changed and schedule next service date.'
      }
    ];

    return this.getLocal('hitech_v2_services', fallbackServices);
  }

  async getServicesByCustomer(customerId) {
    const services = await this.getServices();
    return services.filter(s => s.customerId === customerId);
  }

  async completeService(serviceId, report) {
    const services = await this.getServices();
    const service = services.find(s => s.id === serviceId);
    if (!service) return null;

    const completionDate = report.completionDate || new Date().toISOString().split('T')[0];
    const nextServiceDate = report.nextServiceDate || '';
    const workDone = report.workDone || '';
    const partsReplaced = report.partsReplaced || '';
    const engineerNotes = report.engineerNotes || '';
    const assignedEngineer = report.assignedEngineer || service.assignedEngineer || 'Sanjay Patel';

    // Update current service as Completed
    const updatedService = {
      ...service,
      status: 'Completed',
      workDone: workDone,
      partsReplaced: partsReplaced,
      completionDate: completionDate,
      nextServiceDate: nextServiceDate,
      engineerNotes: engineerNotes,
      assignedEngineer: assignedEngineer,
      notes: engineerNotes || service.notes
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('services').update({
          status: 'Completed',
          work_done: workDone,
          parts_replaced: partsReplaced,
          completion_date: completionDate,
          next_service_date: nextServiceDate,
          notes: engineerNotes || service.notes
        }).eq('id', serviceId);
      } catch (e) {
        console.error('Supabase complete service error:', e);
      }
    }

    let updatedList = services.map(s => s.id === serviceId ? updatedService : s);

    // If nextServiceDate is provided, create the Next Service record!
    if (nextServiceDate) {
      const nextServiceId = `SRV-${Date.now().toString().slice(-4)}`;
      const completedCount = updatedList.filter(s => s.customerId === service.customerId && s.status === 'Completed').length;
      const nextServiceName = `Service #${completedCount + 1} (Scheduled Maintenance)`;

      const newNextService = {
        id: nextServiceId,
        customerId: service.customerId,
        customerName: service.customerName,
        company: service.company,
        product: service.product,
        serviceName: nextServiceName,
        scheduledDate: nextServiceDate,
        status: 'Upcoming',
        assignedEngineer: assignedEngineer,
        workDone: '',
        partsReplaced: '',
        completionDate: '',
        nextServiceDate: '',
        notes: `Scheduled following previous service completed on ${completionDate}. Notes: ${engineerNotes || 'Routine inspection & parts check.'}`
      };

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('services').insert([{
            id: nextServiceId,
            customer_id: service.customerId,
            customer_name: service.customerName,
            company: service.company,
            product: service.product,
            service_name: nextServiceName,
            scheduled_date: nextServiceDate,
            status: 'Upcoming',
            assigned_engineer: assignedEngineer,
            notes: newNextService.notes
          }]);
        } catch (e) {
          console.error('Supabase add next service error:', e);
        }
      }

      updatedList = [newNextService, ...updatedList];
    }

    // Deduct replaced spare parts from Branch Warehouse Stock
    const serviceBranch = service.branch || 'Surat';
    const allStock = await this.getStockItems();

    if (report.usedStockParts && report.usedStockParts.length > 0) {
      for (const p of report.usedStockParts) {
        const qtyToDeduct = Number(p.usedQty) || 1;
        await this.adjustStockQuantity(p.id, {
          adjustmentType: 'DEDUCT',
          quantity: qtyToDeduct,
          reason: 'Service Maintenance Part Replacement',
          notes: `Replaced in ${service.serviceName} (${service.customerName}) by ${assignedEngineer}`
        });
      }
    } else if (partsReplaced) {
      const replacedLower = partsReplaced.toLowerCase();
      const matchingParts = (allStock || []).filter(
        s => s.category === 'Spare Part' &&
        s.branch === serviceBranch &&
        (replacedLower.includes(s.itemName.toLowerCase()) || (s.partNumber && replacedLower.includes(s.partNumber.toLowerCase())))
      );

      for (const matched of matchingParts) {
        if (Number(matched.quantity) > 0) {
          await this.adjustStockQuantity(matched.id, {
            adjustmentType: 'DEDUCT',
            quantity: 1,
            reason: 'Service Maintenance Part Replacement',
            notes: `Replaced in ${service.serviceName} (${service.customerName}) by ${assignedEngineer}`
          });
        }
      }
    }

    this.saveLocal('hitech_v2_services', updatedList);
    return updatedService;
  }

  async addService(serviceData) {
    const id = `SRV-${Date.now().toString().slice(-4)}`;
    const newService = {
      id,
      customerId: serviceData.customerId,
      customerName: serviceData.customerName,
      company: serviceData.company,
      product: serviceData.product,
      serviceName: serviceData.serviceName || 'Scheduled Maintenance Service',
      scheduledDate: serviceData.scheduledDate || new Date().toISOString().split('T')[0],
      status: serviceData.status || 'Upcoming',
      assignedEngineer: serviceData.assignedEngineer || 'Sanjay Patel',
      workDone: serviceData.workDone || '',
      partsReplaced: serviceData.partsReplaced || '',
      completionDate: serviceData.completionDate || '',
      nextServiceDate: serviceData.nextServiceDate || '',
      notes: serviceData.notes || ''
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('services').insert([{
          id,
          customer_id: newService.customerId,
          customer_name: newService.customerName,
          company: newService.company,
          product: newService.product,
          service_name: newService.serviceName,
          scheduled_date: newService.scheduledDate,
          status: newService.status,
          assigned_engineer: newService.assignedEngineer,
          notes: newService.notes
        }]);
      } catch (e) {
        console.error('Supabase add service error:', e);
      }
    }

    const current = await this.getServices();
    this.saveLocal('hitech_v2_services', [newService, ...current]);
    return newService;
  }

  async updateServiceStatus(serviceId, newStatus) {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('services').update({ status: newStatus }).eq('id', serviceId);
      } catch (e) {
        console.error('Supabase update service status error:', e);
      }
    }
    const current = await this.getServices();
    this.saveLocal('hitech_v2_services', current.map(s => s.id === serviceId ? { ...s, status: newStatus } : s));
  }

  // --- PROFILES / USERS (Registered Staff) ---
  async getProfiles() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data && data.length > 0) {
          return data.map(p => ({
            id: p.id,
            name: p.name || p.email.split('@')[0],
            email: p.email,
            role: p.role || 'Sales',
            branch: p.branch || 'Surat',
            canViewStock: p.can_view_stock === true || p.canViewStock === true,
            status: 'Active',
            date: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch profiles error:', e);
      }
    }
    const local = this.getLocal('hitech_v2_profiles', null);
    if (local && local.length > 0) {
      return local;
    }
    const defaultProfiles = [
      { id: 'S-101', name: 'Vikram Mehta', email: 'sales@hitechair.in', role: 'Sales', branch: 'Surat', canViewStock: false, status: 'Active', date: '2026-08-01' },
      { id: 'S-102', name: 'Anita Sharma', email: 'anita.sales@hitechair.in', role: 'Sales', branch: 'Surat', canViewStock: false, status: 'Active', date: '2026-08-02' },
      { id: 'E-201', name: 'Sanjay Patel', email: 'sanjay.engineer@hitechair.in', role: 'Engineer', branch: 'Surat', canViewStock: true, status: 'Active', date: '2026-08-03' },
      { id: 'A-301', name: 'Hi-Tech Super Administrator', email: 'admin@hitechair.in', role: 'Owner', branch: 'Surat', canViewStock: true, status: 'Active', date: '2026-07-15' }
    ];
    this.saveLocal('hitech_v2_profiles', defaultProfiles);
    return defaultProfiles;
  }

  async updateProfileStockAccess(profileId, canViewStock) {
    if (isSupabaseConfigured()) {
      try {
        // 1. Try updating by Supabase UUID/ID
        const { data, error } = await supabase
          .from('profiles')
          .update({ can_view_stock: canViewStock })
          .eq('id', profileId)
          .select();

        if (error) {
          console.warn('Supabase update profile by id returned error, trying email fallback:', error);
          const currentLocal = this.getLocal('hitech_v2_profiles', []) || [];
          const target = currentLocal.find(p => p.id === profileId);
          if (target && target.email) {
            const { error: emailErr } = await supabase
              .from('profiles')
              .update({ can_view_stock: canViewStock })
              .eq('email', target.email);
            if (emailErr) console.warn('Supabase update by email error:', emailErr);
          }
        }
      } catch (e) {
        console.warn('Supabase update profile stock access error:', e);
      }
    }

    // 2. Always immediately update and persist local storage
    const currentLocal = this.getLocal('hitech_v2_profiles', []) || [];
    let updated = [];
    if (currentLocal.length > 0) {
      updated = currentLocal.map(p => 
        (p.id === profileId || (p.email && p.email === profileId)) 
          ? { ...p, canViewStock, can_view_stock: canViewStock } 
          : p
      );
    } else {
      const defaultList = await this.getProfiles();
      updated = defaultList.map(p => 
        (p.id === profileId || (p.email && p.email === profileId)) 
          ? { ...p, canViewStock, can_view_stock: canViewStock } 
          : p
      );
    }
    this.saveLocal('hitech_v2_profiles', updated);

    // 3. Also update logged in user in localStorage if matching
    try {
      const currentUser = JSON.parse(localStorage.getItem('hitech_v2_user') || '{}');
      const targetProfile = updated.find(p => p.id === profileId || p.email === profileId);
      if (currentUser && (currentUser.id === profileId || (targetProfile && currentUser.email === targetProfile.email))) {
        currentUser.canViewStock = canViewStock;
        currentUser.can_view_stock = canViewStock;
        localStorage.setItem('hitech_v2_user', JSON.stringify(currentUser));
      }
    } catch (e) {
      console.error('Error updating current session user stock access:', e);
    }

    return updated;
  }

  // --- ADMIN ANALYTICS & SALES PERSON ATTRIBUTION BREAKDOWN ---
  async getSalesPerformanceSummary() {
    const [leads, futureOpps, customers, profiles] = await Promise.all([
      this.getLeads(),
      this.getFutureOpportunities(),
      this.getCustomers(),
      this.getProfiles()
    ]);

    const salesReps = profiles.filter(p => p.role === 'Sales');

    // Group leads, future opps, and customers by sales rep name
    const summary = salesReps.map(rep => {
      const repLeads = leads.filter(l => l.salesPersonName === rep.name || l.salesPersonId === rep.id);
      const repFutureOpps = futureOpps.filter(o => o.salesPersonName === rep.name || o.salesPersonId === rep.id);
      const repCustomers = customers.filter(c => c.salesPersonName === rep.name || c.salesPersonId === rep.id);

      return {
        id: rep.id,
        name: rep.name,
        email: rep.email,
        totalLeads: repLeads.length,
        futureOpps: repFutureOpps.length,
        wonDeals: repCustomers.length,
        leadsList: repLeads,
        futureOppsList: repFutureOpps,
        customersList: repCustomers
      };
    });

    return summary;
  }

  // --- NOTIFICATIONS ---
  async getNotifications() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) return data;
      } catch (e) {
        console.warn('Supabase fetch notifications error:', e);
      }
    }
    return this.getLocal('hitech_v2_notifications', [
      { id: '1', title: 'New Sales Lead Added', message: 'Rajesh Shah (Reliance Textiles) logged by Vikram Mehta.', type: 'info', read: false },
      { id: '2', title: 'Automated 2-Month Service Reminder', message: 'Service #1 due for Surat Diamond Craft (Eng: Sanjay Patel).', type: 'warning', read: false }
    ]);
  }

  async deleteNotification(id) {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('notifications').delete().eq('id', id);
      } catch (e) {
        console.error('Supabase delete notification error:', e);
      }
    }
    const current = await this.getNotifications();
    this.saveLocal('hitech_v2_notifications', current.filter(n => n.id !== id));
  }

  async clearAllNotifications() {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('notifications').delete().neq('id', '0');
      } catch (e) {
        console.error('Supabase clear notifications error:', e);
      }
    }
    this.saveLocal('hitech_v2_notifications', []);
  }

  // --- STOCK / INVENTORY (Branch-Wise: Surat, Morbi, Rajkot) ---
  async getStockItems() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('stock_items')
          .select('*')
          .order('item_name', { ascending: true });

        if (error) throw error;
        if (data) {
          return data.map(s => ({
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
        }
      } catch (e) {
        console.warn('Supabase fetch stock items error, using local fallback:', e);
      }
    }

    const fallbackStock = [
      // =========================================================================
      // OFFICIAL HI-TECH ROTARY SCREW COMPRESSORS (Single Stage - PDF Page 4)
      // =========================================================================
      {
        id: 'STK-HAT-04-SRT',
        itemName: 'HAT 4 - 5 HP (4 kW) Rotary Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 4',
        branch: 'Surat',
        quantity: 4,
        unit: 'Units',
        minAlertLevel: 2,
        annualConsumption: 20,
        unitPrice: 185000,
        compatibleModels: 'HAT 4 (5 HP / 4 kW) Single Stage',
        lastRestockedDate: '2026-09-01',
        notes: 'Power: 4 kW (5 HP) | FAD: 23/20/18 CFM @ 7/8/10 BAR | Noise: 57 dB(A) | Dim: 85x62x98 cm | Wt: 210 kg | Outlet: G 1/2"'
      },
      {
        id: 'STK-HAT-07-SRT',
        itemName: 'HAT 7 - 10 HP (7.5 kW) Rotary Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 7',
        branch: 'Surat',
        quantity: 5,
        unit: 'Units',
        minAlertLevel: 2,
        annualConsumption: 25,
        unitPrice: 245000,
        compatibleModels: 'HAT 7 (10 HP / 7.5 kW) Single Stage',
        lastRestockedDate: '2026-09-01',
        notes: 'Power: 7.5 kW (10 HP) | FAD: 43/39/32 CFM @ 7/8/10 BAR | Noise: 61 dB(A) | Dim: 95x67x103 cm | Wt: 250 kg | Outlet: G 1/2"'
      },
      {
        id: 'STK-HAT-11-SRT',
        itemName: 'HAT 11 - 15 HP (11 kW) Rotary Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 11',
        branch: 'Surat',
        quantity: 4,
        unit: 'Units',
        minAlertLevel: 2,
        annualConsumption: 22,
        unitPrice: 295000,
        compatibleModels: 'HAT 11 (15 HP / 11 kW) Single Stage',
        lastRestockedDate: '2026-09-01',
        notes: 'Power: 11 kW (15 HP) | FAD: 62/54/47 CFM @ 7/8/10 BAR | Noise: 63 dB(A) | Dim: 115x82x103 cm | Wt: 400 kg | Outlet: G 3/4"'
      },
      {
        id: 'STK-HAT-15-MRB',
        itemName: 'HAT 15 - 20 HP (15 kW) Rotary Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 15',
        branch: 'Morbi',
        quantity: 4,
        unit: 'Units',
        minAlertLevel: 2,
        annualConsumption: 18,
        unitPrice: 340000,
        compatibleModels: 'HAT 15 (20 HP / 15 kW) Single Stage',
        lastRestockedDate: '2026-09-01',
        notes: 'Power: 15 kW (20 HP) | FAD: 90/83/77 CFM @ 7/8/10 BAR | Noise: 65 dB(A) | Dim: 115x82x103 cm | Wt: 400 kg | Outlet: G 3/4"'
      },
      {
        id: 'STK-HAT-18-MRB',
        itemName: 'HAT 18 - 25 HP (18.5 kW) Rotary Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 18',
        branch: 'Morbi',
        quantity: 3,
        unit: 'Units',
        minAlertLevel: 2,
        annualConsumption: 20,
        unitPrice: 395000,
        compatibleModels: 'HAT 18 (25 HP / 18.5 kW) Single Stage',
        lastRestockedDate: '2026-09-01',
        notes: 'Power: 18.5 kW (25 HP) | FAD: 119/108/97 CFM @ 7/8/10 BAR | Noise: 67 dB(A) | Dim: 135x92x123 cm | Wt: 550 kg | Outlet: G 1"'
      },
      {
        id: 'STK-HAT-22-RJK',
        itemName: 'HAT 22 - 30 HP (22 kW) Rotary Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 22',
        branch: 'Rajkot',
        quantity: 5,
        unit: 'Units',
        minAlertLevel: 2,
        annualConsumption: 28,
        unitPrice: 445000,
        compatibleModels: 'HAT 22 (30 HP / 22 kW) Single Stage',
        lastRestockedDate: '2026-09-01',
        notes: 'Power: 22 kW (30 HP) | FAD: 135/129/114 CFM @ 7/8/10 BAR | Noise: 67 dB(A) | Dim: 135x92x123 cm | Wt: 550 kg | Outlet: G 1"'
      },
      {
        id: 'STK-HAT-30-RJK',
        itemName: 'HAT 30 - 40 HP (30 kW) Rotary Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 30',
        branch: 'Rajkot',
        quantity: 3,
        unit: 'Units',
        minAlertLevel: 1,
        annualConsumption: 16,
        unitPrice: 520000,
        compatibleModels: 'HAT 30 (40 HP / 30 kW) Single Stage',
        lastRestockedDate: '2026-09-01',
        notes: 'Power: 30 kW (40 HP) | FAD: 185/179/163 CFM @ 7/8/10 BAR | Noise: 70 dB(A) | Dim: 150x102x131 cm | Wt: 700 kg | Outlet: G-1 1/2"'
      },
      {
        id: 'STK-HAT-37-SRT',
        itemName: 'HAT 37 - 50 HP (37 kW) Rotary Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 37',
        branch: 'Surat',
        quantity: 4,
        unit: 'Units',
        minAlertLevel: 2,
        annualConsumption: 24,
        unitPrice: 590000,
        compatibleModels: 'HAT 37 (50 HP / 37 kW) Single Stage',
        lastRestockedDate: '2026-09-01',
        notes: 'Power: 37 kW (50 HP) | FAD: 239/220/203 CFM @ 7/8/10 BAR | Noise: 71 dB(A) | Dim: 150x102x131 cm | Wt: 750 kg | Outlet: G-1 1/2"'
      },
      {
        id: 'STK-HAT-45-MRB',
        itemName: 'HAT 45 - 60 HP (45 kW) Rotary Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 45',
        branch: 'Morbi',
        quantity: 3,
        unit: 'Units',
        minAlertLevel: 1,
        annualConsumption: 15,
        unitPrice: 680000,
        compatibleModels: 'HAT 45 (60 HP / 45 kW) Single Stage',
        lastRestockedDate: '2026-09-01',
        notes: 'Power: 45 kW (60 HP) | FAD: 286/248/225 CFM @ 7/8/10 BAR | Noise: 73 dB(A) | Dim: 150x102x131 cm | Wt: 800 kg | Outlet: G 2"'
      },
      {
        id: 'STK-HAT-55-SRT',
        itemName: 'HAT 55 - 75 HP (55 kW) Rotary Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 55',
        branch: 'Surat',
        quantity: 3,
        unit: 'Units',
        minAlertLevel: 1,
        annualConsumption: 14,
        unitPrice: 820000,
        compatibleModels: 'HAT 55 (75 HP / 55 kW) Single Stage',
        lastRestockedDate: '2026-09-01',
        notes: 'Power: 55 kW (75 HP) | FAD: 365/325/301 CFM @ 7/8/10 BAR | Noise: 76 dB(A) | Dim: 190x126x160 cm | Wt: 1750 kg | Outlet: G 2"'
      },
      {
        id: 'STK-HAT-75-MRB',
        itemName: 'HAT 75 - 100 HP (75 kW) Rotary Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 75',
        branch: 'Morbi',
        quantity: 2,
        unit: 'Units',
        minAlertLevel: 1,
        annualConsumption: 12,
        unitPrice: 980000,
        compatibleModels: 'HAT 75 (100 HP / 75 kW) Single Stage',
        lastRestockedDate: '2026-09-01',
        notes: 'Power: 75 kW (100 HP) | FAD: 475/446/406 CFM @ 7/8/10 BAR | Noise: 77 dB(A) | Dim: 190x126x160 cm | Wt: 1850 kg | Outlet: G 2"'
      },

      // =========================================================================
      // TWO-STAGE ROTARY SCREW COMPRESSORS (4 Rotor 2-Stage Airend - PDF Page 5)
      // =========================================================================
      {
        id: 'STK-HAT-55II-SRT',
        itemName: 'HAT 55 II - 75 HP (55 kW) Two-Stage Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 55 II',
        branch: 'Surat',
        quantity: 2,
        unit: 'Units',
        minAlertLevel: 1,
        annualConsumption: 8,
        unitPrice: 960000,
        compatibleModels: 'Two-Stage Airend (15% More Energy Efficient)',
        lastRestockedDate: '2026-09-01',
        notes: '2-Stage Airend 4 Rotor | Power: 55 kW (75 HP) | FAD: 460/435 CFM @ 7/8 BAR | Noise: 70 dB(A) | Dim: 2160x1350x1750 mm | Wt: 2320 kg | Outlet: G 2"'
      },
      {
        id: 'STK-HAT-75II-MRB',
        itemName: 'HAT 75 II - 100 HP (75 kW) Two-Stage Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 75 II',
        branch: 'Morbi',
        quantity: 2,
        unit: 'Units',
        minAlertLevel: 1,
        annualConsumption: 8,
        unitPrice: 1180000,
        compatibleModels: 'Two-Stage Airend (15% More Energy Efficient)',
        lastRestockedDate: '2026-09-01',
        notes: '2-Stage Airend 4 Rotor | Power: 75 kW (100 HP) | FAD: 575/545 CFM @ 7/8 BAR | Noise: 73 dB(A) | Dim: 2160x1350x1750 mm | Wt: 2390 kg | Outlet: G 2"'
      },
      {
        id: 'STK-HAT-90II-MRB',
        itemName: 'HAT 90 II - 120 HP (90 kW) Two-Stage Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 90 II',
        branch: 'Morbi',
        quantity: 2,
        unit: 'Units',
        minAlertLevel: 1,
        annualConsumption: 6,
        unitPrice: 1390000,
        compatibleModels: 'Two-Stage Airend (Heavy Vitrified Ceramic Hub)',
        lastRestockedDate: '2026-09-01',
        notes: '2-Stage Airend 4 Rotor | Power: 90 kW (120 HP) | FAD: 695/644 CFM @ 7/8 BAR | Noise: 77 dB(A) | Dim: 2420x1530x1720 mm | Wt: 3110 kg | Outlet: DN 65'
      },
      {
        id: 'STK-HAT-110II-RJK',
        itemName: 'HAT 110 II - 150 HP (110 kW) Two-Stage Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 110 II',
        branch: 'Rajkot',
        quantity: 1,
        unit: 'Units',
        minAlertLevel: 1,
        annualConsumption: 4,
        unitPrice: 1650000,
        compatibleModels: 'Two-Stage Airend (Heavy Forging & Foundry)',
        lastRestockedDate: '2026-09-01',
        notes: '2-Stage Airend 4 Rotor | Power: 110 kW (150 HP) | FAD: 825/742 CFM @ 7/8 BAR | Noise: 79 dB(A) | Dim: 2650x1600x1850 mm | Wt: 3530 kg | Outlet: DN 80'
      },
      {
        id: 'STK-HAT-132II-RJK',
        itemName: 'HAT 132 II - 175 HP (132 kW) Two-Stage Screw Compressor',
        category: 'Machine',
        partNumber: 'HAT 132 II',
        branch: 'Rajkot',
        quantity: 1,
        unit: 'Units',
        minAlertLevel: 1,
        annualConsumption: 4,
        unitPrice: 1890000,
        compatibleModels: 'Two-Stage Airend (Mega Industrial Plants)',
        lastRestockedDate: '2026-09-01',
        notes: '2-Stage Airend 4 Rotor | Power: 132 kW (175 HP) | FAD: 985/888 CFM @ 7/8 BAR | Noise: 83 dB(A) | Dim: 2650x1600x1850 mm | Wt: 3600 kg | Outlet: DN 80'
      },

      // =========================================================================
      // AIR TREATMENT & DRYERS (PDF Page 7)
      // =========================================================================
      {
        id: 'STK-RAD-100-SRT',
        itemName: 'Refrigerated Air Dryer 100 CFM',
        category: 'Machine',
        partNumber: 'HT-RAD-100',
        branch: 'Surat',
        quantity: 4,
        unit: 'Units',
        minAlertLevel: 2,
        annualConsumption: 20,
        unitPrice: 98000,
        compatibleModels: 'HAT 4 to HAT 22 Screw Compressors',
        lastRestockedDate: '2026-09-01',
        notes: '+3°C pressure dew point moisture removal dryer'
      },
      {
        id: 'STK-RAD-150-MRB',
        itemName: 'Refrigerated Air Dryer 150 CFM',
        category: 'Machine',
        partNumber: 'HT-RAD-150',
        branch: 'Morbi',
        quantity: 3,
        unit: 'Units',
        minAlertLevel: 2,
        annualConsumption: 18,
        unitPrice: 145000,
        compatibleModels: 'HAT 30 to HAT 55 Screw Compressors',
        lastRestockedDate: '2026-09-01',
        notes: '+3°C pressure dew point moisture removal dryer'
      },
      {
        id: 'STK-ART-1000L-RJK',
        itemName: 'Industrial Air Receiver Tank 1000L (10 Bar)',
        category: 'Machine',
        partNumber: 'HT-ART-1000L',
        branch: 'Rajkot',
        quantity: 2,
        unit: 'Units',
        minAlertLevel: 1,
        annualConsumption: 10,
        unitPrice: 115000,
        compatibleModels: 'Vertical Compressed Air Storage Tank',
        lastRestockedDate: '2026-09-01',
        notes: 'Vertical 1000L Tank with certified safety valve & pressure gauge'
      },

      // =========================================================================
      // SPARE PARTS & CONSUMABLES
      // =========================================================================
      {
        id: 'STK-SP-AF11-SRT',
        itemName: 'Air Filter Cartridge (HAT 4 - HAT 11)',
        category: 'Spare Part',
        partNumber: 'HT-AF-HAT11',
        branch: 'Surat',
        quantity: 30,
        unit: 'Units',
        minAlertLevel: 10,
        annualConsumption: 150,
        unitPrice: 1800,
        compatibleModels: 'HAT 4, HAT 7, HAT 11 Models',
        lastRestockedDate: '2026-09-01',
        notes: '99.9% dedusting intake filter for compact screw series'
      },
      {
        id: 'STK-SP-AF37-MRB',
        itemName: 'Air Filter Cartridge (HAT 15 - HAT 37)',
        category: 'Spare Part',
        partNumber: 'HT-AF-HAT37',
        branch: 'Morbi',
        quantity: 28,
        unit: 'Units',
        minAlertLevel: 8,
        annualConsumption: 130,
        unitPrice: 2600,
        compatibleModels: 'HAT 15, HAT 18, HAT 22, HAT 30, HAT 37 Models',
        lastRestockedDate: '2026-09-01',
        notes: 'Heavy duty nano-fiber air filter'
      },
      {
        id: 'STK-SP-AF75-RJK',
        itemName: 'Air Filter Cartridge (HAT 45 - HAT 75)',
        category: 'Spare Part',
        partNumber: 'HT-AF-HAT75',
        branch: 'Rajkot',
        quantity: 20,
        unit: 'Units',
        minAlertLevel: 6,
        annualConsumption: 90,
        unitPrice: 3800,
        compatibleModels: 'HAT 45, HAT 55, HAT 75 Models',
        lastRestockedDate: '2026-09-01',
        notes: 'High capacity dust intake filter'
      },
      {
        id: 'STK-SP-OF-SRT',
        itemName: 'Spin-On Oil Filter (HAT Series)',
        category: 'Spare Part',
        partNumber: 'HT-OF-HAT-SO',
        branch: 'Surat',
        quantity: 25,
        unit: 'Units',
        minAlertLevel: 8,
        annualConsumption: 120,
        unitPrice: 1950,
        compatibleModels: 'All HAT Single Stage & Two Stage Compressors',
        lastRestockedDate: '2026-09-01',
        notes: 'High pressure spin-on oil filter'
      },
      {
        id: 'STK-SP-SEP-MRB',
        itemName: 'Air-Oil Separator Element (HAT 37 - HAT 75)',
        category: 'Spare Part',
        partNumber: 'HT-SEP-HAT-FL',
        branch: 'Morbi',
        quantity: 12,
        unit: 'Units',
        minAlertLevel: 4,
        annualConsumption: 40,
        unitPrice: 8500,
        compatibleModels: 'HAT 37, HAT 45, HAT 55, HAT 75 Models',
        lastRestockedDate: '2026-09-01',
        notes: 'Residual oil content < 3 ppm'
      },
      {
        id: 'STK-SP-OIL-SRT',
        itemName: 'Synthetic Compressor Lubricant (ISO VG 46 - 20L)',
        category: 'Spare Part',
        partNumber: 'HT-OIL-VG46-20L',
        branch: 'Surat',
        quantity: 18,
        unit: 'Pails (20L)',
        minAlertLevel: 6,
        annualConsumption: 110,
        unitPrice: 7800,
        compatibleModels: 'All Hi-Tech HAT Rotary Screw Series',
        lastRestockedDate: '2026-09-01',
        notes: '8000-Hour long life synthetic rotary screw lubricant'
      }
    ];

    const localData = this.getLocal('hitech_v2_stock_items', null);
    if (!localData || localData.length === 0 || !localData.some(s => s.partNumber?.startsWith('HAT'))) {
      this.saveLocal('hitech_v2_stock_items', fallbackStock);
      return fallbackStock;
    }

    return localData;
  }

  async addStockItem(item) {
    const id = `STK-${Date.now().toString().slice(-4)}`;
    const newItem = {
      id,
      item_name: item.itemName,
      category: item.category || 'Spare Part',
      part_number: item.partNumber,
      branch: item.branch || 'Surat',
      quantity: Number(item.quantity) || 0,
      unit: item.unit || 'Units',
      min_alert_level: Number(item.minAlertLevel) || 5,
      annual_consumption: Number(item.annualConsumption) || 0,
      unit_price: Number(item.unitPrice) || 0,
      compatible_models: item.compatibleModels || '',
      last_restocked_date: item.lastRestockedDate || new Date().toISOString().split('T')[0],
      notes: item.notes || ''
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('stock_items').insert([newItem]);
      } catch (e) {
        console.error('Supabase add stock item error:', e);
      }
    }

    const formatted = {
      id,
      itemName: newItem.item_name,
      category: newItem.category,
      partNumber: newItem.part_number,
      branch: newItem.branch,
      quantity: newItem.quantity,
      unit: newItem.unit,
      minAlertLevel: newItem.min_alert_level,
      annualConsumption: newItem.annual_consumption,
      unitPrice: newItem.unit_price,
      compatibleModels: newItem.compatible_models,
      lastRestockedDate: newItem.last_restocked_date,
      notes: newItem.notes
    };

    const current = await this.getStockItems();
    this.saveLocal('hitech_v2_stock_items', [formatted, ...current]);
    return formatted;
  }

  async updateStockItem(id, updated) {
    if (isSupabaseConfigured()) {
      try {
        const payload = {};
        if (updated.itemName) payload.item_name = updated.itemName;
        if (updated.category) payload.category = updated.category;
        if (updated.partNumber) payload.part_number = updated.partNumber;
        if (updated.branch) payload.branch = updated.branch;
        if (updated.quantity !== undefined) payload.quantity = Number(updated.quantity);
        if (updated.unit) payload.unit = updated.unit;
        if (updated.minAlertLevel !== undefined) payload.min_alert_level = Number(updated.minAlertLevel);
        if (updated.annualConsumption !== undefined) payload.annual_consumption = Number(updated.annualConsumption);
        if (updated.unitPrice !== undefined) payload.unit_price = Number(updated.unitPrice);
        if (updated.compatibleModels !== undefined) payload.compatible_models = updated.compatibleModels;
        if (updated.lastRestockedDate) payload.last_restocked_date = updated.lastRestockedDate;
        if (updated.notes !== undefined) payload.notes = updated.notes;

        await supabase.from('stock_items').update(payload).eq('id', id);
      } catch (e) {
        console.error('Supabase update stock item error:', e);
      }
    }

    const current = await this.getStockItems();
    const updatedList = current.map(s => s.id === id ? { ...s, ...updated } : s);
    this.saveLocal('hitech_v2_stock_items', updatedList);
  }

  async adjustStockQuantity(id, { adjustmentType, quantity, reason, notes }) {
    const current = await this.getStockItems();
    const item = current.find(s => s.id === id);
    if (!item) return null;

    let newQty = item.quantity;
    const changeAmt = Number(quantity) || 0;
    if (adjustmentType === 'ADD') {
      newQty += changeAmt;
    } else if (adjustmentType === 'DEDUCT') {
      newQty = Math.max(0, newQty - changeAmt);
    } else if (adjustmentType === 'SET') {
      newQty = Math.max(0, changeAmt);
    }

    const today = new Date().toISOString().split('T')[0];
    await this.updateStockItem(id, {
      quantity: newQty,
      lastRestockedDate: adjustmentType === 'ADD' ? today : item.lastRestockedDate,
      notes: notes ? `${item.notes ? item.notes + ' | ' : ''}${reason}: ${notes}` : item.notes
    });

    return { ...item, quantity: newQty };
  }

  async transferStock(id, { fromBranch, toBranch, quantity, notes }) {
    const current = await this.getStockItems();
    const sourceItem = current.find(s => s.id === id);
    if (!sourceItem || fromBranch === toBranch) return false;

    const transferQty = Number(quantity) || 0;
    if (sourceItem.quantity < transferQty) {
      throw new Error(`Insufficient stock in ${fromBranch}. Available: ${sourceItem.quantity}`);
    }

    // 1. Deduct from source branch
    const updatedSourceQty = sourceItem.quantity - transferQty;
    await this.updateStockItem(sourceItem.id, { quantity: updatedSourceQty });

    // 2. Add to destination branch (or find matching item in destination branch)
    const destItem = current.find(s => s.branch === toBranch && s.partNumber === sourceItem.partNumber);
    if (destItem) {
      await this.updateStockItem(destItem.id, { quantity: destItem.quantity + transferQty });
    } else {
      // Create new branch item entry
      await this.addStockItem({
        itemName: sourceItem.itemName,
        category: sourceItem.category,
        partNumber: sourceItem.partNumber,
        branch: toBranch,
        quantity: transferQty,
        unit: sourceItem.unit,
        minAlertLevel: sourceItem.minAlertLevel,
        annualConsumption: Math.round(sourceItem.annualConsumption / 2),
        unitPrice: sourceItem.unitPrice,
        compatibleModels: sourceItem.compatibleModels,
        notes: `Transferred from ${fromBranch} on ${new Date().toISOString().split('T')[0]}`
      });
    }

    return true;
  }

  async deleteStockItem(id) {
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('stock_items').delete().eq('id', id);
      } catch (e) {
        console.error('Supabase delete stock item error:', e);
      }
    }
    const current = await this.getStockItems();
    this.saveLocal('hitech_v2_stock_items', current.filter(s => s.id !== id));
  }

  // --- NOTIFICATIONS & DUE DATE ALERTS ---
  async getNotifications() {
    const dismissed = this.getLocal('hitech_v2_dismissed_notifications', []);
    const dismissedSet = new Set(dismissed);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [services, leads] = await Promise.all([
      this.getServices(),
      this.getLeads()
    ]);

    const generated = [];

    // 1. Service Due Date Notifications (3 Days = Red, 1 Week = Orange)
    (services || []).forEach((srv) => {
      if (srv.status === 'Completed') return;
      if (!srv.scheduledDate) return;

      const target = new Date(srv.scheduledDate);
      target.setHours(0, 0, 0, 0);
      if (isNaN(target.getTime())) return;

      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Overdue / Today / <= 3 Days: RED / URGENT
      if (diffDays <= 3) {
        let title = '';
        let type = 'today';
        let severity = 'urgent'; // red
        if (diffDays < 0) {
          title = `⚠️ Overdue Service Alert: ${srv.customerName}`;
        } else if (diffDays === 0) {
          title = `🚨 Service Due Today: ${srv.customerName}`;
        } else {
          title = `🔴 Urgent Service Due in ${diffDays} Day${diffDays === 1 ? '' : 's'}: ${srv.customerName}`;
        }

        const notifId = `notif-srv-${srv.id}-${srv.scheduledDate}`;
        if (!dismissedSet.has(notifId)) {
          generated.push({
            id: notifId,
            serviceId: srv.id,
            title,
            type,
            severity,
            daysRemaining: diffDays,
            message: `${srv.serviceName || 'Scheduled Service'} for ${srv.customerName} (${srv.company || 'Client'}) is due on ${srv.scheduledDate}. Assigned Engineer: ${srv.assignedEngineer || 'Unassigned'}.`,
            date: srv.scheduledDate,
            createdAt: new Date().toISOString()
          });
        }
      } else if (diffDays <= 7) {
        // <= 7 Days: ORANGE / 1 WEEK WARNING
        const notifId = `notif-srv-${srv.id}-${srv.scheduledDate}`;
        if (!dismissedSet.has(notifId)) {
          generated.push({
            id: notifId,
            serviceId: srv.id,
            title: `🟠 Upcoming Service (1 Week / ${diffDays} Days Left): ${srv.customerName}`,
            type: 'tomorrow',
            severity: 'warning', // orange
            daysRemaining: diffDays,
            message: `Upcoming ${srv.serviceName || 'Service'} for ${srv.customerName} (${srv.company || 'Client'}) on ${srv.scheduledDate}. Assigned Engineer: ${srv.assignedEngineer || 'Unassigned'}.`,
            date: srv.scheduledDate,
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    // 2. Pending Lead Follow-up Due Dates
    (leads || []).forEach((lead) => {
      if (lead.status === 'Won' || lead.status === 'Lost') return;
      if (!lead.followUpDate) return;

      const target = new Date(lead.followUpDate);
      target.setHours(0, 0, 0, 0);
      if (isNaN(target.getTime())) return;

      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 3) {
        const notifId = `notif-lead-${lead.id}-${lead.followUpDate}`;
        if (!dismissedSet.has(notifId)) {
          generated.push({
            id: notifId,
            leadId: lead.id,
            title: diffDays <= 0 ? `📞 Lead Follow-up Due: ${lead.customerName}` : `📞 Follow-up in ${diffDays}d: ${lead.customerName}`,
            type: 'followup',
            severity: diffDays <= 0 ? 'urgent' : 'warning',
            daysRemaining: diffDays,
            message: `Lead follow-up with ${lead.customerName} (${lead.company}) regarding ${lead.interestedProduct || 'Equipment'}. Sales: ${lead.salesPersonName || 'Sales Rep'}.`,
            date: lead.followUpDate,
            createdAt: new Date().toISOString()
          });
        }
      }
    });

    // Sort by urgency: smallest daysRemaining first
    generated.sort((a, b) => (a.daysRemaining ?? 99) - (b.daysRemaining ?? 99));
    return generated;
  }

  async deleteNotification(id) {
    const dismissed = this.getLocal('hitech_v2_dismissed_notifications', []);
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      this.saveLocal('hitech_v2_dismissed_notifications', dismissed);
    }
    return true;
  }

  async clearAllNotifications() {
    const notifs = await this.getNotifications();
    const ids = notifs.map(n => n.id);
    const dismissed = this.getLocal('hitech_v2_dismissed_notifications', []);
    const merged = Array.from(new Set([...dismissed, ...ids]));
    this.saveLocal('hitech_v2_dismissed_notifications', merged);
    return true;
  }

  // Helper local storage functions
  getLocal(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  saveLocal(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error('Local storage save error:', e);
    }
  }
}

export const db = new SupabaseDatabase();

