import { SystemNotification, NotificationPriority, NotificationCategory, UserAccount, School } from '../types';

class NotificationService {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private pushEnabled: boolean = true;

  constructor() {
    try {
      const storedSound = localStorage.getItem('sef_push_audio_enabled');
      if (storedSound !== null) {
        this.soundEnabled = storedSound === 'true';
      }
      const storedPush = localStorage.getItem('sef_web_push_enabled');
      if (storedPush !== null) {
        this.pushEnabled = storedPush === 'true';
      }
    } catch {
      // localStorage may fail in private mode
    }
  }

  public isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem('sef_push_audio_enabled', String(enabled));
    } catch {}
  }

  public isPushEnabled(): boolean {
    return this.pushEnabled && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  }

  public setPushEnabled(enabled: boolean) {
    this.pushEnabled = enabled;
    try {
      localStorage.setItem('sef_web_push_enabled', String(enabled));
    } catch {}
  }

  public async requestPushPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.setPushEnabled(true);
      }
      return permission;
    } catch (err) {
      console.warn('[NotificationService] Push permission request failed:', err);
      return 'denied';
    }
  }

  /**
   * Synthesize audio chimes via Web Audio API.
   * Completely self-contained: works offline, zero external audio asset files needed.
   */
  public playChime(priority: NotificationPriority = 'medium') {
    if (!this.soundEnabled) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioCtxClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (priority === 'urgent') {
        // High urgency: 3-tone rapid alert
        gain.gain.setValueAtTime(0.18, now);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(659, now + 0.12);
        osc.frequency.setValueAtTime(880, now + 0.24);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
        osc.start(now);
        osc.stop(now + 0.45);
      } else if (priority === 'high') {
        // High priority: 2-tone melodic chime (A5 -> C#6)
        gain.gain.setValueAtTime(0.14, now);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.1); // A5
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else {
        // Medium / Normal / Low: Soft single/double gentle pulse
        gain.gain.setValueAtTime(0.10, now);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      }
    } catch (e) {
      console.warn('[NotificationService] Audio chime failed:', e);
    }
  }

  /**
   * Fires a native browser OS-level Web Push Notification if permitted
   */
  public fireWebPushNotification(notification: SystemNotification) {
    if (!this.pushEnabled) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      const priorityPrefix = notification.priority === 'urgent' ? '🚨 [URGENT] ' : notification.priority === 'high' ? '⚠️ ' : '';
      const n = new Notification(`${priorityPrefix}${notification.title}`, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
      });

      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch (err) {
      console.warn('[NotificationService] Web Push failed:', err);
    }
  }

  /**
   * Evaluates if a given notification is delivered to the current user
   */
  public isNotificationForUser(notif: SystemNotification, user: UserAccount | null): boolean {
    if (!user) return false;

    const userRole = (user.role || '').toLowerCase();
    const isOperator = userRole === 'operator';
    const isHT = userRole === 'headteacher' || userRole === 'head_teacher';

    // Role targeting check
    if (notif.targetRole === 'operator' && !isOperator) return false;
    if (notif.targetRole === 'head_teacher' && !isHT) return false;

    // School scope check for Head Teachers
    if (isHT && notif.schoolId && user.schoolId) {
      if (notif.schoolId !== user.schoolId) return false;
    }

    return true;
  }

  // --- FACTORY BUILDERS FOR APPLICATION STATE CHANGES ---

  public buildAttendanceAlert(params: {
    school: School | undefined;
    actor: UserAccount | null;
    total: number;
    present: number;
    absent: number;
    leave: number;
    late: number;
    grade: string;
    isStaff?: boolean;
  }): SystemNotification {
    const { school, actor, total, present, absent, leave, late, grade, isStaff } = params;
    const percent = total > 0 ? (present / total) * 100 : 0;
    const actorRole = actor?.role === 'operator' ? 'operator' : 'head_teacher';
    const schoolName = school?.name || 'School';
    const schoolId = school?.id;

    let priority: NotificationPriority = 'medium';
    if (!isStaff) {
      if (percent < 75) priority = 'urgent';
      else if (percent < 85) priority = 'high';
    } else {
      priority = absent > 0 ? 'high' : 'medium';
    }

    const title = isStaff
      ? `Staff Attendance Submitted: ${schoolName}`
      : percent < 75
      ? `🚨 Low Attendance Alert (${percent.toFixed(1)}%): ${schoolName}`
      : `Daily Student Attendance Recorded: ${schoolName}`;

    const message = isStaff
      ? `${actor?.name || 'Staff'} marked staff roll call: ${present} Present, ${absent} Absent out of ${total} employees.`
      : `Class ${grade === 'all' ? 'All Classes' : grade} roll call submitted by ${actor?.name || 'Head Teacher'}: ${present} Present, ${absent} Absent, ${leave} Leave (${percent.toFixed(1)}%).`;

    return {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'attendance',
      priority,
      title,
      message,
      schoolId,
      schoolName,
      targetRole: actorRole === 'head_teacher' ? 'operator' : 'head_teacher',
      actorRole,
      actorName: actor?.name,
      actorUid: actor?.id,
      actionTab: 'attendance',
      date: new Date().toISOString(),
      isRead: false,
      metadata: { total, present, absent, percent, grade, isStaff },
    };
  }

  public buildStudentAlert(params: {
    action: 'admitted' | 'updated' | 'deleted' | 'promoted' | 'status_changed';
    studentName: string;
    grNumber?: string;
    grade?: string;
    newStatus?: string;
    school: School | undefined;
    actor: UserAccount | null;
  }): SystemNotification {
    const { action, studentName, grNumber, grade, newStatus, school, actor } = params;
    const actorRole = actor?.role === 'operator' ? 'operator' : 'head_teacher';
    const schoolName = school?.name || 'School';

    let title = '';
    let message = '';
    let priority: NotificationPriority = 'medium';

    if (action === 'admitted') {
      title = `New Student Admitted: ${studentName}`;
      message = `${studentName} (GR #${grNumber || 'N/A'}) enrolled into Grade ${grade || 'N/A'} at ${schoolName} by ${actor?.name}.`;
      priority = 'medium';
    } else if (action === 'status_changed') {
      title = `Student Status Changed: ${studentName} (${newStatus})`;
      message = `${studentName}'s enrollment status was updated to "${newStatus}" at ${schoolName}.`;
      priority = newStatus === 'Struck Off' || newStatus === 'Transferred' ? 'high' : 'medium';
    } else if (action === 'deleted') {
      title = `Student Record Deleted: ${studentName}`;
      message = `Student record for ${studentName} was removed from ${schoolName} by ${actor?.name}.`;
      priority = 'high';
    } else if (action === 'promoted') {
      title = `Students Promoted: Grade ${grade}`;
      message = `Students were promoted to next class level at ${schoolName}.`;
      priority = 'medium';
    } else {
      title = `Student Record Updated: ${studentName}`;
      message = `Profile details for ${studentName} were updated at ${schoolName}.`;
      priority = 'low';
    }

    return {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'student',
      priority,
      title,
      message,
      schoolId: school?.id,
      schoolName,
      targetRole: actorRole === 'head_teacher' ? 'operator' : 'head_teacher',
      actorRole,
      actorName: actor?.name,
      actorUid: actor?.id,
      actionTab: 'students',
      date: new Date().toISOString(),
      isRead: false,
    };
  }

  public buildStaffAlert(params: {
    action: 'added' | 'updated' | 'deleted' | 'status_changed';
    staffName: string;
    designation?: string;
    newStatus?: string;
    school: School | undefined;
    actor: UserAccount | null;
  }): SystemNotification {
    const { action, staffName, designation, newStatus, school, actor } = params;
    const actorRole = actor?.role === 'operator' ? 'operator' : 'head_teacher';
    const schoolName = school?.name || 'School';

    let title = '';
    let message = '';
    let priority: NotificationPriority = 'high';

    if (action === 'added') {
      title = `New Staff Assigned: ${staffName}`;
      message = `${staffName} (${designation || 'Staff'}) was assigned to ${schoolName} by ${actor?.name}.`;
    } else if (action === 'status_changed') {
      title = `Staff Status Changed: ${staffName} (${newStatus})`;
      message = `${staffName}'s employment status was changed to "${newStatus}" at ${schoolName}.`;
      priority = 'urgent';
    } else if (action === 'deleted') {
      title = `Staff Record Removed: ${staffName}`;
      message = `${staffName} was removed from the staff directory of ${schoolName}.`;
      priority = 'high';
    } else {
      title = `Staff Profile Updated: ${staffName}`;
      message = `Staff record details updated for ${staffName} at ${schoolName}.`;
      priority = 'medium';
    }

    return {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'staff',
      priority,
      title,
      message,
      schoolId: school?.id,
      schoolName,
      targetRole: actorRole === 'head_teacher' ? 'operator' : 'head_teacher',
      actorRole,
      actorName: actor?.name,
      actorUid: actor?.id,
      actionTab: 'staff',
      date: new Date().toISOString(),
      isRead: false,
    };
  }

  public buildTaskAlert(params: {
    action: 'created' | 'completed' | 'updated';
    taskTitle: string;
    priority?: 'Low' | 'Medium' | 'High' | 'Critical';
    school: School | undefined;
    actor: UserAccount | null;
  }): SystemNotification {
    const { action, taskTitle, priority: taskPri, school, actor } = params;
    const actorRole = actor?.role === 'operator' ? 'operator' : 'head_teacher';
    const schoolName = school?.name || 'School';

    let priority: NotificationPriority = 'medium';
    if (taskPri === 'Critical') priority = 'urgent';
    else if (taskPri === 'High') priority = 'high';

    let title = '';
    let message = '';

    if (action === 'created') {
      title = `New Administrative Task: ${taskTitle}`;
      message = `${actor?.name} assigned a new task for ${schoolName}: "${taskTitle}".`;
    } else if (action === 'completed') {
      title = `Task Completed: ${taskTitle}`;
      message = `Task "${taskTitle}" was marked completed by ${actor?.name} at ${schoolName}.`;
    } else {
      title = `Task Updated: ${taskTitle}`;
      message = `Status updated for task "${taskTitle}" at ${schoolName}.`;
    }

    return {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'task',
      priority,
      title,
      message,
      schoolId: school?.id,
      schoolName,
      targetRole: actorRole === 'head_teacher' ? 'operator' : 'head_teacher',
      actorRole,
      actorName: actor?.name,
      actorUid: actor?.id,
      actionTab: 'tasks',
      date: new Date().toISOString(),
      isRead: false,
    };
  }

  public buildIssueAlert(params: {
    action: 'reported' | 'resolved' | 'updated';
    issueTitle: string;
    severity?: 'Low' | 'Medium' | 'High' | 'Critical';
    school: School | undefined;
    actor: UserAccount | null;
  }): SystemNotification {
    const { action, issueTitle, severity, school, actor } = params;
    const actorRole = actor?.role === 'operator' ? 'operator' : 'head_teacher';
    const schoolName = school?.name || 'School';

    let priority: NotificationPriority = 'high';
    if (severity === 'Critical') priority = 'urgent';

    let title = '';
    let message = '';

    if (action === 'reported') {
      title = severity === 'Critical' ? `🚨 Critical Issue Reported: ${issueTitle}` : `School Issue Reported: ${issueTitle}`;
      message = `${actor?.name} reported a ${severity || 'normal'} severity issue at ${schoolName}: "${issueTitle}".`;
    } else if (action === 'resolved') {
      title = `Issue Resolved: ${issueTitle}`;
      message = `The reported issue "${issueTitle}" at ${schoolName} has been marked resolved.`;
      priority = 'medium';
    } else {
      title = `Issue Status Updated: ${issueTitle}`;
      message = `Updates posted on issue "${issueTitle}" at ${schoolName}.`;
    }

    return {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'issue',
      priority,
      title,
      message,
      schoolId: school?.id,
      schoolName,
      targetRole: actorRole === 'head_teacher' ? 'operator' : 'head_teacher',
      actorRole,
      actorName: actor?.name,
      actorUid: actor?.id,
      actionTab: 'issues',
      date: new Date().toISOString(),
      isRead: false,
    };
  }

  public buildPayrollAlert(params: {
    month: string;
    school: School | undefined;
    actor: UserAccount | null;
    action: 'generated' | 'paid';
    totalAmount?: number;
  }): SystemNotification {
    const { month, school, actor, action, totalAmount } = params;
    const actorRole = actor?.role === 'operator' ? 'operator' : 'head_teacher';
    const schoolName = school?.name || 'School';

    const title = action === 'paid' ? `Payroll Disbursed: ${month}` : `Monthly Payroll Generated: ${month}`;
    const message = action === 'paid'
      ? `Staff salaries for ${month} marked as Paid at ${schoolName}${totalAmount ? ` (PKR ${totalAmount.toLocaleString()})` : ''}.`
      : `Salary sheet for ${month} generated for staff at ${schoolName}.`;

    return {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'payroll',
      priority: 'medium',
      title,
      message,
      schoolId: school?.id,
      schoolName,
      targetRole: actorRole === 'head_teacher' ? 'operator' : 'head_teacher',
      actorRole,
      actorName: actor?.name,
      actorUid: actor?.id,
      actionTab: 'payroll',
      date: new Date().toISOString(),
      isRead: false,
    };
  }

  public buildVisitAlert(params: {
    visitorName: string;
    visitorRole: string;
    school: School | undefined;
    actor: UserAccount | null;
  }): SystemNotification {
    const { visitorName, visitorRole, school, actor } = params;
    const actorRole = actor?.role === 'operator' ? 'operator' : 'head_teacher';
    const schoolName = school?.name || 'School';

    return {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'visit',
      priority: 'high',
      title: `School Monitoring Visit: ${visitorName}`,
      message: `${visitorName} (${visitorRole}) conducted an inspection visit at ${schoolName}.`,
      schoolId: school?.id,
      schoolName,
      targetRole: 'all',
      actorRole,
      actorName: actor?.name,
      actorUid: actor?.id,
      actionTab: 'visits',
      date: new Date().toISOString(),
      isRead: false,
    };
  }

  public buildScheduleAlert(params: {
    details: string;
    school: School | undefined;
    actor: UserAccount | null;
  }): SystemNotification {
    const { details, school, actor } = params;
    const actorRole = actor?.role === 'operator' ? 'operator' : 'head_teacher';
    const schoolName = school?.name || 'School';

    return {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      type: 'schedule',
      priority: 'medium',
      title: `Schedule/Calendar Updated: ${schoolName}`,
      message: `${actor?.name || 'Administrator'} updated school timings/academic details: ${details}.`,
      schoolId: school?.id,
      schoolName,
      targetRole: actorRole === 'head_teacher' ? 'operator' : 'head_teacher',
      actorRole,
      actorName: actor?.name,
      actorUid: actor?.id,
      actionTab: 'settings',
      date: new Date().toISOString(),
      isRead: false,
    };
  }
}

export const notificationService = new NotificationService();
