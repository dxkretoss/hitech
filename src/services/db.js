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

  // Helper to extract the active logged-in user context
  getCurrentUserContext(userContext = null) {
    if (userContext && typeof userContext === 'object' && userContext.role) {
      return userContext;
    }
    try {
      const saved = localStorage.getItem('hitech_v2_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  }

  // --- LEADS ---
  async getLeads(userContext = null) {
    const user = this.getCurrentUserContext(userContext);
    let allLeads = [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          allLeads = data.map(l => ({
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
            userId: l.user_id || '',
            salesPersonId: l.sales_person_id || '',
            salesPersonName: l.sales_person_name || '',
            salesPersonEmail: l.sales_person_email || '',
            createdBy: l.created_by || ''
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch leads error, using local database fallback:', e);
        allLeads = this.getLocal('hitech_v2_leads', fallbackLeads);
      }
    } else {
      allLeads = this.getLocal('hitech_v2_leads', fallbackLeads);
    }

    // Role-based User Isolation:
    if (!user || user.role === 'Admin' || user.role === 'Owner' || user.role === 'SuperAdmin') {
      return allLeads;
    }

    if (user.role === 'Sales') {
      const uId = user.id;
      const uEmail = (user.email || '').toLowerCase().trim();
      const uName = (user.name || '').toLowerCase().trim();

      return allLeads.filter(l => {
        const sId = l.salesPersonId || l.userId;
        const sEmail = (l.salesPersonEmail || l.createdBy || '').toLowerCase().trim();
        const sName = (l.salesPersonName || '').toLowerCase().trim();

        return (
          (uId && sId === uId) ||
          (uEmail && sEmail && sEmail === uEmail) ||
          (uName && sName && (sName === uName || sName.includes(uName) || uName.includes(sName)))
        );
      });
    }

    if (user.role === 'Engineer') {
      return [];
    }

    return allLeads;
  }

  async addLead(lead, currentUser = null) {
    const id = `LD-${Date.now().toString().slice(-4)}`;
    const user = this.getCurrentUserContext(currentUser);
    const salesPersonName = lead.salesPersonName || user?.name || 'Sales Rep';
    const salesPersonId = lead.salesPersonId || user?.id || 'S-101';
    const salesPersonEmail = lead.salesPersonEmail || user?.email || '';
    const createdBy = user?.email || '';
    const leadType = lead.leadType || 'Hot Lead';
    const branch = lead.branch || user?.branch || 'Surat';

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
      user_id: user?.id || null,
      sales_person_id: salesPersonId,
      sales_person_name: salesPersonName,
      sales_person_email: salesPersonEmail,
      created_by: createdBy
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
      userId: user?.id || '',
      salesPersonId: salesPersonId,
      salesPersonName: salesPersonName,
      salesPersonEmail: salesPersonEmail,
      createdBy: createdBy
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
        salesPersonName: salesPersonName,
        salesPersonEmail: salesPersonEmail,
        createdBy: createdBy
      }, currentUser);
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
  async getFutureOpportunities(userContext = null) {
    const user = this.getCurrentUserContext(userContext);
    let allOpps = [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('future_opportunities')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          allOpps = data.map(o => ({
            id: o.id,
            customerName: o.customer_name,
            company: o.company,
            phone: o.phone,
            requirement: o.requirement,
            expectedPurchaseMonth: o.expected_purchase_month,
            reminderDate: o.reminder_date,
            notes: o.notes,
            userId: o.user_id || '',
            salesPersonId: o.sales_person_id || 'S-101',
            salesPersonName: o.sales_person_name || 'Vikram Mehta',
            salesPersonEmail: o.sales_person_email || '',
            createdBy: o.created_by || ''
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch future opps error:', e);
        allOpps = this.getLocal('hitech_v2_future_opps', []);
      }
    } else {
      allOpps = this.getLocal('hitech_v2_future_opps', []);
    }

    if (!user || user.role === 'Admin' || user.role === 'Owner' || user.role === 'SuperAdmin') {
      return allOpps;
    }

    if (user.role === 'Sales') {
      const uId = user.id;
      const uEmail = (user.email || '').toLowerCase().trim();
      const uName = (user.name || '').toLowerCase().trim();

      return allOpps.filter(o => {
        const sId = o.salesPersonId || o.userId;
        const sEmail = (o.salesPersonEmail || o.createdBy || '').toLowerCase().trim();
        const sName = (o.salesPersonName || '').toLowerCase().trim();

        return (
          (uId && sId === uId) ||
          (uEmail && sEmail && sEmail === uEmail) ||
          (uName && sName && (sName === uName || sName.includes(uName) || uName.includes(sName)))
        );
      });
    }

    return [];
  }

  async addFutureOpportunity(opp, currentUser = null) {
    const id = `FO-${Date.now().toString().slice(-4)}`;
    const user = this.getCurrentUserContext(currentUser);
    const salesPersonName = opp.salesPersonName || user?.name || 'Sales Rep';
    const salesPersonId = opp.salesPersonId || user?.id || 'S-101';
    const salesPersonEmail = opp.salesPersonEmail || user?.email || '';
    const createdBy = user?.email || '';
    const branch = opp.branch || user?.branch || 'Surat';

    const newOpp = {
      id,
      customer_name: opp.customerName,
      company: opp.company,
      phone: opp.phone,
      branch: branch,
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
      branch: branch,
      requirement: opp.requirement,
      expectedPurchaseMonth: newOpp.expected_purchase_month,
      reminderDate: newOpp.reminder_date,
      notes: newOpp.notes,
      userId: user?.id || '',
      salesPersonId: salesPersonId,
      salesPersonName: salesPersonName,
      salesPersonEmail: salesPersonEmail,
      createdBy: createdBy
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
  async getCustomers(userContext = null) {
    const user = this.getCurrentUserContext(userContext);
    let allCustomers = [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          allCustomers = data.map(c => ({
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
            assignedEngineerId: c.assigned_engineer_id,
            assignedEngineerEmail: c.assigned_engineer_email,
            address: c.address,
            salesPersonId: c.sales_person_id || 'S-101',
            salesPersonName: c.sales_person_name || 'Vikram Mehta',
            salesPersonEmail: c.sales_person_email || '',
            createdBy: c.created_by || ''
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch customers error:', e);
        allCustomers = this.getLocal('hitech_v2_customers', fallbackCustomers);
      }
    } else {
      allCustomers = this.getLocal('hitech_v2_customers', fallbackCustomers);
    }

    if (!user || user.role === 'Admin' || user.role === 'Owner' || user.role === 'SuperAdmin') {
      return allCustomers;
    }

    if (user.role === 'Sales') {
      const uId = user.id;
      const uEmail = (user.email || '').toLowerCase().trim();
      const uName = (user.name || '').toLowerCase().trim();

      return allCustomers.filter(c => {
        const sId = c.salesPersonId;
        const sEmail = (c.salesPersonEmail || c.createdBy || '').toLowerCase().trim();
        const sName = (c.salesPersonName || '').toLowerCase().trim();

        return (
          (uId && sId === uId) ||
          (uEmail && sEmail && sEmail === uEmail) ||
          (uName && sName && (sName === uName || sName.includes(uName) || uName.includes(sName)))
        );
      });
    }

    if (user.role === 'Engineer') {
      const uId = user.id;
      const uEmail = (user.email || '').toLowerCase().trim();
      const uName = (user.name || '').toLowerCase().trim();

      return allCustomers.filter(c => {
        const engId = c.assignedEngineerId;
        const engEmail = (c.assignedEngineerEmail || '').toLowerCase().trim();
        const engName = (c.assignedEngineer || '').toLowerCase().trim();
        const branchMatch = user.branch && c.branch && c.branch.toLowerCase() === user.branch.toLowerCase();

        return (
          (uId && engId === uId) ||
          (uEmail && engEmail && engEmail === uEmail) ||
          (uName && engName && (engName === uName || engName.includes(uName) || uName.includes(engName))) ||
          branchMatch
        );
      });
    }

    return allCustomers;
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

  // Save Direct Customer Sale (Creates initial service for Field Engineer)
  async addCustomerSale(saleData, currentUser = null) {
    const custId = `CUST-${Date.now().toString().slice(-4)}`;
    const user = this.getCurrentUserContext(currentUser);
    const installDate = saleData.installationDate || new Date().toISOString().split('T')[0];
    const salesPersonName = saleData.salesPersonName || user?.name || 'Sales Rep';
    const salesPersonId = saleData.salesPersonId || user?.id || 'S-101';
    const salesPersonEmail = saleData.salesPersonEmail || user?.email || '';
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
      sales_person_name: salesPersonName,
      sales_person_email: salesPersonEmail,
      created_by: user?.email || ''
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
      salesPersonName: salesPersonName,
      salesPersonEmail: salesPersonEmail,
      createdBy: user?.email || ''
    };

    const currentCusts = await this.getCustomers();
    this.saveLocal('hitech_v2_customers', [formattedCust, ...currentCusts]);

    // Create Initial Service for Field Engineer (for machines)
    if (category !== 'Spare Part' && engineer !== 'Direct Spare Part Sale') {
      await this.generateInitialServiceForCustomer(formattedCust, saleData.nextServiceDate, user);
    }

    return formattedCust;
  }

  // --- SERVICES ---
  async getServices(userContext = null) {
    const user = this.getCurrentUserContext(userContext);
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

    let allServices = [];

    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          allServices = data.map(s => ({
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
            assignedEngineerId: s.assigned_engineer_id,
            assignedEngineerEmail: s.assigned_engineer_email,
            workDone: s.work_done || s.workDone || '',
            partsReplaced: s.parts_replaced || s.partsReplaced || '',
            completionDate: s.completion_date || s.completionDate || '',
            nextServiceDate: s.next_service_date || s.nextServiceDate || '',
            engineerNotes: s.engineer_notes || s.engineerNotes || '',
            notes: s.notes || '',
            createdBy: s.created_by || '',
            createdAt: s.created_at || s.createdAt || ''
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch services error:', e);
        allServices = this.getLocal('hitech_v2_services', fallbackServices);
      }
    } else {
      allServices = this.getLocal('hitech_v2_services', fallbackServices);
    }

    // Role-based User Isolation:
    if (!user || user.role === 'Admin' || user.role === 'Owner' || user.role === 'SuperAdmin') {
      return allServices;
    }

    if (user.role === 'Engineer') {
      const uId = user.id;
      const uEmail = (user.email || '').toLowerCase().trim();
      const uName = (user.name || '').toLowerCase().trim();

      return allServices.filter(s => {
        const engId = s.assignedEngineerId;
        const engEmail = (s.assignedEngineerEmail || s.createdBy || '').toLowerCase().trim();
        const engName = (s.assignedEngineer || '').toLowerCase().trim();

        return (
          (uId && engId === uId) ||
          (uEmail && engEmail && engEmail === uEmail) ||
          (uName && engName && (engName === uName || engName.includes(uName) || uName.includes(engName)))
        );
      });
    }

    return allServices;
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
        if (data) {
          return data.map(p => ({
            id: p.id,
            name: p.name || p.email?.split('@')[0] || 'Team Member',
            email: p.email,
            role: p.role || 'Sales',
            branch: p.branch || 'Surat',
            canViewStock: p.can_view_stock === true || p.role === 'Engineer',
            status: 'Active',
            date: p.created_at ? p.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
          }));
        }
      } catch (e) {
        console.error('Supabase fetch profiles error:', e);
      }
    }
    return [];
  }

  async updateProfileStockAccess(profileId, canViewStock) {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ can_view_stock: canViewStock })
          .eq('id', profileId);
        if (error) console.error('Supabase update profile stock access error:', error);
      } catch (e) {
        console.error('Supabase update profile stock access exception:', e);
      }
    }

    // Update current session user in localStorage if matching
    try {
      const currentUser = JSON.parse(localStorage.getItem('hitech_v2_user') || '{}');
      if (currentUser && (currentUser.id === profileId || currentUser.email === profileId)) {
        currentUser.canViewStock = canViewStock;
        currentUser.can_view_stock = canViewStock;
        localStorage.setItem('hitech_v2_user', JSON.stringify(currentUser));
      }
    } catch (e) {
      console.error('Error updating current session user stock access:', e);
    }
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

  // --- NOTIFICATIONS & DUE DATE ALERTS (Managed via public.notifications Table) ---
  async getNotifications(userContext = null) {
    let user = userContext;
    if (!user) {
      try {
        const saved = localStorage.getItem('hitech_v2_user');
        if (saved) user = JSON.parse(saved);
      } catch (e) {}
    }

    const role = user?.role || (typeof userContext === 'string' ? userContext : 'Owner');
    const isOwner = role === 'Owner' || role === 'SuperAdmin' || role === 'Admin';
    const isEngineer = role === 'Engineer';
    const isSales = role === 'Sales';
    const userName = (user?.name || user?.email || '').toLowerCase();
    const userBranch = (user?.branch || '').toLowerCase();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const generated = [];

    // 1. Fetch live services and leads to generate dynamic due alerts
    const [services, leads] = await Promise.all([
      this.getServices(),
      this.getLeads()
    ]);

    // Generate service maintenance alerts
    (services || []).forEach((srv) => {
      if (srv.status === 'Completed') return;
      if (!srv.scheduledDate) return;

      const target = new Date(srv.scheduledDate);
      target.setHours(0, 0, 0, 0);
      if (isNaN(target.getTime())) return;

      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 3) {
        let title = '';
        if (diffDays < 0) {
          title = `Overdue Service Alert: ${srv.customerName}`;
        } else if (diffDays === 0) {
          title = `Service Due Today: ${srv.customerName}`;
        } else {
          title = `Urgent Service Due in ${diffDays} Day${diffDays === 1 ? '' : 's'}: ${srv.customerName}`;
        }

        generated.push({
          id: `notif-srv-${srv.id}-${srv.scheduledDate}`,
          serviceId: srv.id,
          title,
          type: 'today',
          severity: 'urgent',
          daysRemaining: diffDays,
          message: `${srv.serviceName || 'Scheduled Service'} for ${srv.customerName} (${srv.company || 'Client'}) is due on ${srv.scheduledDate}. Assigned Engineer: ${srv.assignedEngineer || 'Unassigned'}.`,
          date: srv.scheduledDate,
          recipientRole: 'Engineer',
          branch: srv.branch || 'Surat',
          isRead: false,
          createdAt: new Date().toISOString()
        });
      } else if (diffDays <= 7) {
        generated.push({
          id: `notif-srv-${srv.id}-${srv.scheduledDate}`,
          serviceId: srv.id,
          title: `Upcoming Service (1 Week / ${diffDays} Days Left): ${srv.customerName}`,
          type: 'tomorrow',
          severity: 'warning',
          daysRemaining: diffDays,
          message: `Upcoming ${srv.serviceName || 'Service'} for ${srv.customerName} (${srv.company || 'Client'}) on ${srv.scheduledDate}. Assigned Engineer: ${srv.assignedEngineer || 'Unassigned'}.`,
          date: srv.scheduledDate,
          recipientRole: 'Engineer',
          branch: srv.branch || 'Surat',
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }
    });

    // Generate lead follow-up alerts
    (leads || []).forEach((lead) => {
      if (lead.status === 'Won' || lead.status === 'Lost') return;
      if (!lead.followUpDate) return;

      const target = new Date(lead.followUpDate);
      target.setHours(0, 0, 0, 0);
      if (isNaN(target.getTime())) return;

      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let title = '';
      let severity = 'normal';

      if (diffDays < 0) {
        title = `Overdue Follow-up (${Math.abs(diffDays)}d overdue): ${lead.customerName}`;
        severity = 'urgent';
      } else if (diffDays === 0) {
        title = `Lead Follow-up Due Today: ${lead.customerName}`;
        severity = 'urgent';
      } else if (diffDays <= 3) {
        title = `Urgent Follow-up in ${diffDays}d: ${lead.customerName}`;
        severity = 'urgent';
      } else if (diffDays <= 7) {
        title = `Follow-up Due in 1 Week (${diffDays}d): ${lead.customerName}`;
        severity = 'warning';
      } else {
        title = `Upcoming Follow-up (${lead.followUpDate}): ${lead.customerName}`;
        severity = 'normal';
      }

      generated.push({
        id: `notif-lead-${lead.id}-${lead.followUpDate}`,
        leadId: lead.id,
        title,
        type: 'followup',
        severity,
        daysRemaining: diffDays,
        message: `Lead follow-up with ${lead.customerName} (${lead.company || 'Client'}) regarding ${lead.interestedProduct || lead.requirement || 'Compressor / Equipment'}. Sales: ${lead.salesPersonName || 'Sales Team'}.`,
        date: lead.followUpDate,
        recipientRole: 'Sales',
        branch: lead.branch || 'Surat',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });

    const userEmail = userContext?.email || (() => {
      try {
        const u = JSON.parse(localStorage.getItem('hitech_v2_user') || '{}');
        return u.email || 'user@hitech.com';
      } catch (e) {
        return 'user@hitech.com';
      }
    })();

    // 2. Fetch and sync with Supabase notifications table
    if (isSupabaseConfigured()) {
      try {
        if (generated.length > 0) {
          const rowsToUpsert = generated.map(g => ({
            id: g.id,
            title: g.title,
            message: g.message,
            type: g.type,
            severity: g.severity,
            recipient_role: g.recipientRole,
            branch: g.branch,
            service_id: g.serviceId || null,
            lead_id: g.leadId || null,
            days_remaining: g.daysRemaining,
            date: g.date
          }));
          await supabase.from('notifications').upsert(rowsToUpsert, { onConflict: 'id', ignoreDuplicates: true });
        }

        let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
        if (!isOwner) {
          if (isEngineer) {
            query = query.in('recipient_role', ['Engineer', 'All']);
          } else if (isSales) {
            query = query.in('recipient_role', ['Sales', 'All']);
          }
        }

        const { data: dbNotifs, error: notifErr } = await query;

        if (!notifErr && dbNotifs) {
          const leadsMap = new Map((leads || []).map(l => [l.id, l]));
          const servicesMap = new Map((services || []).map(s => [s.id, s]));

          const list = dbNotifs
            .filter(n => {
              const dismissedBy = Array.isArray(n.dismissed_by) ? n.dismissed_by : [];
              if (dismissedBy.includes(userEmail)) return false;

              // User-specific filtering:
              if (!isOwner) {
                if (isSales && n.lead_id) {
                  const lead = leadsMap.get(n.lead_id);
                  if (lead) {
                    const uId = user?.id;
                    const uEmail = (user?.email || '').toLowerCase().trim();
                    const uName = (user?.name || '').toLowerCase().trim();
                    const sId = lead.salesPersonId || lead.userId;
                    const sEmail = (lead.salesPersonEmail || lead.createdBy || '').toLowerCase().trim();
                    const sName = (lead.salesPersonName || '').toLowerCase().trim();

                    const match = (uId && sId === uId) || (uEmail && sEmail && sEmail === uEmail) || (uName && sName && (sName === uName || sName.includes(uName) || uName.includes(sName)));
                    if (!match) return false;
                  }
                } else if (isEngineer && n.service_id) {
                  const srv = servicesMap.get(n.service_id);
                  if (srv) {
                    const uId = user?.id;
                    const uEmail = (user?.email || '').toLowerCase().trim();
                    const uName = (user?.name || '').toLowerCase().trim();
                    const engId = srv.assignedEngineerId;
                    const engEmail = (srv.assignedEngineerEmail || srv.createdBy || '').toLowerCase().trim();
                    const engName = (srv.assignedEngineer || '').toLowerCase().trim();

                    const match = (uId && engId === uId) || (uEmail && engEmail && engEmail === uEmail) || (uName && engName && (engName === uName || engName.includes(uName) || uName.includes(engName)));
                    if (!match) return false;
                  }
                }
              }

              return true;
            })
            .map(n => {
              const readBy = Array.isArray(n.read_by) ? n.read_by : [];
              return {
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type,
                severity: n.severity,
                isRead: readBy.includes(userEmail) || n.is_read === true,
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
          return list.sort((a, b) => (a.daysRemaining ?? 99) - (b.daysRemaining ?? 99));
        }
      } catch (e) {
        console.warn('Supabase notifications fetch error:', e);
      }
    }

    const dismissedKey = `hitech_v2_dismissed_${userEmail}`;
    const readKey = `hitech_v2_read_${userEmail}`;
    const dismissed = this.getLocal(dismissedKey, []);
    const readList = this.getLocal(readKey, []);
    const dismissedSet = new Set(dismissed);
    const readSet = new Set(readList);

    return generated
      .filter(g => {
        if (dismissedSet.has(g.id)) return false;
        if (!isOwner) {
          if (isEngineer && g.recipientRole !== 'Engineer' && g.recipientRole !== 'All') return false;
          if (isSales && g.recipientRole !== 'Sales' && g.recipientRole !== 'All') return false;
        }
        return true;
      })
      .map(g => ({
        ...g,
        isRead: readSet.has(g.id)
      }))
      .sort((a, b) => (a.daysRemaining ?? 99) - (b.daysRemaining ?? 99));
  }

  async markNotificationAsRead(id, userContext = null) {
    const userEmail = userContext?.email || (() => {
      try {
        const u = JSON.parse(localStorage.getItem('hitech_v2_user') || '{}');
        return u.email || 'user@hitech.com';
      } catch (e) {
        return 'user@hitech.com';
      }
    })();

    if (isSupabaseConfigured()) {
      try {
        const { data: row } = await supabase.from('notifications').select('read_by').eq('id', id).single();
        const currentReadBy = Array.isArray(row?.read_by) ? row.read_by : [];
        if (!currentReadBy.includes(userEmail)) {
          await supabase.from('notifications').update({
            read_by: [...currentReadBy, userEmail]
          }).eq('id', id);
        }
      } catch (e) {
        console.error('Supabase mark notification read error:', e);
      }
    }

    const readKey = `hitech_v2_read_${userEmail}`;
    const readList = this.getLocal(readKey, []);
    if (!readList.includes(id)) {
      readList.push(id);
      this.saveLocal(readKey, readList);
    }
    return true;
  }

  async markAllNotificationsAsRead(userContext = null) {
    const userEmail = userContext?.email || (() => {
      try {
        const u = JSON.parse(localStorage.getItem('hitech_v2_user') || '{}');
        return u.email || 'user@hitech.com';
      } catch (e) {
        return 'user@hitech.com';
      }
    })();

    const notifs = await this.getNotifications(userContext);
    const ids = notifs.map(n => n.id);

    if (isSupabaseConfigured() && ids.length > 0) {
      try {
        for (const id of ids) {
          const { data: row } = await supabase.from('notifications').select('read_by').eq('id', id).single();
          const currentReadBy = Array.isArray(row?.read_by) ? row.read_by : [];
          if (!currentReadBy.includes(userEmail)) {
            await supabase.from('notifications').update({
              read_by: [...currentReadBy, userEmail]
            }).eq('id', id);
          }
        }
      } catch (e) {
        console.error('Supabase mark all notifications read error:', e);
      }
    }

    const readKey = `hitech_v2_read_${userEmail}`;
    const readList = this.getLocal(readKey, []);
    const merged = Array.from(new Set([...readList, ...ids]));
    this.saveLocal(readKey, merged);
    return true;
  }

  async deleteNotification(id, userContext = null) {
    const userEmail = userContext?.email || (() => {
      try {
        const u = JSON.parse(localStorage.getItem('hitech_v2_user') || '{}');
        return u.email || 'user@hitech.com';
      } catch (e) {
        return 'user@hitech.com';
      }
    })();

    if (isSupabaseConfigured()) {
      try {
        const { data: row } = await supabase.from('notifications').select('dismissed_by').eq('id', id).single();
        const currentDismissedBy = Array.isArray(row?.dismissed_by) ? row.dismissed_by : [];
        if (!currentDismissedBy.includes(userEmail)) {
          await supabase.from('notifications').update({
            dismissed_by: [...currentDismissedBy, userEmail]
          }).eq('id', id);
        }
      } catch (e) {
        console.error('Supabase delete notification error:', e);
      }
    }

    const dismissedKey = `hitech_v2_dismissed_${userEmail}`;
    const dismissed = this.getLocal(dismissedKey, []);
    if (!dismissed.includes(id)) {
      dismissed.push(id);
      this.saveLocal(dismissedKey, dismissed);
    }
    return true;
  }

  async clearAllNotifications(userContext = null) {
    const userEmail = userContext?.email || (() => {
      try {
        const u = JSON.parse(localStorage.getItem('hitech_v2_user') || '{}');
        return u.email || 'user@hitech.com';
      } catch (e) {
        return 'user@hitech.com';
      }
    })();

    const notifs = await this.getNotifications(userContext);
    const ids = notifs.map(n => n.id);

    if (isSupabaseConfigured() && ids.length > 0) {
      try {
        for (const id of ids) {
          const { data: row } = await supabase.from('notifications').select('dismissed_by, read_by').eq('id', id).single();
          const currentDismissed = Array.isArray(row?.dismissed_by) ? row.dismissed_by : [];
          const currentRead = Array.isArray(row?.read_by) ? row.read_by : [];
          await supabase.from('notifications').update({
            dismissed_by: Array.from(new Set([...currentDismissed, userEmail])),
            read_by: Array.from(new Set([...currentRead, userEmail]))
          }).eq('id', id);
        }
      } catch (e) {
        console.error('Supabase clear notifications error:', e);
      }
    }

    const dismissedKey = `hitech_v2_dismissed_${userEmail}`;
    const dismissed = this.getLocal(dismissedKey, []);
    const merged = Array.from(new Set([...dismissed, ...ids]));
    this.saveLocal(dismissedKey, merged);
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

