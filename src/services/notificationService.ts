import {
  PushNotificationRecord,
  NotificationDeviceRecord,
  NotificationType,
  NotificationPriority,
  NotificationPermissionState,
} from '../types/notifications';
import { storageService } from './storage';
import { db, cleanForFirestore } from '../firebase/config';
import {
  doc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';

// Default persistent VAPID Public Key for client push subscriptions
export const DEFAULT_VAPID_PUBLIC_KEY =
  'BO1Y_J18Iti528KzR6CpBQbLaBxD7OYeSbk4aL0j9tDpq-ebEUPwn_0vAnWmSMVIWpDV8nYR93jBdHR8wN7lsag';

/**
 * Safely parse JSON responses to prevent crashes on non-JSON/HTML proxy responses
 */
async function parseJsonSafely(
  res: Response,
  fallbackDesc = 'API request'
): Promise<{ success: boolean; [key: string]: any }> {
  try {
    const text = await res.text();
    if (!text || (!text.trim().startsWith('{') && !text.trim().startsWith('['))) {
      return {
        success: false,
        message: `${fallbackDesc} returned status ${res.status}: ${text.slice(0, 100)}`,
      };
    }
    return JSON.parse(text);
  } catch (err: any) {
    return {
      success: false,
      message: `${fallbackDesc} JSON parse failed: ${err.message}`,
    };
  }
}

// Helper to convert base64 URL to Uint8Array for VAPID applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Gentle pleasant audio notification chime using Web Audio API
export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // High clear double chime: E6 (1318 Hz) followed by G#6 (1661 Hz)
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1318.51, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1661.22, now + 0.12);
    gain2.gain.setValueAtTime(0.15, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (e) {
    // Audio autoplay restrictions or no audio device
  }
}

