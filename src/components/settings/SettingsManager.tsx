import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { storageService } from '../../services/storage';
import {
  Settings as SettingsIcon,
  Save,
  RotateCcw,
  Sliders,
  Shield,
  Moon,
  Sun,
  Globe,
  WifiOff,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  KeyRound,
  LogOut,
  RefreshCw,
  Download,
  Upload,
  Link,
  PhoneCall,
  Loader2,
  User,
  Activity,
  History,
  CheckCircle,
  FileSpreadsheet,
  Edit2
} from 'lucide-react';

export const SettingsManager: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetDemoData,
    currentUser,
    logout,
    openEditProfile,
    isSimulatedOffline,
    toggleSimulateOffline,
    syncState,
    syncNow,
    pendingMutationsCount,
    lastSyncTime,
    sendPhoneOtp,
    linkAccount,
    changePhoneNumber,
    schools,
    students,
    staff,
  } = useApp();

  type SettingsTab = 'account_security' | 'sync_backup' | 'policy_thresholds';
  const [activeTab, setActiveTab] = useState<SettingsTab>('account_security');

  // Policy thresholds
  const [criticalThreshold, setCriticalThreshold] = useState(settings.attendanceThresholds.criticalBelow);
  const [attentionThreshold, setAttentionThreshold] = useState(settings.attendanceThresholds.attentionBelow);
  const [passingPercentage, setPassingPercentage] = useState(settings.passingPercentage);

  // Formula weights
  const [attWeight, setAttWeight] = useState(settings.healthScoreFormula.attendanceWeight);
  const [teacherAttWeight, setTeacherAttWeight] = useState(settings.healthScoreFormula.teacherAttendanceWeight);
  const [examWeight, setExamWeight] = useState(settings.healthScoreFormula.examResultsWeight);
  const [monitoringWeight, setMonitoringWeight] = useState(settings.healthScoreFormula.monitoringWeight);
  const [issuesWeight, setIssuesWeight] = useState(settings.healthScoreFormula.issuesPenaltyWeight);

  const [activeAcademicYear, setActiveAcademicYear] = useState(settings.academicYear);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Devices & Audit Logs state
  const [devices, setDevices] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Link / Change phone modal state
  const [actionModal, setActionModal] = useState<'link_google' | 'link_phone' | 'change_phone' | null>(null);
  const [modalPhone, setModalPhone] = useState('');
  const [modalOtp, setModalOtp] = useState('');
  const [modalSessionId, setModalSessionId] = useState('');
  const [modalStep, setModalStep] = useState<'input_phone' | 'enter_otp'>('input_phone');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const currentDeviceId = storageService.getDeviceId();

  // Load devices and audit logs on tab view
  useEffect(() => {
    if (activeTab === 'account_security' && currentUser) {
      loadDevicesAndLogs();
    }
  }, [activeTab, currentUser]);

  const loadDevicesAndLogs = async () => {
    setIsLoadingDevices(true);
    try {
      const [devs, logs] = await Promise.all([
        storageService.getActiveDevices(currentUser?.id),
        storageService.getSecurityAuditLogs(currentUser?.id),
      ]);
      setDevices(devs);
      setAuditLogs(logs);
    } finally {
      setIsLoadingDevices(false);
    }
  };

  const handleSignOutOtherDevices = async () => {
    if (!currentUser) return;
    if (confirm('Are you sure you want to sign out all other mobile devices?')) {
      const res = await storageService.logoutDevice(currentDeviceId, currentUser.id, true);
      alert(res.message);
      loadDevicesAndLogs();
    }
  };

  const handleSignOutDevice = async (deviceId: string) => {
    if (!currentUser) return;
    const res = await storageService.logoutDevice(deviceId, currentUser.id);
    alert(res.message);
    loadDevicesAndLogs();
  };

  // Phone linking & phone update handler
  const handleSendModalOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');
    if (!modalPhone.trim()) {
      setModalError('Please enter Pakistani mobile phone number.');
      return;
    }
    setModalLoading(true);
    try {
      const res = await sendPhoneOtp(modalPhone);
      if (res.success && res.sessionId) {
        setModalSessionId(res.sessionId);
        setModalStep('enter_otp');
        setModalSuccess(res.message);
      } else {
        setModalError(res.message);
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to send OTP.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleVerifyModalOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');
    if (!modalOtp.trim() || !modalSessionId) {
      setModalError('Please enter the 6-digit OTP code.');
      return;
    }
    setModalLoading(true);
    try {
      if (actionModal === 'link_phone') {
        const res = await linkAccount({
          targetProvider: 'phone',
          phoneData: {
            phone: modalPhone,
            otp: modalOtp.trim(),
            sessionId: modalSessionId,
          },
        });
        if (res.success) {
          alert('Phone number linked successfully!');
          setActionModal(null);
          loadDevicesAndLogs();
        } else {
          setModalError(res.message);
        }
      } else if (actionModal === 'change_phone') {
        const res = await changePhoneNumber({
          newPhone: modalPhone,
          otp: modalOtp.trim(),
          sessionId: modalSessionId,
        });
        if (res.success) {
          alert('Phone number changed successfully on this account!');
          setActionModal(null);
          loadDevicesAndLogs();
        } else {
          setModalError(res.message);
        }
      }
    } catch (err: any) {
      setModalError(err.message || 'Operation failed.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    setModalError('');
    setModalLoading(true);
    try {
      const demoEmail = currentUser?.email || 'saleh.mangi@sefpartner.org.pk';
      const res = await linkAccount({
        targetProvider: 'google',
        googleData: {
          googleUid: 'google-sub-' + Date.now(),
          email: demoEmail,
          name: currentUser?.name || 'SEF Operator',
        },
      });
      if (res.success) {
        alert('Google Account linked successfully to your SEF Operator profile!');
        setActionModal(null);
        loadDevicesAndLogs();
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to link Google account.');
    } finally {
      setModalLoading(false);
    }
  };

  // Export full JSON backup
  const handleExportData = () => {
    const backup = storageService.generateFullBackup();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SEF_School_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const totalFormulaWeight = attWeight + teacherAttWeight + examWeight + monitoringWeight;

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      academicYear: activeAcademicYear,
      attendanceThresholds: {
        criticalBelow: Number(criticalThreshold),
        attentionBelow: Number(attentionThreshold),
      },
      passingPercentage: Number(passingPercentage),
      healthScoreFormula: {
        attendanceWeight: Number(attWeight),
        teacherAttendanceWeight: Number(teacherAttWeight),
        examResultsWeight: Number(examWeight),
        monitoringWeight: Number(monitoringWeight),
        issuesPenaltyWeight: Number(issuesWeight),
      },
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-4 pb-12 text-xs">
      {/* Settings Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('account_security')}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer text-xs ${
              activeTab === 'account_security'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            Account & Security
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sync_backup')}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer text-xs ${
              activeTab === 'sync_backup'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Cloud Sync & Data
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('policy_thresholds')}
            className={`px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer text-xs ${
              activeTab === 'policy_thresholds'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            SEF Policy Thresholds
          </button>
        </div>

        {saveSuccess && (
          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" />
            Settings Updated Successfully
          </span>
        )}
      </div>

      {/* Modal for Linking Phone or Changing Phone */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                {actionModal === 'link_phone' && 'Link Phone Number'}
                {actionModal === 'change_phone' && 'Change Account Phone Number'}
              </h3>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
                {modalError}
              </div>
            )}

            {modalStep === 'input_phone' ? (
              <form onSubmit={handleSendModalOtp} className="space-y-3">
                <p className="text-xs text-slate-300">
                  Enter your Pakistani mobile number. A 6-digit OTP will be sent to verify.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number</label>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 font-mono text-sm font-bold">
                      🇵🇰 +92
                    </span>
                    <input
                      type="tel"
                      value={modalPhone}
                      onChange={e => setModalPhone(e.target.value)}
                      placeholder="0300 1234567"
                      required
                      className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActionModal(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-md flex items-center gap-2"
                  >
                    {modalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PhoneCall className="w-3.5 h-3.5" />}
                    Send OTP
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyModalOtp} className="space-y-3">
                <p className="text-xs text-slate-300">
                  Enter 6-digit verification code sent to <strong className="font-mono text-emerald-300">{modalPhone}</strong>.
                </p>
                <input
                  type="text"
                  maxLength={6}
                  value={modalOtp}
                  onChange={e => setModalOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit code"
                  required
                  className="w-full rounded-xl bg-slate-800 border border-slate-700 px-3 py-2.5 text-center text-lg tracking-widest text-emerald-300 font-mono focus:outline-none focus:border-emerald-500 font-bold"
                />
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setModalStep('input_phone')}
                    className="text-xs text-slate-400 hover:underline"
                  >
                    Back to Number
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-md flex items-center gap-2"
                  >
                    {modalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    Verify & Confirm
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: ACCOUNT & SECURITY */}
      {activeTab === 'account_security' && (
        <div className="space-y-4">
          {/* User Profile Card */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {currentUser?.photoUrl ? (
                  <img
                    src={currentUser.photoUrl}
                    alt={currentUser.name}
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-400 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-lg font-bold shadow-md shrink-0">
                    {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'OP'}
                  </div>
                )}
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    {currentUser?.name || 'SEF Operator'}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                      {currentUser?.role || 'operator'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {currentUser?.organizationName || 'Sindh Education Foundation Partner'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => openEditProfile(currentUser)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out Account
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Username ID</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                  {currentUser?.username || 'N/A'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Registered Email</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                  {currentUser?.email || 'No email attached'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Verified Phone</div>
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                    {currentUser?.phone || 'Not verified'}
                  </div>
                </div>
                {currentUser?.phone && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionModal('change_phone');
                      setModalStep('input_phone');
                      setModalPhone('');
                    }}
                    className="text-[10px] px-2 py-1 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer"
                  >
                    Change
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Linked Login Methods Section (Google + Phone) */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <KeyRound className="w-4 h-4 text-emerald-600" />
              <span>Login Methods & Account Linking</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Link both Google and your verified mobile phone to this single account. You can log in using either method on any mobile or desktop without creating duplicate accounts.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Google Link Status */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUser?.photoUrl ? (
                    <img
                      src={currentUser.photoUrl}
                      alt="Google Avatar"
                      className="w-9 h-9 rounded-full object-cover border border-emerald-400 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                    </div>
                  )}
                  <div className="truncate">
                    <div className="font-bold text-slate-900 dark:text-white text-xs">Google Account</div>
                    <div className="text-[11px] text-slate-500 font-mono truncate">
                      {currentUser?.email || 'Authenticated'}
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                  Linked
                </span>
              </div>

              {/* Registered Phone Display */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-850 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
                    🇵🇰
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white text-xs">Primary Contact Phone</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {currentUser?.phone || 'Not provided'}
                    </div>
                  </div>
                </div>

                <span className="text-[10px] text-slate-400 font-medium">
                  Editable in Profile
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-200">
              🔒 <strong>Anti-Unsafe Merge Security:</strong> If a phone number or Google account is already registered to a separate distinct user account, automatic merging is blocked to protect school data ownership.
            </div>
          </div>

          {/* Active Devices Management */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                <span>Active Mobile & Desktop Devices</span>
              </div>
              <button
                type="button"
                onClick={handleSignOutOtherDevices}
                className="text-[11px] px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 font-bold cursor-pointer"
              >
                Sign Out All Other Devices
              </button>
            </div>
            <p className="text-slate-500 text-[11px]">
              Every phone or browser you sign in from is listed below. All devices access the same authorized cloud account.
            </p>

            {isLoadingDevices ? (
              <div className="py-6 text-center text-slate-400">Loading active devices...</div>
            ) : devices.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 text-center text-xs">
                Current device active.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {devices.map(dev => {
                  const isCurrent = dev.deviceId === currentDeviceId;
                  return (
                    <div key={dev.deviceId} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isCurrent ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                            {dev.deviceName || 'Mobile Device'}
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-600 text-white font-mono">
                                THIS DEVICE
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {dev.platform} • Last active: {new Date(dev.lastActiveAt).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => handleSignOutDevice(dev.deviceId)}
                          className="text-[11px] text-rose-500 hover:underline cursor-pointer font-semibold"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Security & Activity Audit Log */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <History className="w-4 h-4 text-emerald-600" />
              <span>Security & Account Activity Audit Trail</span>
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {auditLogs.length === 0 ? (
                <div className="py-4 text-center text-slate-400 text-[11px]">No recent audit logs.</div>
              ) : (
                auditLogs.map(log => (
                  <div key={log.id} className="py-2 flex items-center justify-between text-[11px]">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono">{log.action}: </span>
                      <span className="text-slate-600 dark:text-slate-300">{log.details || 'User event logged'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0 pl-2">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLOUD SYNCHRONIZATION & DATA BACKUP */}
      {activeTab === 'sync_backup' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-emerald-600" />
                  SEF Central Cloud Synchronization Engine
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  The central cloud database is the authoritative source of truth. Local changes sync automatically.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                  syncState === 'synced'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : syncState === 'syncing'
                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {syncState === 'synced' ? '✓ Synced' : syncState === 'syncing' ? '⟳ Syncing...' : '⚠ Pending Changes'}
                </span>

                <button
                  type="button"
                  onClick={async () => {
                    setIsSyncing(true);
                    await syncNow();
                    setIsSyncing(false);
                  }}
                  disabled={isSyncing}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync Now
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Pending Changes</div>
                <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                  {pendingMutationsCount} records
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Last Synced</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                  {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Just now'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Enrolled Students</div>
                <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                  {students.length}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Teaching Staff</div>
                <div className="text-base font-bold text-teal-600 dark:text-teal-400 mt-0.5 font-mono">
                  {staff.length}
                </div>
              </div>
            </div>
          </div>

          {/* Data Export & Backup Section */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Data Export & Full Cloud Backup</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Export authorized school data including students, staff, attendance, and examinations in structured formats.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handleExportData}
                className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs shadow-md flex items-center gap-2 hover:opacity-90 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Download Complete JSON Backup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SEF POLICY THRESHOLDS & SCORE FORMULA */}
      {activeTab === 'policy_thresholds' && (
        <form onSubmit={handleSaveSettings} className="space-y-4">
          {/* Attendance Thresholds */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Sliders className="w-4 h-4 text-emerald-600" />
              <span>Attendance Status Automated Thresholds (%)</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Controls the automatic Green / Yellow / Red indicators across the operator dashboard.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1 text-rose-600">Critical Red Status (Below %)</label>
                <input
                  type="number"
                  value={criticalThreshold}
                  onChange={e => setCriticalThreshold(Number(e.target.value))}
                  min={50}
                  max={95}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-bold focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Default: &lt;80% triggers critical alerts</span>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-amber-600">Attention Yellow Status (Below %)</label>
                <input
                  type="number"
                  value={attentionThreshold}
                  onChange={e => setAttentionThreshold(Number(e.target.value))}
                  min={60}
                  max={99}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-bold focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Default: 80% to 89% Attention</span>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-emerald-600">Exam Passing Percentage (%)</label>
                <input
                  type="number"
                  value={passingPercentage}
                  onChange={e => setPassingPercentage(Number(e.target.value))}
                  min={20}
                  max={50}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-bold focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">SEF Benchmark Standard: 33%</span>
              </div>
            </div>
          </div>

          {/* Transparent School Health Score Formula */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>School Health Performance Score Formula</span>
              </div>
              <span className={`text-[11px] font-mono font-bold ${totalFormulaWeight === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                Total Weight: {totalFormulaWeight}% {totalFormulaWeight === 100 ? '✓ Balanced' : '⚠️ Adjust to 100%'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 font-mono text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              Formula: Score = (Student Attendance × {attWeight}%) + (Teacher Attendance × {teacherAttWeight}%) + (Exam Pass % × {examWeight}%) + (Monitoring Visits × {monitoringWeight}%) - (Open Issues × 5 pts penalty)
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">Student Attendance Weight %</label>
                <input
                  type="number"
                  value={attWeight}
                  onChange={e => setAttWeight(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Teacher Attendance Weight %</label>
                <input
                  type="number"
                  value={teacherAttWeight}
                  onChange={e => setTeacherAttWeight(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Examination Pass % Weight</label>
                <input
                  type="number"
                  value={examWeight}
                  onChange={e => setExamWeight(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Monitoring Visits Weight</label>
                <input
                  type="number"
                  value={monitoringWeight}
                  onChange={e => setMonitoringWeight(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Academic Year & Offline Simulator */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white">Active Academic Year</h4>
              <select
                value={activeAcademicYear}
                onChange={e => setActiveAcademicYear(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2 font-bold"
              >
                {settings.availableAcademicYears.map(yr => (
                  <option key={yr} value={yr}>{yr} {yr === '2026-27' ? '(Current)' : ''}</option>
                ))}
              </select>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <WifiOff className="w-4 h-4 text-amber-500" />
                  Rural Offline Simulation Mode
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Simulates remote desert/village internet disconnection to test local queue and synchronization.
                </p>
              </div>

              <button
                type="button"
                onClick={toggleSimulateOffline}
                className={`w-full py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isSimulatedOffline
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {isSimulatedOffline ? 'Simulated Offline Active (Click to Go Online)' : 'Enable Simulated Offline'}
              </button>
            </div>
          </div>

          {/* Save & Reset buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                if (confirm('Reset application back to pristine demo data for 5 Sindh schools?')) {
                  resetDemoData();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Sample Sindh Demo Data
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Save System Settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
