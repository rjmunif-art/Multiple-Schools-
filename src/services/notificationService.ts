import {
  PushNotificationRecord,
  NotificationDeviceRecord,
  NotificationType,
  NotificationPriority,
  NotificationPermissionState,
} from '../types/notifications';
import { storageService } from './storage';

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
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/',
        });
        console.log('[NotificationService] FCM Service Worker registered:', this.serviceWorkerRegistration.scope);
      }

      this.initForegroundListeners();
      return this.serviceWorkerRegistration;
    } catch (err) {
      console.warn('[NotificationService] Failed to register service worker:', err);
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

      // Fetch VAPID public key from backend
      const keyRes = await fetch('/api/notifications/vapid-public-key');
      const keyData = await keyRes.json();
      if (!keyData.success || !keyData.publicKey) {
        throw new Error('Failed to retrieve FCM public key from server.');
      }

      // Subscribe to PushManager
      const convertedVapidKey = urlBase64ToUint8Array(keyData.publicKey);
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as unknown as BufferSource,
        });
      }

      const subJson = sub.toJSON();
      const deviceId = storageService.getDeviceId();
      const deviceInfo = this.getDeviceInfo();

      // Register device with backend
      const regRes = await fetch('/api/notifications/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          user_id: userId,
          role,
          school_ids: schoolIds,
          platform: deviceInfo.platform,
          app_version: '3.5.0',
          device_name: deviceInfo.deviceName,
          device_model: deviceInfo.deviceModel,
          os_version: deviceInfo.osVersion,
          messaging_token: sub.endpoint,
          push_subscription: {
            endpoint: sub.endpoint,
            keys: subJson.keys || { p256dh: '', auth: '' },
          },
          permission_status: 'granted',
          notifications_enabled: true,
        }),
      });

      const regResult = await regRes.json();
      if (!regResult.success) {
        throw new Error(regResult.message || 'Failed to save device push registration.');
      }

      return {
        success: true,
        state: 'granted',
        message: 'Notifications are enabled! You will receive live school updates on this device.',
        device: regResult.device,
      };
    } catch (err: any) {
      console.error('[NotificationService] Enable notifications error:', err);
      return {
        success: false,
        state: 'granted',
        message: `Permission granted, but failed to complete push registration: ${err.message}`,
      };
    }
  }

  /**
   * Deactivates device on logout
   */
  public async deactivateCurrentDevice(userId: string): Promise<void> {
    try {
      const deviceId = storageService.getDeviceId();
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
   * Fetch notification history from server
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
      const data = await res.json();
      if (data.success) {
        return {
          notifications: data.notifications || [],
          unreadCount: data.unreadCount || 0,
          totalCount: data.totalCount || 0,
        };
      }
      return { notifications: [], unreadCount: 0, totalCount: 0 };
    } catch (err) {
      console.warn('[NotificationService] Fetch notifications error:', err);
      return { notifications: [], unreadCount: 0, totalCount: 0 };
    }
  }

  /**
   * Mark notification as read
   */
  public async markAsRead(userId: string, notificationId?: string, markAll = false): Promise<boolean> {
    try {
      const res = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, notificationId, markAll }),
      });
      const data = await res.json();
      return !!data.success;
    } catch (err) {
      console.warn('[NotificationService] Mark read error:', err);
      return false;
    }
  }

  /**
   * Delete notification from personal history
   */
  public async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/notifications/${encodeURIComponent(notificationId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      return !!data.success;
    } catch (err) {
      console.warn('[NotificationService] Delete notification error:', err);
      return false;
    }
  }

  /**
   * Send test push notification directly to user's device
   */
  public async sendTestNotification(
    userId: string,
    schoolId?: string,
    schoolName?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const deviceId = storageService.getDeviceId();
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          schoolId: schoolId || 'all',
          schoolName: schoolName || 'SEF Portal',
          deviceId,
        }),
      });
      const data = await res.json();
      return {
        success: !!data.success,
        message: data.message || 'Test push notification dispatched.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to dispatch test notification: ${err.message}`,
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
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      return {
        success: !!data.success,
        message: data.message || 'Notification dispatched.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Failed to dispatch notification: ${err.message}`,
      };
    }
  }

  /**
   * Retrieve notification system diagnostics
   */
  public async getDiagnostics(): Promise<any> {
    try {
      const res = await fetch('/api/notifications/diagnostics');
      return await res.json();
    } catch {
      return { success: false };
    }
  }
}

export const notificationService = new NotificationService();
