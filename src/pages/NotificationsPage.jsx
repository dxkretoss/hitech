import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
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
  Check,
  CheckCheck
} from 'lucide-react';
import { toast } from 'sonner';

export const NotificationsPage = () => {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'UNREAD' | 'URGENT' | 'WEEK' | 'FOLLOWUP'

  const isOwner = role === 'Owner' || role === 'SuperAdmin' || role === 'Admin';
  const isEngineer = role === 'Engineer';
  const isSales = role === 'Sales';

  const loadNotifications = async () => {
    setLoading(true);
    const data = await db.getNotifications(currentUser);
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, [currentUser, role]);

  const handleMarkAsRead = async (id) => {
    await db.markNotificationAsRead(id, currentUser);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    toast.success('Marked as read');
  };

  const handleMarkAllAsRead = async () => {
    await db.markAllNotificationsAsRead(currentUser);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast.success('All notifications marked as read');
  };

  const handleDeleteSingle = async (id) => {
    await db.deleteNotification(id, currentUser);
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast.success('Notification deleted');
  };

  const handleConfirmClearAll = async () => {
    await db.clearAllNotifications(currentUser);
    setNotifications([]);
    setClearConfirmOpen(false);
    toast.success('All notifications cleared!');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const urgentCount = notifications.filter(n => n.severity === 'urgent' && !n.isRead).length;
  const weekCount = notifications.filter(n => n.severity === 'warning' && !n.isRead).length;
  const followupCount = notifications.filter(n => n.type === 'followup' && !n.isRead).length;

  const filteredNotifs = notifications.filter(n => {
    if (filterType === 'UNREAD') return !n.isRead;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-[#3B318A] text-white p-4 sm:p-6 rounded-2xl shadow-lg">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/10 shrink-0 mt-0.5 sm:mt-1">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-black text-white leading-snug">
              Notifications & Due Date Alert Center
            </h1>
            <p className="text-xs text-indigo-100/90 mt-1 max-w-2xl leading-relaxed">
              {isEngineer
                ? 'Real-time database-managed service maintenance alerts: Red Alert for equipment services due within 3 days or today, and Orange Alert for services due within 1 week.'
                : isSales
                ? 'Real-time database-managed sales follow-up alerts and pending client meeting reminders for your active leads.'
                : 'Real-time database-managed alerts: Red Alert for services due within 3 days or today, Orange Alert for services due within 1 week, and pending sales follow-ups.'}
            </p>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="outline"
                icon={CheckCheck}
                onClick={handleMarkAllAsRead}
                className="text-white border-white/30 hover:bg-white/10 hover:border-white transition-all font-bold text-xs"
              >
                Mark All Read
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              icon={Trash2}
              onClick={() => setClearConfirmOpen(true)}
              className="text-white border-white/30 hover:bg-white/10 hover:border-white transition-all font-bold text-xs"
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Quick Alert Filter Pills */}
      <div className={`grid gap-2.5 sm:gap-3 ${
        isEngineer ? 'grid-cols-2 sm:grid-cols-4' : isSales ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
      }`}>

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
          onClick={() => setFilterType('UNREAD')}
          className={`p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
            filterType === 'UNREAD'
              ? 'bg-blue-600 text-white border-blue-600 shadow-md'
              : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wide">Unread</span>
            {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
          </div>
          <span className="text-2xl font-black block mt-0.5">{unreadCount}</span>
        </button>

        {!isSales && (
          <>
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
                <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Urgent (≤3 Days)
                </span>
                {urgentCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
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
                <span className="text-[11px] font-bold uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Due in 1 Week
                </span>
                {weekCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              </div>
              <span className="text-2xl font-black block mt-0.5">{weekCount}</span>
            </button>
          </>
        )}

        {!isEngineer && (
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
        )}
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
              <p className="text-xs text-gray-400">No notifications found under this filter.</p>
            </div>
          </div>
        ) : (
          filteredNotifs.map((notif) => {
            const isUrgent = notif.severity === 'urgent';
            const isWarning = notif.severity === 'warning';
            const isRead = notif.isRead === true;

            return (
              <div
                key={notif.id}
                className={`p-4 flex items-start gap-4 transition-colors group ${
                  isRead
                    ? 'opacity-60 bg-gray-50/50 hover:opacity-100 hover:bg-gray-50'
                    : isUrgent
                    ? 'bg-red-50/40 hover:bg-red-50/70 border-l-4 border-l-red-600'
                    : isWarning
                    ? 'bg-amber-50/30 hover:bg-amber-50/60 border-l-4 border-l-amber-500'
                    : 'bg-white hover:bg-gray-50/80 border-l-4 border-l-blue-500'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isUrgent ? 'bg-red-100' : isWarning ? 'bg-amber-100' : 'bg-gray-100'
                  }`}
                >
                  {getIcon(notif)}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-bold ${isRead ? 'text-gray-600' : 'text-gray-900'}`}>
                        {notif.title}
                      </h4>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600" title="Unread" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isRead && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Read
                        </span>
                      )}
                      {getTypeBadge(notif)}
                      {!isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(notif.id)}
                          className="p-1 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Mark as Read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(notif.id)}
                        className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete Notification"
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
                        onClick={() => navigate(isOwner ? '/admin/services?tab=schedules' : '/services?tab=schedules')}
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
                        onClick={() => navigate(isOwner ? '/admin/leads' : '/leads')}
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
        description="Are you sure you want to clear all notifications from your alert center?"
        confirmText="Yes, Clear All"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};
