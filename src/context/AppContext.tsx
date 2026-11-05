import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  UserAccount,
  UserRole,
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
  SyncState,
} from '../types';
import { storageService, AppDatabase, SyncMutation } from '../services/storage';
import { firebaseSync } from '../services/firebaseSync';
import {
  auth,
  signInWithGoogle,
  checkRedirectResult,
  signOutUser,
  getFriendlyAuthErrorMessage,
  validateFirestoreConnection,
} from '../firebase/config';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

interface AppContextType {
  currentUser: UserAccount | null;
  users: UserAccount[];
  isAuthLoading: boolean;
  authError: string | null;
  loginWithGoogleAuth: () => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserAccount>) => Promise<boolean>;

  // Legacy compatibility helpers
  login: (username: string, pin: string) => Promise<{ success: boolean; message: string }>;
  signUpOperator: (data: any) => Promise<{ success: boolean; message: string }>;
  sendPhoneOtp: (phone: string) => Promise<{ success: boolean; sessionId?: string; message: string }>;
  sendEmailOtp: (email: string) => Promise<{ success: boolean; sessionId?: string; message: string }>;
  registerWithOtp: (payload: any) => Promise<{ success: boolean; message: string }>;
  loginWithPhone: (params: any) => Promise<{ success: boolean; message: string }>;
  loginWithGoogle: (params: any) => Promise<{ success: boolean; message: string }>;
  linkAccount: (payload: any) => Promise<{ success: boolean; conflict?: boolean; message: string }>;
  changePhoneNumber: (payload: any) => Promise<{ success: boolean; message: string }>;
  createUserAccount: (user: Omit<UserAccount, 'id' | 'createdAt'>) => void;
  updateUserAccount: (user: UserAccount) => void;
  deleteUserAccount: (userId: string) => void;
  quickSwitchUser: (userId: string) => void;
  isRestoringCloudData: boolean;
  restoreProgress: { step: string; current: number; total: number; entity: string } | null;

  // School Context
  schools: School[];
  activeSchoolId: string; // 'all' or schoolId
  setActiveSchoolId: (id: string) => void;
  activeSchool: School | null;
  selectedSchoolIdForProfile: string | null;
  setSelectedSchoolIdForProfile: (id: string | null) => void;

  // Academic Year
  activeAcademicYear: string;
  setActiveAcademicYear: (year: string) => void;

  // Navigation
  currentTab: string;
  setCurrentTab: (tab: string) => void;

  // Entities
  students: Student[];
  staff: Staff[];
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

  // CRUD Actions
  addSchool: (school: Omit<School, 'id' | 'createdAt' | 'updatedAt'>) => School;
  updateSchool: (school: School) => void;
  deleteSchool: (id: string) => void;

  addStudent: (student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => Student;
  batchAddStudents: (students: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]) => Student[];
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  promoteStudents: (studentIds: string[], nextGrade: string) => void;
  transferStudent: (studentId: string, toSchoolId: string) => void;

  addStaff: (staffMember: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>) => Staff;
  updateStaff: (staffMember: Staff) => void;
  deleteStaff: (id: string) => void;

  saveStudentAttendance: (record: Omit<StudentDailyAttendance, 'id' | 'createdAt'> | Omit<StudentDailyAttendance, 'id' | 'createdAt'>[]) => void;
  saveStaffAttendance: (records: Omit<StaffDailyAttendance, 'id' | 'createdAt'>[]) => void;

  addExamination: (exam: Omit<Examination, 'id'>) => Examination;
  saveExamMarks: (marks: Omit<ExamMark, 'id' | 'createdAt' | 'updatedAt'>[]) => void;

  addPayrollRecord: (record: Omit<PayrollRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePayrollRecord: (record: PayrollRecord) => void;
  generateMonthlyPayroll: (schoolId: string, month: string) => void;
  confirmPayrollReceipt: (payrollId: string, remarks?: string) => void;
  confirmAllSchoolPayroll: (schoolId: string, month: string) => void;

  addSchoolVisit: (visit: Omit<SchoolVisit, 'id' | 'createdAt'>) => SchoolVisit;
  updateSchoolVisit: (visit: SchoolVisit) => void;

  addIssue: (issue: Omit<SchoolIssue, 'id' | 'createdAt' | 'updatedAt'>) => SchoolIssue;
  updateIssue: (issue: SchoolIssue) => void;
  deleteIssue: (id: string) => void;

  addTask: (task: Omit<SchoolTask, 'id'>) => SchoolTask;
  updateTask: (task: SchoolTask) => void;
  deleteTask: (id: string) => void;

  addDocument: (doc: Omit<SchoolDocument, 'id' | 'uploadDate'>) => void;
  deleteDocument: (id: string) => void;

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  resetDemoData: () => void;
  loadDemoDataset: () => void;
  loadCleanDataset: () => void;

  // Sync & Offline State
  syncState: SyncState;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  toggleSimulateOffline: () => void;
  pendingMutationsCount: number;
  lastSyncTime: string;
  syncNow: () => Promise<void>;

  // Modals & Navigation state
  isAIAssistantOpen: boolean;
  setIsAIAssistantOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  photoModal: {
    isOpen: boolean;
    title: string;
    imageUrl: string;
    caption?: string;
  } | null;
  openPhotoModal: (title: string, imageUrl: string, caption?: string) => void;
  closePhotoModal: () => void;

  // Profile Edit Modal
  isEditProfileOpen: boolean;
  setIsEditProfileOpen: (open: boolean) => void;
  editingTargetUser: UserAccount | null;
  openEditProfile: (user?: UserAccount | null) => void;
  closeEditProfile: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize storage
  useEffect(() => {
    storageService.initDatabase();
  }, []);

  const [db, setDb] = useState<AppDatabase>(() => storageService.loadDatabase());
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeSchoolId, setActiveSchoolId] = useState<string>('all');
  const [selectedSchoolIdForProfile, setSelectedSchoolIdForProfileState] = useState<string | null>(null);
  const [activeAcademicYear, setActiveAcademicYear] = useState<string>(() => db.settings?.academicYear || '2026-27');
  const [currentTab, setCurrentTabState] = useState<string>('dashboard');

  // Network & Sync
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(db.settings?.offlineSimulation || false);
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [pendingMutationsCount, setPendingMutationsCount] = useState<number>(() => storageService.getPendingMutations().length);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => storageService.getLastSyncTime());

  // Search, Photo, AI & Edit Profile Modals
  const [isSearchOpen, setIsSearchOpenState] = useState<boolean>(false);
  const [isAIAssistantOpen, setIsAIAssistantOpenState] = useState<boolean>(false);
  const [photoModal, setPhotoModalState] = useState<{ isOpen: boolean; title: string; imageUrl: string; caption?: string } | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpenState] = useState<boolean>(false);
  const [editingTargetUser, setEditingTargetUser] = useState<UserAccount | null>(null);

  // Keep a ref to the latest DB to avoid closures losing state in auto-syncs
  const dbRef = useRef<AppDatabase>(db);
  useEffect(() => {
    dbRef.current = db;
  }, [db]);

  const currentUserRef = useRef<UserAccount | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Push state to browser history whenever tabs change for Phone Back Button / Swipe from Side
  const setCurrentTab = useCallback((newTab: string) => {
    setCurrentTabState(prev => {
      if (prev !== newTab && typeof window !== 'undefined') {
        window.history.pushState({ type: 'tab', tab: newTab }, '');
      }
      return newTab;
    });
  }, []);

  const setSelectedSchoolIdForProfile = useCallback((schoolId: string | null) => {
    setSelectedSchoolIdForProfileState(prev => {
      if (schoolId && schoolId !== prev && typeof window !== 'undefined') {
        window.history.pushState({ type: 'school_profile', id: schoolId }, '');
      }
      return schoolId;
    });
  }, []);

  const setIsSearchOpen = useCallback((open: boolean) => {
    setIsSearchOpenState(prev => {
      if (open && !prev && typeof window !== 'undefined') {
        window.history.pushState({ type: 'modal', name: 'search' }, '');
      }
      return open;
    });
  }, []);

  const setIsAIAssistantOpen = useCallback((open: boolean) => {
    setIsAIAssistantOpenState(prev => {
      if (open && !prev && typeof window !== 'undefined') {
        window.history.pushState({ type: 'modal', name: 'ai_assistant' }, '');
      }
      return open;
    });
  }, []);

  const setIsEditProfileOpen = useCallback((open: boolean) => {
    setIsEditProfileOpenState(prev => {
      if (open && !prev && typeof window !== 'undefined') {
        window.history.pushState({ type: 'modal', name: 'edit_profile' }, '');
      }
      return open;
    });
  }, []);

  const openPhotoModal = useCallback((title: string, imageUrl: string, caption?: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({ type: 'modal', name: 'photo' }, '');
    }
    setPhotoModalState({ isOpen: true, title, imageUrl, caption });
  }, []);

  const closePhotoModal = useCallback(() => {
    setPhotoModalState(null);
  }, []);

  const openEditProfile = useCallback((user?: UserAccount | null) => {
    setEditingTargetUser(user || currentUserRef.current);
    setIsEditProfileOpen(true);
  }, [setIsEditProfileOpen]);

  const closeEditProfile = useCallback(() => {
    setIsEditProfileOpenState(false);
    setEditingTargetUser(null);
  }, []);

  // Phone Back Button & Swipe Back Navigation Interceptor
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial history state if not set
    if (!window.history.state) {
      window.history.replaceState({ type: 'tab', tab: 'dashboard', root: true }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
      // 1. Check if photo modal is open -> close it
      if (photoModal) {
        setPhotoModalState(null);
        return;
      }

      // 2. Check if AI Assistant modal is open -> close it
      if (isAIAssistantOpen) {
        setIsAIAssistantOpenState(false);
        return;
      }

      // 3. Check if Search modal is open -> close it
      if (isSearchOpen) {
        setIsSearchOpenState(false);
        return;
      }

      // 4. Check if Edit Profile modal is open -> close it
      if (isEditProfileOpen) {
        setIsEditProfileOpenState(false);
        setEditingTargetUser(null);
        return;
      }

      // 5. Check if viewing a specific School's Profile -> step back to school directory
      if (selectedSchoolIdForProfile) {
        setSelectedSchoolIdForProfileState(null);
        return;
      }

      // 6. If history event contains a tab, switch to it
      if (event.state && event.state.tab) {
        setCurrentTabState(event.state.tab);
        return;
      }

      // 7. If currently on a different tab, step back to dashboard
      if (currentTab !== 'dashboard') {
        setCurrentTabState('dashboard');
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [
    photoModal,
    isAIAssistantOpen,
    isSearchOpen,
    isEditProfileOpen,
    selectedSchoolIdForProfile,
    currentTab,
  ]);

  // Check for redirect result on initial page load (for mobile browsers where popup was redirected)
  useEffect(() => {
    checkRedirectResult()
      .then(user => {
        if (user) {
          console.log('[Firebase Auth] Logged in via redirect:', user.email);
        }
      })
      .catch(err => {
        const friendly = getFriendlyAuthErrorMessage(err);
        setAuthError(friendly);
      });
  }, []);

  // Primary Auth Listener: onAuthStateChanged as single source of truth for login state
  useEffect(() => {
    validateFirestoreConnection().catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setAuthError(null);

      if (firebaseUser) {
        try {
          // 1. Ensure user profile document exists in Firestore under users/{uid}
          const profile = await firebaseSync.ensureUserDocument(firebaseUser);

          // 2. Load or migrate school database under users/{uid}/data/database
          const currentLocalDb = storageService.loadDatabase();
          const remoteDb = await firebaseSync.loadOrMigrateUserData(firebaseUser.uid, currentLocalDb);

          // Update local state and cache
          setDb(remoteDb);
          storageService.saveFullDatabase(remoteDb);

          // 3. Construct current user object
          const appUser: UserAccount = {
            id: firebaseUser.uid,
            username: firebaseUser.email?.split('@')[0] || 'operator',
            name: profile.displayName || firebaseUser.displayName || 'School Operator',
            email: firebaseUser.email || '',
            phone: profile.phone || '',
            role: (profile.role as UserRole) || 'operator',
            pin: '••••',
            organizationName: profile.organizationName || 'Sindh Rural Education Support Organization (SRESO)',
            schoolId: profile.schoolId,
            photoUrl: profile.photoURL || firebaseUser.photoURL || undefined,
            createdAt: profile.createdAt || new Date().toISOString(),
          };

          setCurrentUser(appUser);
          storageService.setCurrentUser(appUser);

          if (appUser.role === 'head_teacher' && appUser.schoolId) {
            setActiveSchoolId(appUser.schoolId);
          } else {
            setActiveSchoolId('all');
          }

          // 4. Attach real-time Firestore listener to keep all devices in sync
          firebaseSync.subscribeToUserData(firebaseUser.uid, updatedDb => {
            console.log('[Firestore Sync] Received live database update from cloud');
            setDb(updatedDb);
            storageService.saveFullDatabase(updatedDb);
          });
        } catch (err: any) {
          console.warn('[Firebase Auth] Error during post-auth sync:', err);
        } finally {
          setIsAuthLoading(false);
        }
      } else {
        // User is signed out
        firebaseSync.cleanup();
        setCurrentUser(null);
        storageService.setCurrentUser(null);
        setIsAuthLoading(false);
      }
    });

    return () => {
      unsubscribe();
      firebaseSync.cleanup();
    };
  }, []);

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!isSimulatedOffline && currentUserRef.current) {
        // Auto-save any local state
        firebaseSync.saveUserData(currentUserRef.current.id, dbRef.current).catch(() => {});
      }
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncState('error');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isSimulatedOffline]);

  // Google Sign-In Action
  const loginWithGoogleAuth = useCallback(async (): Promise<{ success: boolean; message?: string }> => {
    setAuthError(null);
    try {
      const res = await signInWithGoogle();
      if (res.redirected) {
        return { success: true, message: 'Redirecting to Google sign-in...' };
      }
      return { success: true };
    } catch (err: any) {
      const friendly = getFriendlyAuthErrorMessage(err);
      setAuthError(friendly);
      return { success: false, message: friendly };
    }
  }, []);

  // Sign out
  const logout = useCallback(async () => {
    try {
      await signOutUser();
      firebaseSync.cleanup();
      setCurrentUser(null);
      storageService.setCurrentUser(null);
    } catch (err: any) {
      console.warn('Sign out warning:', err);
      setCurrentUser(null);
      storageService.setCurrentUser(null);
    }
  }, []);

  // Synchronize database to Firestore and local storage
  const persistDatabase = useCallback((updatedDb: AppDatabase) => {
    setDb(updatedDb);
    storageService.saveFullDatabase(updatedDb);

    if (currentUserRef.current?.id && navigator.onLine && !isSimulatedOffline) {
      firebaseSync.saveUserData(currentUserRef.current.id, updatedDb).catch(err => {
        console.warn('Firestore auto-save warning:', err);
      });
    }
  }, [isSimulatedOffline]);

  // Update Operator / Head Teacher Profile
  const updateUserProfile = useCallback(async (updates: Partial<UserAccount>): Promise<boolean> => {
    if (!currentUserRef.current) return false;
    const uid = currentUserRef.current.id;

    const updatedUser: UserAccount = {
      ...currentUserRef.current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    setCurrentUser(updatedUser);
    storageService.setCurrentUser(updatedUser);

    // Update in user list if exists
    const updatedUsers = dbRef.current.users.map(u => u.id === uid ? updatedUser : u);
    if (!updatedUsers.some(u => u.id === uid)) {
      updatedUsers.push(updatedUser);
    }

    const updatedDb = { ...dbRef.current, users: updatedUsers };
    persistDatabase(updatedDb);

    // Update Firestore user document
    await firebaseSync.updateUserProfile(uid, {
      displayName: updatedUser.name,
      role: updatedUser.role,
      phone: updatedUser.phone,
      email: updatedUser.email,
      photoURL: updatedUser.photoUrl,
      organizationName: updatedUser.organizationName,
      schoolId: updatedUser.schoolId,
    });

    return true;
  }, [persistDatabase]);

  // Cloud manual sync
  const syncNow = useCallback(async () => {
    if (!isOnline || isSimulatedOffline || !currentUserRef.current) {
      setSyncState('error');
      return;
    }
    setSyncState('syncing');
    try {
      await firebaseSync.saveUserData(currentUserRef.current.id, dbRef.current);
      setPendingMutationsCount(0);
      setLastSyncTime(new Date().toISOString());
      setSyncState('synced');
    } catch {
      setSyncState('error');
    }
  }, [isOnline, isSimulatedOffline]);

  const toggleSimulateOffline = useCallback(() => {
    setIsSimulatedOffline(prev => {
      const next = !prev;
      setDb(curr => ({
        ...curr,
        settings: { ...curr.settings, offlineSimulation: next },
      }));
      setSyncState(next ? 'pending' : 'synced');
      return next;
    });
  }, []);

  // CRUD Actions
  const addSchool = useCallback((schoolData: Omit<School, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newSchool: School = {
      ...schoolData,
      id: 'sch-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [...dbRef.current.schools, newSchool];
    persistDatabase({ ...dbRef.current, schools: updated });
    return newSchool;
  }, [persistDatabase]);

  const updateSchool = useCallback((school: School) => {
    const updated = dbRef.current.schools.map(s => s.id === school.id ? { ...school, updatedAt: new Date().toISOString() } : s);
    persistDatabase({ ...dbRef.current, schools: updated });
  }, [persistDatabase]);

  const deleteSchool = useCallback((id: string) => {
    const updated = dbRef.current.schools.filter(s => s.id !== id);
    persistDatabase({ ...dbRef.current, schools: updated });
  }, [persistDatabase]);

  const addStudent = useCallback((studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newStudent: Student = {
      ...studentData,
      id: 'std-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newStudent, ...dbRef.current.students];
    persistDatabase({ ...dbRef.current, students: updated });
    return newStudent;
  }, [persistDatabase]);

  const batchAddStudents = useCallback((studentsData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const newStudents: Student[] = studentsData.map((s, idx) => ({
      ...s,
      id: 'std-' + Date.now() + '-' + idx,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const updated = [...newStudents, ...dbRef.current.students];
    persistDatabase({ ...dbRef.current, students: updated });
    return newStudents;
  }, [persistDatabase]);

  const updateStudent = useCallback((student: Student) => {
    const updated = dbRef.current.students.map(s => s.id === student.id ? { ...student, updatedAt: new Date().toISOString() } : s);
    persistDatabase({ ...dbRef.current, students: updated });
  }, [persistDatabase]);

  const deleteStudent = useCallback((id: string) => {
    const updated = dbRef.current.students.filter(s => s.id !== id);
    persistDatabase({ ...dbRef.current, students: updated });
  }, [persistDatabase]);

  const promoteStudents = useCallback((studentIds: string[], nextGrade: string) => {
    const set = new Set(studentIds);
    const updated = dbRef.current.students.map(s => set.has(s.id) ? { ...s, class: nextGrade, updatedAt: new Date().toISOString() } : s);
    persistDatabase({ ...dbRef.current, students: updated });
  }, [persistDatabase]);

  const transferStudent = useCallback((studentId: string, toSchoolId: string) => {
    const updated = dbRef.current.students.map(s => s.id === studentId ? { ...s, schoolId: toSchoolId, updatedAt: new Date().toISOString() } : s);
    persistDatabase({ ...dbRef.current, students: updated });
  }, [persistDatabase]);

  const addStaff = useCallback((staffData: Omit<Staff, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newStaff: Staff = {
      ...staffData,
      id: 'stf-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newStaff, ...dbRef.current.staff];
    persistDatabase({ ...dbRef.current, staff: updated });
    return newStaff;
  }, [persistDatabase]);

  const updateStaff = useCallback((staffMember: Staff) => {
    const updated = dbRef.current.staff.map(s => s.id === staffMember.id ? { ...staffMember, updatedAt: new Date().toISOString() } : s);
    persistDatabase({ ...dbRef.current, staff: updated });
  }, [persistDatabase]);

  const deleteStaff = useCallback((id: string) => {
    const updated = dbRef.current.staff.filter(s => s.id !== id);
    persistDatabase({ ...dbRef.current, staff: updated });
  }, [persistDatabase]);

  const saveStudentAttendance = useCallback((records: Omit<StudentDailyAttendance, 'id' | 'createdAt'> | Omit<StudentDailyAttendance, 'id' | 'createdAt'>[]) => {
    const recsArray = Array.isArray(records) ? records : [records];
    const newRecs: StudentDailyAttendance[] = recsArray.map(r => ({
      ...r,
      id: 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
    }));

    // Replace matching school+date+grade
    const keys = new Set(newRecs.map(r => `${r.schoolId}_${r.date}_${r.grade}`));
    const filtered = dbRef.current.studentAttendance.filter(a => !keys.has(`${a.schoolId}_${a.date}_${a.grade}`));
    const updated = [...newRecs, ...filtered];
    persistDatabase({ ...dbRef.current, studentAttendance: updated });
  }, [persistDatabase]);

  const saveStaffAttendance = useCallback((records: Omit<StaffDailyAttendance, 'id' | 'createdAt'>[]) => {
    const newRecs: StaffDailyAttendance[] = records.map(r => ({
      ...r,
      id: 'stfatt-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
    }));
    const keys = new Set(newRecs.map(r => `${r.staffId}_${r.date}`));
    const filtered = dbRef.current.staffAttendance.filter(a => !keys.has(`${a.staffId}_${a.date}`));
    const updated = [...newRecs, ...filtered];
    persistDatabase({ ...dbRef.current, staffAttendance: updated });
  }, [persistDatabase]);

  const addExamination = useCallback((examData: Omit<Examination, 'id'>) => {
    const newExam: Examination = {
      ...examData,
      id: 'exm-' + Date.now(),
    };
    const updated = [newExam, ...dbRef.current.examinations];
    persistDatabase({ ...dbRef.current, examinations: updated });
    return newExam;
  }, [persistDatabase]);

  const saveExamMarks = useCallback((marks: Omit<ExamMark, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const newMarks: ExamMark[] = marks.map(m => ({
      ...m,
      id: 'mrk-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const keys = new Set(newMarks.map(m => `${m.examinationId}_${m.studentId}`));
    const filtered = dbRef.current.examMarks.filter(m => !keys.has(`${m.examinationId}_${m.studentId}`));
    const updated = [...newMarks, ...filtered];
    persistDatabase({ ...dbRef.current, examMarks: updated });
  }, [persistDatabase]);

  const addPayrollRecord = useCallback((record: Omit<PayrollRecord, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRec: PayrollRecord = {
      ...record,
      id: 'pay-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newRec, ...dbRef.current.payroll];
    persistDatabase({ ...dbRef.current, payroll: updated });
  }, [persistDatabase]);

  const updatePayrollRecord = useCallback((record: PayrollRecord) => {
    const updated = dbRef.current.payroll.map(p => p.id === record.id ? { ...record, updatedAt: new Date().toISOString() } : p);
    persistDatabase({ ...dbRef.current, payroll: updated });
  }, [persistDatabase]);

  const generateMonthlyPayroll = useCallback((schoolId: string, month: string) => {
    const schoolStaff = dbRef.current.staff.filter(s => s.schoolId === schoolId && s.status === 'Active');
    const existing = new Set(dbRef.current.payroll.filter(p => p.schoolId === schoolId && p.month === month).map(p => p.staffId));

    const newRecs: PayrollRecord[] = schoolStaff
      .filter(s => !existing.has(s.id))
      .map(s => ({
        id: 'pay-' + Date.now() + '-' + s.id,
        schoolId,
        staffId: s.id,
        month,
        academicYear: dbRef.current.settings.academicYear || '2026-27',
        baseSalary: s.baseSalary || 25000,
        allowances: {
          travel: 0,
          hardship: 0,
          special: 0,
        },
        deductions: {
          unexcusedAbsenceDays: 0,
          absenceDeduction: 0,
        },
        netSalary: s.baseSalary || 25000,
        paymentStatus: 'Pending',
        paymentMethod: 'Bank Transfer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

    if (newRecs.length > 0) {
      const updated = [...newRecs, ...dbRef.current.payroll];
      persistDatabase({ ...dbRef.current, payroll: updated });
    }
  }, [persistDatabase]);

  const confirmPayrollReceipt = useCallback((payrollId: string, remarks?: string) => {
    const updated = dbRef.current.payroll.map(p => p.id === payrollId ? {
      ...p,
      paymentStatus: 'Paid' as const,
      paymentDate: new Date().toISOString().split('T')[0],
      remarks: remarks || p.remarks,
      updatedAt: new Date().toISOString(),
    } : p);
    persistDatabase({ ...dbRef.current, payroll: updated });
  }, [persistDatabase]);

  const confirmAllSchoolPayroll = useCallback((schoolId: string, month: string) => {
    const updated = dbRef.current.payroll.map(p => (p.schoolId === schoolId && p.month === month && p.paymentStatus !== 'Paid') ? {
      ...p,
      paymentStatus: 'Paid' as const,
      paymentDate: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    } : p);
    persistDatabase({ ...dbRef.current, payroll: updated });
  }, [persistDatabase]);

  const addSchoolVisit = useCallback((visit: Omit<SchoolVisit, 'id' | 'createdAt'>) => {
    const newVisit: SchoolVisit = {
      ...visit,
      id: 'vst-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newVisit, ...dbRef.current.visits];
    persistDatabase({ ...dbRef.current, visits: updated });
    return newVisit;
  }, [persistDatabase]);

  const updateSchoolVisit = useCallback((visit: SchoolVisit) => {
    const updated = dbRef.current.visits.map(v => v.id === visit.id ? visit : v);
    persistDatabase({ ...dbRef.current, visits: updated });
  }, [persistDatabase]);

  const addIssue = useCallback((issue: Omit<SchoolIssue, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newIssue: SchoolIssue = {
      ...issue,
      id: 'iss-' + Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newIssue, ...dbRef.current.issues];
    persistDatabase({ ...dbRef.current, issues: updated });
    return newIssue;
  }, [persistDatabase]);

  const updateIssue = useCallback((issue: SchoolIssue) => {
    const updated = dbRef.current.issues.map(i => i.id === issue.id ? { ...issue, updatedAt: new Date().toISOString() } : i);
    persistDatabase({ ...dbRef.current, issues: updated });
  }, [persistDatabase]);

  const deleteIssue = useCallback((id: string) => {
    const updated = dbRef.current.issues.filter(i => i.id !== id);
    persistDatabase({ ...dbRef.current, issues: updated });
  }, [persistDatabase]);

  const addTask = useCallback((task: Omit<SchoolTask, 'id'>) => {
    const newTask: SchoolTask = {
      ...task,
      id: 'tsk-' + Date.now(),
    };
    const updated = [newTask, ...dbRef.current.tasks];
    persistDatabase({ ...dbRef.current, tasks: updated });
    return newTask;
  }, [persistDatabase]);

  const updateTask = useCallback((task: SchoolTask) => {
    const updated = dbRef.current.tasks.map(t => t.id === task.id ? task : t);
    persistDatabase({ ...dbRef.current, tasks: updated });
  }, [persistDatabase]);

  const deleteTask = useCallback((id: string) => {
    const updated = dbRef.current.tasks.filter(t => t.id !== id);
    persistDatabase({ ...dbRef.current, tasks: updated });
  }, [persistDatabase]);

  const addDocument = useCallback((docItem: Omit<SchoolDocument, 'id' | 'uploadDate'>) => {
    const newDoc: SchoolDocument = {
      ...docItem,
      id: 'doc-' + Date.now(),
      uploadDate: new Date().toISOString(),
    };
    const updated = [newDoc, ...dbRef.current.documents];
    persistDatabase({ ...dbRef.current, documents: updated });
  }, [persistDatabase]);

  const deleteDocument = useCallback((id: string) => {
    const updated = dbRef.current.documents.filter(d => d.id !== id);
    persistDatabase({ ...dbRef.current, documents: updated });
  }, [persistDatabase]);

  const markNotificationRead = useCallback((id: string) => {
    const updated = dbRef.current.notifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    persistDatabase({ ...dbRef.current, notifications: updated });
  }, [persistDatabase]);

  const markAllNotificationsRead = useCallback(() => {
    const updated = dbRef.current.notifications.map(n => ({ ...n, isRead: true }));
    persistDatabase({ ...dbRef.current, notifications: updated });
  }, [persistDatabase]);

  const updateSettings = useCallback((newSettings: Partial<AppSettings>) => {
    const updated = { ...dbRef.current.settings, ...newSettings };
    persistDatabase({ ...dbRef.current, settings: updated });
  }, [persistDatabase]);

  const resetDemoData = useCallback(() => {
    storageService.resetToSampleData();
    const freshDb = storageService.loadDatabase();
    persistDatabase(freshDb);
  }, [persistDatabase]);

  const loadDemoDataset = useCallback(() => {
    storageService.resetToSampleData();
    const freshDb = storageService.loadDatabase();
    persistDatabase(freshDb);
  }, [persistDatabase]);

  const loadCleanDataset = useCallback(() => {
    storageService.resetToEmptyData();
    const freshDb = storageService.loadDatabase();
    persistDatabase(freshDb);
  }, [persistDatabase]);

  // Compatibility stubs
  const createUserAccount = useCallback((userData: Omit<UserAccount, 'id' | 'createdAt'>) => {
    const newUser: UserAccount = {
      ...userData,
      id: 'usr-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    const updated = [...dbRef.current.users, newUser];
    persistDatabase({ ...dbRef.current, users: updated });
  }, [persistDatabase]);

  const updateUserAccount = useCallback((user: UserAccount) => {
    const updated = dbRef.current.users.map(u => u.id === user.id ? user : u);
    persistDatabase({ ...dbRef.current, users: updated });
    if (currentUserRef.current?.id === user.id) {
      setCurrentUser(user);
    }
  }, [persistDatabase]);

  const deleteUserAccount = useCallback((userId: string) => {
    const updated = dbRef.current.users.filter(u => u.id !== userId);
    persistDatabase({ ...dbRef.current, users: updated });
  }, [persistDatabase]);

  const quickSwitchUser = useCallback((userId: string) => {
    const found = dbRef.current.users.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
      if (found.role === 'head_teacher' && found.schoolId) {
        setActiveSchoolId(found.schoolId);
      }
    }
  }, []);

  const login = useCallback(async () => {
    return { success: false, message: 'Please use "Continue with Google" for authentication.' };
  }, []);

  const signUpOperator = useCallback(async () => {
    return { success: false, message: 'Please use "Continue with Google" for registration.' };
  }, []);

  const sendPhoneOtp = useCallback(async () => {
    return { success: false, message: 'Phone OTP has been replaced with Google Sign-In.' };
  }, []);

  const sendEmailOtp = useCallback(async () => {
    return { success: false, message: 'Email OTP has been replaced with Google Sign-In.' };
  }, []);

  const registerWithOtp = useCallback(async () => {
    return { success: false, message: 'Please sign in with Google.' };
  }, []);

  const loginWithPhone = useCallback(async () => {
    return { success: false, message: 'Please sign in with Google.' };
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const res = await loginWithGoogleAuth();
    return {
      success: res.success,
      message: res.message || (res.success ? 'Logged in successfully.' : 'Google sign-in failed.')
    };
  }, [loginWithGoogleAuth]);

  const linkAccount = useCallback(async () => {
    return { success: false, message: 'Account is securely authenticated with Google.' };
  }, []);

  const changePhoneNumber = useCallback(async () => {
    return { success: false, message: 'You can update phone in Edit Profile.' };
  }, []);

  // Active School resolution
  const activeSchool = useMemo(() => {
    if (activeSchoolId === 'all') return null;
    return db.schools.find(s => s.id === activeSchoolId) || null;
  }, [activeSchoolId, db.schools]);

  const value = {
    currentUser,
    users: db.users,
    isAuthLoading,
    authError,
    loginWithGoogleAuth,
    logout,
    updateUserProfile,

    login,
    signUpOperator,
    sendPhoneOtp,
    sendEmailOtp,
    registerWithOtp,
    loginWithPhone,
    loginWithGoogle,
    linkAccount,
    changePhoneNumber,
    createUserAccount,
    updateUserAccount,
    deleteUserAccount,
    quickSwitchUser,
    isRestoringCloudData: false,
    restoreProgress: null,

    schools: db.schools,
    activeSchoolId,
    setActiveSchoolId,
    activeSchool,
    selectedSchoolIdForProfile,
    setSelectedSchoolIdForProfile,

    activeAcademicYear,
    setActiveAcademicYear,

    currentTab,
    setCurrentTab,

    students: db.students,
    staff: db.staff,
    studentAttendance: db.studentAttendance,
    staffAttendance: db.staffAttendance,
    examinations: db.examinations,
    examMarks: db.examMarks,
    payroll: db.payroll,
    visits: db.visits,
    issues: db.issues,
    tasks: db.tasks,
    documents: db.documents,
    notifications: db.notifications,
    settings: db.settings,

    addSchool,
    updateSchool,
    deleteSchool,

    addStudent,
    batchAddStudents,
    updateStudent,
    deleteStudent,
    promoteStudents,
    transferStudent,

    addStaff,
    updateStaff,
    deleteStaff,

    saveStudentAttendance,
    saveStaffAttendance,

    addExamination,
    saveExamMarks,

    addPayrollRecord,
    updatePayrollRecord,
    generateMonthlyPayroll,
    confirmPayrollReceipt,
    confirmAllSchoolPayroll,

    addSchoolVisit,
    updateSchoolVisit,

    addIssue,
    updateIssue,
    deleteIssue,

    addTask,
    updateTask,
    deleteTask,

    addDocument,
    deleteDocument,

    markNotificationRead,
    markAllNotificationsRead,
    updateSettings,
    resetDemoData,
    loadDemoDataset,
    loadCleanDataset,

    syncState,
    isOnline,
    isSimulatedOffline,
    toggleSimulateOffline,
    pendingMutationsCount,
    lastSyncTime,
    syncNow,

    isSearchOpen,
    setIsSearchOpen,

    isAIAssistantOpen,
    setIsAIAssistantOpen,

    photoModal,
    openPhotoModal,
    closePhotoModal,

    isEditProfileOpen,
    setIsEditProfileOpen,
    editingTargetUser,
    openEditProfile,
    closeEditProfile,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
