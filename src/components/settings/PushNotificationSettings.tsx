import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Send,
  Loader2,
  Settings as SettingsIcon,
  Shield,
  RefreshCw,
  Info,
  Sliders,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { UserAccount, School } from '../../types';
import {
  NotificationPermissionState,
  NotificationCategoryPreferences,
  DEFAULT_OPERATOR_PREFERENCES,
  DEFAULT_HEAD_TEACHER_PREFERENCES,
} from '../../types/notifications';
import { notificationService } from '../../services/notificationService';
import { storageService } from '../../services/storage';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface PushNotificationSettingsProps {
  currentUser: UserAccount;
  schools: School[];
  onOpenSendModal?: () => void;
}

export const PushNotificationSettings: React.FC<PushNotificationSettingsProps> = ({
  currentUser,
  schools,
  onOpenSendModal,
}) => {
  const [permissionState, setPermissionState] = useState<NotificationPermissionState>(
    notificationService.getPermissionState()
  );
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'warning' | 'info';
    text: string;
  } | null>(null);

  const [activeDevices, setActiveDevices] = useState<any[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);

  // Category preferences
  const isHT = currentUser.role === 'headTeacher' || currentUser.role === 'head_teacher';
  const defaultPrefs = isHT ? DEFAULT_HEAD_TEACHER_PREFERENCES : DEFAULT_OPERATOR_PREFERENCES;
  const [preferences, setPreferences] = useState<NotificationCategoryPreferences>(() => {
    try {
      const saved = localStorage.getItem(`sef_notif_prefs_${currentUser.id}`);
      return saved ? JSON.parse(saved) : defaultPrefs;
    } catch {
      return defaultPrefs;
    }
  });

  const currentDeviceId = storageService.getDeviceId();

  // Load registered devices for this user with dual-source fallback
  const loadDevices = async () => {
    if (!currentUser?.id) return;
    setIsLoadingDevices(true);
    let loaded: any[] = [];
    try {
      const res = await fetch(`/api/notifications/devices?userId=${encodeURIComponent(currentUser.id)}`);
      if (res.ok) {
        const text = await res.text();
        if (text && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
          const data = JSON.parse(text);
          if (data.success && Array.isArray(data.devices) && data.devices.length > 0) {
            loaded = data.devices;
          }
        }
      }
    } catch (e) {
      console.warn('Failed loading notification devices from server:', e);
    }

    // Direct Firestore fallback / sync
    if (loaded.length === 0) {
      try {
        const q = query(
          collection(db, 'notification_devices'),
          where('user_id', '==', currentUser.id)
        );
        const snap = await getDocs(q);
        const fsDevices: any[] = [];
        snap.forEach(docSnap => {
          fsDevices.push(docSnap.data());
        });
        if (fsDevices.length > 0) {
          loaded = fsDevices;
        }
      } catch (fsErr) {
        console.warn('Failed loading notification devices from Firestore:', fsErr);
      }
    }

    setActiveDevices(loaded);
    setIsLoadingDevices(false);
  };

  useEffect(() => {
    setPermissionState(notificationService.getPermissionState());
    loadDevices();
  }, [currentUser]);

  // Persist category preferences
  const handleTogglePref = (key: keyof NotificationCategoryPreferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    try {
      localStorage.setItem(`sef_notif_prefs_${currentUser.id}`, JSON.stringify(updated));
    } catch {}
  };

  const handleSetAllPrefs = (enabled: boolean) => {
    const updated: NotificationCategoryPreferences = {
      attendance_alerts: enabled,
      teacher_alerts: enabled,
      school_issues: enabled,
      tasks: enabled,
      visits: enabled,
      results: enabled,
      messages: enabled,
      system_alerts: enabled,
    };
    setPreferences(updated);
    try {
      localStorage.setItem(`sef_notif_prefs_${currentUser.id}`, JSON.stringify(updated));
    } catch {}
  };

  // Critical Permission Flow execution
  const handleEnableNotifications = async () => {
    setIsRegistering(true);
    setStatusMessage(null);

    const schoolIds = isHT
      ? currentUser.schoolId ? [currentUser.schoolId] : []
      : schools.map(s => s.id);

    const role = isHT ? 'headTeacher' : 'operator';

    try {
      const result = await notificationService.enableNotifications(currentUser.id, role, schoolIds);
      setPermissionState(result.state);

      if (result.success) {
        setStatusMessage({
          type: 'success',
          text: result.message,
        });
        await loadDevices();
      } else {
        if (result.state === 'denied') {
          setStatusMessage({
            type: 'error',
            text: 'Notifications are currently disabled. You can enable them from Android Settings.',
          });
          setShowAndroidGuide(true);
        } else {
          setStatusMessage({
            type: 'warning',
            text: result.message,
          });
        }
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error registering device: ${err.message}`,
      });
    } finally {
      setIsRegistering(false);
    }
  };

  // Send real test notification
  const handleSendTestPush = async () => {
    setIsSendingTest(true);
    setStatusMessage(null);

    try {
      const school = schools[0];
      const res = await notificationService.sendTestNotification(
        currentUser.id,
        school?.id,
        school?.name
      );

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Test push notification sent! Check your Android notification panel and open the alert.',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message || 'Failed to dispatch test notification.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Error sending test notification: ${err.message}`,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Determine Exact Verification Status
  const isCurrentDeviceRegistered =
    activeDevices.some(
      d => d.device_id === currentDeviceId && d.is_active && d.notifications_enabled
    ) || permissionState === 'granted';

  let enableStatusText = 'Not Registered';
  let enableStatusColor = 'text-slate-400 bg-slate-800 border-slate-700';

  if (permissionState === 'denied') {
    enableStatusText = 'Blocked by Android';
    enableStatusColor = 'text-rose-400 bg-rose-950/80 border-rose-800';
  } else if (permissionState === 'default') {
    enableStatusText = 'Permission Required';
    enableStatusColor = 'text-amber-400 bg-amber-950/80 border-amber-800';
  } else if (permissionState === 'granted') {
    if (isRegistering) {
      enableStatusText = 'Syncing Registration';
      enableStatusColor = 'text-sky-400 bg-sky-950/80 border-sky-800';
    } else {
      enableStatusText = 'Enabled & Active';
      enableStatusColor = 'text-emerald-400 bg-emerald-950/80 border-emerald-700';
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Primary Notification Status Card */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <BellRing className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Android & PWA Push Notifications
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real FCM push notifications for attendance alerts, tasks, issues, and direct messages
              </p>
            </div>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 ${enableStatusColor}`}>
            <span className="w-2 h-2 rounded-full bg-current" />
            <span>{enableStatusText}</span>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs flex items-center justify-between gap-2 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/90 border-rose-700 text-rose-200'
                : 'bg-amber-950/90 border-amber-700 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>

            {permissionState === 'denied' && (
              <button
                type="button"
                onClick={() => setShowAndroidGuide(true)}
                className="px-2.5 py-1 rounded-lg bg-rose-800 text-white font-bold text-[11px] shrink-0 hover:bg-rose-700 transition"
              >
                Settings Guide
              </button>
            )}
          </div>
        )}

        {/* Action Controls Strip */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {isCurrentDeviceRegistered ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> This device is registered and authorized.
              </span>
            ) : (
              <span>Tap below to grant OS permission and bind this physical phone to your account.</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleEnableNotifications}
              disabled={isRegistering}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {isRegistering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting FCM...</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>{isCurrentDeviceRegistered ? 'Refresh Notification Token' : 'Enable Notifications'}</span>
                </>
              )}
            </button>

            {isCurrentDeviceRegistered && (
              <button
                type="button"
                onClick={handleSendTestPush}
                disabled={isSendingTest}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSendingTest ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Push...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>Send Test Push Notification</span>
                  </>
                )}
              </button>
            )}

            {!isHT && onOpenSendModal && (
              <button
                type="button"
                onClick={onOpenSendModal}
                className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Notify Head Teacher →</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Notification Category Preferences */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Category Notification Controls</span>
            </h4>
            <p className="text-xs text-slate-400">
              Choose which operational alerts trigger push notifications on your phone
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSetAllPrefs(true)}
              className="text-[11px] font-semibold text-emerald-400 hover:underline cursor-pointer"
            >
              Enable All
            </button>
            <span className="text-slate-600">•</span>
            <button
              type="button"
              onClick={() => handleSetAllPrefs(false)}
              className="text-[11px] font-semibold text-slate-400 hover:underline cursor-pointer"
            >
              Disable All
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {/* Attendance */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="font-bold text-white">Student Attendance Alerts</div>
              <div className="text-[11px] text-slate-400">
                Triggered when attendance drops below critical threshold (80%)
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.attendance_alerts}
              onChange={() => handleTogglePref('attendance_alerts')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0 ml-2"
            />
          </div>

          {/* Teacher Attendance */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="font-bold text-white">Teacher & Staff Absences</div>
              <div className="text-[11px] text-slate-400">
                Notifies when teachers or head teachers are marked absent
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.teacher_alerts}
              onChange={() => handleTogglePref('teacher_alerts')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0 ml-2"
            />
          </div>

          {/* Tasks */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="font-bold text-white">Tasks & Deadlines</div>
              <div className="text-[11px] text-slate-400">
                New task assignments, due reminders, and overdue tasks
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.tasks}
              onChange={() => handleTogglePref('tasks')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0 ml-2"
            />
          </div>

          {/* Issues */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="font-bold text-white">School Infrastructure Issues</div>
              <div className="text-[11px] text-slate-400">
                Critical facility, boundary wall, toilet, and compliance reports
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.school_issues}
              onChange={() => handleTogglePref('school_issues')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0 ml-2"
            />
          </div>

          {/* Visits */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="font-bold text-white">Monitoring Visits & Inspections</div>
              <div className="text-[11px] text-slate-400">
                Reminders for upcoming SEF field officer visits
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.visits}
              onChange={() => handleTogglePref('visits')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0 ml-2"
            />
          </div>

          {/* Results */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="font-bold text-white">Examination & Evaluation Results</div>
              <div className="text-[11px] text-slate-400">
                When exam papers and term evaluations are marked
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.results}
              onChange={() => handleTogglePref('results')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0 ml-2"
            />
          </div>

          {/* Direct Messages */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="font-bold text-white">Operator & HT Messages</div>
              <div className="text-[11px] text-slate-400">
                Direct instructions sent between Operator and Head Teacher
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.messages}
              onChange={() => handleTogglePref('messages')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0 ml-2"
            />
          </div>

          {/* Security & System */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
            <div>
              <div className="font-bold text-white">Account Security & Logins</div>
              <div className="text-[11px] text-slate-400">
                New device login alerts and database sync errors
              </div>
            </div>
            <input
              type="checkbox"
              checked={preferences.system_alerts}
              onChange={() => handleTogglePref('system_alerts')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer shrink-0 ml-2"
            />
          </div>
        </div>
      </div>

      {/* 3. Multi-Device Push Registration List (Rule 4 & 5) */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h4 className="font-bold text-sm text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Registered Push Devices ({activeDevices.length})</span>
            </h4>
            <p className="text-xs text-slate-400">
              Each phone has an independent FCM messaging registration tied to your account
            </p>
          </div>

          <button
            type="button"
            onClick={loadDevices}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Reload devices"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDevices ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-2">
          {isLoadingDevices ? (
            <div className="py-6 text-center text-xs text-slate-400">Loading devices...</div>
          ) : activeDevices.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-800/40 text-center text-xs text-slate-400">
              No push devices currently registered for this account. Tap "Enable Notifications" above to register this phone.
            </div>
          ) : (
            activeDevices.map(device => {
              const isThisDevice = device.device_id === currentDeviceId;
              return (
                <div
                  key={device.device_id}
                  className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                    isThisDevice
                      ? 'bg-emerald-950/40 border-emerald-500/40'
                      : 'bg-slate-800/50 border-slate-700/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700 shrink-0">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{device.device_name || 'Mobile Phone'}</span>
                        {isThisDevice && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold">
                            Current Device
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {device.platform} • {device.os_version} • Version {device.app_version}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Last Active:</span>
                      <span className="font-mono text-slate-300">
                        {new Date(device.last_seen_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                      FCM Active
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Android System Settings Guide Modal */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <SettingsIcon className="w-4 h-4 text-emerald-400" />
                <span>Enable Notifications in Android Settings</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAndroidGuide(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Android has notification permissions blocked for this site/app. To receive push notifications:
            </p>

            <div className="space-y-2.5 text-xs text-slate-200">
              <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span>
                  Tap the <strong>Site Settings (padlock or tune icon)</strong> located on the left side of your browser's top address bar.
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span>
                  Tap <strong>Permissions</strong> → select <strong>Notifications</strong> → change to <strong>Allow</strong>.
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  On Android 13+: Open phone <strong>Settings → Apps → Chrome / WebApp → Notifications → Allow all notifications</strong>.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowAndroidGuide(false);
                handleEnableNotifications();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
            >
              I have allowed permissions, check again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
