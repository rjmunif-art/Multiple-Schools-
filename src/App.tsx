import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { Header } from './components/common/Header';
import { BottomNav } from './components/common/BottomNav';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { PhotoDocumentViewer } from './components/common/PhotoDocumentViewer';
import { HeadTeacherAIAssistantModal } from './components/ai/HeadTeacherAIAssistantModal';
import { EditProfileModal } from './components/common/EditProfileModal';
import { Sparkles, School as SchoolIcon, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

import { OperatorDashboard } from './components/dashboard/OperatorDashboard';
import { SchoolDirectory } from './components/schools/SchoolDirectory';
import { StudentManager } from './components/students/StudentManager';
import { StaffManager } from './components/staff/StaffManager';
import { PayrollManager } from './components/payroll/PayrollManager';
import { AttendanceSystem } from './components/attendance/AttendanceSystem';
import { ExaminationManager } from './components/examinations/ExaminationManager';
import { SchoolComparison } from './components/comparison/SchoolComparison';
import { SchoolVisitManager } from './components/visits/SchoolVisitManager';
import { IssueManager } from './components/issues/IssueManager';
import { TaskManager } from './components/tasks/TaskManager';
import { ReportsCenter } from './components/reports/ReportsCenter';
import { ImportExportCenter } from './components/importExport/ImportExportCenter';
import { UserCredentialsManager } from './components/auth/UserCredentialsManager';
import { SettingsManager } from './components/settings/SettingsManager';
import { PullToRefresh } from './components/common/PullToRefresh';

import { OperatorProfileSetup } from './components/auth/OperatorProfileSetup';
import { HeadTeacherProfileSetup } from './components/auth/HeadTeacherProfileSetup';

const AppContent: React.FC = () => {
  const {
    currentUser,
    isAuthLoading,
    authStatus,
    pendingFirebaseUser,
    pendingInvite,
    authError,
    retryAuth,
    completeOperatorSetup,
    completeHeadTeacherSetup,
    logout,
    currentTab,
    isAIAssistantOpen,
    setIsAIAssistantOpen,
    isEditProfileOpen,
    closeEditProfile,
    editingTargetUser,
  } = useApp();

  // Error screen when Firestore read or verification fails (never default to operator silently)
  if (authStatus === 'auth_error') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Account Verification Error</h2>
        <p className="text-xs text-rose-300 max-w-sm mb-6 bg-rose-950/40 p-3 rounded-2xl border border-rose-800/60 font-mono leading-relaxed">
          {authError || 'An error occurred while verifying your Google account credentials.'}
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => retryAuth()}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer active:scale-98"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </button>
          <button
            onClick={logout}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // If checking authentication state, show smooth loading spinner (no login screen flash)
  if (isAuthLoading || authStatus === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center select-none">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-2xl shadow-emerald-950/60 border border-emerald-400/40 mb-4 animate-pulse">
          <SchoolIcon className="w-8 h-8 text-white" />
        </div>
        <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Verifying Session...</span>
        </div>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Sindh Education Foundation • Multi-Campus Operator Portal
        </p>
      </div>
    );
  }

  // If new Head Teacher with pending invite -> show Head Teacher Profile Setup
  if (authStatus === 'needs_head_teacher_setup' && pendingFirebaseUser && pendingInvite) {
    return (
      <HeadTeacherProfileSetup
        firebaseUser={pendingFirebaseUser}
        invite={pendingInvite}
        onComplete={completeHeadTeacherSetup}
        onSignOut={logout}
      />
    );
  }

  // If new Operator without completed profile -> show Operator Profile Setup
  if (authStatus === 'needs_operator_setup' && pendingFirebaseUser) {
    return (
      <OperatorProfileSetup
        firebaseUser={pendingFirebaseUser}
        onComplete={completeOperatorSetup}
        onSignOut={logout}
      />
    );
  }

  // If not authenticated, show the Google Sign-In auth screen
  if (!currentUser || authStatus === 'unauthenticated') {
    return <AuthScreen />;
  }

  return (
    <PullToRefresh>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors duration-200 w-full max-w-full overflow-x-hidden">
        <Header />

        <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-4 py-3 sm:py-5 pb-24 sm:pb-20 overflow-x-hidden">
          {currentTab === 'dashboard' && <OperatorDashboard />}
          {currentTab === 'schools' && <SchoolDirectory />}
          {currentTab === 'students' && <StudentManager />}
          {currentTab === 'staff' && <StaffManager />}
          {currentTab === 'payroll' && <PayrollManager />}
          {currentTab === 'attendance' && <AttendanceSystem />}
          {currentTab === 'examinations' && <ExaminationManager />}
          {currentTab === 'comparison' && <SchoolComparison />}
          {currentTab === 'visits' && <SchoolVisitManager />}
          {currentTab === 'issues' && <IssueManager />}
          {currentTab === 'tasks' && <TaskManager />}
          {currentTab === 'reports' && <ReportsCenter />}
          {currentTab === 'import-export' && <ImportExportCenter />}
          {currentTab === 'users' && <UserCredentialsManager />}
          {currentTab === 'settings' && <SettingsManager />}

          {/* Global Developer Credit & Help Footer */}
          <footer className="mt-8 pt-4 pb-4 border-t border-slate-800 text-center text-xs text-slate-400">
            <p className="font-medium text-slate-300">
              Design and Developed by <span className="text-emerald-400 font-semibold">Munif Ahmed</span>
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              SEF Multi-School Management System • Contact for Help:{' '}
              <a href="mailto:rjmunif@gmail.com" className="text-emerald-400 underline font-mono hover:text-emerald-300">
                rjmunif@gmail.com
              </a>
            </p>
          </footer>
        </main>

        <BottomNav />
        <OfflineIndicator />
        <GlobalSearchModal />
        <PhotoDocumentViewer />

        {/* Global Edit Profile Modal for Operators and HTs */}
        <EditProfileModal
          isOpen={isEditProfileOpen}
          onClose={closeEditProfile}
          targetUser={editingTargetUser}
        />

        {/* Floating AI Assistant Button (One-tap access on mobile & desktop) */}
        <button
          onClick={() => setIsAIAssistantOpen(true)}
          className="fixed bottom-16 right-3 sm:bottom-20 sm:right-6 z-35 flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-2xl border border-emerald-400/50 hover:scale-105 active:scale-95 transition cursor-pointer group"
          title="Open AI School Assistant (Evaluate, Search & Bulk Enroll from PDF/Excel)"
          aria-label="Open AI Assistant"
        >
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse group-hover:rotate-12 transition shrink-0" />
          <span className="tracking-wide">AI Assistant</span>
        </button>

        <HeadTeacherAIAssistantModal isOpen={isAIAssistantOpen} onClose={() => setIsAIAssistantOpen(false)} />
      </div>
    </PullToRefresh>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
