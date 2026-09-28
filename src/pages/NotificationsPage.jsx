import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.jsx';
import {
  Bell,
  Wrench,
  Clock,
  Phone,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'URGENT' | 'WEEK' | 'FOLLOWUP'

  const loadNotifications = async () => {
    setLoading(true);
    const data = await db.getNotifications();
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleDeleteSingle = async (id) => {
    await db.deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success('Notification cleared');
  };

  const handleConfirmClearAll = async () => {
    await db.clearAllNotifications();
    setNotifications([]);
    setClearConfirmOpen(false);
    toast.success('All notifications cleared!');
  };

  const urgentCount = notifications.filter(n => n.severity === 'urgent').length;
  const weekCount = notifications.filter(n => n.severity === 'warning').length;
  const followupCount = notifications.filter(n => n.type === 'followup').length;

  const filteredNotifs = notifications.filter(n => {
    if (filterType === 'URGENT') return n.severity === 'urgent';
    if (filterType === 'WEEK') return n.severity === 'warning';
    if (filterType === 'FOLLOWUP') return n.type === 'followup';
    return true;
  });

  const getIcon = (notif) => {
    if (notif.severity === 'urgent') {
      return <Wrench className="w-5 h-5 text-red-600" />;
    }
    if (notif.severity === 'warning') {
      return <Clock className="w-5 h-5 text-amber-600" />;
    }
    if (notif.type === 'followup') {
      return <Phone className="w-5 h-5 text-indigo-600" />;
    }
    return <Bell className="w-5 h-5 text-[#3B318A]" />;
  };

  const getTypeBadge = (notif) => {
    if (notif.severity === 'urgent') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide bg-red-100 text-red-800 border border-red-300 px-2.5 py-0.5 rounded-full shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
          Urgent (≤3 Days)
        </span>
      );
    }
    if (notif.severity === 'warning') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-2xs">
          <Clock className="w-3 h-3 text-amber-700" />
          Due in 1 Week
        </span>
      );
    }
    if (notif.type === 'followup') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full">
          Lead Follow-up
        </span>
      );
    }
    return <Badge variant="default">Notification</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-[#3B318A] text-white p-6 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Bell className="w-6 h-6 text-amber-400" />
            Notifications & Due Date Alert Center
          </h1>
          <p className="text-xs text-indigo-100 mt-1 max-w-2xl">
            Real-time automated alerts: <strong>Red Alert</strong> for services due within 3 days or today, <strong>Orange Alert</strong> for services due within 1 week, and pending sales follow-ups.
          </p>
        </div>

        {notifications.length > 0 && (
          <Button
            type="button"
            variant="outline"
            icon={Trash2}
            onClick={() => setClearConfirmOpen(true)}
            className="text-white border-white/30 hover:bg-white/10 hover:border-white transition-all font-bold text-xs"
          >
            Clear All Alerts
          </Button>
        )}
      </div>

      {/* Quick Alert Filter Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setFilterType('ALL')}
          className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
            filterType === 'ALL'
              ? 'bg-[#3B318A] text-white border-[#3B318A] shadow-md'
              : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <span className="text-[11px] font-bold block uppercase tracking-wide opacity-80">All Alerts</span>
          <span className="text-2xl font-black block mt-0.5">{notifications.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('URGENT')}
          className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
            filterType === 'URGENT'
              ? 'bg-red-700 text-white border-red-700 shadow-md'
              : 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide">🚨 Urgent (≤3 Days)</span>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </div>
          <span className="text-2xl font-black block mt-0.5">{urgentCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('WEEK')}
          className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
            filterType === 'WEEK'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md'
              : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide">🟠 Due in 1 Week</span>
            <Clock className="w-3.5 h-3.5" />
          </div>
          <span className="text-2xl font-black block mt-0.5">{weekCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterType('FOLLOWUP')}
          className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
            filterType === 'FOLLOWUP'
              ? 'bg-indigo-700 text-white border-indigo-700 shadow-md'
              : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100/70'
          }`}
        >
          <span className="text-[11px] font-bold block uppercase tracking-wide opacity-80">Lead Follow-ups</span>
          <span className="text-2xl font-black block mt-0.5">{followupCount}</span>
        </button>
      </div>

      <Card className="divide-y divide-gray-100 p-0 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-gray-400">Loading real-time notifications...</div>
        ) : filteredNotifs.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-800">All Caught Up!</p>
              <p className="text-xs text-gray-400">No active notifications or pending due date alerts found.</p>
            </div>
          </div>
        ) : (
          filteredNotifs.map((notif) => {
            const isUrgent = notif.severity === 'urgent';
            const isWarning = notif.severity === 'warning';

            return (
              <div
                key={notif.id}
                className={`p-4 flex items-start gap-4 transition-colors group ${
                  isUrgent
                    ? 'border-l-4 border-l-red-500 bg-red-50/30 hover:bg-red-50/60'
                    : isWarning
                      ? 'border-l-4 border-l-amber-500 bg-amber-50/30 hover:bg-amber-50/60'
                      : 'hover:bg-gray-50/80'
                }`}
              >
                <div
                  className={`p-2.5 rounded-2xl shrink-0 ${
                    isUrgent ? 'bg-red-100' : isWarning ? 'bg-amber-100' : 'bg-gray-100'
                  }`}
                >
                  {getIcon(notif)}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-sm font-bold text-gray-900">{notif.title}</h4>
                    <div className="flex items-center gap-2">
                      {getTypeBadge(notif)}
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(notif.id)}
                        className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Dismiss Notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{notif.message}</p>
                  
                  {/* Action Link button to navigate */}
                  <div className="pt-1 flex items-center gap-2">
                    {notif.serviceId && (
                      <button
                        type="button"
                        onClick={() => navigate('/services?tab=schedules')}
                        className={`text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer ${
                          isUrgent ? 'text-red-700' : isWarning ? 'text-amber-800' : 'text-[#3B318A]'
                        }`}
                      >
                        <span>View in Services Schedule</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {notif.leadId && (
                      <button
                        type="button"
                        onClick={() => navigate('/leads')}
                        className="text-xs font-bold text-indigo-700 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span>View Lead Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </Card>

      {/* Clear All Confirm Modal */}
      <ConfirmModal
        isOpen={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={handleConfirmClearAll}
        title="Clear All Notifications?"
        description="Are you sure you want to clear all active alerts and notifications from your alert center?"
        confirmText="Yes, Clear All"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