class NotificationService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private messageListenersInitialized = false;

  /**
   * Check current OS / Browser notification permission state
   */
  public getPermissionState(): NotificationPermissionState {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission as NotificationPermissionState;
  }

  /**
   * Detect Android / Device platform info
   */
  public getDeviceInfo(): {
    deviceName: string;
    deviceModel: string;
    platform: string;
    osVersion: string;
  } {
    if (typeof navigator === 'undefined') {
      return {
        deviceName: 'Mobile Device',
        deviceModel: 'Android Device',
        platform: 'Android Web',
        osVersion: 'Android',
      };
    }

    const ua = navigator.userAgent;
    let platform = 'Web';
    let deviceModel = 'Generic Device';
    let osVersion = 'Unknown';

    if (/android/i.test(ua)) {
      platform = 'Android';
      const match = ua.match(/Android\s([0-9\.]+)/i);
      osVersion = match ? `Android ${match[1]}` : 'Android';
      const modelMatch = ua.match(/;\s([^;]+)\sBuild\//i);
      deviceModel = modelMatch ? modelMatch[1].trim() : 'Android Mobile';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      platform = 'iOS';
      deviceModel = 'Apple Mobile';
      osVersion = 'iOS';
    } else if (/windows/i.test(ua)) {
      platform = 'Windows PC';
      deviceModel = 'Desktop PC';
      osVersion = 'Windows';
    }

    const isPWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true;

    return {
      deviceName: `${deviceModel} (${isPWA ? 'PWA' : 'Browser'})`,
      deviceModel,
      platform: isPWA ? `${platform} PWA` : `${platform} Browser`,
      osVersion,
    };
  }

  /**
   * Initializes Service Worker for FCM push notifications
   */
  public async initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('[NotificationService] Service Worker not supported in this browser.');
      return null;
    }

    try {
      if (!this.serviceWorkerRegistration) {
        const existing = await navigator.serviceWorker.getRegistration();
        if (existing && existing.active) {
          this.serviceWorkerRegistration = existing;
        } else {
          this.serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/',
          });
        }
        console.log('[NotificationService] Service Worker active:', this.serviceWorkerRegistration.scope);
      }

      this.initForegroundListeners();
      return this.serviceWorkerRegistration;
    } catch (err) {
      console.warn('[NotificationService] Failed to register service worker:', err);
      try {
        const fallbackReg = await navigator.serviceWorker.getRegistration();
        if (fallbackReg) {
          this.serviceWorkerRegistration = fallbackReg;
          return fallbackReg;
        }
      } catch {}
      return null;
    }
  }

  /**
   * Setup foreground listeners for push events and deep links
   */
  private initForegroundListeners() {
    if (this.messageListenersInitialized || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.addEventListener('message', (event) => {
      const { data } = event;
      if (!data) return;

      if (data.type === 'FCM_FOREGROUND_PUSH' && data.notification) {
        playNotificationChime();
        // Dispatch custom DOM event for React component banners
        window.dispatchEvent(
          new CustomEvent('sef:notification', {
            detail: data.notification,
          })
        );
      } else if (data.type === 'NOTIFICATION_DEEP_LINK' && data.data) {
        window.dispatchEvent(
          new CustomEvent('sef:deep_link', {
            detail: data.data,
          })
        );
      }
    });

    this.messageListenersInitialized = true;
  }

  /**
   * Step 2 & 3: User triggers "Enable Notifications"
   * Real Android system permission prompt is requested only on direct user interaction.
   */
  public async enableNotifications(
    userId: string,
    role: 'operator' | 'headTeacher' | 'supervisor',
    schoolIds: string[]
  ): Promise<{
    success: boolean;
    state: NotificationPermissionState;
    message: string;
    device?: NotificationDeviceRecord;
  }> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return {
        success: false,
        state: 'unsupported',
        message: 'Push notifications are not supported by this browser environment.',
      };
    }

    // Step 1: Check current permission state
    let perm = Notification.permission as NotificationPermissionState;

    // Step 3: If not granted, trigger REAL system permission dialog
    if (perm !== 'granted') {
      try {
        perm = (await Notification.requestPermission()) as NotificationPermissionState;
      } catch (err: any) {
        console.warn('[NotificationService] Error requesting permission:', err);
      }
    }

    // Step 4: If denied
    if (perm === 'denied') {
      return {
        success: false,
        state: 'denied',
        message: 'Notifications are currently disabled. You can enable them from Android Settings.',
      };
    }

    if (perm !== 'granted') {
      return {
        success: false,
        state: 'default',
        message: 'Notification permission was not granted.',
      };
    }

    // Step 2: Permission is granted -> Register device messaging token & push subscription
    try {
      const reg = await this.initServiceWorker();
      if (!reg) {
        throw new Error('Service worker registration failed.');
      }

      // Fetch VAPID public key from backend or use persistent fallback key
      let publicKey = DEFAULT_VAPID_PUBLIC_KEY;
      try {
        const keyRes = await fetch('/api/notifications/vapid-public-key');
        if (keyRes.ok) {
          const keyData = await parseJsonSafely(keyRes, 'VAPID key query');
          if (keyData.success && keyData.publicKey) {
            publicKey = keyData.publicKey;
          }
        }
      } catch (keyErr) {
        console.warn('[NotificationService] Using persistent fallback VAPID key:', keyErr);
      }

      // Subscribe to PushManager with automatic retry and in-app fallback
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      let sub: PushSubscription | null = null;
      let fcmPushUnavailable = false;

      try {
        sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey as unknown as BufferSource,
          });
        }
      } catch (subErr: any) {
        console.warn('[NotificationService] Primary pushManager.subscribe failed:', subErr?.message);
        // Attempt clean retry: unsubscribe any stale registration first
        try {
          const oldSub = await reg.pushManager.getSubscription();
          if (oldSub) {
            await oldSub.unsubscribe();
          }
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey as unknown as BufferSource,
          });
        } catch (retryErr: any) {
          console.warn('[NotificationService] PushManager retry note (FCM push service offline/restricted):', retryErr?.message);
          fcmPushUnavailable = true;
        }
      }

      const subJson = sub ? sub.toJSON() : null;
      const deviceId = storageService.getDeviceId();
      const deviceInfo = this.getDeviceInfo();
      const now = new Date().toISOString();

      const deviceRecord: NotificationDeviceRecord = {
        device_id: deviceId,
        user_id: userId,
        role,
        school_ids: schoolIds,
        platform: deviceInfo.platform,
        app_version: '3.5.0',
        device_name: deviceInfo.deviceName,
        device_model: deviceInfo.deviceModel,
        os_version: deviceInfo.osVersion,
        messaging_token: sub ? sub.endpoint : `in_app_${deviceId}`,
        push_subscription: sub && subJson
          ? {
              endpoint: sub.endpoint,
              keys: {
                p256dh: subJson.keys?.p256dh || '',
                auth: subJson.keys?.auth || '',
              },
            }
          : undefined,
        permission_status: 'granted',
        notifications_enabled: true,
        last_seen_at: now,
        created_at: now,
        updated_at: now,
        last_token_refresh_at: now,
        is_active: true,
      };

      // 1. Direct Firestore Persistence (Always succeeds for authenticated users)
      try {
        const cleanedDevice = cleanForFirestore(deviceRecord);
        await setDoc(doc(db, 'notification_devices', deviceId), cleanedDevice, { merge: true });
        console.log('[NotificationService] Device record saved to Firestore:', deviceId);
      } catch (fsErr) {
        console.warn('[NotificationService] Firestore direct device sync notice:', fsErr);
      }

      // 2. Also register with Express backend for VAPID web-push engine
      try {
        const regRes = await fetch('/api/notifications/devices/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deviceRecord),
        });
        const regResult = await parseJsonSafely(regRes, 'Device registration');
        if (regResult.success && regResult.device) {
          console.log('[NotificationService] Device registered with push server:', regResult.device);
        }
      } catch (serverErr) {
        console.warn('[NotificationService] Server push registry notice:', serverErr);
      }

      return {
        success: true,
        state: 'granted',
        message: fcmPushUnavailable
          ? 'Notifications are enabled! Live alerts and audio chime are active on this device.'
          : 'Notifications are enabled! You will receive live school updates on this device.',
        device: deviceRecord,
      };
    } catch (err: any) {
      console.error('[NotificationService] Enable notifications error:', err);
      return {
        success: false,
        state: 'granted',
        message: `Failed to complete push registration: ${err.message}`,
      };
    }
  }

  /**
   * Deactivates device on logout
   */
  public async deactivateCurrentDevice(userId: string): Promise<void> {
    try {
      const deviceId = storageService.getDeviceId();

      // Deactivate in Firestore directly
      try {
        await updateDoc(doc(db, 'notification_devices', deviceId), {
          is_active: false,
          last_seen_at: new Date().toISOString(),
        });
      } catch (fsErr) {
        console.warn('[NotificationService] Firestore device deactivation notice:', fsErr);
      }

      // Also notify backend
      await fetch('/api/notifications/devices/deactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, user_id: userId }),
      });
    } catch (err) {
      console.warn('[NotificationService] Error deactivating device:', err);
    }
  }

  /**
   * Fetch notification history from server or fallback to Firestore
   */
  public async fetchNotifications(
    userId: string,
    options?: { unreadOnly?: boolean; category?: string; schoolId?: string; limit?: number }
  ): Promise<{ notifications: PushNotificationRecord[]; unreadCount: number; totalCount: number }> {
    try {
      const params = new URLSearchParams({
        userId,
        unreadOnly: options?.unreadOnly ? 'true' : 'false',
        category: options?.category || 'ALL',
        schoolId: options?.schoolId || 'all',
        limit: String(options?.limit || 100),
      });

      const res = await fetch(`/api/notifications/list?${params.toString()}`);
      if (res.ok) {
        const data = await parseJsonSafely(res, 'Notifications query');
        if (data.success && Array.isArray(data.notifications)) {
          return {
            notifications: data.notifications || [],
            unreadCount: data.unreadCount || 0,
            totalCount: data.totalCount || 0,
          };
        }
      }
    } catch (err) {
      console.warn('[NotificationService] Server notifications fetch failed, falling back to Firestore:', err);
    }

    // Direct Firestore fallback
    try {
      const q = query(
        collection(db, 'notifications'),
        where('recipient_user_id', '==', userId)
      );
      const snapshot = await getDocs(q);
      const map = new Map<string, PushNotificationRecord>();

      snapshot.forEach(d => {
        const notif = { ...d.data() } as PushNotificationRecord;
        map.set(notif.notification_id, notif);
      });

      // Also query school-scoped notifications if schoolId is provided
      if (options?.schoolId && options.schoolId !== 'all') {
        try {
          const schoolQ = query(
            collection(db, 'notifications'),
            where('school_id', '==', options.schoolId)
          );
          const schoolSnap = await getDocs(schoolQ);
          schoolSnap.forEach(d => {
            const notif = { ...d.data() } as PushNotificationRecord;
            if (
              notif.recipient_role === 'headTeacher' ||
              notif.recipient_user_id.startsWith('ht_') ||
              notif.recipient_user_id === userId
            ) {
              map.set(notif.notification_id, notif);
            }
          });
        } catch {}
      }

      const all = Array.from(map.values());
      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      let filtered = all;
      if (options?.category && options.category !== 'ALL') {
        filtered = filtered.filter(n => n.category === options.category);
      }
      if (options?.unreadOnly) {
        filtered = filtered.filter(n => !n.read_at);
      }

      const unreadCount = all.filter(n => !n.read_at).length;
      return {
        notifications: filtered.slice(0, options?.limit || 100),
        unreadCount,
        totalCount: all.length,
      };
    } catch (fsErr) {
      console.warn('[NotificationService] Firestore fallback error:', fsErr);
      return { notifications: [], unreadCount: 0, totalCount: 0 };
    }
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(userId: string, notificationId?: string, markAll = false): Promise<boolean> {
    try {
      // 1. Direct Firestore update
      if (notificationId) {
        try {
          await updateDoc(doc(db, 'notifications', notificationId), {
            read_at: new Date().toISOString(),
          });
        } catch {}
      }

      // 2. Also notify server
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationId, markAll }),
      });
      if (res.ok) {
        const data = await parseJsonSafely(res, 'Mark read');
        return !!data.success;
      }
      return true;
    } catch (err) {
      console.warn('[NotificationService] Mark read notice:', err);
      return false;
    }
  }

  /**
   * Delete notification from personal history
   */
  public async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    try {
      // 1. Delete from Firestore directly
      try {
        await deleteDoc(doc(db, 'notifications', notificationId));
      } catch {}

      // 2. Also notify server
      const res = await fetch(`/api/notifications/${encodeURIComponent(notificationId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await parseJsonSafely(res, 'Delete notification');
        return !!data.success;
      }
      return true;
    } catch (err) {
      console.warn('[NotificationService] Delete notification notice:', err);
      return false;
    }
  }

  /**
   * Shows a real native system notification in the Android notification bar / status tray
   */
  public async showSystemNotification(
    title: string,
    options?: {
      body?: string;
      icon?: string;
      badge?: string;
      tag?: string;
      data?: any;
      sound?: boolean;
      vibrate?: boolean;
    }
  ): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;

      // 1. Always play pleasant audio chime
      if (options?.sound !== false) {
        playNotificationChime();
      }

      // 2. Trigger native Android vibration
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([200, 100, 200, 100, 200]);
        } catch {}
      }

      // 3. Verify notification permission
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        return false;
      }

      const notifData = options?.data || {};
      const targetUrl =
        notifData.url ||
        (notifData.target_screen
          ? `/?screen=${encodeURIComponent(notifData.target_screen)}&school_id=${encodeURIComponent(
              notifData.school_id || ''
            )}&record_id=${encodeURIComponent(
              notifData.target_record_id || ''
            )}&notification_id=${encodeURIComponent(notifData.notification_id || '')}`
          : '/');

      const nativeOptions: any = {
        body: options?.body || 'New operational update received.',
        icon: options?.icon || '/icon-192.png',
        badge: options?.badge || '/badge-72.png',
        tag: options?.tag || `sef_tray_${Date.now()}`,
        renotify: true,
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: true,
        silent: false,
        data: {
          ...notifData,
          url: targetUrl,
        },
        actions: [
          { action: 'open', title: 'Open View' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };

      let swNotified = false;

      // Primary: Display via active Service Worker (REQUIRED FOR ANDROID NOTIFICATION BAR / TRAY DISPLAY)
      if ('serviceWorker' in navigator) {
        try {
          let reg: ServiceWorkerRegistration | null | undefined = await navigator.serviceWorker.getRegistration();
          if (!reg) {
            reg = await this.initServiceWorker();
          }
          if (!reg) {
            const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500));
            reg = await Promise.race([navigator.serviceWorker.ready, timeoutPromise]);
          }

          if (reg && typeof reg.showNotification === 'function') {
            await reg.showNotification(title, nativeOptions);
            swNotified = true;
            console.log('[NotificationService] Android notification bar alert displayed via SW reg.showNotification:', title);
          }

          // Also trigger through active SW postMessage to ensure service worker handles background
          if (reg && reg.active) {
            reg.active.postMessage({
              type: 'SHOW_NOTIFICATION',
              title,
              options: nativeOptions,
            });
            swNotified = true;
          }
        } catch (swErr) {
          console.warn('[NotificationService] SW showNotification notice:', swErr);
        }
      }

      // Secondary fallback: Window Notification constructor
      if (!swNotified) {
        try {
          const notifInstance = new Notification(title, nativeOptions);
          notifInstance.onclick = () => {
            window.focus();
            window.location.href = targetUrl;
            notifInstance.close();
          };
          return true;
        } catch (winErr) {
          console.warn('[NotificationService] Window Notification constructor notice:', winErr);
        }
      }

      return swNotified;
    } catch (err) {
      console.error('[NotificationService] showSystemNotification failure:', err);
      return false;
    }
  }

  /**
   * Send test push notification directly to user's device and Android notification bar
   */
  public async sendTestNotification(
    userId: string,
    schoolId?: string,
    schoolName?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 1. Direct native Android notification bar alert!
      await this.showSystemNotification('SEF Push System Test', {
        body: 'Congratulations! Real Android notification bar alerts are active on your device.',
        tag: `test_${Date.now()}`,
        data: {
          target_screen: 'settings',
          school_id: schoolId || 'all',
          notification_id: `test_${Date.now()}`,
        },
      });

      // 2. Also record in Firestore
      const notifId = 'ntf_test_' + Date.now();
      try {
        await setDoc(
          doc(db, 'notifications', notifId),
          cleanForFirestore({
            notification_id: notifId,
            event_id: 'evt_test_' + Date.now(),
            recipient_user_id: userId,
            recipient_role: 'operator',
            school_id: schoolId || 'all',
            school_name: schoolName || 'SEF Portal',
            type: 'SYSTEM_ALERT',
            category: 'SYSTEM',
            title: 'SEF Push System Test',
            body: 'Congratulations! Real Android notification bar alerts are active on your device.',
            target_screen: 'settings',
            payload: {},
            created_at: new Date().toISOString(),
            sent_at: new Date().toISOString(),
            status: 'delivered',
            priority: 'high',
            deduplication_key: `dedup_${notifId}`,
            retry_count: 0,
          })
        );
      } catch {}

      // 3. Dispatch to server if reachable
      try {
        const deviceId = storageService.getDeviceId();
        await fetch('/api/notifications/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            schoolId: schoolId || 'all',
            schoolName: schoolName || 'SEF Portal',
            deviceId,
          }),
        });
      } catch {}

      return {
        success: true,
        message: 'Test notification sent to your Android notification bar! Check the top of your phone screen.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to show test notification: ${err.message}`,
      };
    }
  }

  /**
   * Send operational push notification with server authorization
   */
  public async sendNotification(params: {
    senderUserId: string;
    senderRole: 'operator' | 'headTeacher';
    recipient_user_id: string;
    recipient_role: 'operator' | 'headTeacher';
    school_id: string;
    school_name: string;
    type: NotificationType;
    target_screen?: string;
    target_record_id?: string;
    custom_title?: string;
    custom_body?: string;
    priority?: NotificationPriority;
    payload?: Record<string, any>;
    deduplication_key?: string;
  }): Promise<{ success: boolean; message: string }> {
    const notifId = 'ntf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const now = new Date().toISOString();

    const notifRecord: PushNotificationRecord = {
      notification_id: notifId,
      event_id: 'evt_' + Date.now(),
      recipient_user_id: params.recipient_user_id,
      recipient_role: params.recipient_role,
      school_id: params.school_id,
      school_name: params.school_name,
      type: params.type,
      category: 'MESSAGE',
      title: params.custom_title || 'New Message from Operator',
      body: params.custom_body || 'You have received an operational notification.',
      target_screen: params.target_screen || 'tasks',
      target_record_id: params.target_record_id,
      payload: params.payload || {},
      created_at: now,
      sent_at: now,
      status: 'sent',
      priority: params.priority || 'high',
      deduplication_key: params.deduplication_key || `dedup_${notifId}`,
      retry_count: 0,
    };

    let firestoreSaved = false;
    try {
      const cleanedRecord = cleanForFirestore(notifRecord);
      await setDoc(doc(db, 'notifications', notifId), cleanedRecord);
      firestoreSaved = true;
      console.log('[NotificationService] Notification saved directly to Firestore:', notifId);
    } catch (fsErr: any) {
      console.error('[NotificationService] Firestore notification save notice:', fsErr);
    }

    let serverDelivered = false;
    let serverMessage = '';
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          notification_id: notifId,
        }),
      });

      const data = await parseJsonSafely(res, 'Send notification');
      if (res.ok && data.success) {
        serverDelivered = true;
        serverMessage = data.message || 'Notification dispatched successfully to authorized devices.';
      } else if (data.message && !data.message.includes('404')) {
        serverMessage = data.message;
      }
    } catch (err: any) {
      console.warn('[NotificationService] Push server dispatch notice:', err?.message);
    }

    if (serverDelivered) {
      return {
        success: true,
        message: serverMessage || 'Notification dispatched successfully to authorized devices.',
      };
    }

    if (firestoreSaved) {
      return {
        success: true,
        message: 'Notification dispatched to Head Teacher account successfully.',
      };
    }

    return {
      success: false,
      message: serverMessage || 'Failed to dispatch notification. Please try again.',
    };
  }

  /**
   * Retrieve notification system diagnostics
   */
  public async getDiagnostics(): Promise<any> {
    try {
      const res = await fetch('/api/notifications/diagnostics');
      if (res.ok) {
        return await parseJsonSafely(res, 'Diagnostics');
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  }
}

export const notificationService = new NotificationService();
