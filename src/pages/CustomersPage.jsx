import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import { useAuth } from '../contexts/AuthContext.jsx';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Table } from '../components/ui/Table.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.jsx';
import { Search, ChevronRight, Trash2, ShoppingBag, Plus, Users, User, ShieldCheck, Building2 } from 'lucide-react';
import { DataPrivacyShield } from '../components/common/DataPrivacyShield.jsx';
import { toast } from 'sonner';

const ReactPhoneInput = PhoneInput.default || PhoneInput;

export const CustomersPage = () => {
  const { currentUser, role } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [engineersList, setEngineersList] = useState([]);
  const navigate = useNavigate();

  // Direct Customer Sale Form (Generates 3 service reminders)
  const [saleFormData, setSaleFormData] = useState({
    customerName: '',
    company: '',
    phone: '',
    purchasedProduct: '50 HP Screw Air Compressor',
    dispatchBranch: 'Surat',
    installationDate: new Date().toISOString().split('T')[0],
    assignedEngineer: 'Sanjay Patel',
    address: ''
  });
  const [machineStock, setMachineStock] = useState([]);

  const loadCustomers = async () => {
    setLoading(true);
    const [data, profiles, allStock] = await Promise.all([
      db.getCustomers(),
      db.getProfiles(),
      db.getStockItems()
    ]);
    setCustomers(data || []);
    const engs = (profiles || []).filter(p => p.role === 'Engineer');
    setEngineersList(engs);
    const machines = (allStock || []).filter(s => s.category === 'Machine');
    setMachineStock(machines);
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleOpenDirectSale = () => {
    setSaleFormData({
      customerName: '',
      company: '',
      phone: '',
      purchasedProduct: '50 HP Screw Air Compressor',
      dispatchBranch: 'Surat',
      installationDate: new Date().toISOString().split('T')[0],
      assignedEngineer: engineersList[0]?.name || 'Sanjay Patel',
      address: ''
    });
    setSaleModalOpen(true);
  };

  const handleSaveDirectSale = async (e) => {
    e.preventDefault();
    await db.addCustomerSale(saleFormData, currentUser);

    // If matching machine stock is found in the dispatch branch, deduct 1 unit
    const matchingStock = machineStock.find(
      s => s.branch === saleFormData.dispatchBranch &&
        (s.itemName.toLowerCase().includes(saleFormData.purchasedProduct.toLowerCase()) ||
          saleFormData.purchasedProduct.toLowerCase().includes(s.itemName.toLowerCase()))
    );
    if (matchingStock && matchingStock.quantity > 0) {
      await db.adjustStockQuantity(matchingStock.id, {
        adjustmentType: 'DEDUCT',
        quantity: 1,
        reason: 'Direct Customer Machine Sale',
        notes: `Sold to ${saleFormData.customerName} (${saleFormData.company})`
      });
      toast.success(`Product Sale Saved! 1 unit deducted from ${saleFormData.dispatchBranch} Branch machine inventory.`);
    } else {
      toast.success('Product Sale Saved! Initial Service scheduled for Field Engineer.');
    }

    setSaleModalOpen(false);
    await loadCustomers();
  };

  const handleOpenDelete = (customer) => {
    setCustomerToDelete(customer);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (customerToDelete) {
      await db.deleteCustomer(customerToDelete.id);
      toast.success('Customer record deleted successfully');
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
      await loadCustomers();
    }
  };

  const userBranch = currentUser?.branch || 'Surat';
  const isAdmin = role === 'Owner' || role === 'SuperAdmin' || role === 'Admin';

  const filteredCustomers = customers.filter(c => {
    if (!isAdmin && c.branch && c.branch !== userBranch) return false;

    return (
      (c.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || '').includes(searchTerm) ||
      (c.branch || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.purchasedProduct || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.salesPersonName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const columns = [
    {
      header: 'Customer Name',
      accessor: 'customerName'
    },
    {
      header: 'Company Name',
      cell: (row) => (
        <span className="font-bold text-gray-900">{row.company}</span>
      )
    },
    {
      header: 'Branch',
      cell: (row) => (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
          <Building2 className="w-3 h-3 text-[#3B318A]" />
          {row.branch || 'Surat'}
        </span>
      )
    },
    { header: 'Phone Number', accessor: 'phone' },
    {
      header: 'Purchased Product',
      cell: (row) => (
        <span className="text-xs font-semibold text-[#3B318A]">{row.purchasedProduct}</span>
      )
    },
    { header: 'Installation Date', accessor: 'installationDate' },
    { header: 'Assigned Engineer', accessor: 'assignedEngineer' },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/customers/${row.id}`)}
          >
            View Details <ChevronRight className="w-3.5 h-3.5" />
          </Button>
          <button
            onClick={() => handleOpenDelete(row)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete Customer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <DataPrivacyShield currentUser={currentUser} role={role}>
      <div className="space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#3B318A] to-[#2F2770] text-white p-6 rounded-2xl shadow-lg">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl font-black flex items-center gap-2">
                <Users className="w-6 h-6 text-indigo-300" />
                Customer Management
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                Data Privacy Active
              </span>
            </div>
            <p className="text-xs text-indigo-100">
              Installed machine customer registry with engineer-managed service logs, parts replacement tracking, and next service scheduling.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <Button onClick={handleOpenDirectSale} variant="amber" icon={ShoppingBag}>
              Record Item Sale
            </Button>
          </div>
        </div>

        <Card className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers by name, company, phone, machine product..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#3B318A] outline-none"
            />
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400">Loading customer database...</div>
          ) : (
            <Table columns={columns} data={filteredCustomers} emptyMessage="No customers found." />
          )}
        </Card>

        {/* Record Direct Item Sale Modal */}
        <Modal isOpen={saleModalOpen} onClose={() => setSaleModalOpen(false)} title="Record Item / Equipment Sale" maxWidth="max-w-xl">
          <form onSubmit={handleSaveDirectSale} className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                Field Engineer Service Assignment:
              </p>
              <p className="text-[11px] text-emerald-700">
                Saving this sale schedules the <strong>First Commissioning Service</strong> for the assigned engineer. Upon completion, the engineer logs parts replaced (e.g. Air filter) and enters the next service date.
              </p>
            </div>

            <Input
              label="Customer / Buyer Name"
              placeholder="e.g. Dharmesh Joshi"
              value={saleFormData.customerName}
              onChange={(e) => setSaleFormData({ ...saleFormData, customerName: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company Name"
                placeholder="e.g. Surat Diamond Craft"
                value={saleFormData.company}
                onChange={(e) => setSaleFormData({ ...saleFormData, company: e.target.value })}
                required
              />
              <div className="space-y-1.5 w-full">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                  <span>Phone Number</span> <span className="text-red-500 select-none">*</span>
                </label>
                <ReactPhoneInput
                  country={'in'}
                  enableSearch={true}
                  searchPlaceholder="Search country..."
                  value={saleFormData.phone}
                  onChange={(phone, country, e, formattedValue) =>
                    setSaleFormData({ ...saleFormData, phone: formattedValue || phone })
                  }
                  inputProps={{
                    required: true,
                    name: 'phone'
                  }}
                />
              </div>
            </div>

            {/* Branch Warehouse & Machine Stock Selection */}
            <div className="space-y-1.5 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                <span>Dispatch / Fulfill from Branch Warehouse</span> <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Surat', 'Morbi', 'Rajkot'].map((br) => {
                  const branchStockCount = machineStock
                    .filter((m) => m.branch === br)
                    .reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);

                  return (
                    <button
                      key={br}
                      type="button"
                      onClick={() => setSaleFormData({ ...saleFormData, dispatchBranch: br })}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all text-center ${saleFormData.dispatchBranch === br
                          ? 'bg-[#3B318A] text-white border-[#3B318A] shadow-xs'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                      <span className="block">{br} Branch</span>
                      <span
                        className={`text-[10px] font-semibold block mt-0.5 ${saleFormData.dispatchBranch === br ? 'text-indigo-200' : 'text-emerald-700'
                          }`}
                      >
                        {branchStockCount} Machines
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                Purchased Item / Machine Product
              </label>
              <select
                value={saleFormData.purchasedProduct}
                onChange={(e) => setSaleFormData({ ...saleFormData, purchasedProduct: e.target.value })}
                className="w-full h-[38px] px-3.5 py-2 text-sm border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] font-semibold text-gray-900"
              >
                <option value="50 HP Screw Air Compressor">50 HP Screw Air Compressor</option>
                <option value="75 HP VFD Screw Compressor">75 HP VFD Screw Compressor</option>
                <option value="100 HP Heavy-Duty Screw Air Compressor">100 HP Heavy-Duty Screw Air Compressor</option>
                <option value="30 HP Compact Rotary Screw Compressor">30 HP Compact Rotary Screw Compressor</option>
                <option value="10-Ton Industrial Water Chiller">10-Ton Industrial Water Chiller</option>
                <option value="Refrigerated Air Dryer 100 CFM">Refrigerated Air Dryer 100 CFM</option>
                <option value="Refrigerated Air Dryer 150 CFM">Refrigerated Air Dryer 150 CFM</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Purchase / Installation Date"
                type="date"
                value={saleFormData.installationDate}
                onChange={(e) => setSaleFormData({ ...saleFormData, installationDate: e.target.value })}
                required
              />
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">Assign Engineer</label>
                <select
                  value={saleFormData.assignedEngineer}
                  onChange={(e) => setSaleFormData({ ...saleFormData, assignedEngineer: e.target.value })}
                  className="w-full h-[38px] px-3 py-2 text-xs font-medium border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-[#3B318A] bg-white text-gray-900 truncate"
                >
                  {engineersList.length > 0 ? (
                    engineersList.map((eng) => (
                      <option key={eng.id} value={eng.name}>
                        {eng.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Sanjay Patel">Sanjay Patel</option>
                      <option value="Ramesh Kumar">Ramesh Kumar</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <Input
              label="Site / Installation Address (Optional)"
              placeholder="e.g. Plot No 12, GIDC Sachin, Surat"
              value={saleFormData.address}
              onChange={(e) => setSaleFormData({ ...saleFormData, address: e.target.value })}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSaleModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Save Sale & Generate Services
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Customer Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteConfirmOpen}
          onClose={() => {
            setDeleteConfirmOpen(false);
            setCustomerToDelete(null);
          }}
          onConfirm={handleConfirmDelete}
          title="Delete Customer Record?"
          description={
            customerToDelete ? (
              <span>
                Are you sure you want to delete <strong className="text-gray-900">{customerToDelete.customerName}</strong> ({customerToDelete.company || 'N/A'})? Deleting this customer will also remove their associated maintenance service reminders.
              </span>
            ) : (
              'Are you sure you want to delete this customer record?'
            )
          }
          confirmText="Yes, Delete Customer"
          cancelText="Cancel"
          variant="danger"
        />
      </div>
    </DataPrivacyShield>
  );
};
