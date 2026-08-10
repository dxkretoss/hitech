import React, { useState, useEffect } from 'react';
import { db } from '../services/db.js';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Bell, Wrench, Clock, Phone } from 'lucide-react';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    const data = await db.getNotifications();
    setNotifications(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

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
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          Notifications Alert Center
        </h1>
        <p className="text-xs text-gray-500 mt-1">Real-time alerts for Today's Services, Tomorrow Services, and Lead Follow-ups.</p>
      </div>

      <Card className="divide-y divide-gray-100 p-0 overflow-hidden">
        {loading ? (
          <div className="py-8 text-center text-xs text-gray-400">Loading notifications from database...</div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">No active notifications.</div>
        ) : (
          notifications.map((notif) => (
            <div key={notif.id} className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
              <div className="p-2.5 rounded-2xl bg-gray-100 shrink-0">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900">{notif.title}</h4>
                  {getTypeBadge(notif.type)}
                </div>
                <p className="text-xs text-gray-600">{notif.message}</p>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
};
