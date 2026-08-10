import { supabase, isSupabaseConfigured } from './supabase.js';

/**
 * Real Supabase Database Adapter Layer
 * Handles async CRUD operations directly on Supabase tables:
 * - leads
 * - customers
 * - future_opportunities
 * - services
 * - profiles
 * - notifications
 */

class SupabaseDatabase {
  // --- LEADS ---
  async getLeads() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data && data.length > 0) {
          return data.map(l => ({
            id: l.id,
            customerName: l.customer_name,
            company: l.company,
            phone: l.phone,
            interestedProduct: l.interested_product,
            requirement: l.requirement,
            status: l.status || 'New',
            followUpDate: l.follow_up_date || new Date().toISOString().split('T')[0],
            notes: l.notes || ''
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch leads error, using local database fallback:', e);
      }
    }
    return this.getLocal('hitech_v2_leads', []);
  }

  async addLead(lead) {
    const id = `LD-${Date.now().toString().slice(-4)}`;
    const newLead = {
      id,
      customer_name: lead.customerName || lead.customer_name,
      company: lead.company,
      phone: lead.phone,
      interested_product: lead.interestedProduct || lead.interested_product || lead.requirement,
      requirement: lead.requirement,
      status: lead.status || 'New',
      follow_up_date: lead.followUpDate || lead.follow_up_date || new Date().toISOString().split('T')[0],
      notes: lead.notes || ''
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
      notes: newLead.notes
    };

    const current = this.getLocal('hitech_v2_leads', []);
    this.saveLocal('hitech_v2_leads', [formatted, ...current]);
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

        await supabase.from('leads').update(payload).eq('id', id);
      } catch (e) {
        console.error('Supabase update lead error:', e);
      }
    }

    const current = this.getLocal('hitech_v2_leads', []);
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

    const current = this.getLocal('hitech_v2_leads', []);
    this.saveLocal('hitech_v2_leads', current.filter(l => l.id !== id));
  }

  // Convert Lead to Customer & Auto-Generate 3 Recurring Maintenance Services (+2m, +6m, +10m)
  async convertLeadToCustomer(leadId) {
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
      assigned_engineer: 'Sanjay Patel',
      address: 'Industrial Area, Gujarat'
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
      assignedEngineer: 'Sanjay Patel',
      address: 'Industrial Area, Gujarat'
    };

    const currentCusts = this.getLocal('hitech_v2_customers', []);
    this.saveLocal('hitech_v2_customers', [formattedCust, ...currentCusts]);

    // Auto-generate 3 recurring services (+2m, +6m, +10m)
    const today = new Date();
    const dates = [
      new Date(today.getFullYear(), today.getMonth() + 2, today.getDate()).toISOString().split('T')[0],
      new Date(today.getFullYear(), today.getMonth() + 6, today.getDate()).toISOString().split('T')[0],
      new Date(today.getFullYear(), today.getMonth() + 10, today.getDate()).toISOString().split('T')[0]
    ];

    const autoServices = [
      { id: `SRV-${Date.now()}-1`, customer_id: custId, customer_name: lead.customerName, service_name: 'Service 1 (2 Months General Check)', scheduled_date: dates[0], status: 'Upcoming', assigned_engineer: 'Sanjay Patel' },
      { id: `SRV-${Date.now()}-2`, customer_id: custId, customer_name: lead.customerName, service_name: 'Service 2 (6 Months Maintenance)', scheduled_date: dates[1], status: 'Upcoming', assigned_engineer: 'Sanjay Patel' },
      { id: `SRV-${Date.now()}-3`, customer_id: custId, customer_name: lead.customerName, service_name: 'Service 3 (10 Months Major AMC)', scheduled_date: dates[2], status: 'Upcoming', assigned_engineer: 'Sanjay Patel' }
    ];

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('services').insert(autoServices);
      } catch (e) {
        console.error('Supabase insert auto services error:', e);
      }
    }

    const currentServices = this.getLocal('hitech_v2_services', []);
    const formattedServices = autoServices.map(s => ({
      id: s.id,
      customerId: s.customer_id,
      customerName: s.customer_name,
      serviceName: s.service_name,
      scheduledDate: s.scheduled_date,
      status: s.status,
      assignedEngineer: s.assigned_engineer
    }));
    this.saveLocal('hitech_v2_services', [...formattedServices, ...currentServices]);

    return formattedCust;
  }

  // Save Lead to Future Opportunity Vault
  async saveLeadToFutureOpportunity(leadId, expectedMonth, reminderDate) {
    const leads = await this.getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return null;

    await this.updateLead(leadId, { status: 'Future Requirement' });

    const oppId = `FO-${Date.now().toString().slice(-4)}`;
    const newOpp = {
      id: oppId,
      customer_name: lead.customerName,
      company: lead.company,
      phone: lead.phone,
      requirement: lead.requirement,
      expected_purchase_month: expectedMonth || '6 Months Later',
      reminder_date: reminderDate || new Date().toISOString().split('T')[0],
      notes: lead.notes || 'Moved from sales lead pipeline.'
    };

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('future_opportunities').insert([newOpp]);
      } catch (e) {
        console.error('Supabase insert future opp error:', e);
      }
    }

    const formattedOpp = {
      id: oppId,
      customerName: lead.customerName,
      company: lead.company,
      phone: lead.phone,
      requirement: lead.requirement,
      expectedPurchaseMonth: expectedMonth || '6 Months Later',
      reminderDate: reminderDate || new Date().toISOString().split('T')[0],
      notes: lead.notes || 'Moved from sales lead pipeline.'
    };

    const currentOpps = this.getLocal('hitech_v2_future_opps', []);
    this.saveLocal('hitech_v2_future_opps', [formattedOpp, ...currentOpps]);
    return formattedOpp;
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
            notes: o.notes
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch future opps error:', e);
      }
    }
    return this.getLocal('hitech_v2_future_opps', []);
  }

  async addFutureOpportunity(opp) {
    const id = `FO-${Date.now().toString().slice(-4)}`;
    const newOpp = {
      id,
      customer_name: opp.customerName,
      company: opp.company,
      phone: opp.phone,
      requirement: opp.requirement,
      expected_purchase_month: opp.expectedPurchaseMonth || '6 Months Later',
      reminder_date: opp.reminderDate || new Date().toISOString().split('T')[0],
      notes: opp.notes || ''
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
      notes: newOpp.notes
    };

    const current = this.getLocal('hitech_v2_future_opps', []);
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
    const current = this.getLocal('hitech_v2_future_opps', []);
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
            address: c.address
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
            serviceName: s.service_name,
            scheduledDate: s.scheduled_date,
            status: s.status,
            assignedEngineer: s.assigned_engineer
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
    const current = this.getLocal('hitech_v2_services', []);
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
      { id: '1', name: 'Vikram Mehta', email: 'sales@hitechair.in', role: 'Sales', status: 'Active', date: '2026-08-01' },
      { id: '2', name: 'Sanjay Patel', email: 'sanjay.engineer@hitechair.in', role: 'Engineer', status: 'Active', date: '2026-08-03' },
      { id: '3', name: 'Hi-Tech Super Administrator', email: 'admin@hitechair.in', role: 'Owner', status: 'Active', date: '2026-07-15' }
    ];
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
      { id: '1', title: 'New Sales Lead Added', message: 'Rajesh Shah (Reliance Textiles) interested in 50HP Compressor.', type: 'info', read: false },
      { id: '2', title: 'Upcoming Service Dispatch', message: 'AMC Service scheduled for Parikh Plastics tomorrow.', type: 'warning', read: false }
    ]);
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
