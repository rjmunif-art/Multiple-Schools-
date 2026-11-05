import {
  School,
  Student,
  Staff,
  PayrollRecord,
  StudentDailyAttendance,
  StaffDailyAttendance,
  Examination,
  ExamMark,
  SchoolVisit,
  SchoolIssue,
  SchoolTask,
  SchoolDocument,
  SystemNotification,
  AppSettings,
  UserAccount,
  SyncState
} from '../types';
import {
  DEFAULT_SETTINGS,
  INITIAL_USERS,
  INITIAL_SCHOOLS,
  INITIAL_STAFF,
  INITIAL_STUDENTS,
  INITIAL_STUDENT_ATTENDANCE,
  INITIAL_STAFF_ATTENDANCE,
  INITIAL_EXAMINATIONS,
  INITIAL_EXAM_MARKS,
  INITIAL_PAYROLL,
  INITIAL_VISITS,
  INITIAL_ISSUES,
  INITIAL_TASKS,
  INITIAL_DOCUMENTS,
  INITIAL_NOTIFICATIONS,
} from '../data/sampleData';

const STORAGE_KEYS = {
  USERS: 'sef_op_users',
  CURRENT_USER: 'sef_op_current_user',
  SCHOOLS: 'sef_op_schools',
  STAFF: 'sef_op_staff',
  STUDENTS: 'sef_op_students',
  STUDENT_ATTENDANCE: 'sef_op_student_attendance',
  STAFF_ATTENDANCE: 'sef_op_staff_attendance',
  EXAMINATIONS: 'sef_op_examinations',
  EXAM_MARKS: 'sef_op_exam_marks',
  PAYROLL: 'sef_op_payroll',
  VISITS: 'sef_op_visits',
  ISSUES: 'sef_op_issues',
  TASKS: 'sef_op_tasks',
  DOCUMENTS: 'sef_op_documents',
  NOTIFICATIONS: 'sef_op_notifications',
  SETTINGS: 'sef_op_settings',
  MUTATIONS: 'sef_op_mutations_queue',
  LAST_SYNC: 'sef_op_last_sync_time',
};

export interface SyncMutation {
  id: string;
  table: string;
  action: 'create' | 'update' | 'delete';
  recordId: string;
  timestamp: string;
}

export interface AppDatabase {
  users: UserAccount[];
  schools: School[];
  staff: Staff[];
  students: Student[];
  studentAttendance: StudentDailyAttendance[];
  staffAttendance: StaffDailyAttendance[];
  examinations: Examination[];
  examMarks: ExamMark[];
  payroll: PayrollRecord[];
  visits: SchoolVisit[];
  issues: SchoolIssue[];
  tasks: SchoolTask[];
  documents: SchoolDocument[];
  notifications: SystemNotification[];
  settings: AppSettings;
}

class StorageService {
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  private getItem<T>(key: string, defaultValue: T): T {
    if (!this.isBrowser()) return defaultValue;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.warn(`Error reading localStorage key ${key}:`, e);
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    if (!this.isBrowser()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error(`Error writing to localStorage key ${key}:`, e);
    }
  }

  // Initialize data if not yet present
  public initDatabase(): void {
    if (!this.isBrowser()) return;
    const CURRENT_DATA_VERSION = 'v3_muhammad_saleh_mangi_5_schools';
    const storedVersion = localStorage.getItem('sef_dataset_version');
    if (!localStorage.getItem(STORAGE_KEYS.SCHOOLS) || storedVersion !== CURRENT_DATA_VERSION) {
      this.resetToSampleData();
      localStorage.setItem('sef_dataset_version', CURRENT_DATA_VERSION);
    }
  }

