import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  Shield,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Filter,
  Inbox,
  RefreshCw,
} from 'lucide-react';
import { PushNotificationRecord, NotificationCategory } from '../../types/notifications';
import { notificationService } from '../../services/notificationService';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onNavigate: (screen: string, schoolId?: string, recordId?: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  userId,
  onNavigate,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [notifications, setNotifications] = useState<PushNotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const filterTabs = [
    { id: 'ALL', label: 'All' },
    { id: 'UNREAD', label: `Unread (${unreadCount})` },
    { id: 'ATTENDANCE', label: 'Attendance' },
    { id: 'TASK', label: 'Tasks' },
    { id: 'ISSUE', label: 'Issues' },
    { id: 'VISIT', label: 'Visits' },
    { id: 'RESULT', label: 'Results' },
    { id: 'MESSAGE', label: 'Messages' },
    { id: 'SYSTEM', label: 'System' },
  ];

  const loadNotifications = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await notificationService.fetchNotifications(userId, {
        unreadOnly: activeFilter === 'UNREAD',
        category:
          activeFilter !== 'ALL' && activeFilter !== 'UNREAD'
            ? activeFilter
            : undefined,
      });
      setNotifications(res.notifications);
      setUnreadCount(res.unreadCount);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, activeFilter, userId]);

  // Re-fetch on foreground notification
  useEffect(() => {
    const handleForeground = () => {
      loadNotifications();
    };
    window.addEventListener('sef:notification', handleForeground);
    return () => window.removeEventListener('sef:notification', handleForeground);
  }, [userId, activeFilter]);

  if (!isOpen) return null;

  const handleNotificationClick = async (notif: PushNotificationRecord) => {
    if (!notif.read_at) {
      await notificationService.markAsRead(userId, notif.notification_id);
      setNotifications(prev =>
        prev.map(n =>
          n.notification_id === notif.notification_id
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount(c => Math.max(0, c - 1));
    }

    onClose();

    if (notif.target_screen) {
      onNavigate(notif.target_screen, notif.school_id, notif.target_record_id);
    }
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAsRead(userId, undefined, true);
    setNotifications(prev =>
      prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
    );
    setUnreadCount(0);
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await notificationService.deleteNotification(userId, notificationId);
    setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} min ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hr ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      return new Date(isoString).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return 'Recently';
    }
  };

  const getCategoryBadge = (category: NotificationCategory) => {
    switch (category) {
      case 'ATTENDANCE':
      case 'STUDENT_ATTENDANCE':
      case 'TEACHER_ATTENDANCE':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Attendance
          </span>
        );
      case 'TASK':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle className="w-3 h-3 text-emerald-400" />
            Task
          </span>
        );
      case 'ISSUE':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Issue
          </span>
        );
      case 'VISIT':
      case 'MONITORING':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
            <Calendar className="w-3 h-3 text-sky-400" />
            Visit
          </span>
        );
      case 'RESULT':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
            <FileText className="w-3 h-3 text-indigo-400" />
            Result
          </span>
        );
      case 'SECURITY':
      case 'ACCOUNT':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
            <Shield className="w-3 h-3 text-rose-400" />
            Security
          </span>
        );
      case 'MESSAGE':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800">
            <MessageSquare className="w-3 h-3 text-teal-400" />
            Message
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            <Bell className="w-3 h-3 text-slate-400" />
            System
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">Notifications Center</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-mono text-[10px] font-black">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Live alerts for attendance, tasks, issues & messages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              onClick={loadNotifications}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Close"
              aria-label="Close notifications modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Tabs Strip */}
        <div className="px-3 py-2 border-b border-slate-800/80 bg-slate-950/30 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {filterTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                activeFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification List Container */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-800/40">
          {isLoading && notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-emerald-400" />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Inbox className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No notifications found</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {activeFilter === 'UNREAD'
                  ? 'You are all caught up! No unread notifications.'
                  : 'New school activity, attendance alerts, and tasks will appear here.'}
              </p>
            </div>
          ) : (
            notifications.map(notif => {
              const isUnread = !notif.read_at;
              return (
                <div
                  key={notif.notification_id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`pt-2 p-3 rounded-2xl transition cursor-pointer relative group flex items-start gap-3 border ${
                    isUnread
                      ? 'bg-slate-800/60 hover:bg-slate-800/90 border-emerald-500/30'
                      : 'bg-slate-900/40 hover:bg-slate-800/40 border-slate-800/60 opacity-80 hover:opacity-100'
                  }`}
                >
                  {/* Unread dot */}
                  {isUnread && (
                    <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}

                  <div className="mt-0.5 shrink-0">
                    {getCategoryBadge(notif.category)}
                  </div>

                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-white leading-tight">
                        {notif.title}
                      </span>
                      {notif.school_name && (
                        <span className="text-[10px] text-emerald-400/90 font-medium bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60">
                          {notif.school_name}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {notif.body}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span>{formatRelativeTime(notif.created_at)}</span>
                      {notif.target_screen && (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold group-hover:underline">
                          <ExternalLink className="w-3 h-3" />
                          <span>View {notif.target_screen}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={(e) => handleDelete(e, notif.notification_id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-950/70 text-slate-500 hover:text-rose-400 transition shrink-0 cursor-pointer"
                    title="Delete notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info strip */}
        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-[11px] text-slate-400">
          <span>Synced with Firebase Cloud Messaging (FCM)</span>
          <span className="text-emerald-400 font-medium">Multi-Device Synchronized</span>
        </div>
      </div>
    </div>
  );
};
