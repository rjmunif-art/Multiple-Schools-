import fs from 'fs';
import path from 'path';
import * as webpushModule from 'web-push';
// Handle both CommonJS and ESM shapes
const webpush: any = (webpushModule as any).default || webpushModule;
import {
  PushNotificationRecord,
  NotificationDeviceRecord,
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from '../types/notifications';
import { buildNotificationFromTemplate, NotificationTemplatePayload } from '../utils/notificationTemplates';

// Storage paths
const STORAGE_DIR = path.resolve(process.cwd(), 'cloud_storage');
const VAPID_KEYS_PATH = path.join(STORAGE_DIR, 'vapid_keys.json');
const NOTIFICATION_DEVICES_PATH = path.join(STORAGE_DIR, 'notification_devices.json');
const NOTIFICATIONS_PATH = path.join(STORAGE_DIR, 'notifications.json');
const NOTIFICATION_AUDIT_LOG_PATH = path.join(STORAGE_DIR, 'notification_audit_logs.json');

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// 1. Initialize or Load VAPID Keys
interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

let vapidKeys: VapidKeys;

try {
  if (fs.existsSync(VAPID_KEYS_PATH)) {
    vapidKeys = JSON.parse(fs.readFileSync(VAPID_KEYS_PATH, 'utf-8'));
  } else {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(VAPID_KEYS_PATH, JSON.stringify(vapidKeys, null, 2), 'utf-8');
    console.log('[Push Server] Generated fresh persistent VAPID keypair for FCM Web Push.');
  }
  webpush.setVapidDetails(
    'mailto:rjmunif@gmail.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} catch (err) {
  console.error('[Push Server] Error initializing VAPID keys:', err);
  vapidKeys = webpush.generateVAPIDKeys();
  webpush.setVapidDetails('mailto:rjmunif@gmail.com', vapidKeys.publicKey, vapidKeys.privateKey);
}

export function getVapidPublicKey(): string {
  return vapidKeys.publicKey;
}

// 2. Storage Helpers for Notification Devices
export function getStoredDevices(): NotificationDeviceRecord[] {
  if (fs.existsSync(NOTIFICATION_DEVICES_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(NOTIFICATION_DEVICES_PATH, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

export function saveStoredDevices(devices: NotificationDeviceRecord[]): void {
  fs.writeFileSync(NOTIFICATION_DEVICES_PATH, JSON.stringify(devices, null, 2), 'utf-8');
}

export function registerOrUpdateNotificationDevice(
  deviceData: Partial<NotificationDeviceRecord> & { device_id: string; user_id: string }
): NotificationDeviceRecord {
  const devices = getStoredDevices();
  const now = new Date().toISOString();
  const existingIdx = devices.findIndex(
    d => d.device_id === deviceData.device_id
  );

  const fullRecord: NotificationDeviceRecord = {
    device_id: deviceData.device_id,
    user_id: deviceData.user_id,
    role: deviceData.role || 'operator',
    school_ids: deviceData.school_ids || [],
    platform: deviceData.platform || 'Android Web',
    app_version: deviceData.app_version || '3.5.0',
    device_name: deviceData.device_name || 'Android Mobile',
    device_model: deviceData.device_model || 'Mobile Device',
    os_version: deviceData.os_version || 'Android 14',
    messaging_token: deviceData.messaging_token || '',
    push_subscription: deviceData.push_subscription,
    permission_status: deviceData.permission_status || 'granted',
    notifications_enabled: deviceData.notifications_enabled ?? true,
    last_seen_at: now,
    created_at: existingIdx >= 0 ? devices[existingIdx].created_at : now,
    updated_at: now,
    last_token_refresh_at: now,
    is_active: true,
  };

  if (existingIdx >= 0) {
    devices[existingIdx] = fullRecord;
  } else {
    devices.push(fullRecord);
  }

  saveStoredDevices(devices);
  recordNotificationAudit('device_registered', {
    deviceId: fullRecord.device_id,
    userId: fullRecord.user_id,
    platform: fullRecord.platform,
    role: fullRecord.role,
  });

  return fullRecord;
}

export function deactivateNotificationDevice(device_id: string, user_id?: string): boolean {
  const devices = getStoredDevices();
  let modified = false;

  devices.forEach(d => {
    if (d.device_id === device_id && (!user_id || d.user_id === user_id)) {
      d.is_active = false;
      d.notifications_enabled = false;
      d.updated_at = new Date().toISOString();
      modified = true;
    }
  });

  if (modified) {
    saveStoredDevices(devices);
    recordNotificationAudit('device_deactivated', { deviceId: device_id, userId: user_id || 'all' });
  }
  return modified;
}

export function getActiveDevicesForUser(user_id: string): NotificationDeviceRecord[] {
  const devices = getStoredDevices();
  return devices.filter(d => d.user_id === user_id && d.is_active && d.notifications_enabled);
}

// 3. Storage Helpers for Notifications
export function getStoredNotifications(): PushNotificationRecord[] {
  if (fs.existsSync(NOTIFICATIONS_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(NOTIFICATIONS_PATH, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

export function saveStoredNotifications(notifs: PushNotificationRecord[]): void {
  fs.writeFileSync(NOTIFICATIONS_PATH, JSON.stringify(notifs, null, 2), 'utf-8');
}

export function getUserNotifications(
  user_id: string,
  options?: { unreadOnly?: boolean; category?: string; schoolId?: string; limit?: number }
): PushNotificationRecord[] {
  const notifs = getStoredNotifications();
  let filtered = notifs.filter(n => n.recipient_user_id === user_id);

  if (options?.unreadOnly) {
    filtered = filtered.filter(n => !n.read_at);
  }
  if (options?.category && options.category !== 'ALL') {
    filtered = filtered.filter(n => n.category === options.category);
  }
  if (options?.schoolId && options.schoolId !== 'all') {
    filtered = filtered.filter(n => n.school_id === options.schoolId);
  }

  // Sort by created_at desc
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (options?.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

export function markNotificationAsRead(notification_id: string, user_id: string): boolean {
  const notifs = getStoredNotifications();
  const notif = notifs.find(n => n.notification_id === notification_id && n.recipient_user_id === user_id);
  if (notif && !notif.read_at) {
    notif.read_at = new Date().toISOString();
    saveStoredNotifications(notifs);
    return true;
  }
  return false;
}

export function markAllNotificationsAsRead(user_id: string): number {
  const notifs = getStoredNotifications();
  const now = new Date().toISOString();
  let count = 0;
  notifs.forEach(n => {
    if (n.recipient_user_id === user_id && !n.read_at) {
      n.read_at = now;
      count++;
    }
  });
  if (count > 0) {
    saveStoredNotifications(notifs);
  }
  return count;
}

export function deleteNotificationForUser(notification_id: string, user_id: string): boolean {
  let notifs = getStoredNotifications();
  const initialLen = notifs.length;
  notifs = notifs.filter(n => !(n.notification_id === notification_id && n.recipient_user_id === user_id));
  if (notifs.length !== initialLen) {
    saveStoredNotifications(notifs);
    return true;
  }
  return false;
}

// 4. Notification Audit Logs
export function recordNotificationAudit(action: string, details: Record<string, any>): void {
  let logs: any[] = [];
  if (fs.existsSync(NOTIFICATION_AUDIT_LOG_PATH)) {
    try {
      logs = JSON.parse(fs.readFileSync(NOTIFICATION_AUDIT_LOG_PATH, 'utf-8'));
    } catch {
      logs = [];
    }
  }

  logs.unshift({
    id: 'notif_log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    action,
    timestamp: new Date().toISOString(),
    ...details,
  });

  if (logs.length > 200) logs = logs.slice(0, 200);
  fs.writeFileSync(NOTIFICATION_AUDIT_LOG_PATH, JSON.stringify(logs, null, 2), 'utf-8');
}

export function getNotificationAuditLogs(): any[] {
  if (fs.existsSync(NOTIFICATION_AUDIT_LOG_PATH)) {
    try {
      return JSON.parse(fs.readFileSync(NOTIFICATION_AUDIT_LOG_PATH, 'utf-8'));
    } catch {
      return [];
    }
  }
  return [];
}

// 5. Core Notification Dispatch Engine
export interface DispatchNotificationRequest {
  type: NotificationType;
  recipient_user_id: string;
  recipient_role: 'operator' | 'headTeacher' | 'supervisor';
  school_id: string;
  school_name: string;
  target_screen?: string;
  target_record_id?: string;
  custom_title?: string;
  custom_body?: string;
  priority?: NotificationPriority;
  payload?: Record<string, any>;
  deduplication_key?: string;
}

export interface DispatchNotificationResult {
  success: boolean;
  notification_id?: string;
  duplicate?: boolean;
  delivered_devices_count: number;
  total_devices_count: number;
  message: string;
  error?: string;
}

export async function dispatchNotification(
  req: DispatchNotificationRequest
): Promise<DispatchNotificationResult> {
  const notifs = getStoredNotifications();
  const now = new Date().toISOString();

  // Deduplication protection: Check if same deduplication_key within last 5 minutes
  const dedupKey =
    req.deduplication_key ||
    `dedup_${req.type}_${req.school_id}_${req.recipient_user_id}_${req.target_record_id || ''}`;

  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const recentDuplicate = notifs.find(
    n =>
      n.deduplication_key === dedupKey &&
      new Date(n.created_at).getTime() > fiveMinutesAgo &&
      n.recipient_user_id === req.recipient_user_id
  );

  if (recentDuplicate) {
    return {
      success: true,
      duplicate: true,
      notification_id: recentDuplicate.notification_id,
      delivered_devices_count: 0,
      total_devices_count: 0,
      message: 'Notification skipped: duplicate event already dispatched within 5 minutes.',
    };
  }

  // Generate notification details from centralized template
  const templatePayload: NotificationTemplatePayload = {
    school_id: req.school_id,
    school_name: req.school_name,
    target_record_id: req.target_record_id,
    ...(req.payload || {}),
  };

  const details = buildNotificationFromTemplate(req.type, templatePayload);
  const title = req.custom_title || details.title;
  const body = req.custom_body || details.body;
  const priority = req.priority || details.priority;
  const targetScreen = req.target_screen || details.target_screen;
  const notificationId = 'ntf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const eventId = 'evt_' + Date.now();

  const newRecord: PushNotificationRecord = {
    notification_id: notificationId,
    event_id: eventId,
    recipient_user_id: req.recipient_user_id,
    recipient_role: req.recipient_role,
    school_id: req.school_id,
    school_name: req.school_name,
    type: req.type,
    category: details.category,
    title,
    body,
    target_screen: targetScreen,
    target_record_id: req.target_record_id,
    payload: req.payload || {},
    created_at: now,
    sent_at: now,
    status: 'pending',
    priority,
    deduplication_key: dedupKey,
    retry_count: 0,
  };

  // Find all active devices for this user
  const userDevices = getActiveDevicesForUser(req.recipient_user_id);
  let deliveredCount = 0;
  const deliveryErrors: string[] = [];

  const pushPayload = JSON.stringify({
    notification_id: notificationId,
    event_id: eventId,
    recipient_user_id: req.recipient_user_id,
    recipient_role: req.recipient_role,
    school_id: req.school_id,
    type: req.type,
    category: details.category,
    title,
    body,
    target_screen: targetScreen,
    target_record_id: req.target_record_id,
    priority,
    channelId: details.channelId,
    deduplication_key: dedupKey,
    sent_at: now,
  });

  for (const device of userDevices) {
    if (device.push_subscription && device.push_subscription.endpoint) {
      try {
        await webpush.sendNotification(
          {
            endpoint: device.push_subscription.endpoint,
            keys: device.push_subscription.keys,
          },
          pushPayload,
          {
            TTL: priority === 'high' ? 60 * 60 * 24 : 60 * 60 * 4, // 24h for high, 4h for normal
            urgency: priority === 'high' ? 'high' : 'normal',
          }
        );
        deliveredCount++;
      } catch (pushErr: any) {
        console.warn(`[Push Delivery] Device ${device.device_id} push delivery error:`, pushErr?.message);
        deliveryErrors.push(`${device.device_id}: ${pushErr?.message}`);

        // If subscription has expired or unsubscribed (410 or 404), mark device inactive
        if (pushErr?.statusCode === 410 || pushErr?.statusCode === 404) {
          deactivateNotificationDevice(device.device_id, req.recipient_user_id);
        }
      }
    }
  }

  newRecord.status = deliveredCount > 0 ? 'delivered' : userDevices.length === 0 ? 'sent' : 'failed';
  if (deliveredCount > 0) {
    newRecord.delivered_at = new Date().toISOString();
  }
  if (deliveryErrors.length > 0) {
    newRecord.failure_reason = deliveryErrors.join('; ');
  }

  notifs.unshift(newRecord);
  // Keep last 1,000 notifications in persistent history
  if (notifs.length > 1000) notifs.length = 1000;
  saveStoredNotifications(notifs);

  recordNotificationAudit('notification_dispatched', {
    notificationId,
    type: req.type,
    recipient: req.recipient_user_id,
    role: req.recipient_role,
    schoolId: req.school_id,
    title,
    deliveredDevices: deliveredCount,
    totalDevices: userDevices.length,
    status: newRecord.status,
  });

  return {
    success: true,
    notification_id: notificationId,
    delivered_devices_count: deliveredCount,
    total_devices_count: userDevices.length,
    message:
      deliveredCount > 0
        ? `Delivered push notification to ${deliveredCount} active Android device(s).`
        : userDevices.length === 0
        ? 'Notification recorded in account history. No push-enabled physical device currently registered.'
        : 'Notification recorded, but delivery to device endpoints reported issues.',
  };
}
