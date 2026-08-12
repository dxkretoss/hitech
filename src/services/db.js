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
            interestedProduct: l.interested_product,
            requirement: l.requirement,
            status: l.status || 'New',
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
    return this.getLocal('hitech_v2_leads', []);
  }

  async addLead(lead, currentUser = null) {
    const id = `LD-${Date.now().toString().slice(-4)}`;
    const salesPersonName = lead.salesPersonName || currentUser?.name || 'Vikram Mehta';
    const salesPersonId = lead.salesPersonId || currentUser?.id || 'S-101';

    const newLead = {
      id,
      customer_name: lead.customerName || lead.customer_name,
      company: lead.company,
      phone: lead.phone,
      interested_product: lead.interestedProduct || lead.interested_product || lead.requirement,
      requirement: lead.requirement,
      status: lead.status || 'New',
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
      interestedProduct: newLead.interested_product,
      requirement: newLead.requirement,
      status: newLead.status,
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
        if (updated.interestedProduct) payload.interested_product = updated.interestedProduct;
        if (updated.requirement) payload.requirement = updated.requirement;
        if (updated.status) payload.status = updated.status;
        if (updated.followUpDate) payload.follow_up_date = updated.followUpDate;
        if (updated.notes) payload.notes = updated.notes;
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

    // Auto-generate 3 recurring services (+2m, +6m, +10m)
    await this.generateThreeServicesForCustomer(formattedCust);

    return formattedCust;
  }

  // Save Direct Customer Sale (with auto 3 service reminders: +2m, +6m, +10m)
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

    // Auto-generate 3 recurring services (+2m, +6m, +10m)
    await this.generateThreeServicesForCustomer(formattedCust);

    return formattedCust;
  }

  // Helper to generate 3 services (+2 months, +6 months, +10 months)
  async generateThreeServicesForCustomer(customer) {
    const installDate = new Date(customer.installationDate || Date.now());

    // Function to calculate exact future date
    const addMonths = (date, months) => {
      const d = new Date(date);
      d.setMonth(d.getMonth() + months);
      return d.toISOString().split('T')[0];
    };

    const date2M = addMonths(installDate, 2);
    const date6M = addMonths(installDate, 6);
    const date10M = addMonths(installDate, 10);

    const autoServices = [
      {
        id: `SRV-${Date.now()}-1`,
        customer_id: customer.id,
        customer_name: customer.customerName,
        company: customer.company,
        product: customer.purchasedProduct,
        service_name: 'Service #1 (2-Month Mandatory Inspection & Oil Check)',
        scheduled_date: date2M,
        status: 'Upcoming',
        assigned_engineer: customer.assignedEngineer || 'Sanjay Patel',
        notes: 'Inspect filter, check pressure ratio, clear condensate drain.'
      },
      {
        id: `SRV-${Date.now()}-2`,
        customer_id: customer.id,
        customer_name: customer.customerName,
        company: customer.company,
        product: customer.purchasedProduct,
        service_name: 'Service #2 (6-Month Mid-Term Preventative Maintenance)',
        scheduled_date: date6M,
        status: 'Upcoming',
        assigned_engineer: customer.assignedEngineer || 'Sanjay Patel',
        notes: 'Replace air intake filter element, tighten electrical connections.'
      },
      {
        id: `SRV-${Date.now()}-3`,
        customer_id: customer.id,
        customer_name: customer.customerName,
        company: customer.company,
        product: customer.purchasedProduct,
        service_name: 'Service #3 (10-Month Annual Overhaul & AMC Renewal)',
        scheduled_date: date10M,
        status: 'Upcoming',
        assigned_engineer: customer.assignedEngineer || 'Sanjay Patel',
        notes: 'Full system audit, coolant replacement, renew warranty/AMC contract.'
      }
    ];

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('services').insert(autoServices);
      } catch (e) {
        console.error('Supabase insert auto services error:', e);
      }
    }

    const currentServices = await this.getServices();
    const formattedServices = autoServices.map(s => ({
      id: s.id,
      customerId: s.customer_id,
      customerName: s.customer_name,
      company: s.company,
      product: s.product,
      serviceName: s.service_name,
      scheduledDate: s.scheduled_date,
      status: s.status,
      assignedEngineer: s.assigned_engineer,
      notes: s.notes
    }));

    this.saveLocal('hitech_v2_services', [...formattedServices, ...currentServices]);
    return formattedServices;
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
        if (data && data.length > 0) {
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
        if (data && data.length > 0) {
          return data.map(c => ({
            id: c.id,
            customerName: c.customer_name,
            company: c.company,
            phone: c.phone,
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
        if (data && data.length > 0) {
          return data.map(s => ({
            id: s.id,
            customerId: s.customer_id,
            customerName: s.customer_name,
            company: s.company,
            product: s.product,
            serviceName: s.service_name,
            scheduledDate: s.scheduled_date,
            status: s.status,
            assignedEngineer: s.assigned_engineer,
            notes: s.notes
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch services error:', e);
      }
    }
    return this.getLocal('hitech_v2_services', []);
  }

  async getServicesByCustomer(customerId) {
    const services = await this.getServices();
    return services.filter(s => s.customerId === customerId);
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

