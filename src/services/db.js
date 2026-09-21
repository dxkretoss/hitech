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
      company: lead.company,
      phone: lead.phone,
      branch: branch,
      lead_type: leadType,
      interested_product: lead.interestedProduct || lead.interested_product || lead.requirement,
      requirement: lead.requirement,
      status: lead.status || 'New',
      loss_reason: lead.lossReason || '',
      loss_remark: lead.lossRemark || '',
      loss_date: lead.lossDate || '',
      follow_up_date: lead.followUpDate || lead.follow_up_date || new Date().toISOString().split('T')[0],
      notes: lead.notes || '',
      sales_person_id: salesPersonId,
      sales_person_name: salesPersonName
    };

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('leads').insert([newLead]);
        if (error) console.error('Supabase add lead error:', error);
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
        if (updated.lossReason !== undefined) payload.loss_reason = updated.lossReason;
        if (updated.lossRemark !== undefined) payload.loss_remark = updated.lossRemark;
        if (updated.lossDate !== undefined) payload.loss_date = updated.lossDate;
        if (updated.followUpDate) payload.follow_up_date = updated.followUpDate;
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
    const salesPersonName = saleData.salesPersonName || currentUser?.name || 'Vikram Mehta';
    const salesPersonId = saleData.salesPersonId || currentUser?.id || 'S-101';
    const engineer = saleData.assignedEngineer || 'Sanjay Patel';

    const newCust = {
      id: custId,
      customer_name: saleData.customerName,
      company: saleData.company,
      phone: saleData.phone,
      purchased_product: saleData.purchasedProduct,
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
      purchasedProduct: saleData.purchasedProduct,
      installationDate: installDate,
      assignedEngineer: engineer,
      address: newCust.address,
      salesPersonId: salesPersonId,
      salesPersonName: salesPersonName
    };

    const currentCusts = await this.getCustomers();
    this.saveLocal('hitech_v2_customers', [formattedCust, ...currentCusts]);

    // Create Initial Service for Field Engineer
    await this.generateInitialServiceForCustomer(formattedCust, saleData.nextServiceDate);

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
      work_done: '',
      parts_replaced: '',
      completion_date: '',
      next_service_date: '',
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
            purchasedProduct: c.purchased_product,
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
    return this.getLocal('hitech_v2_customers', []);
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
            status: 'Active',
            date: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch profiles error:', e);
      }
    }
    return [
      { id: 'S-101', name: 'Vikram Mehta', email: 'sales@hitechair.in', role: 'Sales', status: 'Active', date: '2026-08-01' },
      { id: 'S-102', name: 'Anita Sharma', email: 'anita.sales@hitechair.in', role: 'Sales', status: 'Active', date: '2026-08-02' },
      { id: 'E-201', name: 'Sanjay Patel', email: 'sanjay.engineer@hitechair.in', role: 'Engineer', status: 'Active', date: '2026-08-03' },
      { id: 'A-301', name: 'Hi-Tech Super Administrator', email: 'admin@hitechair.in', role: 'Owner', status: 'Active', date: '2026-07-15' }
    ];
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
        if (data && data.length > 0) return data;
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
        if (data && data.length > 0) {
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
      // --- SURAT BRANCH ---
      {
        id: 'STK-SRT-01',
        itemName: '50 HP Screw Air Compressor (Direct Drive)',
        category: 'Machine',
        partNumber: 'HT-CMP-50HP-DD',
        branch: 'Surat',
        quantity: 4,
        unit: 'Units',
        minAlertLevel: 2,
        annualConsumption: 24,
        unitPrice: 420000,
        compatibleModels: 'Standard 50 HP Industrial Series',
        lastRestockedDate: '2026-08-20',
        notes: 'High demand textile & diamond processing units'
      },
      {
        id: 'STK-SRT-02',
        itemName: '75 HP VFD Screw Compressor (Energy Saver)',
        category: 'Machine',
        partNumber: 'HT-CMP-75HP-VFD',
        branch: 'Surat',
        quantity: 3,
        unit: 'Units',
        minAlertLevel: 2,
        annualConsumption: 18,
        unitPrice: 650000,
        compatibleModels: 'VFD Series Plant Installations',
        lastRestockedDate: '2026-08-15',
        notes: 'Variable speed drive for heavy power saving'
      },
      {
        id: 'STK-SRT-03',
        itemName: 'Air Filter Cartridge 50 HP (Nano Fiber)',
        category: 'Spare Part',
        partNumber: 'HT-AF-50HP-NF',
        branch: 'Surat',
        quantity: 28,
        unit: 'Units',
        minAlertLevel: 10,
        annualConsumption: 140,
        unitPrice: 2800,
        compatibleModels: '50 HP & 60 HP Screw Compressors',
        lastRestockedDate: '2026-08-25',
        notes: 'Fast moving consumable, replaced every 2000 hours'
      },
      {
        id: 'STK-SRT-04',
        itemName: 'Spin-On Oil Filter 50/75 HP',
        category: 'Spare Part',
        partNumber: 'HT-OF-75HP-SO',
        branch: 'Surat',
        quantity: 22,
        unit: 'Units',
        minAlertLevel: 8,
        annualConsumption: 120,
        unitPrice: 1950,
        compatibleModels: '50 HP, 75 HP, 100 HP Models',
        lastRestockedDate: '2026-08-22',
        notes: 'Routine service replacement item'
      },
      {
        id: 'STK-SRT-05',
        itemName: 'Synthetic Compressor Lubricant (ISO VG 46 - 20L)',
        category: 'Spare Part',
        partNumber: 'HT-OIL-VG46-20L',
        branch: 'Surat',
        quantity: 15,
        unit: 'Pails (20L)',
        minAlertLevel: 6,
        annualConsumption: 95,
        unitPrice: 7800,
        compatibleModels: 'All Hi-Tech Rotary Screw Series',
        lastRestockedDate: '2026-08-26',
        notes: '8000-Hour long life synthetic oil'
      },
      {
        id: 'STK-SRT-06',
        itemName: 'Air-Oil Separator Element 75 HP',
        category: 'Spare Part',
        partNumber: 'HT-SEP-75HP-FL',
        branch: 'Surat',
        quantity: 6,
        unit: 'Units',
        minAlertLevel: 4,
        annualConsumption: 36,
        unitPrice: 8500,
        compatibleModels: '75 HP VFD & Direct Drive Series',
        lastRestockedDate: '2026-08-10',
        notes: 'Residual oil content < 3 ppm'
      },

      // --- MORBI BRANCH ---
      {
        id: 'STK-MRB-01',
        itemName: '100 HP Heavy-Duty Screw Air Compressor',
        category: 'Machine',
        partNumber: 'HT-CMP-100HP-HD',
        branch: 'Morbi',
        quantity: 2,
        unit: 'Units',
        minAlertLevel: 1,
        annualConsumption: 16,
        unitPrice: 890000,
        compatibleModels: 'Ceramic & Heavy Vitrified Tile Plants',
        lastRestockedDate: '2026-08-18',
        notes: 'Ceramic cluster standard heavy unit'
      },
      {
        id: 'STK-MRB-02',
        itemName: '10-Ton Industrial Water Chiller',
        category: 'Machine',
        partNumber: 'HT-CHL-10TON',
        branch: 'Morbi',
        quantity: 3,
        unit: 'Units',
        minAlertLevel: 1,
        annualConsumption: 12,
        unitPrice: 380000,
        compatibleModels: 'Ceramic Roller & Glaze Line Cooling',
        lastRestockedDate: '2026-08-12',
        notes: 'Heavy duty scroll compressor chiller'
      },
      {
        id: 'STK-MRB-03',
        itemName: 'Air Filter Cartridge 100 HP Heavy Dust',
        category: 'Spare Part',
        partNumber: 'HT-AF-100HP-HD',
        branch: 'Morbi',
        quantity: 35,
        unit: 'Units',
        minAlertLevel: 12,
        annualConsumption: 190,
        unitPrice: 4200,
        compatibleModels: '100 HP & 120 HP Screw Compressors',
        lastRestockedDate: '2026-08-28',
        notes: 'Critical high-dust ceramic zone intake filter'
      },
      {
        id: 'STK-MRB-04',
        itemName: 'Refrigerated Air Dryer 150 CFM',
        category: 'Machine',
        partNumber: 'HT-DRY-150CFM',
        branch: 'Morbi',
        quantity: 4,
        unit: 'Units',
        minAlertLevel: 2,
        annualConsumption: 22,
        unitPrice: 145000,
        compatibleModels: 'Moisture removal for ceramic glazing lines',
        lastRestockedDate: '2026-08-14',
        notes: '+3°C pressure dew point dryer'
      },
      {
        id: 'STK-MRB-05',
        itemName: 'Drive Belt Set (SPB 2240 - High Torque)',
        category: 'Spare Part',
        partNumber: 'HT-BLT-SPB2240',
        branch: 'Morbi',
        quantity: 18,
        unit: 'Sets',
        minAlertLevel: 6,
        annualConsumption: 75,
        unitPrice: 3200,
        compatibleModels: '50 HP & 75 HP Belt Driven Compressors',
        lastRestockedDate: '2026-08-19',
        notes: 'Oil & heat resistant cogged raw edge belts'
      },

      // --- RAJKOT BRANCH ---
      {
        id: 'STK-RJK-01',
        itemName: '30 HP Compact Rotary Screw Compressor',
        category: 'Machine',
        partNumber: 'HT-CMP-30HP-CP',
        branch: 'Rajkot',
        quantity: 5,
        unit: 'Units',
        minAlertLevel: 2,
        annualConsumption: 28,
        unitPrice: 295000,
        compatibleModels: 'CNC Machine Shops & Forging Units',
        lastRestockedDate: '2026-08-24',
        notes: 'Popular in Rajkot engineering and auto-parts hub'
      },
      {
        id: 'STK-RJK-02',
        itemName: 'Refrigerated Air Dryer 100 CFM',
        category: 'Machine',
        partNumber: 'HT-DRY-100CFM',
        branch: 'Rajkot',
        quantity: 3,
        unit: 'Units',
        minAlertLevel: 2,
        annualConsumption: 20,
        unitPrice: 98000,
        compatibleModels: '30 HP & 50 HP CNC workshop lines',
        lastRestockedDate: '2026-08-16',
        notes: 'Ensures moisture-free pneumatic tooling'
      },
      {
        id: 'STK-RJK-03',
        itemName: 'Air Filter Cartridge 30 HP Compact',
        category: 'Spare Part',
        partNumber: 'HT-AF-30HP-CP',
        branch: 'Rajkot',
        quantity: 24,
        unit: 'Units',
        minAlertLevel: 8,
        annualConsumption: 110,
        unitPrice: 2200,
        compatibleModels: '30 HP Compact Series',
        lastRestockedDate: '2026-08-27',
        notes: 'Fast moving consumable in Rajkot machine tooling'
      },
      {
        id: 'STK-RJK-04',
        itemName: 'Thermostatic Valve Element (71°C)',
        category: 'Spare Part',
        partNumber: 'HT-THV-71C',
        branch: 'Rajkot',
        quantity: 8,
        unit: 'Units',
        minAlertLevel: 3,
        annualConsumption: 32,
        unitPrice: 4500,
        compatibleModels: 'All Oil Injected Screw Compressors',
        lastRestockedDate: '2026-08-08',
        notes: 'Oil temperature regulation valve'
      },
      {
        id: 'STK-RJK-05',
        itemName: 'Minimum Pressure Valve (MPV) Kit',
        category: 'Spare Part',
        partNumber: 'HT-MPV-KIT-50',
        branch: 'Rajkot',
        quantity: 5,
        unit: 'Kits',
        minAlertLevel: 3,
        annualConsumption: 26,
        unitPrice: 5800,
        compatibleModels: '50 HP Discharge Line Valves',
        lastRestockedDate: '2026-08-05',
        notes: 'Includes internal seals and return spring'
      }
    ];

    return this.getLocal('hitech_v2_stock_items', fallbackStock);
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

  // Helper local storage functions
  getLocal(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
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