  public resetToSampleData(): void {
    this.setItem(STORAGE_KEYS.USERS, INITIAL_USERS);
    this.setItem(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
    this.setItem(STORAGE_KEYS.STAFF, INITIAL_STAFF);
    this.setItem(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
    this.setItem(STORAGE_KEYS.STUDENT_ATTENDANCE, INITIAL_STUDENT_ATTENDANCE);
    this.setItem(STORAGE_KEYS.STAFF_ATTENDANCE, INITIAL_STAFF_ATTENDANCE);
    this.setItem(STORAGE_KEYS.EXAMINATIONS, INITIAL_EXAMINATIONS);
    this.setItem(STORAGE_KEYS.EXAM_MARKS, INITIAL_EXAM_MARKS);
    this.setItem(STORAGE_KEYS.PAYROLL, INITIAL_PAYROLL);
    this.setItem(STORAGE_KEYS.VISITS, INITIAL_VISITS);
    this.setItem(STORAGE_KEYS.ISSUES, INITIAL_ISSUES);
    this.setItem(STORAGE_KEYS.TASKS, INITIAL_TASKS);
    this.setItem(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS);
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);
    this.setItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    this.setItem(STORAGE_KEYS.MUTATIONS, []);
    this.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  public resetToEmptyData(): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, null);
    this.setItem(STORAGE_KEYS.USERS, []);
    this.setItem(STORAGE_KEYS.SCHOOLS, []);
    this.setItem(STORAGE_KEYS.STAFF, []);
    this.setItem(STORAGE_KEYS.STUDENTS, []);
    this.setItem(STORAGE_KEYS.STUDENT_ATTENDANCE, []);
    this.setItem(STORAGE_KEYS.STAFF_ATTENDANCE, []);
    this.setItem(STORAGE_KEYS.EXAMINATIONS, INITIAL_EXAMINATIONS);
    this.setItem(STORAGE_KEYS.EXAM_MARKS, []);
    this.setItem(STORAGE_KEYS.PAYROLL, []);
    this.setItem(STORAGE_KEYS.VISITS, []);
    this.setItem(STORAGE_KEYS.ISSUES, []);
    this.setItem(STORAGE_KEYS.TASKS, []);
    this.setItem(STORAGE_KEYS.DOCUMENTS, []);
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, []);
    this.setItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    this.setItem(STORAGE_KEYS.MUTATIONS, []);
    this.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  // Current session user (defaults to null so login window is shown first)
  public getCurrentUser(): UserAccount | null {
    return this.getItem<UserAccount | null>(STORAGE_KEYS.CURRENT_USER, null);
  }

  public setCurrentUser(user: UserAccount | null): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  // Queue mutation for offline sync tracking
  public recordMutation(table: string, action: 'create' | 'update' | 'delete', recordId: string): void {
    const queue = this.getItem<SyncMutation[]>(STORAGE_KEYS.MUTATIONS, []);
    const newMutation: SyncMutation = {
      id: 'mut-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      table,
      action,
      recordId,
      timestamp: new Date().toISOString(),
    };
    queue.push(newMutation);
    this.setItem(STORAGE_KEYS.MUTATIONS, queue);
  }

  public getPendingMutations(): SyncMutation[] {
    return this.getItem<SyncMutation[]>(STORAGE_KEYS.MUTATIONS, []);
  }

