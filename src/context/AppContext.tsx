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
import { notificationService } from '../services/notificationService';
import {
  auth,
  signInWithGoogle,
  checkRedirectResult,
  signOutUser,
  getFriendlyAuthErrorMessage,
  validateFirestoreConnection,
} from '../firebase/config';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { SchoolInvite } from '../types';

export type AuthFlowStatus = 'loading' | 'unauthenticated' | 'needs_operator_setup' | 'needs_head_teacher_setup' | 'authenticated' | 'auth_error';

interface AppContextType {
  currentUser: UserAccount | null;
  users: UserAccount[];
  isAuthLoading: boolean;
  authStatus: AuthFlowStatus;
  pendingFirebaseUser: FirebaseUser | null;
  pendingInvite: SchoolInvite | null;
  authError: string | null;
  loginWithGoogleAuth: () => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  retryAuth: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserAccount>) => Promise<boolean>;
  completeOperatorSetup: (details: { name: string; instituteName: string; degree: string; phone: string; photoData?: string }) => Promise<void>;
  completeHeadTeacherSetup: (details: { name: string; phone: string; photoData?: string }) => Promise<void>;
  inviteHeadTeacher: (schoolId: string, email: string, name?: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  removeHeadTeacher: (schoolId: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  getSchoolInvites: (schoolId: string) => Promise<SchoolInvite[]>;

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
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;
  dispatchNotification: (notification: SystemNotification) => void;
  activeToasts: SystemNotification[];
  dismissToast: (id: string) => void;
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
  const [authStatus, setAuthStatus] = useState<AuthFlowStatus>('loading');
  const [pendingFirebaseUser, setPendingFirebaseUser] = useState<FirebaseUser | null>(null);
  const [pendingInvite, setPendingInvite] = useState<SchoolInvite | null>(null);
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

  const processAuthUser = useCallback(async (firebaseUser: FirebaseUser) => {
    setIsAuthLoading(true);
    setAuthError(null);

    try {
      // 1. Check if user document exists in users/{uid} and profileCompleted == true
      const check = await firebaseSync.checkUserProfile(firebaseUser);

      // If Firestore read fails, never default to operator!
      if (check.error) {
        setAuthError(`Unable to verify user account: ${check.error}`);
        setAuthStatus('auth_error');
        setIsAuthLoading(false);
        return;
      }

      if (check.profileCompleted && check.user) {
        // a) users/{uid} exists with profileCompleted == true -> open dashboard for its saved role
        setCurrentUser(check.user);
        storageService.setCurrentUser(check.user);
        setPendingFirebaseUser(null);
        setPendingInvite(null);

        let remoteDb: AppDatabase;
        if (check.user.role === 'headTeacher' || check.user.role === 'head_teacher') {
          remoteDb = await firebaseSync.loadHeadTeacherData(check.user);
          if (check.user.schoolId) {
            setActiveSchoolId(check.user.schoolId);
            firebaseSync.subscribeToSchoolData(check.user.schoolId, updatedSchoolData => {
              setDb(curr => ({
                ...curr,
                students: updatedSchoolData.students || curr.students,
                staff: updatedSchoolData.staff || curr.staff,
                studentAttendance: updatedSchoolData.studentAttendance || curr.studentAttendance,
                staffAttendance: updatedSchoolData.staffAttendance || curr.staffAttendance,
                payroll: updatedSchoolData.payroll || curr.payroll,
                examinations: updatedSchoolData.examinations || curr.examinations,
                examMarks: updatedSchoolData.examMarks || curr.examMarks,
                visits: updatedSchoolData.visits || curr.visits,
                issues: updatedSchoolData.issues || curr.issues,
                tasks: updatedSchoolData.tasks || curr.tasks,
                documents: updatedSchoolData.documents || curr.documents,
              }));
            });
          }
        } else {
          remoteDb = await firebaseSync.loadOperatorData(check.user);
          setActiveSchoolId('all');

          firebaseSync.subscribeToOperatorSchools(check.user.id, updatedSchools => {
            setDb(curr => ({
              ...curr,
              schools: updatedSchools,
            }));
          });
        }

        setDb(remoteDb);
        storageService.saveFullDatabase(remoteDb);
        setAuthStatus('authenticated');
        setIsAuthLoading(false);
        return;
      }

      // b) Else, check if invites/{lowercase signed-in email} exists
      const cleanEmail = (firebaseUser.email || '').trim().toLowerCase();
      if (!cleanEmail) {
        setAuthError('Your Google account does not provide an email address.');
        setAuthStatus('auth_error');
        setIsAuthLoading(false);
        return;
      }

      const inviteRes = await firebaseSync.checkInvite(cleanEmail);

      // Never default to operator if a Firestore read fails!
      if (inviteRes.error) {
        setAuthError(`Unable to verify invitation status: ${inviteRes.error}`);
        setAuthStatus('auth_error');
        setIsAuthLoading(false);
        return;
      }

      setPendingFirebaseUser(firebaseUser);

      if (inviteRes.found && inviteRes.invite) {
        // b) invites/{lowercase signed-in email} exists: the user is a HEAD TEACHER
        setPendingInvite(inviteRes.invite);
        setAuthStatus('needs_head_teacher_setup');
      } else {
        // c) Else, only if the invite truly does not exist (not found, not an error): OPERATOR
        setPendingInvite(null);
        setAuthStatus('needs_operator_setup');
      }
    } catch (err: any) {
      console.error('[Firebase Auth] Error during post-auth sync:', err);
      setAuthError(err.message || 'An error occurred during authentication routing.');
      setAuthStatus('auth_error');
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const retryAuth = useCallback(async () => {
    const user = auth.currentUser || pendingFirebaseUser;
    if (user) {
      await processAuthUser(user);
    } else {
      setAuthStatus('unauthenticated');
    }
  }, [pendingFirebaseUser, processAuthUser]);

  // Primary Auth Listener: onAuthStateChanged as single source of truth for login state
  useEffect(() => {
    validateFirestoreConnection().catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setAuthError(null);

      if (firebaseUser) {
        await processAuthUser(firebaseUser);
      } else {
        firebaseSync.cleanup();
        setCurrentUser(null);
        setPendingFirebaseUser(null);
        setPendingInvite(null);
        storageService.setCurrentUser(null);
        setAuthStatus('unauthenticated');
        setIsAuthLoading(false);
      }
    });

    return () => {
      unsubscribe();
      firebaseSync.cleanup();
    };
  }, [processAuthUser]);

  // Online / offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!isSimulatedOffline && currentUserRef.current) {
        firebaseSync.saveDatabase(currentUserRef.current, dbRef.current).catch(() => {});
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
      setPendingFirebaseUser(null);
      setPendingInvite(null);
      storageService.setCurrentUser(null);
      setAuthStatus('unauthenticated');
    } catch (err: any) {
      console.warn('Sign out warning:', err);
      setCurrentUser(null);
      storageService.setCurrentUser(null);
      setAuthStatus('unauthenticated');
    }
  }, []);

  // Complete Operator profile setup
  const completeOperatorSetup = useCallback(async (details: {
    name: string;
    instituteName: string;
    degree: string;
    phone: string;
    photoData?: string;
  }) => {
    if (!pendingFirebaseUser) throw new Error('No authenticated Google session found');
    const operatorUser = await firebaseSync.completeOperatorProfile(pendingFirebaseUser, details);
    setCurrentUser(operatorUser);
    storageService.setCurrentUser(operatorUser);
    setPendingFirebaseUser(null);
    setPendingInvite(null);

    const remoteDb = await firebaseSync.loadOperatorData(operatorUser);
    setDb(remoteDb);
    storageService.saveFullDatabase(remoteDb);
    setActiveSchoolId('all');
    setAuthStatus('authenticated');
  }, [pendingFirebaseUser]);

  // Complete Head Teacher profile setup
  const completeHeadTeacherSetup = useCallback(async (details: {
    name: string;
    phone: string;
    photoData?: string;
  }) => {
    if (!pendingFirebaseUser || !pendingInvite) throw new Error('No active invite found for session');
    const htUser = await firebaseSync.completeHeadTeacherProfile(pendingFirebaseUser, pendingInvite, details);
    setCurrentUser(htUser);
    storageService.setCurrentUser(htUser);
    setPendingFirebaseUser(null);
    setPendingInvite(null);

    const remoteDb = await firebaseSync.loadHeadTeacherData(htUser);
    setDb(remoteDb);
    storageService.saveFullDatabase(remoteDb);
    if (htUser.schoolId) {
      setActiveSchoolId(htUser.schoolId);
    }
    setAuthStatus('authenticated');
  }, [pendingFirebaseUser, pendingInvite]);

  // Invite Head Teacher
  const inviteHeadTeacher = useCallback(async (
    schoolId: string,
    email: string,
    name?: string,
    phone?: string
  ) => {
    if (!currentUserRef.current) return { success: false, error: 'Not authenticated' };
    const school = dbRef.current.schools.find(s => s.id === schoolId);
    const res = await firebaseSync.inviteHeadTeacher(
      currentUserRef.current.id,
      currentUserRef.current.name,
      schoolId,
      school?.name || 'School',
      email,
      name,
      phone
    );

    if (res.success && school) {
      const updatedSchool: School = {
        ...school,
        headTeacherEmail: email.toLowerCase(),
        headTeacherName: name || school.headTeacherName,
        contactNumber: phone || school.contactNumber,
        updatedAt: new Date().toISOString(),
      };
      const updatedSchools = dbRef.current.schools.map(s => s.id === schoolId ? updatedSchool : s);
      setDb(curr => ({ ...curr, schools: updatedSchools }));
    }

    return res;
  }, []);

  // Remove Head Teacher
  const removeHeadTeacher = useCallback(async (schoolId: string, email?: string) => {
    const res = await firebaseSync.removeHeadTeacherAccess(schoolId, email);
    if (res.success) {
      const school = dbRef.current.schools.find(s => s.id === schoolId);
      if (school) {
        const updatedSchool: School = {
          ...school,
          headTeacherUid: undefined,
          headTeacherEmail: undefined,
          updatedAt: new Date().toISOString(),
        };
        const updatedSchools = dbRef.current.schools.map(s => s.id === schoolId ? updatedSchool : s);
        setDb(curr => ({ ...curr, schools: updatedSchools }));
      }
    }
    return res;
  }, []);

  const getSchoolInvites = useCallback(async (schoolId: string) => {
    return await firebaseSync.getSchoolInvites(schoolId);
  }, []);

  // Synchronize database to Firestore and local storage in real-time
  const persistDatabase = useCallback((updatedDb: AppDatabase) => {
    setDb(updatedDb);
    storageService.saveFullDatabase(updatedDb);

    if (currentUserRef.current?.id && navigator.onLine && !isSimulatedOffline) {
      setSyncState('syncing');
      firebaseSync.saveDatabase(currentUserRef.current, updatedDb)
        .then(res => {
          if (res.success) {
            setSyncState('synced');
            setLastSyncTime(new Date().toISOString());
          } else {
            setSyncState('error');
          }
        })
        .catch(err => {
          console.warn('[Firestore] Auto-save warning:', err);
          setSyncState('error');
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

    const updatedUsers = dbRef.current.users.map(u => u.id === uid ? updatedUser : u);
    if (!updatedUsers.some(u => u.id === uid)) {
      updatedUsers.push(updatedUser);
    }

    const updatedDb = { ...dbRef.current, users: updatedUsers };
    persistDatabase(updatedDb);

    await firebaseSync.updateUserProfile(uid, {
      name: updatedUser.name,
      phone: updatedUser.phone,
      photoData: updatedUser.photoData,
      photoUrl: updatedUser.photoUrl,
      instituteName: updatedUser.instituteName,
      organizationName: updatedUser.organizationName,
      degree: updatedUser.degree,
      updatedAt: new Date().toISOString(),
    });

    return true;
  }, [persistDatabase]);

  // Cloud manual sync
  const syncNow = useCallback(async () => {
    if (!currentUserRef.current) {
      setSyncState('error');
      return;
    }
    setSyncState('syncing');
    try {
      const res = await firebaseSync.saveDatabase(currentUserRef.current, dbRef.current);
      if (!res.success) {
        throw new Error(res.error || 'Failed to save to Firestore');
      }

      setPendingMutationsCount(0);
      const now = new Date().toISOString();
      setLastSyncTime(now);
      setSyncState('synced');
    } catch (err: any) {
      console.error('Manual sync failed:', err);
      setSyncState('error');
    }
  }, []);

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

  // Real-Time Notification & In-App Toast Engine
  const [activeToasts, setActiveToasts] = useState<SystemNotification[]>([]);

  const dismissToast = useCallback((id: string) => {
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dispatchNotification = useCallback((notification: SystemNotification) => {
    // 1. Add to local notifications state
    const updated = [notification, ...dbRef.current.notifications.filter(n => n.id !== notification.id)];
    persistDatabase({ ...dbRef.current, notifications: updated });

    // 2. Play sound chime
    notificationService.playChime(notification.priority);

    // 3. Show live in-app toast
    setActiveToasts(prev => [notification, ...prev.filter(t => t.id !== notification.id)].slice(0, 3));
    if (notification.priority !== 'urgent') {
      setTimeout(() => {
        setActiveToasts(prev => prev.filter(t => t.id !== notification.id));
      }, 6500);
    }

    // 4. Send browser OS push if enabled
    notificationService.fireWebPushNotification(notification);

    // 5. Sync to Firestore in real time
    firebaseSync.pushNotification(notification).catch(() => {});
  }, [persistDatabase]);

  const deleteNotification = useCallback((id: string) => {
    const updated = dbRef.current.notifications.filter(n => n.id !== id);
    persistDatabase({ ...dbRef.current, notifications: updated });
    setActiveToasts(prev => prev.filter(t => t.id !== id));
  }, [persistDatabase]);

  const clearAllNotifications = useCallback(() => {
    persistDatabase({ ...dbRef.current, notifications: [] });
    setActiveToasts([]);
  }, [persistDatabase]);

  // Real-time Firestore notification listener across schools
  useEffect(() => {
    if (!currentUser || authStatus !== 'authenticated') return;

    const unsub = firebaseSync.subscribeToRealtimeNotifications(
      currentUser,
      db.schools,
      (incomingNotif, isLiveEvent) => {
        if (!notificationService.isNotificationForUser(incomingNotif, currentUserRef.current)) {
          return;
        }

        setDb(curr => {
          if (curr.notifications.some(n => n.id === incomingNotif.id)) return curr;
          return {
            ...curr,
            notifications: [incomingNotif, ...curr.notifications],
          };
        });

        // Trigger real-time sound and toast if it's a live notification originating from another user
        if (isLiveEvent && incomingNotif.actorUid !== currentUserRef.current?.id) {
          notificationService.playChime(incomingNotif.priority);
          notificationService.fireWebPushNotification(incomingNotif);
          setActiveToasts(prev => [incomingNotif, ...prev.filter(t => t.id !== incomingNotif.id)].slice(0, 3));
          if (incomingNotif.priority !== 'urgent') {
            setTimeout(() => {
              setActiveToasts(prev => prev.filter(t => t.id !== incomingNotif.id));
            }, 6500);
          }
        }
      }
    );

    return () => {
      unsub();
    };
  }, [currentUser?.id, authStatus, db.schools]);

  // CRUD Actions
  const addSchool = useCallback((schoolData: Omit<School, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Head teachers cannot add schools
    if (currentUserRef.current?.role === 'headTeacher' || currentUserRef.current?.role === 'head_teacher') {
      console.warn('Head Teachers are not permitted to add schools.');
      return {} as School;
    }

    const newSchool: School = {
      ...schoolData,
      id: 'sch-' + Date.now(),
      ownerUid: currentUserRef.current?.id,
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

    const alert = notificationService.buildScheduleAlert({
      details: `${school.name} details or academic schedule updated`,
      school,
      actor: currentUserRef.current,
    });
    dispatchNotification(alert);
  }, [persistDatabase, dispatchNotification]);

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

    const school = dbRef.current.schools.find(s => s.id === newStudent.schoolId);
    const alert = notificationService.buildStudentAlert({
      action: 'admitted',
      studentName: newStudent.name,
      grNumber: newStudent.grNumber,
      grade: newStudent.grade,
      school,
      actor: currentUserRef.current,
    });
    dispatchNotification(alert);

    return newStudent;
  }, [persistDatabase, dispatchNotification]);

  const batchAddStudents = useCallback((studentsData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const newStudents: Student[] = studentsData.map((s, idx) => ({
      ...s,
      id: 'std-' + Date.now() + '-' + idx,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    const updated = [...newStudents, ...dbRef.current.students];
    persistDatabase({ ...dbRef.current, students: updated });

    if (newStudents.length > 0) {
      const school = dbRef.current.schools.find(s => s.id === newStudents[0].schoolId);
      const alert = notificationService.buildStudentAlert({
        action: 'admitted',
        studentName: `${newStudents.length} Students (Batch)`,
        grade: newStudents[0].grade,
        school,
        actor: currentUserRef.current,
      });
      dispatchNotification(alert);
    }
    return newStudents;
  }, [persistDatabase, dispatchNotification]);

  const updateStudent = useCallback((student: Student) => {
    const oldStudent = dbRef.current.students.find(s => s.id === student.id);
    const isStatusChange = oldStudent && oldStudent.status !== student.status;
    const updated = dbRef.current.students.map(s => s.id === student.id ? { ...student, updatedAt: new Date().toISOString() } : s);
    persistDatabase({ ...dbRef.current, students: updated });

    const school = dbRef.current.schools.find(s => s.id === student.schoolId);
    const alert = notificationService.buildStudentAlert({
      action: isStatusChange ? 'status_changed' : 'updated',
      studentName: student.name,
      grNumber: student.grNumber,
      grade: student.grade,
      newStatus: student.status,
      school,
      actor: currentUserRef.current,
    });
    dispatchNotification(alert);
  }, [persistDatabase, dispatchNotification]);

  const deleteStudent = useCallback((id: string) => {
    const st = dbRef.current.students.find(s => s.id === id);
    const updated = dbRef.current.students.filter(s => s.id !== id);
    persistDatabase({ ...dbRef.current, students: updated });

    if (st) {
      const school = dbRef.current.schools.find(s => s.id === st.schoolId);
      const alert = notificationService.buildStudentAlert({
        action: 'deleted',
        studentName: st.name,
        school,
        actor: currentUserRef.current,
      });
      dispatchNotification(alert);
    }
  }, [persistDatabase, dispatchNotification]);

  const promoteStudents = useCallback((studentIds: string[], nextGrade: string) => {
    const set = new Set(studentIds);
    const updated = dbRef.current.students.map(s => set.has(s.id) ? { ...s, class: nextGrade, updatedAt: new Date().toISOString() } : s);
    persistDatabase({ ...dbRef.current, students: updated });

    const sampleSt = dbRef.current.students.find(s => set.has(s.id));
    const school = dbRef.current.schools.find(s => s.id === sampleSt?.schoolId);
    const alert = notificationService.buildStudentAlert({
      action: 'promoted',
      studentName: `${studentIds.length} Students`,
      grade: nextGrade,
      school,
      actor: currentUserRef.current,
    });
    dispatchNotification(alert);
  }, [persistDatabase, dispatchNotification]);

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

    const school = dbRef.current.schools.find(s => s.id === newStaff.schoolId);
    const alert = notificationService.buildStaffAlert({
      action: 'added',
      staffName: newStaff.name,
      designation: newStaff.designation,
      school,
      actor: currentUserRef.current,
    });
    dispatchNotification(alert);

    return newStaff;
  }, [persistDatabase, dispatchNotification]);

  const updateStaff = useCallback((staffMember: Staff) => {
    const old = dbRef.current.staff.find(s => s.id === staffMember.id);
    const isStatusChange = old && old.status !== staffMember.status;
    const updated = dbRef.current.staff.map(s => s.id === staffMember.id ? { ...staffMember, updatedAt: new Date().toISOString() } : s);
    persistDatabase({ ...dbRef.current, staff: updated });

    const school = dbRef.current.schools.find(s => s.id === staffMember.schoolId);
    const alert = notificationService.buildStaffAlert({
      action: isStatusChange ? 'status_changed' : 'updated',
      staffName: staffMember.name,
      designation: staffMember.designation,
      newStatus: staffMember.status,
      school,
      actor: currentUserRef.current,
    });
    dispatchNotification(alert);
  }, [persistDatabase, dispatchNotification]);

  const deleteStaff = useCallback((id: string) => {
    const stf = dbRef.current.staff.find(s => s.id === id);
    const updated = dbRef.current.staff.filter(s => s.id !== id);
    persistDatabase({ ...dbRef.current, staff: updated });

    if (stf) {
      const school = dbRef.current.schools.find(s => s.id === stf.schoolId);
      const alert = notificationService.buildStaffAlert({
        action: 'deleted',
        staffName: stf.name,
        school,
        actor: currentUserRef.current,
      });
      dispatchNotification(alert);
    }
  }, [persistDatabase, dispatchNotification]);

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

    // Trigger comprehensive push alert
    if (newRecs.length > 0) {
      const primarySchool = dbRef.current.schools.find(s => s.id === newRecs[0].schoolId);
      const totalStudents = newRecs.reduce((sum, r) => sum + (r.totalStudents || 0), 0);
      const presentStudents = newRecs.reduce((sum, r) => sum + (r.present || 0), 0);
      const absentStudents = newRecs.reduce((sum, r) => sum + (r.absent || 0), 0);
      const leaveStudents = newRecs.reduce((sum, r) => sum + (r.leave || 0), 0);
      const lateStudents = newRecs.reduce((sum, r) => sum + (r.late || 0), 0);
      const grade = newRecs.length > 1 ? 'all' : (newRecs[0].grade || 'all');

      const alert = notificationService.buildAttendanceAlert({
        school: primarySchool,
        actor: currentUserRef.current,
        total: totalStudents,
        present: presentStudents,
        absent: absentStudents,
        leave: leaveStudents,
        late: lateStudents,
        grade,
        isStaff: false,
      });
      dispatchNotification(alert);
    }
  }, [persistDatabase, dispatchNotification]);

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

    if (newRecs.length > 0) {
      const school = dbRef.current.schools.find(s => s.id === (newRecs[0].schoolId || currentUserRef.current?.schoolId));
      const total = newRecs.length;
      const present = newRecs.filter(r => r.status === 'Present').length;
      const absent = newRecs.filter(r => r.status === 'Absent').length;
      const leave = newRecs.filter(r => r.status === 'Leave').length;
      const late = newRecs.filter(r => r.status === 'Late').length;

      const alert = notificationService.buildAttendanceAlert({
        school,
        actor: currentUserRef.current,
        total,
        present,
        absent,
        leave,
        late,
        grade: 'Staff',
        isStaff: true,
      });
      dispatchNotification(alert);
    }
  }, [persistDatabase, dispatchNotification]);

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

      const school = dbRef.current.schools.find(s => s.id === schoolId);
      const alert = notificationService.buildPayrollAlert({
        month,
        school,
        actor: currentUserRef.current,
        action: 'generated',
      });
      dispatchNotification(alert);
    }
  }, [persistDatabase, dispatchNotification]);

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

    const school = dbRef.current.schools.find(s => s.id === schoolId);
    const alert = notificationService.buildPayrollAlert({
      month,
      school,
      actor: currentUserRef.current,
      action: 'paid',
    });
    dispatchNotification(alert);
  }, [persistDatabase, dispatchNotification]);

  const addSchoolVisit = useCallback((visit: Omit<SchoolVisit, 'id' | 'createdAt'>) => {
    const newVisit: SchoolVisit = {
      ...visit,
      id: 'vst-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newVisit, ...dbRef.current.visits];
    persistDatabase({ ...dbRef.current, visits: updated });

    const school = dbRef.current.schools.find(s => s.id === newVisit.schoolId);
    const alert = notificationService.buildVisitAlert({
      visitorName: newVisit.visitorName,
      visitorRole: newVisit.visitType,
      school,
      actor: currentUserRef.current,
    });
    dispatchNotification(alert);

    return newVisit;
  }, [persistDatabase, dispatchNotification]);

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

    const school = dbRef.current.schools.find(s => s.id === newIssue.schoolId);
    const alert = notificationService.buildIssueAlert({
      action: 'reported',
      issueTitle: newIssue.description.slice(0, 50),
      severity: newIssue.priority,
      school,
      actor: currentUserRef.current,
    });
    dispatchNotification(alert);

    return newIssue;
  }, [persistDatabase, dispatchNotification]);

  const updateIssue = useCallback((issue: SchoolIssue) => {
    const old = dbRef.current.issues.find(i => i.id === issue.id);
    const isResolved = old && old.status !== 'Resolved' && issue.status === 'Resolved';
    const updated = dbRef.current.issues.map(i => i.id === issue.id ? { ...issue, updatedAt: new Date().toISOString() } : i);
    persistDatabase({ ...dbRef.current, issues: updated });

    const school = dbRef.current.schools.find(s => s.id === issue.schoolId);
    const alert = notificationService.buildIssueAlert({
      action: isResolved ? 'resolved' : 'updated',
      issueTitle: issue.description.slice(0, 50),
      severity: issue.priority,
      school,
      actor: currentUserRef.current,
    });
    dispatchNotification(alert);
  }, [persistDatabase, dispatchNotification]);

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

    const school = dbRef.current.schools.find(s => s.id === newTask.schoolId);
    const alert = notificationService.buildTaskAlert({
      action: 'created',
      taskTitle: newTask.title,
      priority: newTask.priority,
      school,
      actor: currentUserRef.current,
    });
    dispatchNotification(alert);

    return newTask;
  }, [persistDatabase, dispatchNotification]);

  const updateTask = useCallback((task: SchoolTask) => {
    const old = dbRef.current.tasks.find(t => t.id === task.id);
    const isCompleted = old && old.status !== 'Completed' && task.status === 'Completed';
    const updated = dbRef.current.tasks.map(t => t.id === task.id ? task : t);
    persistDatabase({ ...dbRef.current, tasks: updated });

    const school = dbRef.current.schools.find(s => s.id === task.schoolId);
    const alert = notificationService.buildTaskAlert({
      action: isCompleted ? 'completed' : 'updated',
      taskTitle: task.title,
      priority: task.priority,
      school,
      actor: currentUserRef.current,
    });
    dispatchNotification(alert);
  }, [persistDatabase, dispatchNotification]);

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
    authStatus,
    pendingFirebaseUser,
    pendingInvite,
    authError,
    loginWithGoogleAuth,
    logout,
    retryAuth,
    updateUserProfile,
    completeOperatorSetup,
    completeHeadTeacherSetup,
    inviteHeadTeacher,
    removeHeadTeacher,
    getSchoolInvites,

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
    deleteNotification,
    clearAllNotifications,
    dispatchNotification,
    activeToasts,
    dismissToast,
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
