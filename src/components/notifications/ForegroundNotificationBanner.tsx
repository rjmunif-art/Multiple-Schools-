import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  Shield,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { PushNotificationRecord } from '../../types/notifications';

interface ForegroundNotificationBannerProps {
  onNavigate: (screen: string, schoolId?: string, recordId?: string) => void;
}

export const ForegroundNotificationBanner: React.FC<ForegroundNotificationBannerProps> = ({
  onNavigate,
}) => {
  const [currentNotif, setCurrentNotif] = useState<Partial<PushNotificationRecord> | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleNotification = (event: any) => {
      const notif = event.detail;
      if (notif) {
        setCurrentNotif(notif);
        setIsVisible(true);
      }
    };

    window.addEventListener('sef:notification', handleNotification);
    return () => {
      window.removeEventListener('sef:notification', handleNotification);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 7000);
    return () => clearTimeout(timer);
  }, [isVisible, currentNotif]);

  if (!isVisible || !currentNotif) return null;

  const handleOpen = () => {
    setIsVisible(false);
    if (currentNotif.target_screen) {
      onNavigate(
        currentNotif.target_screen,
        currentNotif.school_id,
        currentNotif.target_record_id
      );
    }
  };

  const getCategoryIcon = () => {
    switch (currentNotif.category) {
      case 'ATTENDANCE':
      case 'STUDENT_ATTENDANCE':
      case 'TEACHER_ATTENDANCE':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'TASK':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'ISSUE':
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      case 'VISIT':
        return <Calendar className="w-4 h-4 text-sky-400" />;
      case 'RESULT':
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case 'SECURITY':
      case 'ACCOUNT':
        return <Shield className="w-4 h-4 text-rose-400" />;
      case 'MESSAGE':
        return <MessageSquare className="w-4 h-4 text-teal-400" />;
      default:
        return <Bell className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-3 animate-in slide-in-from-top duration-300 pointer-events-auto">
      <div className="rounded-2xl bg-slate-900/98 text-white p-3.5 shadow-2xl border border-emerald-500/50 backdrop-blur-xl flex items-start gap-3 select-none">
        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 mt-0.5">
          {getCategoryIcon()}
        </div>

        <div className="flex-1 min-w-0" onClick={handleOpen} role="button" tabIndex={0}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-bold text-white truncate">
              {currentNotif.title || 'SEF Notification'}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono shrink-0">Just now</span>
          </div>

          {currentNotif.school_name && (
            <div className="text-[11px] text-emerald-300 font-medium truncate">
              {currentNotif.school_name}
            </div>
          )}

          <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
            {currentNotif.body}
          </p>

          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mt-1.5 hover:underline cursor-pointer">
            <span>Tap to view details</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
          }}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition shrink-0 cursor-pointer"
          title="Dismiss notification"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
