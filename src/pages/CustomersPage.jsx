import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Table } from '../components/ui/Table.jsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.jsx';
import { Search, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const navigate = useNavigate();

  const loadCustomers = async () => {
    setLoading(true);
    const data = await db.getCustomers();
    setCustomers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

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

  const filteredCustomers = customers.filter(c =>
    (c.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone || '').includes(searchTerm) ||
    (c.purchasedProduct || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Customer Management</h1>
        <p className="text-xs text-gray-500 mt-1">Installed machine customer registry with automated 3-stage recurring service schedules.</p>
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
  );
};

