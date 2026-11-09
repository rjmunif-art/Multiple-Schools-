import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { PWAInstallButton } from './PWAInstallButton';
import { SideMenuDrawer } from './SideMenuDrawer';
import {
  School as SchoolIcon,
  Search,
  Bell,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  User,
  LogOut,
  ChevronDown,
  Calendar,
  Lock,
  Layers,
  Sparkles,
  UserCheck,
  Menu,
  Edit2
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser,
    logout,
    schools,
    activeSchoolId,
    setActiveSchoolId,
    activeSchool,
    activeAcademicYear,
    setActiveAcademicYear,
    settings,
    syncState,
    syncNow,
    pendingMutationsCount,
    isOnline,
    isSimulatedOffline,
    toggleSimulateOffline,
    notifications,
    markAllNotificationsRead,
    setIsSearchOpen,
    setIsAIAssistantOpen,
    quickSwitchUser,
    users,
    setCurrentTab,
    currentTab,
    openEditProfile,
  } = useApp();

  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const [showSchoolMenu, setShowSchoolMenu] = useState(false);
  const [showYearMenu, setShowYearMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const unreadNotifs = notifications.filter(n => !n.isRead);
  const isHT = currentUser?.role === 'head_teacher';
  const isSupervisor = currentUser?.role === 'supervisor';
  const isOperator = currentUser?.role === 'operator';

  const todayStr = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  // Touch gesture: swipe right only from the dashboard tab to open side menu
  useEffect(() => {
    let startX = 0;
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = endX - startX;
      const diffY = Math.abs(endY - startY);

      // Only allow swipe gesture on dashboard tab (distance > 50px and horizontally dominant)
      if (currentTab === 'dashboard' && diffX > 50 && diffX > diffY * 1.1) {
        setIsSideMenuOpen(true);
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [currentTab]);

  return (
    <>
      <header className="sticky top-0 z-30 bg-slate-900 border-b border-slate-800 text-white shadow-md select-none w-full max-w-full">
        {/* Top brand & meta strip */}
        <div className="px-3 py-1 flex items-center justify-between border-b border-slate-800/80 text-[11px] text-slate-300">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex items-center gap-1.5 font-bold tracking-wider text-emerald-400 uppercase text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SEF SCHOOL OPERATOR
            </div>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="truncate text-slate-400 font-medium hidden sm:inline">
              {currentUser?.organizationName || 'Muhammad Saleh Mangi'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync status badge & manual sync fallback */}
            <button
              onClick={() => syncNow()}
              disabled={syncState === 'syncing'}
              className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition cursor-pointer disabled:opacity-75"
              title="Automatic real-time sync is active. Tap to sync manually."
            >
              {(!isOnline || syncState === 'error') ? (
                <>
                  <WifiOff className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-amber-300 font-medium hidden xs:inline">Offline - will sync automatically</span>
                  <span className="text-amber-300 font-medium xs:hidden">Offline</span>
                </>
              ) : syncState === 'syncing' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-teal-300 animate-spin shrink-0" />
                  <span className="text-teal-200 font-medium">Syncing...</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="text-emerald-300 font-medium">All changes saved</span>
                </>
              )}
            </button>

            {/* Date */}
            <div className="hidden md:flex items-center gap-1 text-slate-400 font-mono text-[10px]">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{todayStr}</span>
            </div>

            {/* PWA Install Button */}
            <PWAInstallButton />
          </div>
        </div>

        {/* Main Bar: 3-line Menu, School Selector, Search, Notifications, User Profile */}
        <div className="px-2.5 py-1.5 flex items-center justify-between gap-1.5 sm:gap-2 w-full max-w-full">
          {/* Left: 3-line Hamburger Menu Button + School Selector */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1 max-w-[62%] sm:max-w-[70%]">
            {/* 3-line Menu button */}
            <button
              onClick={() => setIsSideMenuOpen(true)}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white transition cursor-pointer shrink-0"
              title="Open Navigation Menu"
              aria-label="Open Menu"
            >
              <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </button>

            {/* School Selector Dropdown (Narrowed down so all buttons comfortably fit fixed screen) */}
            <div className="relative min-w-0 flex-1">
              {isHT ? (
                // Head teacher is locked to their school
                <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white truncate">
                  <SchoolIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="truncate flex-1 text-left">
                    <div className="font-bold text-[11px] sm:text-xs truncate">{activeSchool?.name || 'School'}</div>
                    <div className="text-[9px] text-slate-400 truncate leading-none">Code: {activeSchool?.code}</div>
                  </div>
                  <Lock className="w-3 h-3 text-slate-400 shrink-0 hidden sm:inline" />
                </div>
              ) : (
                // Operator & Supervisor can switch between schools
                <>
                  <button
                    onClick={() => setShowSchoolMenu(!showSchoolMenu)}
                    className="w-full flex items-center justify-between gap-1.5 bg-slate-800/95 hover:bg-slate-750 active:bg-slate-700 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-white transition cursor-pointer text-left truncate"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <SchoolIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <div className="truncate leading-tight">
                        <div className="font-bold text-[11px] sm:text-xs truncate">
                          {activeSchoolId === 'all' ? `All Schools (${schools.length})` : activeSchool?.name}
                        </div>
                        <div className="text-[9px] text-slate-400 truncate leading-none mt-0.5">
                          {activeSchoolId === 'all' ? 'Combined View' : activeSchool?.code}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </button>

                  {showSchoolMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSchoolMenu(false)} />
                      <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 p-2 z-50 max-h-96 overflow-y-auto">
                        <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">
                          Switch School Scope
                        </div>

                        {/* All schools option */}
                        <button
                          onClick={() => {
                            setActiveSchoolId('all');
                            setShowSchoolMenu(false);
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left text-xs transition cursor-pointer mb-1 ${
                            activeSchoolId === 'all'
                              ? 'bg-emerald-600 text-white font-semibold'
                              : 'hover:bg-slate-800 text-slate-200'
                          }`}
                        >
                          <Layers className="w-4 h-4 text-emerald-300 shrink-0" />
                          <div>
                            <div className="font-bold">ALL SCHOOLS (Combined)</div>
                            <div className="text-[10px] opacity-80">All {schools.length} schools aggregated</div>
                          </div>
                        </button>

                        <div className="my-1 border-t border-slate-800" />

                        {/* School individual list */}
                        {schools.map(s => {
                          const isSelected = activeSchoolId === s.id;
                          return (
                            <button
                              key={s.id}
                              onClick={() => {
                                setActiveSchoolId(s.id);
                                setShowSchoolMenu(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition cursor-pointer mb-1 ${
                                isSelected
                                  ? 'bg-emerald-600 text-white font-semibold'
                                  : 'hover:bg-slate-800 text-slate-200'
                              }`}
                            >
                              <div className="truncate pr-2">
                                <div className="font-semibold truncate text-[11px] sm:text-xs">{s.name}</div>
                                <div className="text-[9px] opacity-80 flex items-center gap-1">
                                  <span className="font-mono">{s.code}</span>
                                  <span>•</span>
                                  <span>{s.district}</span>
                                </div>
                              </div>
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  s.status === 'active'
                                    ? 'bg-emerald-400'
                                    : s.status === 'attention'
                                    ? 'bg-amber-400'
                                    : 'bg-rose-500'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right actions: AI Assistant, Search, Notifications, User Profile */}
          <div className="flex items-center gap-1 shrink-0">
            {/* AI Assistant Button (For Head Teacher and Operator) */}
            <button
              onClick={() => setIsAIAssistantOpen(true)}
              className="flex items-center gap-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              title="SEF School AI Assistant - Evaluate data & bulk enroll from PDF/Excel"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span className="hidden md:inline">AI Assistant</span>
              <span className="md:hidden text-[10px]">AI</span>
            </button>

            {/* Universal Search */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition cursor-pointer"
              title="Search"
              aria-label="Search records"
            >
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className="relative p-1.5 sm:p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white transition cursor-pointer"
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300" />
                {unreadNotifs.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadNotifs.length}
                  </span>
                )}
              </button>

              {showNotifMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifMenu(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 p-2.5 z-50">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="text-xs font-bold text-white">System Alerts</span>
                      {unreadNotifs.length > 0 && (
                        <button
                          onClick={markAllNotificationsRead}
                          className="text-[10px] text-emerald-400 hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 mt-1">
                      {notifications.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-400">No notifications</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className={`p-2 text-xs ${n.isRead ? 'opacity-70' : 'bg-slate-800/50 rounded-lg'}`}>
                            <div className="font-semibold text-slate-200 flex items-center justify-between">
                              <span className="text-[11px] truncate">{n.title}</span>
                              <span className="text-[9px] text-slate-400 shrink-0">{new Date(n.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Account / Role Badge */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white transition cursor-pointer max-w-[170px]"
                title="Account menu"
              >
                {currentUser?.photoUrl ? (
                  <img
                    src={currentUser.photoUrl}
                    alt={currentUser.name}
                    className="w-6 h-6 rounded-full object-cover shrink-0 border border-emerald-400/60 shadow-xs"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isOperator
                        ? 'bg-amber-400 text-amber-950'
                        : isHT
                        ? 'bg-emerald-400 text-emerald-950'
                        : 'bg-purple-400 text-purple-950'
                    }`}
                  >
                    {currentUser?.name.charAt(0) || 'U'}
                  </div>
                )}
                <span className="hidden sm:inline font-semibold text-[11px] truncate text-slate-200">
                  {currentUser?.name}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-72 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 p-3 z-50">
                    <div className="pb-2.5 border-b border-slate-800 flex items-start gap-3">
                      {currentUser?.photoUrl ? (
                        <img
                          src={currentUser.photoUrl}
                          alt={currentUser.name}
                          className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400 shadow-md shrink-0"
                        />
                      ) : (
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            isOperator
                              ? 'bg-amber-400 text-amber-950'
                              : isHT
                              ? 'bg-emerald-400 text-emerald-950'
                              : 'bg-purple-400 text-purple-950'
                          }`}
                        >
                          {currentUser?.name.charAt(0) || 'U'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{currentUser?.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{currentUser?.email || currentUser?.username}</div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                            isOperator ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            isHT ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                            'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          }`}>
                            {currentUser?.role.replace('_', ' ')}
                          </span>
                          {isHT && activeSchool && (
                            <span className="text-[10px] text-emerald-300 truncate max-w-[130px]">
                              {activeSchool.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Edit Profile Button for Operators and HTs */}
                    <button
                      onClick={() => {
                        openEditProfile(currentUser);
                        setShowUserMenu(false);
                      }}
                      className="mt-2.5 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit {isOperator ? 'Operator' : isHT ? 'Head Teacher' : 'User'} Profile
                    </button>

                    {/* Switch user demo selector */}
                    <div className="mt-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Quick Role Switcher
                    </div>
                    <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                      {users.map(u => (
                        <button
                          key={u.id}
                          onClick={() => {
                            quickSwitchUser(u.id);
                            setShowUserMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition cursor-pointer ${
                            currentUser?.id === u.id ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="truncate">
                            <div className="truncate">{u.name}</div>
                            <div className="text-[10px] opacity-75">{u.role.replace('_', ' ')}</div>
                          </div>
                          {currentUser?.id === u.id && <UserCheck className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>

                    {isOperator && (
                      <button
                        onClick={() => {
                          setCurrentTab('users');
                          setShowUserMenu(false);
                        }}
                        className="mt-2 w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium text-center transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <User className="w-3.5 h-3.5" />
                        Manage Staff Credentials
                      </button>
                    )}

                    {/* Developer Credits & Support */}
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-800/70 border border-slate-700/80 text-[10px] text-center">
                      <div className="font-semibold text-slate-200">
                        Design and Developed by <span className="text-emerald-400">Munif Ahmed</span>
                      </div>
                      <div className="mt-1 flex items-center justify-center gap-1">
                        <span className="text-slate-400">Help:</span>
                        <a href="mailto:rjmunif@gmail.com" className="text-emerald-400 underline font-mono">
                          rjmunif@gmail.com
                        </a>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <button
                        onClick={toggleSimulateOffline}
                        className="text-[11px] text-slate-400 hover:text-slate-200"
                      >
                        {isSimulatedOffline ? 'Disable Offline' : 'Simulate Offline'}
                      </button>
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Side Menu Drawer Component */}
      <SideMenuDrawer isOpen={isSideMenuOpen} onClose={() => setIsSideMenuOpen(false)} />
    </>
  );
};
