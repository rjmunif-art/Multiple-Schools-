import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  LayoutDashboard,
  School,
  ClipboardCheck,
  Award,
  Compass,
  FileText,
  DollarSign,
  Users,
  GraduationCap,
  AlertTriangle,
  CheckSquare,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  UserCheck,
  LogOut,
  ChevronRight,
  Archive,
  History,
  Building2,
  Calendar,
  Sparkles
} from 'lucide-react';

interface SideMenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SideMenuDrawer: React.FC<SideMenuDrawerProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    currentTab,
    setCurrentTab,
    schools,
    activeSchool,
    activeSchoolId,
    activeAcademicYear,
    logout,
    setIsAIAssistantOpen,
  } = useApp();

  const isOperator = currentUser?.role === 'operator';
  const isHT = currentUser?.role === 'head_teacher';
  const isSupervisor = currentUser?.role === 'supervisor';

  // Touch swipe support to close drawer
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;
    // If swiped left by more than 50px, close drawer
    if (diff < -50) {
      onClose();
      touchStartX.current = null;
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const navigateTo = (tab: string) => {
    setCurrentTab(tab);
    onClose();
  };

  const menuSections = [
    {
      title: 'Main Operations',
      items: [
        { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard, desc: 'Central KPIs & school statuses' },
        { id: 'schools', label: 'School Campuses', icon: School, desc: 'Profiles, GPS & facilities' },
        { id: 'attendance', label: 'Daily Attendance', icon: ClipboardCheck, desc: 'Student assembly roll call & staff' },
        { id: 'examinations', label: 'Results & Exams', icon: Award, desc: 'Midterm, annual & marks ledger' },
      ],
    },
    {
      title: 'Staff & Student Archives',
      items: [
        { id: 'students', label: 'Student Directory & Bio-data', icon: GraduationCap, desc: 'Enrolled & permanently archived passed-out students' },
        { id: 'staff', label: 'Staff & Teachers Directory', icon: Users, desc: 'Active & archived resigned teachers/peons' },
        ...(isOperator || isHT ? [{ id: 'payroll', label: 'Salary & Payroll Management', icon: DollarSign, desc: isHT ? 'Verify & acknowledge staff salary receipts' : 'Monthly payslips & payment history' }] : []),
      ],
    },
    {
      title: 'Field Monitoring & Actions',
      items: [
        { id: 'visits', label: 'School Monitoring Visits', icon: Compass, desc: 'Inspection checklists & audit reports' },
        { id: 'issues', label: 'School Issues & Follow-up', icon: AlertTriangle, desc: 'Infrastructure, staffing & compliance' },
        { id: 'tasks', label: 'Task Planner & Deadlines', icon: CheckSquare, desc: 'Action items for schools' },
      ],
    },
    {
      title: 'Reports & Administration',
      items: [
        { id: 'comparison', label: 'School Comparison Matrix', icon: FileSpreadsheet, desc: 'Benchmark attendance & exam scores' },
        { id: 'reports', label: 'Reports Center', icon: FileText, desc: 'SEF monthly summaries & PDF export' },
        { id: 'import-export', label: 'Data Backup & Import', icon: Archive, desc: 'Export excel / JSON backups' },
        ...(isOperator ? [{ id: 'users', label: 'Staff Account Credentials', icon: ShieldCheck, desc: 'Generate logins for Head Teachers' }] : []),
        { id: 'settings', label: 'System Settings', icon: Settings, desc: 'Thresholds, formula & theme' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className="relative w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 text-white flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 border-b border-emerald-800/60 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-sm font-bold tracking-wider text-emerald-100 uppercase">
                SEF School System
              </h2>
            </div>
            <p className="text-[11px] text-emerald-300/80 mt-0.5 truncate">
              {currentUser?.name} • <span className="uppercase font-semibold">{currentUser?.role?.replace('_', ' ')}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Context Pill */}
        <div className="px-3.5 py-2.5 bg-slate-850 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300 truncate font-medium">
              {activeSchoolId === 'all' ? `All Schools (${schools.length})` : activeSchool?.name}
            </span>
          </div>
          <span className="text-[10px] bg-slate-800 text-emerald-300 px-2 py-0.5 rounded-full font-mono shrink-0">
            {activeAcademicYear}
          </span>
        </div>

        {/* AI Assistant Quick Action */}
        <div className="p-3 pb-0">
          <button
            onClick={() => {
              onClose();
              setIsAIAssistantOpen(true);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg transition cursor-pointer group text-left border border-emerald-500/40"
          >
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold leading-tight flex items-center gap-1.5 text-white">
                AI School Assistant
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-400 text-slate-950 font-black uppercase tracking-wider">
                  PDF / Excel
                </span>
              </div>
              <div className="text-[10px] text-emerald-100 truncate mt-0.5">
                Auto-enroll students & evaluate records
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-75 group-hover:translate-x-0.5 transition shrink-0" />
          </button>
        </div>

        {/* Menu Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {menuSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {sec.title}
              </div>
              {sec.items.map(item => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigateTo(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-emerald-400'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium leading-tight truncate">{item.label}</div>
                      <div className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                        {item.desc}
                      </div>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 opacity-60 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  </button>
                );
              })}
            </div>
          ))}

          {/* Developer & Support Credit Card */}
          <div className="mt-4 p-3 rounded-2xl bg-slate-800/90 border border-slate-700/80 text-center">
            <div className="text-[11px] font-bold text-slate-200">
              Design and Developed by <span className="text-emerald-400">Munif Ahmed</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              SEF Multi-School Management System
            </div>
            <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-center gap-1.5">
              <span className="text-[10px] text-slate-400">Contact for Help:</span>
              <a
                href="mailto:rjmunif@gmail.com"
                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 font-semibold underline"
              >
                rjmunif@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Drawer Footer with Sign Out */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center text-xs font-bold">
              {currentUser?.name.charAt(0) || 'U'}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white truncate max-w-[120px]">{currentUser?.name}</div>
              <div className="text-[10px] text-slate-400">SEF Verified</div>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-semibold transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
