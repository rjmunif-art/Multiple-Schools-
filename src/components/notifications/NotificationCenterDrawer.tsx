import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { notificationService } from '../../services/notificationService';
import { SystemNotification, NotificationPriority } from '../../types';
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  Users,
  AlertCircle,
  Calendar,
  Volume2,
  VolumeX,
  ArrowRight,
  Trash2,
  CheckCheck,
  DollarSign,
  Filter,
  ShieldCheck
} from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterDrawer: React.FC<DrawerProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    clearAllNotifications,
    deleteNotification,
    setCurrentTab,
    setActiveSchoolId,
    currentUser,
  } = useApp();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'urgent' | 'attendance' | 'admin'>('all');
  const [soundEnabled, setSoundEnabled] = useState(() => notificationService.isSoundEnabled());
  const [pushStatus, setPushStatus] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  if (!isOpen) return null;

  const handleToggleSound = () => {
    const next = !soundEnabled;
    notificationService.setSoundEnabled(next);
    setSoundEnabled(next);
    if (next) {
      notificationService.playChime('medium');
    }
  };

  const handleRequestPush = async () => {
    const res = await notificationService.requestPushPermission();
    setPushStatus(res);
  };

  // Filter list
  const filteredNotifs = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.isRead;
    if (activeFilter === 'urgent') return n.priority === 'urgent' || n.priority === 'high';
    if (activeFilter === 'attendance') return n.type === 'attendance';
    if (activeFilter === 'admin') return n.type === 'task' || n.type === 'issue' || n.type === 'payroll' || n.type === 'schedule' || n.type === 'admin';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNavigate = (notif: SystemNotification) => {
    markNotificationRead(notif.id);
    if (notif.schoolId) {
      setActiveSchoolId(notif.schoolId);
    }
    if (notif.actionTab) {
      setCurrentTab(notif.actionTab as any);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Push Alerts & System Center</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                      {unreadCount} new
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Real-time synchronization across Head Teachers & Operators
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Real-time Push Preferences bar */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            {/* Audio chime toggle */}
            <button
              onClick={handleToggleSound}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>{soundEnabled ? 'Chime Sound ON' : 'Chime Muted'}</span>
            </button>

            {/* Desktop Web Push toggle */}
            {pushStatus !== 'granted' ? (
              <button
                onClick={handleRequestPush}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm transition cursor-pointer"
              >
                <Bell className="w-3 h-3" />
                <span>Enable Browser Push</span>
              </button>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/50">
                <ShieldCheck className="w-3 h-3" />
                <span>Push Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter subtabs */}
        <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between gap-1 overflow-x-auto text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer shrink-0 ${
                activeFilter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer shrink-0 ${
                activeFilter === 'unread'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Unread ({unreadCount})
            </button>
            <button
              onClick={() => setActiveFilter('urgent')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer shrink-0 ${
                activeFilter === 'urgent'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Urgent & High
            </button>
            <button
              onClick={() => setActiveFilter('attendance')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer shrink-0 ${
                activeFilter === 'attendance'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => setActiveFilter('admin')}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer shrink-0 ${
                activeFilter === 'admin'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Admin & Tasks
            </button>
          </div>
        </div>

        {/* Global batch actions */}
        <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <span>Showing {filteredNotifs.length} alerts</span>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={markAllNotificationsRead}
                className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition cursor-pointer font-semibold"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAllNotifications}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-400 transition cursor-pointer font-medium"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear all</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-800/40">
          {filteredNotifs.length === 0 ? (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-400 mb-3 border border-slate-700/50">
                <Bell className="w-6 h-6 opacity-40" />
              </div>
              <p className="text-xs font-bold text-slate-400">No alerts found</p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
                New attendance submissions, task assignments, and administrative state changes will appear here in real time.
              </p>
            </div>
          ) : (
            filteredNotifs.map(n => {
              const isUrgent = n.priority === 'urgent';
              const isHigh = n.priority === 'high';

              let IconComp = Bell;
              if (n.type === 'attendance') IconComp = ClipboardCheck;
              else if (n.type === 'student' || n.type === 'staff') IconComp = Users;
              else if (n.type === 'issue') IconComp = AlertTriangle;
              else if (n.type === 'task') IconComp = AlertCircle;
              else if (n.type === 'payroll') IconComp = DollarSign;
              else if (n.type === 'schedule' || n.type === 'visit') IconComp = Calendar;

              const cardBg = !n.isRead
                ? isUrgent
                  ? 'bg-rose-950/50 border-rose-700/70 shadow-md'
                  : isHigh
                  ? 'bg-amber-950/40 border-amber-700/60'
                  : 'bg-emerald-950/30 border-emerald-800/70'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700';

              return (
                <div
                  key={n.id}
                  className={`pt-2.5 first:pt-0 rounded-2xl p-3 border transition-all ${cardBg}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isUrgent ? 'bg-rose-900/80 text-rose-300' : isHigh ? 'bg-amber-900/80 text-amber-300' : 'bg-emerald-900/80 text-emerald-300'
                      }`}>
                        <IconComp className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-black ${
                            isUrgent
                              ? 'bg-rose-600 text-white'
                              : isHigh
                              ? 'bg-amber-500 text-amber-950 font-bold'
                              : 'bg-emerald-700 text-emerald-100'
                          }`}>
                            {n.priority || 'Alert'}
                          </span>

                          {n.schoolName && (
                            <span className="text-[10px] text-emerald-400 font-semibold truncate max-w-[150px]">
                              {n.schoolName}
                            </span>
                          )}

                          {n.actorRole && (
                            <span className="text-[9px] text-slate-400 bg-slate-800 px-1 py-0.2 rounded">
                              By {n.actorRole === 'operator' ? 'Operator' : 'Head Teacher'}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-white mt-1 leading-snug">
                          {n.title}
                        </h4>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => deleteNotification(n.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition cursor-pointer"
                        title="Remove alert"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                    {n.message}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span>
                      {new Date(n.date).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                      {new Date(n.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <div className="flex items-center gap-2">
                      {!n.isRead && (
                        <button
                          onClick={() => markNotificationRead(n.id)}
                          className="text-emerald-400 hover:underline cursor-pointer font-semibold"
                        >
                          Mark read
                        </button>
                      )}

                      {n.actionTab && (
                        <button
                          onClick={() => handleNavigate(n)}
                          className="px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1 transition cursor-pointer"
                        >
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
