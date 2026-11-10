import { NotificationType, NotificationCategory, NotificationPriority } from '../types/notifications';

export interface NotificationTemplatePayload {
  school_id: string;
  school_name: string;
  attendance_percentage?: number | string;
  teacher_name?: string;
  absent_count?: number;
  task_title?: string;
  task_id?: string;
  issue_title?: string;
  issue_id?: string;
  visit_date?: string;
  visitor_name?: string;
  exam_title?: string;
  message_title?: string;
  message_body?: string;
  sender_name?: string;
  device_name?: string;
  login_time?: string;
  error_details?: string;
  target_record_id?: string;
  [key: string]: any;
}

export interface GeneratedNotificationDetails {
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  body: string;
  target_screen: string;
  target_record_id?: string;
  priority: NotificationPriority;
  channelId: string;
}

export function buildNotificationFromTemplate(
  type: NotificationType,
  data: NotificationTemplatePayload
): GeneratedNotificationDetails {
  const schoolName = data.school_name || 'School';

  switch (type) {
    case 'LOW_STUDENT_ATTENDANCE':
      return {
        type,
        category: 'STUDENT_ATTENDANCE',
        title: 'Low Student Attendance',
        body: `${schoolName}: Student attendance dropped to ${data.attendance_percentage}% today. Required threshold is 80%.`,
        target_screen: 'attendance',
        target_record_id: data.target_record_id,
        priority: 'high',
        channelId: 'attendance',
      };

    case 'LOW_TEACHER_ATTENDANCE':
      return {
        type,
        category: 'TEACHER_ATTENDANCE',
        title: 'Low Teacher Attendance',
        body: `${schoolName}: Teacher attendance is critically low at ${data.attendance_percentage}%.`,
        target_screen: 'attendance',
        target_record_id: data.target_record_id,
        priority: 'high',
        channelId: 'attendance',
      };

    case 'TEACHER_ABSENT':
      return {
        type,
        category: 'TEACHER_ATTENDANCE',
        title: 'Teacher Absent Alert',
        body: `${schoolName}: ${data.teacher_name || 'Teacher'} is marked absent today.`,
        target_screen: 'attendance',
        target_record_id: data.target_record_id,
        priority: 'high',
        channelId: 'attendance',
      };

    case 'NEW_TASK':
      return {
        type,
        category: 'TASK',
        title: 'New Task Assigned',
        body: `${schoolName}: You have been assigned a new task — "${data.task_title}".`,
        target_screen: 'tasks',
        target_record_id: data.task_id || data.target_record_id,
        priority: 'high',
        channelId: 'tasks',
      };

    case 'TASK_DUE':
      return {
        type,
        category: 'TASK',
        title: 'Task Due Reminder',
        body: `${schoolName}: Task "${data.task_title}" is due today.`,
        target_screen: 'tasks',
        target_record_id: data.task_id || data.target_record_id,
        priority: 'normal',
        channelId: 'tasks',
      };

    case 'TASK_OVERDUE':
      return {
        type,
        category: 'TASK',
        title: 'Overdue Task Alert',
        body: `${schoolName}: Task "${data.task_title}" is overdue. Please complete it immediately.`,
        target_screen: 'tasks',
        target_record_id: data.task_id || data.target_record_id,
        priority: 'high',
        channelId: 'tasks',
      };

    case 'ISSUE_CREATED':
      return {
        type,
        category: 'ISSUE',
        title: 'New School Issue Reported',
        body: `${schoolName}: New issue reported — "${data.issue_title}".`,
        target_screen: 'issues',
        target_record_id: data.issue_id || data.target_record_id,
        priority: 'high',
        channelId: 'issues',
      };

    case 'ISSUE_OVERDUE':
      return {
        type,
        category: 'ISSUE',
        title: 'Overdue School Issue',
        body: `${schoolName}: Issue "${data.issue_title}" is overdue for resolution.`,
        target_screen: 'issues',
        target_record_id: data.issue_id || data.target_record_id,
        priority: 'high',
        channelId: 'issues',
      };

    case 'VISIT_REMINDER':
      return {
        type,
        category: 'VISIT',
        title: 'Upcoming School Monitoring Visit',
        body: `${schoolName}: Monitoring visit scheduled for ${data.visit_date || 'this week'}.`,
        target_screen: 'visits',
        target_record_id: data.target_record_id,
        priority: 'normal',
        channelId: 'visits',
      };

    case 'MONITORING_REQUIRED':
      return {
        type,
        category: 'MONITORING',
        title: 'Inspection Monitoring Required',
        body: `${schoolName}: Quarterly inspection report submission is required.`,
        target_screen: 'reports',
        target_record_id: data.target_record_id,
        priority: 'normal',
        channelId: 'visits',
      };

    case 'RESULT_AVAILABLE':
      return {
        type,
        category: 'RESULT',
        title: 'Examination Results Available',
        body: `${schoolName}: Academic evaluation results for "${data.exam_title || 'Term'}" are now published.`,
        target_screen: 'examinations',
        target_record_id: data.target_record_id,
        priority: 'normal',
        channelId: 'results',
      };

    case 'NEW_OPERATOR_MESSAGE':
      return {
        type,
        category: 'MESSAGE',
        title: data.message_title || `Message from Operator (${data.sender_name || 'Admin'})`,
        body: `${schoolName}: ${data.message_body || 'You have received a direct message.'}`,
        target_screen: data.target_screen || 'schools',
        target_record_id: data.target_record_id,
        priority: 'high',
        channelId: 'messages',
      };

    case 'NEW_HEAD_TEACHER_MESSAGE':
      return {
        type,
        category: 'MESSAGE',
        title: data.message_title || `Update from Head Teacher (${data.sender_name || schoolName})`,
        body: `${schoolName}: ${data.message_body || 'Head Teacher submitted an update.'}`,
        target_screen: data.target_screen || 'schools',
        target_record_id: data.target_record_id,
        priority: 'normal',
        channelId: 'messages',
      };

    case 'ACCOUNT_LOGIN':
      return {
        type,
        category: 'SECURITY',
        title: 'New Account Login Detected',
        body: `Your account was accessed from ${data.device_name || 'a new mobile device'} at ${data.login_time || new Date().toLocaleTimeString()}.`,
        target_screen: 'settings',
        target_record_id: data.target_record_id,
        priority: 'high',
        channelId: 'security',
      };

    case 'ACCOUNT_SECURITY_ALERT':
      return {
        type,
        category: 'SECURITY',
        title: 'Security Alert',
        body: data.message_body || 'A security-related change was detected on your account.',
        target_screen: 'settings',
        target_record_id: data.target_record_id,
        priority: 'high',
        channelId: 'security',
      };

    case 'SYNC_ERROR':
      return {
        type,
        category: 'SYNC',
        title: 'Data Synchronization Issue',
        body: `Sync failed for ${schoolName}: ${data.error_details || 'Please check network and retry.'}`,
        target_screen: 'settings',
        target_record_id: data.target_record_id,
        priority: 'normal',
        channelId: 'general',
      };

    case 'TEST_NOTIFICATION':
    default:
      return {
        type,
        category: 'SYSTEM',
        title: data.message_title || 'SEF Push Notification Test',
        body: data.message_body || `${schoolName}: Android push notifications are active and verified!`,
        target_screen: data.target_screen || 'dashboard',
        target_record_id: data.target_record_id,
        priority: 'high',
        channelId: 'general',
      };
  }
}
