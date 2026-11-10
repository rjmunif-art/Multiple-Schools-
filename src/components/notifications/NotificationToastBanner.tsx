import React from 'react';
import { useApp } from '../../context/AppContext';
import { SystemNotification } from '../../types';
import {
  Bell,
  AlertTriangle,
  ClipboardCheck,
  Users,
  AlertCircle,
  Calendar,
  X,
  ArrowRight,
  ShieldAlert,
  DollarSign
} from 'lucide-react';

interface ToastProps {
  toasts: SystemNotification[];
  onDismiss: (id: string) => void;
  onNavigate: (tab: string, schoolId?: string) => void;
}

export const NotificationToastBanner: React.FC<ToastProps> = ({ toasts, onDismiss, onNavigate }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-3 pointer-events-none flex flex-col gap-2.5">
      {toasts.map(toast => {
        const isUrgent = toast.priority === 'urgent';
        const isHigh = toast.priority === 'high';

        // Select matching category icon
        let IconComponent = Bell;
        if (toast.type === 'attendance') IconComponent = ClipboardCheck;
        else if (toast.type === 'student' || toast.type === 'staff') IconComponent = Users;
        else if (toast.type === 'issue') IconComponent = AlertTriangle;
        else if (toast.type === 'task') IconComponent = AlertCircle;
        else if (toast.type === 'payroll') IconComponent = DollarSign;
        else if (toast.type === 'schedule' || toast.type === 'visit') IconComponent = Calendar;

        // Border and bg colors
        const containerClasses = isUrgent
          ? 'bg-rose-950/95 border-rose-600 shadow-2xl shadow-rose-950/80 text-rose-100 ring-2 ring-rose-500/50'
          : isHigh
          ? 'bg-amber-950/95 border-amber-600 shadow-2xl shadow-amber-950/80 text-amber-100 ring-1 ring-amber-500/40'
          : 'bg-slate-900/95 border-emerald-600/70 shadow-2xl shadow-black/80 text-slate-100 ring-1 ring-emerald-500/30';

        const badgeClasses = isUrgent
          ? 'bg-rose-600 text-white animate-pulse'
          : isHigh
          ? 'bg-amber-500 text-amber-950 font-bold'
          : 'bg-emerald-600 text-white';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border p-3.5 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 flex items-start gap-3 ${containerClasses}`}
            role="alert"
          >
            {/* Category Icon */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
              isUrgent ? 'bg-rose-900/70 text-rose-300' : isHigh ? 'bg-amber-900/70 text-amber-300' : 'bg-emerald-900/70 text-emerald-300'
            }`}>
              <IconComponent className="w-5 h-5" />
            </div>

            {/* Content Body */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full font-black ${badgeClasses}`}>
                  {toast.priority || 'Alert'}
                </span>
                {toast.schoolName && (
                  <span className="text-[10px] text-slate-300 font-semibold truncate max-w-[170px]">
                    {toast.schoolName}
                  </span>
                )}
                {toast.actorRole && (
                  <span className="text-[9px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                    From {toast.actorRole === 'operator' ? 'Operator' : 'Head Teacher'}
                  </span>
                )}
              </div>

              <h4 className="text-xs font-bold mt-1 text-white leading-tight">
                {toast.title}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
                {toast.message}
              </p>

              {/* Action and Dismiss */}
              <div className="mt-2.5 flex items-center gap-2">
                {toast.actionTab && (
                  <button
                    onClick={() => {
                      onNavigate(toast.actionTab!, toast.schoolId);
                      onDismiss(toast.id);
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition cursor-pointer active:scale-95 ${
                      isUrgent
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                        : isHigh
                        ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-md'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                    }`}
                  >
                    <span>View Record</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}

                <button
                  onClick={() => onDismiss(toast.id)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>

            {/* Close Cross */}
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/50 transition cursor-pointer shrink-0"
              title="Close alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
