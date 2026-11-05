import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  School,
  ClipboardCheck,
  Award,
  Compass,
  FileText,
  DollarSign,
  MoreHorizontal,
  Users,
  GraduationCap,
  AlertTriangle,
  CheckSquare,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  X
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { currentTab, setCurrentTab, currentUser } = useApp();
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  const isOperator = currentUser?.role === 'operator';
  const isHT = currentUser?.role === 'head_teacher';
  const isSupervisor = currentUser?.role === 'supervisor';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'schools', label: 'Schools', icon: School },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'examinations', label: 'Results', icon: Award },
    { id: 'visits', label: 'Visits', icon: Compass },
    ...(isOperator || isHT ? [{ id: 'payroll', label: 'Payroll', icon: DollarSign }] : []),
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  const moreItems = [
    { id: 'students', label: 'Student Directory', icon: GraduationCap, desc: 'GR numbers, B-Form & parent records' },
    { id: 'staff', label: 'Staff & Teachers', icon: Users, desc: 'Head teachers, teachers & peon profiles' },
    { id: 'comparison', label: 'School Comparison', icon: FileSpreadsheet, desc: 'Side-by-side performance comparison' },
    { id: 'issues', label: 'Issues & Follow-up', icon: AlertTriangle, desc: 'Facility, staffing & safety alerts' },
    { id: 'tasks', label: 'Task Management', icon: CheckSquare, desc: 'School deadlines & assignments' },
    { id: 'import-export', label: 'Import / Export', icon: FileSpreadsheet, desc: 'Excel / CSV upload and backups' },
    ...(isOperator ? [{ id: 'users', label: 'School Credentials', icon: ShieldCheck, desc: 'Generate login for Head Teachers & Supervisors' }] : []),
    { id: 'settings', label: 'App Settings', icon: Settings, desc: 'Thresholds, formula, theme & sync' },
  ];

  return (
    <>
      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 text-slate-300 border-t border-slate-800 backdrop-blur-md px-1 py-1 shadow-2xl safe-area-bottom">
        <div className="flex items-center justify-around max-w-xl mx-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setShowMoreSheet(false);
                }}
                className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition cursor-pointer ${
                  isActive
                    ? 'text-emerald-400 font-bold scale-105'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400 stroke-[2.4]' : 'stroke-[1.8]'}`} />
                <span className="text-[10px] mt-0.5 tracking-tight truncate">{item.label}</span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setShowMoreSheet(!showMoreSheet)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition cursor-pointer ${
              showMoreSheet || ['students', 'staff', 'comparison', 'issues', 'tasks', 'import-export', 'settings', 'users'].includes(currentTab)
                ? 'text-emerald-400 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* More Drawer Sheet */}
      {showMoreSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setShowMoreSheet(false)} />
          <div className="relative z-10 w-full max-w-lg mx-auto bg-[#032e22] text-white rounded-t-3xl border-t border-emerald-600/70 shadow-2xl p-4 pb-8 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1 bg-emerald-700/60 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between pb-3 border-b border-emerald-800">
              <div>
                <h3 className="text-sm font-bold text-white">Additional School Modules</h3>
                <p className="text-xs text-emerald-200/80">All tools for field operations and records</p>
              </div>
              <button
                onClick={() => setShowMoreSheet(false)}
                className="p-1.5 rounded-full bg-[#02241b] text-emerald-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {moreItems.map(item => {
                const Icon = item.icon;
                const isSelected = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setShowMoreSheet(false);
                    }}
                    className={`flex items-start gap-3 p-3 rounded-2xl border text-left transition cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-400 font-bold'
                        : 'bg-[#02241b] border-emerald-700/50 hover:bg-[#04382c] text-emerald-100'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-900/90 border border-emerald-600/60 flex items-center justify-center shrink-0 text-emerald-300">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold truncate">{item.label}</div>
                      <div className="text-[11px] text-emerald-300/70 leading-snug line-clamp-2 mt-0.5">{item.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
