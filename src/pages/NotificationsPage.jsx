import React, { useState, useEffect } from 'react';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { ConfirmModal } from '../components/ui/ConfirmModal.jsx';
import { Bell, Wrench, Clock, Phone, Trash2, X, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

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

  const getIcon = (type) => {
    switch (type) {
      case 'today': return <Wrench className="w-5 h-5 text-indigo-600" />;
      case 'tomorrow': return <Clock className="w-5 h-5 text-sky-600" />;
      case 'followup': return <Phone className="w-5 h-5 text-amber-600" />;
      default: return <Bell className="w-5 h-5 text-[#3B318A]" />;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'today': return <Badge variant="primary">Today's Service</Badge>;
      case 'tomorrow': return <Badge variant="info">Tomorrow Service</Badge>;
      case 'followup': return <Badge variant="warning">Pending Follow Up</Badge>;
      default: return <Badge variant="default">Notification</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            Notifications Alert Center
          </h1>
          <p className="text-xs text-gray-500 mt-1">Real-time alerts for Today's Services, Tomorrow Services, and Lead Follow-ups.</p>
        </div>

        {notifications.length > 0 && (
          <Button
            type="button"
            variant="outline"
            icon={Trash2}
            onClick={() => setClearConfirmOpen(true)}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 transition-all font-bold text-xs"
          >
            Clear All Notifications
          </Button>
        )}
      </div>

      <Card className="divide-y divide-gray-100 p-0 overflow-hidden">
        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading notifications from database...</div>
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-gray-800">All Caught Up!</p>
              <p className="text-xs text-gray-400">No active notifications or pending alerts at this time.</p>
            </div>
          </div>
        ) : (
          notifications.map((notif) => (
            <div key={notif.id} className="p-4 flex items-start gap-4 hover:bg-gray-50/80 transition-colors group">
              <div className="p-2.5 rounded-2xl bg-gray-100 shrink-0">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-gray-900">{notif.title}</h4>
                  <div className="flex items-center gap-2">
                    {getTypeBadge(notif.type)}
                    <button
                      type="button"
                      onClick={() => handleDeleteSingle(notif.id)}
                      className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Dismiss Notification"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-600">{notif.message}</p>
              </div>
            </div>
          ))
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

