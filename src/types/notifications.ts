export type NotificationCategory =
  | 'ATTENDANCE'
  | 'TEACHER_ATTENDANCE'
  | 'STUDENT_ATTENDANCE'
  | 'TASK'
  | 'ISSUE'
  | 'VISIT'
  | 'MONITORING'
  | 'RESULT'
  | 'MESSAGE'
  | 'SYSTEM'
  | 'SYNC'
  | 'SECURITY'
  | 'ACCOUNT';

export type NotificationType =
  | 'LOW_STUDENT_ATTENDANCE'
  | 'LOW_TEACHER_ATTENDANCE'
  | 'TEACHER_ABSENT'
  | 'NEW_TASK'
  | 'TASK_DUE'
  | 'TASK_OVERDUE'
  | 'ISSUE_CREATED'
  | 'ISSUE_OVERDUE'
  | 'VISIT_REMINDER'
  | 'MONITORING_REQUIRED'
  | 'RESULT_AVAILABLE'
  | 'NEW_OPERATOR_MESSAGE'
  | 'NEW_HEAD_TEACHER_MESSAGE'
  | 'ACCOUNT_LOGIN'
  | 'ACCOUNT_SECURITY_ALERT'
  | 'SYNC_ERROR'
  | 'GENERAL_ANNOUNCEMENT'
  | 'TEST_NOTIFICATION';

export type NotificationPriority = 'high' | 'normal' | 'low';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'retrying';

export type NotificationPermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  expirationTime?: number | null;
  keys: PushSubscriptionKeys;
}

export interface NotificationDeviceRecord {
  device_id: string;
  user_id: string;
  role: 'operator' | 'headTeacher' | 'supervisor';
  school_ids: string[];
  platform: string; // e.g., 'Android Chrome', 'PWA Standalone', 'Desktop'
  app_version: string;
  device_name: string;
  device_model: string;
  os_version: string;
  messaging_token: string; // FCM token or subscription endpoint
  push_subscription?: PushSubscriptionData;
  permission_status: NotificationPermissionState;
  notifications_enabled: boolean;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
  last_token_refresh_at: string;
  is_active: boolean;
}

export interface PushNotificationRecord {
  notification_id: string;
  event_id: string;
  recipient_user_id: string;
  recipient_role: 'operator' | 'headTeacher' | 'supervisor';
  school_id: string;
  school_name?: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  target_screen: string; // e.g. 'attendance', 'tasks', 'issues', 'staff', 'students', 'reports', 'schools', 'examinations'
  target_record_id?: string;
  payload: Record<string, any>;
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string | null;
  opened_at?: string | null;
  status: NotificationStatus;
  priority: NotificationPriority;
  deduplication_key: string;
  expires_at?: string;
  failure_reason?: string;
  retry_count?: number;
}

export interface AndroidNotificationChannel {
  channelId: string;
  name: string;
  description: string;
  importance: 'high' | 'default' | 'low';
}

export const ANDROID_NOTIFICATION_CHANNELS: AndroidNotificationChannel[] = [
  {
    channelId: 'attendance',
    name: 'Attendance Alerts',
    description: 'Alerts when student or teacher attendance falls below required thresholds',
    importance: 'high',
  },
  {
    channelId: 'tasks',
    name: 'Tasks & Deadlines',
    description: 'Notifications for new assignments, deadlines, and overdue tasks',
    importance: 'high',
  },
  {
    channelId: 'issues',
    name: 'School Issues',
    description: 'Critical facility, compliance, and infrastructure issues',
    importance: 'high',
  },
  {
    channelId: 'visits',
    name: 'School Visits & Monitoring',
    description: 'Upcoming and due SEF monitoring visits and inspections',
    importance: 'default',
  },
  {
    channelId: 'results',
    name: 'Examinations & Results',
    description: 'Exam mark submissions and academic report cards',
    importance: 'default',
  },
  {
    channelId: 'messages',
    name: 'Direct Messages',
    description: 'Operator to Head Teacher instructions and urgent announcements',
    importance: 'high',
  },
  {
    channelId: 'security',
    name: 'Account & Security Alerts',
    description: 'New logins, credential changes, and device authorization alerts',
    importance: 'high',
  },
  {
    channelId: 'general',
    name: 'General Updates',
    description: 'System announcements and data synchronization status',
    importance: 'default',
  },
];

export interface NotificationCategoryPreferences {
  attendance_alerts: boolean;
  teacher_alerts: boolean;
  school_issues: boolean;
  tasks: boolean;
  visits: boolean;
  results: boolean;
  messages: boolean;
  system_alerts: boolean;
}

export const DEFAULT_OPERATOR_PREFERENCES: NotificationCategoryPreferences = {
  attendance_alerts: true,
  teacher_alerts: true,
  school_issues: true,
  tasks: true,
  visits: true,
  results: true,
  messages: true,
  system_alerts: true,
};

export const DEFAULT_HEAD_TEACHER_PREFERENCES: NotificationCategoryPreferences = {
  attendance_alerts: true,
  teacher_alerts: true,
  school_issues: true,
  tasks: true,
  visits: true,
  results: true,
  messages: true,
  system_alerts: true,
};