  public clearPendingMutations(): void {
    this.setItem(STORAGE_KEYS.MUTATIONS, []);
    this.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  public getLastSyncTime(): string {
    return this.getItem<string>(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  }

  // Push local changes to Central Cloud Server
  public async pushToCloud(user?: UserAccount | null): Promise<{ success: boolean; message: string; timestamp?: string }> {
    if (!this.isBrowser()) return { success: false, message: 'Not in browser' };
    const mutations = this.getPendingMutations();
    const db = this.loadDatabase();

    try {
      const response = await fetch('/api/cloud/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          database: db,
          mutations,
          user: user || this.getCurrentUser(),
          role: user?.role || 'head_teacher',
          schoolId: user?.schoolId || 'all',
          syncBatchId: 'sync-' + Date.now(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Cloud server responded with HTTP ${response.status}`);
      }

      const res = await response.json();
      if (res.success) {
        this.clearPendingMutations();
        const now = res.syncedAt || new Date().toISOString();
        this.setItem(STORAGE_KEYS.LAST_SYNC, now);
        return { success: true, message: res.message, timestamp: now };
      }
      return { success: false, message: res.message || 'Sync failed' };
    } catch (err: any) {
      console.warn('Network / Cloud sync error (operating in offline fallback):', err.message);
      return { success: false, message: `Cloud unavailable: ${err.message}. Changes remain safe offline in device storage.` };
    }
  }

  // Pull latest updates from Central Cloud Server
  public async pullFromCloud(): Promise<{ success: boolean; data?: AppDatabase; message?: string }> {
    if (!this.isBrowser()) return { success: false };
    try {
      const response = await fetch('/api/cloud/data');
      if (!response.ok) return { success: false };
      const res = await response.json();
      if (res.success && res.data) {
        this.saveFullDatabase(res.data);
        return { success: true, data: res.data };
      }
      return { success: false };
    } catch (err) {
      return { success: false };
    }
  }

  // Save full database to localStorage
  public saveFullDatabase(data: Partial<AppDatabase>): void {
    if (!this.isBrowser() || !data) return;
    const collections: (keyof AppDatabase)[] = [
      'users', 'schools', 'staff', 'students', 'studentAttendance',
      'staffAttendance', 'examinations', 'examMarks', 'payroll',
      'visits', 'issues', 'tasks', 'documents', 'notifications', 'settings'
    ];
    for (const col of collections) {
      if (data[col] !== undefined) {
        this.saveCollection(col, data[col] as any);
      }
    }
  }

  // Device identification & tracking
  public getDeviceId(): string {
    if (!this.isBrowser()) return 'device-server';
    let id = localStorage.getItem('sef_device_id');
    if (!id) {
      id = 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 6);
      localStorage.setItem('sef_device_id', id);
    }
    return id;
  }

  public getDevicePayload(): { deviceId: string; deviceName: string; platform: string; appVersion: string } {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isMobile = isAndroid || isIOS || /Mobi/i.test(ua);

    let platform = 'Web Desktop';
    if (isAndroid) platform = 'Android Mobile';
    else if (isIOS) platform = 'Apple iOS';
    else if (isMobile) platform = 'Mobile Browser';

    return {
      deviceId: this.getDeviceId(),
      deviceName: isMobile ? (isAndroid ? 'Android Phone' : 'iPhone') : 'Chrome / Desktop',
      platform,
      appVersion: '3.5.0-sef',
    };
  }

  // Central Cloud Multi-Device Login
  public async loginViaCloud(username: string, pin: string): Promise<{ success: boolean; user?: UserAccount; database?: AppDatabase; message?: string }> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          pin,
          device: this.getDevicePayload(),
        }),
      });
      const res = await response.json();
      if (res.success && res.user) {
        this.setCurrentUser(res.user);
        if (res.database) {
          this.saveFullDatabase(res.database);
        }
        return { success: true, user: res.user, database: res.database, message: res.message };
      }
      return { success: false, message: res.message || 'Invalid Username or PIN / Password.' };
    } catch (err: any) {
      console.warn('Network offline during cloud login, checking local storage:', err);
      const localDb = this.loadDatabase();
      const cleanU = username.trim().toLowerCase();
      const cleanP = pin.trim();
      const matched = localDb.users.find(u => {
        const matchU = (u.username || '').toLowerCase() === cleanU;
        const matchE = (u.email || '').toLowerCase() === cleanU;
        return (matchU || matchE) && String(u.pin).trim() === cleanP;
      });
      if (matched) {
        this.setCurrentUser(matched);
        return { success: true, user: matched, database: localDb, message: `Logged in offline as ${matched.name}` };
      }
      return { success: false, message: 'Invalid Username/Email or PIN/Password (Offline).' };
    }
  }

  // Send Phone OTP
  public async sendPhoneOtp(phone: string): Promise<{ success: boolean; sessionId?: string; phoneNumber?: string; message: string }> {
    try {
      const response = await fetch('/api/auth/phone/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: 'Network error sending OTP: ' + err.message };
    }
  }

  // Send Email OTP
  public async sendEmailOtp(email: string): Promise<{ success: boolean; sessionId?: string; email?: string; previewCode?: string; emailSent?: boolean; mailNotice?: string; message: string }> {
    try {
      const response = await fetch('/api/auth/email/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: 'Network error sending email verification: ' + err.message };
    }
  }

  // Register Operator with Confirmed OTP (Phone or Email)
  public async registerWithOtp(payload: {
    sessionId: string;
    otp: string;
    verificationType: 'phone' | 'email';
    contactValue: string;
    name: string;
    username: string;
    pin: string;
    organizationName: string;
    secondaryEmail?: string;
    secondaryPhone?: string;
  }): Promise<{ success: boolean; user?: UserAccount; database?: AppDatabase; message: string }> {
    try {
      const response = await fetch('/api/auth/register-with-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          device: this.getDevicePayload(),
        }),
      });
      const res = await response.json();
      if (res.success && res.user) {
        this.setCurrentUser(res.user);
        if (res.database) {
          this.saveFullDatabase(res.database);
        }
      }
      return res;
    } catch (err: any) {
      return { success: false, message: 'Network error during registration: ' + err.message };
    }
  }

  // Verify Phone OTP & Log in / Register
  public async verifyPhoneOtp(params: {
    sessionId: string;
    otp: string;
    phone: string;
    name?: string;
    role?: string;
    organizationName?: string;
    schoolId?: string;
  }): Promise<{ success: boolean; user?: UserAccount; database?: AppDatabase; isNewUser?: boolean; message: string }> {
    try {
      const response = await fetch('/api/auth/phone/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          device: this.getDevicePayload(),
        }),
      });
      const res = await response.json();
      if (res.success && res.user) {
        this.setCurrentUser(res.user);
        if (res.database) {
          this.saveFullDatabase(res.database);
        }
      }
      return res;
    } catch (err: any) {
      return { success: false, message: 'Network error verifying OTP: ' + err.message };
    }
  }

  // Google Sign-In
  public async loginWithGoogle(params: {
    credential?: string;
    email?: string;
    name?: string;
    googleUid?: string;
    picture?: string;
  }): Promise<{ success: boolean; user?: UserAccount; database?: AppDatabase; isNewUser?: boolean; message: string }> {
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          device: this.getDevicePayload(),
        }),
      });
      const res = await response.json();
      if (res.success && res.user) {
        this.setCurrentUser(res.user);
        if (res.database) {
          this.saveFullDatabase(res.database);
        }
      }
      return res;
    } catch (err: any) {
      return { success: false, message: 'Google authentication error: ' + err.message };
    }
  }

  // Link account (Google to Phone, or Phone to Google)
  public async linkAccount(payload: {
    userId: string;
    targetProvider: 'google' | 'phone';
    googleData?: { googleUid?: string; email?: string; name?: string; picture?: string };
    phoneData?: { phone: string; otp: string; sessionId: string };
  }): Promise<{ success: boolean; user?: UserAccount; conflict?: boolean; message: string }> {
    try {
      const response = await fetch('/api/auth/link-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await response.json();
      if (res.success && res.user) {
        this.setCurrentUser(res.user);
      }
      return res;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // Change phone number
  public async changePhoneNumber(payload: {
    userId: string;
    newPhone: string;
    otp: string;
    sessionId: string;
  }): Promise<{ success: boolean; user?: UserAccount; message: string }> {
    try {
      const response = await fetch('/api/auth/change-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await response.json();
      if (res.success && res.user) {
        this.setCurrentUser(res.user);
      }
      return res;
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // Update Profile (Operator and Head Teacher)
  public async updateUserProfile(payload: {
    userId: string;
    name?: string;
    organizationName?: string;
    phone?: string;
    email?: string;
    pin?: string;
    profilePic?: string;
    schoolId?: string;
  }): Promise<{ success: boolean; user?: UserAccount; database?: AppDatabase; message: string }> {
    try {
      const response = await fetch('/api/auth/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const res = await response.json();
      if (res.success && res.user) {
        this.setCurrentUser(res.user);
        const localDb = this.loadDatabase();
        localDb.users = localDb.users.map(u => u.id === res.user!.id ? res.user! : u);
        this.saveCollection('users', localDb.users);
      }
      return res;
    } catch (err: any) {
      // Offline fallback
      const localDb = this.loadDatabase();
      const existingIdx = localDb.users.findIndex(u => u.id === payload.userId);
      if (existingIdx >= 0) {
        const updated: UserAccount = {
          ...localDb.users[existingIdx],
          ...(payload.name ? { name: payload.name.trim() } : {}),
          ...(payload.organizationName !== undefined ? { organizationName: payload.organizationName.trim() } : {}),
          ...(payload.email !== undefined ? { email: payload.email.trim() } : {}),
          ...(payload.phone !== undefined ? { phone: payload.phone.trim() } : {}),
          ...(payload.pin ? { pin: payload.pin.trim() } : {}),
          ...(payload.profilePic !== undefined ? { profilePic: payload.profilePic, photoUrl: payload.profilePic } : {}),
          ...(payload.schoolId !== undefined ? { schoolId: payload.schoolId } : {}),
          updatedAt: new Date().toISOString(),
        };
        localDb.users[existingIdx] = updated;
        this.saveCollection('users', localDb.users);
        this.setCurrentUser(updated);
        this.recordMutation('users', 'update', updated.id);
        return { success: true, user: updated, message: 'Profile updated in offline storage.' };
      }
      return { success: false, message: 'Network error updating profile: ' + err.message };
    }
  }

  // Active devices
  public async getActiveDevices(userId?: string): Promise<any[]> {
    try {
      const url = userId ? `/api/auth/devices?userId=${encodeURIComponent(userId)}` : '/api/auth/devices';
      const response = await fetch(url);
      const res = await response.json();
      return res.devices || [];
    } catch {
      return [];
    }
  }

  public async logoutDevice(deviceId: string, userId?: string, logoutAllOthers?: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch('/api/auth/devices/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, userId, logoutAllOthers }),
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // Security audit logs
  public async getSecurityAuditLogs(userId?: string): Promise<any[]> {
    try {
      const url = userId ? `/api/auth/audit-logs?userId=${encodeURIComponent(userId)}` : '/api/auth/audit-logs';
      const response = await fetch(url);
      const res = await response.json();
      return res.logs || [];
    } catch {
      return [];
    }
  }

  // Central Cloud Registration (Operator or Staff)
  public async registerViaCloud(userData: any): Promise<{ success: boolean; user?: UserAccount; message?: string }> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          device: this.getDevicePayload(),
        }),
      });
      const res = await response.json();
      if (res.success && res.user) {
        const localUsers = this.getItem(STORAGE_KEYS.USERS, INITIAL_USERS);
        const filtered = localUsers.filter((u: any) => u.username.toLowerCase() !== res.user.username.toLowerCase());
        const updatedUsers = [...filtered, res.user];
        this.saveCollection('users', updatedUsers);
        this.setCurrentUser(res.user);
        return { success: true, user: res.user, message: res.message };
      }
      return { success: false, message: res.message || 'Registration failed' };
    } catch (err: any) {
      console.warn('Network error during cloud registration, saving locally:', err);
      const newUser: UserAccount = {
        ...userData,
        id: 'usr-' + Date.now(),
        createdAt: new Date().toISOString(),
      };
      const localUsers = this.getItem(STORAGE_KEYS.USERS, INITIAL_USERS);
      const updatedUsers = [...localUsers, newUser];
      this.saveCollection('users', updatedUsers);
      this.setCurrentUser(newUser);
      return { success: true, user: newUser, message: 'Saved offline on device. Will sync to central cloud when online.' };
    }
  }

  // Load all database collections
  public loadDatabase(): AppDatabase {
    return {
      users: this.getItem(STORAGE_KEYS.USERS, INITIAL_USERS),
      schools: this.getItem(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS),
      staff: this.getItem(STORAGE_KEYS.STAFF, INITIAL_STAFF),
      students: this.getItem(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS),
      studentAttendance: this.getItem(STORAGE_KEYS.STUDENT_ATTENDANCE, INITIAL_STUDENT_ATTENDANCE),
      staffAttendance: this.getItem(STORAGE_KEYS.STAFF_ATTENDANCE, INITIAL_STAFF_ATTENDANCE),
      examinations: this.getItem(STORAGE_KEYS.EXAMINATIONS, INITIAL_EXAMINATIONS),
      examMarks: this.getItem(STORAGE_KEYS.EXAM_MARKS, INITIAL_EXAM_MARKS),
      payroll: this.getItem(STORAGE_KEYS.PAYROLL, INITIAL_PAYROLL),
      visits: this.getItem(STORAGE_KEYS.VISITS, INITIAL_VISITS),
      issues: this.getItem(STORAGE_KEYS.ISSUES, INITIAL_ISSUES),
      tasks: this.getItem(STORAGE_KEYS.TASKS, INITIAL_TASKS),
      documents: this.getItem(STORAGE_KEYS.DOCUMENTS, INITIAL_DOCUMENTS),
      notifications: this.getItem(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS),
      settings: this.getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
    };
  }

  // Generic Save for a collection
  public saveCollection<K extends keyof AppDatabase>(key: K, data: AppDatabase[K]): void {
    const keyMap: Record<keyof AppDatabase, string> = {
      users: STORAGE_KEYS.USERS,
      schools: STORAGE_KEYS.SCHOOLS,
      staff: STORAGE_KEYS.STAFF,
      students: STORAGE_KEYS.STUDENTS,
      studentAttendance: STORAGE_KEYS.STUDENT_ATTENDANCE,
      staffAttendance: STORAGE_KEYS.STAFF_ATTENDANCE,
      examinations: STORAGE_KEYS.EXAMINATIONS,
      examMarks: STORAGE_KEYS.EXAM_MARKS,
      payroll: STORAGE_KEYS.PAYROLL,
      visits: STORAGE_KEYS.VISITS,
      issues: STORAGE_KEYS.ISSUES,
      tasks: STORAGE_KEYS.TASKS,
      documents: STORAGE_KEYS.DOCUMENTS,
      notifications: STORAGE_KEYS.NOTIFICATIONS,
      settings: STORAGE_KEYS.SETTINGS,
    };
    this.setItem(keyMap[key], data);
  }

  // Backup & Restore
  public createBackup(filterSchoolId?: string, academicYear?: string): {
    metadata: {
      exportedAt: string;
      version: string;
      operatorOrg: string;
      schoolCount: number;
      studentCount: number;
      staffCount: number;
      filterSchoolId?: string;
      academicYear?: string;
    };
    data: Partial<AppDatabase>;
  } {
    const db = this.loadDatabase();
    let schools = db.schools;
    let students = db.students;
    let staff = db.staff;
    let studentAtt = db.studentAttendance;
    let staffAtt = db.staffAttendance;
    let marks = db.examMarks;
    let payroll = db.payroll;
    let visits = db.visits;
    let issues = db.issues;
    let tasks = db.tasks;
    let documents = db.documents;

    if (filterSchoolId && filterSchoolId !== 'all') {
      schools = schools.filter(s => s.id === filterSchoolId);
      students = students.filter(s => s.schoolId === filterSchoolId);
      staff = staff.filter(s => s.schoolId === filterSchoolId);
      studentAtt = studentAtt.filter(s => s.schoolId === filterSchoolId);
      staffAtt = staffAtt.filter(s => s.schoolId === filterSchoolId);
      marks = marks.filter(m => m.schoolId === filterSchoolId);
      payroll = payroll.filter(p => p.schoolId === filterSchoolId);
      visits = visits.filter(v => v.schoolId === filterSchoolId);
      issues = issues.filter(i => i.schoolId === filterSchoolId);
      tasks = tasks.filter(t => t.schoolId === filterSchoolId);
      documents = documents.filter(d => d.schoolId === filterSchoolId);
    }

    if (academicYear) {
      studentAtt = studentAtt.filter(s => s.academicYear === academicYear);
      staffAtt = staffAtt.filter(s => s.academicYear === academicYear);
      marks = marks.filter(m => m.academicYear === academicYear);
      payroll = payroll.filter(p => p.academicYear === academicYear);
    }

    return {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
        operatorOrg: db.settings.theme,
        schoolCount: schools.length,
        studentCount: students.length,
        staffCount: staff.length,
        filterSchoolId,
        academicYear,
      },
      data: {
        schools,
        students,
        staff,
        studentAttendance: studentAtt,
        staffAttendance: staffAtt,
        examinations: db.examinations,
        examMarks: marks,
        payroll,
        visits,
        issues,
        tasks,
        documents,
        settings: db.settings,
      },
    };
  }

  public generateFullBackup(): any {
    return this.createBackup();
  }

  public restoreFromBackup(backupJson: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(backupJson);
      if (!parsed.data || !parsed.metadata) {
        return { success: false, message: 'Invalid backup file format: Missing metadata or data.' };
      }

      const current = this.loadDatabase();
      const incoming = parsed.data;

      // Merge or replace
      if (incoming.schools) this.saveCollection('schools', incoming.schools);
      if (incoming.staff) this.saveCollection('staff', incoming.staff);
      if (incoming.students) this.saveCollection('students', incoming.students);
      if (incoming.studentAttendance) this.saveCollection('studentAttendance', incoming.studentAttendance);
      if (incoming.staffAttendance) this.saveCollection('staffAttendance', incoming.staffAttendance);
      if (incoming.examinations) this.saveCollection('examinations', incoming.examinations);
      if (incoming.examMarks) this.saveCollection('examMarks', incoming.examMarks);
      if (incoming.payroll) this.saveCollection('payroll', incoming.payroll);
      if (incoming.visits) this.saveCollection('visits', incoming.visits);
      if (incoming.issues) this.saveCollection('issues', incoming.issues);
      if (incoming.tasks) this.saveCollection('tasks', incoming.tasks);
      if (incoming.documents) this.saveCollection('documents', incoming.documents);

      return {
        success: true,
        message: `Successfully restored database (${parsed.metadata.schoolCount} schools, ${parsed.metadata.studentCount} students, ${parsed.metadata.staffCount} staff).`,
      };
    } catch (e: any) {
      return { success: false, message: `Restore error: ${e.message}` };
    }
  }
}

export const storageService = new StorageService();
