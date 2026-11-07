import { db, validateFirestoreConnection } from '../firebase/config';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { AppDatabase } from './storage';
import { UserAccount, School, SchoolInvite } from '../types';
import { DEFAULT_SETTINGS } from '../data/sampleData';

function sanitizeForFirestore<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

export interface UserCheckResult {
  exists: boolean;
  profileCompleted: boolean;
  user?: UserAccount;
  role?: 'operator' | 'headTeacher';
  error?: string;
}

export interface InviteCheckResult {
  found: boolean;
  invite?: SchoolInvite;
  error?: string;
}

class FirebaseSyncService {
  private activeUnsubscribes: Unsubscribe[] = [];

  public async init(): Promise<boolean> {
    try {
      return await validateFirestoreConnection();
    } catch {
      return false;
    }
  }

  /**
   * Checks user profile in Firestore under users/{uid}.
   * Does NOT create any document automatically (never create operator silently).
   */
  public async checkUserProfile(firebaseUser: FirebaseUser): Promise<UserCheckResult> {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const snap = await getDoc(userDocRef);

      if (snap.exists()) {
        const data = snap.data();
        const profileCompleted = !!data.profileCompleted;
        const role = data.role === 'headTeacher' || data.role === 'head_teacher' ? 'headTeacher' : 'operator';

        const user: UserAccount = {
          id: firebaseUser.uid,
          username: data.email?.split('@')[0] || firebaseUser.email?.split('@')[0] || 'user',
          name: data.name || data.displayName || firebaseUser.displayName || 'User',
          email: data.email || firebaseUser.email || '',
          phone: data.phone || '',
          role,
          instituteName: data.instituteName || data.organizationName || '',
          organizationName: data.organizationName || data.instituteName || '',
          degree: data.degree || '',
          photoData: data.photoData || data.photoURL || firebaseUser.photoURL || undefined,
          photoUrl: data.photoData || data.photoURL || firebaseUser.photoURL || undefined,
          profileCompleted,
          schoolId: data.schoolId,
          operatorUid: data.operatorUid,
          createdAt: data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt,
        };

        return {
          exists: true,
          profileCompleted,
          user,
          role,
        };
      }

      return {
        exists: false,
        profileCompleted: false,
      };
    } catch (err: any) {
      console.error('[Firestore] Error checking user profile:', err);
      return {
        exists: false,
        profileCompleted: false,
        error: err.message || String(err),
      };
    }
  }

  /**
   * Checks if an invite exists for the given email in invites/{lowercase email}.
   * Returns found: true and invite if exists, found: false if not found, or error if read fails.
   */
  public async checkInvite(email: string): Promise<InviteCheckResult> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      return { found: false };
    }
    try {
      const inviteRef = doc(db, 'invites', cleanEmail);
      const snap = await getDoc(inviteRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          found: true,
          invite: { ...(data as SchoolInvite), email: cleanEmail },
        };
      }
      return { found: false };
    } catch (err: any) {
      console.error('[Firestore] Error checking invite:', err);
      return {
        found: false,
        error: err.message || String(err),
      };
    }
  }

  /**
   * Completes Operator profile setup: saves users/{uid} with profileCompleted: true
   */
  public async completeOperatorProfile(
    firebaseUser: FirebaseUser,
    details: {
      name: string;
      instituteName: string;
      degree: string;
      phone: string;
      photoData?: string;
    }
  ): Promise<UserAccount> {
    const now = new Date().toISOString();
    const userDocRef = doc(db, 'users', firebaseUser.uid);

    const operatorUser: UserAccount = {
      id: firebaseUser.uid,
      username: firebaseUser.email?.split('@')[0] || 'operator',
      name: details.name,
      email: firebaseUser.email || '',
      phone: details.phone,
      role: 'operator',
      instituteName: details.instituteName,
      organizationName: details.instituteName,
      degree: details.degree,
      photoData: details.photoData || firebaseUser.photoURL || '',
      photoUrl: details.photoData || firebaseUser.photoURL || '',
      profileCompleted: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    const docPayload = {
      uid: firebaseUser.uid,
      role: 'operator',
      name: details.name,
      displayName: details.name,
      instituteName: details.instituteName,
      organizationName: details.instituteName,
      degree: details.degree,
      email: firebaseUser.email || '',
      phone: details.phone,
      photoData: details.photoData || firebaseUser.photoURL || '',
      photoURL: details.photoData || firebaseUser.photoURL || '',
      profileCompleted: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    await setDoc(userDocRef, sanitizeForFirestore(docPayload), { merge: true });
    return operatorUser;
  }

  /**
   * Completes Head Teacher profile setup:
   * 1. Saves users/{uid} with role: 'headTeacher', schoolId: invite.schoolId, profileCompleted: true
   * 2. Updates schools/{schoolId} with headTeacherUid, headTeacherEmail, headTeacherName
   * 3. Deletes the invite from invites/{email}
   */
  public async completeHeadTeacherProfile(
    firebaseUser: FirebaseUser,
    invite: SchoolInvite,
    details: {
      name: string;
      phone: string;
      photoData?: string;
    }
  ): Promise<UserAccount> {
    const now = new Date().toISOString();
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const lowercaseEmail = (firebaseUser.email || invite.email).toLowerCase();

    const htUser: UserAccount = {
      id: firebaseUser.uid,
      username: lowercaseEmail.split('@')[0] || 'headteacher',
      name: details.name,
      email: lowercaseEmail,
      phone: details.phone,
      role: 'headTeacher',
      schoolId: invite.schoolId,
      operatorUid: invite.operatorUid,
      photoData: details.photoData || firebaseUser.photoURL || '',
      photoUrl: details.photoData || firebaseUser.photoURL || '',
      profileCompleted: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    const docPayload = {
      uid: firebaseUser.uid,
      role: 'headTeacher',
      name: details.name,
      displayName: details.name,
      email: lowercaseEmail,
      phone: details.phone,
      schoolId: invite.schoolId,
      operatorUid: invite.operatorUid,
      photoData: details.photoData || firebaseUser.photoURL || '',
      photoURL: details.photoData || firebaseUser.photoURL || '',
      profileCompleted: true,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };

    // 1. Save user profile
    await setDoc(userDocRef, sanitizeForFirestore(docPayload), { merge: true });

    // 2. Update school document
    try {
      const schoolRef = doc(db, 'schools', invite.schoolId);
      await setDoc(
        schoolRef,
        {
          headTeacherUid: firebaseUser.uid,
          headTeacherEmail: lowercaseEmail,
          headTeacherName: details.name,
          contactNumber: details.phone,
          updatedAt: now,
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('[Firestore] Error binding head teacher to school document:', e);
    }

    // 3. Delete invite doc
    try {
      const inviteRef = doc(db, 'invites', lowercaseEmail);
      await deleteDoc(inviteRef);
    } catch (e) {
      console.warn('[Firestore] Error removing accepted invite doc:', e);
    }

    return htUser;
  }

  /**
   * Invites a Head Teacher by Google email.
   * Enforces: one email can only be invited to ONE school across the system.
   */
  public async inviteHeadTeacher(
    operatorUid: string,
    operatorName: string,
    schoolId: string,
    schoolName: string,
    inviteEmail: string,
    headTeacherName?: string,
    headTeacherPhone?: string
  ): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid Google email address.' };
    }

    try {
      // 1. Check if email already has an active invite
      const inviteRef = doc(db, 'invites', cleanEmail);
      const existingSnap = await getDoc(inviteRef).catch((e) => {
        console.warn('[Firestore] Checking existing invite error (proceeding):', e);
        return null;
      });

      if (existingSnap && existingSnap.exists()) {
        const existingInvite = existingSnap.data() as SchoolInvite;
        if (existingInvite.schoolId !== schoolId) {
          return {
            success: false,
            error: `This email address is already invited to another school (${existingInvite.schoolName || 'Another School'}). One email can only be assigned to one school.`,
          };
        }
      }

      // Check if another school already has this head teacher assigned
      try {
        const otherSchoolsQuery = query(collection(db, 'schools'), where('headTeacherEmail', '==', cleanEmail));
        const otherSchoolsSnap = await getDocs(otherSchoolsQuery);
        for (const sDoc of otherSchoolsSnap.docs) {
          if (sDoc.id !== schoolId) {
            return {
              success: false,
              error: 'This Google account is already registered as Head Teacher for another school.',
            };
          }
        }
      } catch (checkErr) {
        console.warn('[Firestore] Checking other schools warning (proceeding):', checkErr);
      }

      // 2. Save invite strictly to invites/{email}. Do NOT create a users document for the HT!
      const inviteData: SchoolInvite = {
        email: cleanEmail,
        name: headTeacherName || '',
        phone: headTeacherPhone || '',
        schoolId,
        schoolName,
        operatorUid,
        operatorName,
        createdAt: new Date().toISOString(),
      };

      await setDoc(inviteRef, sanitizeForFirestore(inviteData));

      // 3. Link to school document with operatorUid to ensure ownership permissions
      const schoolRef = doc(db, 'schools', schoolId);
      await setDoc(
        schoolRef,
        {
          ownerUid: operatorUid,
          headTeacherEmail: cleanEmail,
          headTeacherName: headTeacherName || '',
          contactNumber: headTeacherPhone || '',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return { success: true };
    } catch (err: any) {
      console.error('[Firestore] Error inviting head teacher:', err);
      return { success: false, error: err.message || 'Failed to create invite.' };
    }
  }

  /**
   * Removes Head Teacher access from a school:
   * 1. Deletes invite from invites/{email}
   * 2. Unsets headTeacherUid and headTeacherEmail on school
   */
  public async removeHeadTeacherAccess(schoolId: string, email?: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (email) {
        const cleanEmail = email.trim().toLowerCase();
        const inviteRef = doc(db, 'invites', cleanEmail);
        await deleteDoc(inviteRef).catch(() => {});
      }

      const schoolRef = doc(db, 'schools', schoolId);
      await setDoc(
        schoolRef,
        {
          headTeacherUid: null,
          headTeacherEmail: null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return { success: true };
    } catch (err: any) {
      console.error('[Firestore] Error removing head teacher:', err);
      return { success: false, error: err.message || 'Failed to remove head teacher.' };
    }
  }

  /**
   * Fetches active invites for a specific school
   */
  public async getSchoolInvites(schoolId: string, operatorUid?: string): Promise<SchoolInvite[]> {
    try {
      const q = query(collection(db, 'invites'), where('schoolId', '==', schoolId));
      const snap = await getDocs(q);
      const invites = snap.docs.map(d => ({ ...d.data(), email: d.id } as SchoolInvite));

      // Also check if the school document itself has headTeacherEmail
      try {
        const schoolRef = doc(db, 'schools', schoolId);
        const schoolSnap = await getDoc(schoolRef);
        if (schoolSnap.exists()) {
          const sch = schoolSnap.data() as School;
          const htEmail = (sch.headTeacherEmail || '').trim().toLowerCase();
          if (htEmail && !invites.some(i => i.email.toLowerCase() === htEmail)) {
            const invRef = doc(db, 'invites', htEmail);
            const invSnap = await getDoc(invRef);
            if (invSnap.exists()) {
              invites.push({ ...(invSnap.data() as SchoolInvite), email: htEmail });
            } else {
              invites.push({
                email: htEmail,
                name: sch.headTeacherName || '',
                phone: sch.contactNumber || '',
                schoolId: sch.id,
                schoolName: sch.name,
                operatorUid: sch.ownerUid || operatorUid || '',
                createdAt: sch.updatedAt || new Date().toISOString(),
              });
            }
          }
        }
      } catch (innerErr) {
        console.warn('[Firestore] Fallback school invite check:', innerErr);
      }

      return invites;
    } catch (err: any) {
      console.warn('[Firestore] Error fetching school invites:', err);
      return [];
    }
  }

  /**
   * Migrates existing legacy head teacher data:
   * 1. Scans existing users documents for HTs (role headTeacher or head_teacher, with email & schoolId,
   *    whose document id is not a real auth uid).
   *    Creates matching invites/{lowercase email} document from its fields, then deletes that fake users document.
   * 2. Checks all schools documents for head teacher email field and creates invites from them.
   */
  public async migrateExistingHeadTeacherData(operatorUid?: string): Promise<{ migratedUsers: number; migratedSchools: number }> {
    let migratedUsers = 0;
    let migratedSchools = 0;

    try {
      // 1. Check users collection
      try {
        const usersSnap = await getDocs(collection(db, 'users')).catch(() => null);
        if (usersSnap) {
          for (const uDoc of usersSnap.docs) {
          const uData = uDoc.data();
          const isHT = uData.role === 'headTeacher' || uData.role === 'head_teacher';
          const email = (uData.email || '').trim().toLowerCase();
          const schoolId = uData.schoolId;

          // Fake UIDs in this app start with 'usr-' or 'ht-' or have length != 28
          const isFakeDocId = uDoc.id.startsWith('usr-') || uDoc.id.startsWith('ht-') || uDoc.id.includes('_') || uDoc.id.length < 20;

          if (isHT && email && schoolId) {
            const inviteRef = doc(db, 'invites', email);
            const inviteSnap = await getDoc(inviteRef).catch(() => null);

            if (!inviteSnap || !inviteSnap.exists()) {
              const invitePayload: SchoolInvite = {
                email,
                name: uData.name || uData.displayName || '',
                phone: uData.phone || '',
                schoolId,
                schoolName: uData.schoolName || '',
                operatorUid: uData.operatorUid || operatorUid || '',
                createdAt: uData.createdAt || new Date().toISOString(),
              };
              await setDoc(inviteRef, sanitizeForFirestore(invitePayload));
              migratedUsers++;
              console.log(`[Migration] Created invite for HT user ${email} from doc ${uDoc.id}`);
            }

            // Delete fake users document if it's not a real auth UID
            if (isFakeDocId) {
              await deleteDoc(doc(db, 'users', uDoc.id)).catch(err => {
                console.warn('[Migration] Could not delete fake user doc:', uDoc.id, err);
              });
              console.log(`[Migration] Deleted fake user doc ${uDoc.id}`);
            }
            }
          }
        }
      } catch (err: any) {
        console.warn('[Migration] Error querying users for migration:', err);
      }

      // 2. Check schools collection for head teacher emails
      try {
        let schoolsQuery;
        if (operatorUid) {
          schoolsQuery = query(collection(db, 'schools'), where('ownerUid', '==', operatorUid));
        } else {
          schoolsQuery = collection(db, 'schools');
        }

        const schoolsSnap = await getDocs(schoolsQuery);
        for (const sDoc of schoolsSnap.docs) {
          const sData = sDoc.data() as School;
          const htEmail = (sData.headTeacherEmail || '').trim().toLowerCase();

          if (htEmail && htEmail.includes('@')) {
            const inviteRef = doc(db, 'invites', htEmail);
            const inviteSnap = await getDoc(inviteRef).catch(() => null);

            if (!inviteSnap || !inviteSnap.exists()) {
              const invitePayload: SchoolInvite = {
                email: htEmail,
                name: sData.headTeacherName || '',
                phone: sData.contactNumber || '',
                schoolId: sDoc.id,
                schoolName: sData.name || '',
                operatorUid: sData.ownerUid || operatorUid || '',
                createdAt: new Date().toISOString(),
              };
              await setDoc(inviteRef, sanitizeForFirestore(invitePayload));
              migratedSchools++;
              console.log(`[Migration] Created invite for HT email ${htEmail} from school ${sDoc.id}`);
            }
          }
        }
      } catch (err: any) {
        console.warn('[Migration] Error checking schools for migration:', err);
      }
    } catch (globalErr: any) {
      console.warn('[Migration] Global migration error:', globalErr);
    }

    return { migratedUsers, migratedSchools };
  }

  /**
   * Loads full database for an Operator:
   * 1. Reads schools from schools/{schoolId} where ownerUid == operator.uid
   * 2. Reads subcollections for each school under schools/{schoolId}/data/main
   * 3. Checks for one-time migration from users/{uid}/data/database if no schools exist
   */
  public async loadOperatorData(operatorUser: UserAccount): Promise<AppDatabase> {
    const uid = operatorUser.id;
    try {
      // Run HT migration check for operator's records
      await this.migrateExistingHeadTeacherData(uid);

      // 1. Fetch schools owned by operator
      const schoolsQuery = query(collection(db, 'schools'), where('ownerUid', '==', uid));
      const schoolsSnap = await getDocs(schoolsQuery);
      const schools: School[] = schoolsSnap.docs.map(d => ({ ...(d.data() as School), id: d.id }));

      // If operator already has schools in Firestore, load their aggregated school data
      if (schools.length > 0) {
        // Load combined school records
        const allStudents: any[] = [];
        const allStaff: any[] = [];
        const allStudentAtt: any[] = [];
        const allStaffAtt: any[] = [];
        const allPayroll: any[] = [];
        const allExams: any[] = [];
        const allExamMarks: any[] = [];
        const allVisits: any[] = [];
        const allIssues: any[] = [];
        const allTasks: any[] = [];
        const allDocs: any[] = [];

        for (const school of schools) {
          try {
            const schoolDataRef = doc(db, 'schools', school.id, 'data', 'main');
            const dataSnap = await getDoc(schoolDataRef);
            if (dataSnap.exists()) {
              const d = dataSnap.data();
              if (d.students) allStudents.push(...d.students);
              if (d.staff) allStaff.push(...d.staff);
              if (d.studentAttendance) allStudentAtt.push(...d.studentAttendance);
              if (d.staffAttendance) allStaffAtt.push(...d.staffAttendance);
              if (d.payroll) allPayroll.push(...d.payroll);
              if (d.examinations) allExams.push(...d.examinations);
              if (d.examMarks) allExamMarks.push(...d.examMarks);
              if (d.visits) allVisits.push(...d.visits);
              if (d.issues) allIssues.push(...d.issues);
              if (d.tasks) allTasks.push(...d.tasks);
              if (d.documents) allDocs.push(...d.documents);
            }
          } catch (e) {
            console.warn(`[Firestore] Could not load data for school ${school.id}:`, e);
          }
        }

        return {
          users: [operatorUser],
          schools,
          students: allStudents,
          staff: allStaff,
          studentAttendance: allStudentAtt,
          staffAttendance: allStaffAtt,
          payroll: allPayroll,
          examinations: allExams,
          examMarks: allExamMarks,
          visits: allVisits,
          issues: allIssues,
          tasks: allTasks,
          documents: allDocs,
          notifications: [],
          settings: DEFAULT_SETTINGS,
        };
      }

      // 2. Check for legacy data in users/{uid}/data/database for migration
      const legacyRef = doc(db, 'users', uid, 'data', 'database');
      const legacySnap = await getDoc(legacyRef);

      if (legacySnap.exists()) {
        const legacy = legacySnap.data() as AppDatabase;
        if (legacy.schools && legacy.schools.length > 0) {
          console.log('[Firestore] Migrating legacy user schools to schools/{schoolId}...');
          // Migrate schools to root collection
          for (const sch of legacy.schools) {
            const schoolRef = doc(db, 'schools', sch.id);
            const schoolDoc: School = {
              ...sch,
              ownerUid: uid,
            };
            await setDoc(schoolRef, sanitizeForFirestore(schoolDoc), { merge: true });

            // Save school sub-data to schools/{schoolId}/data/main
            const schoolDataRef = doc(db, 'schools', sch.id, 'data', 'main');
            const schoolDataPayload = {
              students: (legacy.students || []).filter(s => s.schoolId === sch.id),
              staff: (legacy.staff || []).filter(s => s.schoolId === sch.id),
              studentAttendance: (legacy.studentAttendance || []).filter(a => a.schoolId === sch.id),
              staffAttendance: (legacy.staffAttendance || []).filter(a => a.schoolId === sch.id),
              payroll: (legacy.payroll || []).filter(p => p.schoolId === sch.id),
              examinations: legacy.examinations || [],
              examMarks: (legacy.examMarks || []).filter(m => m.schoolId === sch.id),
              visits: (legacy.visits || []).filter(v => v.schoolId === sch.id),
              issues: (legacy.issues || []).filter(i => i.schoolId === sch.id),
              tasks: (legacy.tasks || []).filter(t => !t.schoolId || t.schoolId === sch.id),
              documents: (legacy.documents || []).filter(d => d.schoolId === sch.id),
            };
            await setDoc(schoolDataRef, sanitizeForFirestore(schoolDataPayload), { merge: true });
          }

          return {
            ...legacy,
            users: [operatorUser],
            schools: legacy.schools.map(s => ({ ...s, ownerUid: uid })),
          };
        }
      }

      // 3. Brand new account: return clean empty database
      return {
        users: [operatorUser],
        schools: [],
        staff: [],
        students: [],
        studentAttendance: [],
        staffAttendance: [],
        examinations: [],
        examMarks: [],
        payroll: [],
        visits: [],
        issues: [],
        tasks: [],
        documents: [],
        notifications: [
          {
            id: 'notif-welcome',
            title: 'Welcome to SEF School Operator Portal',
            message: 'Your account is ready. Begin by adding your schools, inviting Head Teachers, and enrolling students.',
            type: 'sync',
            date: new Date().toISOString(),
            isRead: false,
          },
        ],
        settings: DEFAULT_SETTINGS,
      };
    } catch (err: any) {
      console.warn('[Firestore] Error loading operator data:', err);
      return {
        users: [operatorUser],
        schools: [],
        staff: [],
        students: [],
        studentAttendance: [],
        staffAttendance: [],
        examinations: [],
        examMarks: [],
        payroll: [],
        visits: [],
        issues: [],
        tasks: [],
        documents: [],
        notifications: [],
        settings: DEFAULT_SETTINGS,
      };
    }
  }

  /**
   * Loads scoped data for a Head Teacher (restricted to their assigned school)
   */
  public async loadHeadTeacherData(htUser: UserAccount): Promise<AppDatabase> {
    const schoolId = htUser.schoolId;
    if (!schoolId) {
      return {
        users: [htUser],
        schools: [],
        staff: [],
        students: [],
        studentAttendance: [],
        staffAttendance: [],
        examinations: [],
        examMarks: [],
        payroll: [],
        visits: [],
        issues: [],
        tasks: [],
        documents: [],
        notifications: [],
        settings: DEFAULT_SETTINGS,
      };
    }

    try {
      // 1. Fetch school document
      const schoolRef = doc(db, 'schools', schoolId);
      const schoolSnap = await getDoc(schoolRef);
      const schoolData: School = schoolSnap.exists()
        ? ({ ...(schoolSnap.data() as School), id: schoolId })
        : {
            id: schoolId,
            code: 'SCH-' + schoolId.slice(0, 6).toUpperCase(),
            name: 'Assigned School',
            programType: 'PIMS',
            district: 'Sindh',
            taluka: 'Sindh',
            uc: '1',
            village: 'Camp',
            address: 'Sindh',
            headTeacherName: htUser.name,
            contactNumber: htUser.phone || '',
            establishedDate: '2020-01-01',
            grades: ['Kachi', 'Class I', 'Class II', 'Class III', 'Class IV', 'Class V'],
            shift: 'Morning',
            status: 'active',
            facilities: {
              drinkingWater: true,
              toilets: true,
              boundaryWall: true,
              electricity: true,
              solarPower: false,
              library: false,
              computerLab: false,
              playground: true,
              furnitureAdequate: true,
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

      // 2. Fetch school records from schools/{schoolId}/data/main
      const schoolDataRef = doc(db, 'schools', schoolId, 'data', 'main');
      const dataSnap = await getDoc(schoolDataRef);
      const d = dataSnap.exists() ? dataSnap.data() : {};

      return {
        users: [htUser],
        schools: [schoolData],
        students: d.students || [],
        staff: d.staff || [],
        studentAttendance: d.studentAttendance || [],
        staffAttendance: d.staffAttendance || [],
        payroll: d.payroll || [],
        examinations: d.examinations || [],
        examMarks: d.examMarks || [],
        visits: d.visits || [],
        issues: d.issues || [],
        tasks: d.tasks || [],
        documents: d.documents || [],
        notifications: [],
        settings: DEFAULT_SETTINGS,
      };
    } catch (err: any) {
      console.warn('[Firestore] Error loading head teacher data:', err);
      return {
        users: [htUser],
        schools: [],
        staff: [],
        students: [],
        studentAttendance: [],
        staffAttendance: [],
        examinations: [],
        examMarks: [],
        payroll: [],
        visits: [],
        issues: [],
        tasks: [],
        documents: [],
        notifications: [],
        settings: DEFAULT_SETTINGS,
      };
    }
  }

  /**
   * Saves updated school database:
   * - Persists schools to schools/{schoolId}
   * - Persists each school's subcollection to schools/{schoolId}/data/main
   * - Also syncs operator backup to users/{uid}/data/database
   */
  public async saveDatabase(currentUser: UserAccount, database: AppDatabase): Promise<{ success: boolean; error?: string }> {
    if (!currentUser?.id) return { success: false, error: 'User not logged in' };

    try {
      const isOperator = currentUser.role === 'operator';

      // 1. If operator, save schools to schools/{schoolId}
      if (isOperator) {
        for (const school of database.schools) {
          const schoolRef = doc(db, 'schools', school.id);
          const schoolPayload = {
            ...school,
            ownerUid: school.ownerUid || currentUser.id,
            updatedAt: new Date().toISOString(),
          };
          await setDoc(schoolRef, sanitizeForFirestore(schoolPayload), { merge: true });

          // Save that specific school's scoped records to schools/{schoolId}/data/main
          const schoolDataRef = doc(db, 'schools', school.id, 'data', 'main');
          const schoolDataPayload = {
            students: (database.students || []).filter(s => s.schoolId === school.id),
            staff: (database.staff || []).filter(s => s.schoolId === school.id),
            studentAttendance: (database.studentAttendance || []).filter(a => a.schoolId === school.id),
            staffAttendance: (database.staffAttendance || []).filter(a => a.schoolId === school.id),
            payroll: (database.payroll || []).filter(p => p.schoolId === school.id),
            examinations: database.examinations || [],
            examMarks: (database.examMarks || []).filter(m => m.schoolId === school.id),
            visits: (database.visits || []).filter(v => v.schoolId === school.id),
            issues: (database.issues || []).filter(i => i.schoolId === school.id),
            tasks: (database.tasks || []).filter(t => !t.schoolId || t.schoolId === school.id),
            documents: (database.documents || []).filter(d => d.schoolId === school.id),
          };
          await setDoc(schoolDataRef, sanitizeForFirestore(schoolDataPayload), { merge: true });
        }

        // Also save operator backup under users/{uid}/data/database
        const userBackupRef = doc(db, 'users', currentUser.id, 'data', 'database');
        await setDoc(userBackupRef, sanitizeForFirestore(database), { merge: true });
      } else {
        // Head Teacher: save only to their assigned school: schools/{schoolId}/data/main
        const schoolId = currentUser.schoolId;
        if (schoolId) {
          const schoolDataRef = doc(db, 'schools', schoolId, 'data', 'main');
          const schoolDataPayload = {
            students: database.students || [],
            staff: database.staff || [],
            studentAttendance: database.studentAttendance || [],
            staffAttendance: database.staffAttendance || [],
            payroll: database.payroll || [],
            examinations: database.examinations || [],
            examMarks: database.examMarks || [],
            visits: database.visits || [],
            issues: database.issues || [],
            tasks: database.tasks || [],
            documents: database.documents || [],
          };
          await setDoc(schoolDataRef, sanitizeForFirestore(schoolDataPayload), { merge: true });
        }
      }

      return { success: true };
    } catch (err: any) {
      console.error('[Firestore] Save error:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Subscribes to real-time updates for a Head Teacher's school
   */
  public subscribeToSchoolData(schoolId: string, onUpdate: (data: any) => void): Unsubscribe {
    const schoolDataRef = doc(db, 'schools', schoolId, 'data', 'main');
    const unsub = onSnapshot(
      schoolDataRef,
      snap => {
        if (snap.exists()) {
          onUpdate(snap.data());
        }
      },
      err => {
        console.warn('[Firestore] Head teacher school subscription warning:', err);
      }
    );
    this.activeUnsubscribes.push(unsub);
    return unsub;
  }

  /**
   * Subscribes to real-time updates for Operator schools
   */
  public subscribeToOperatorSchools(operatorUid: string, onUpdate: (schools: School[]) => void): Unsubscribe {
    const q = query(collection(db, 'schools'), where('ownerUid', '==', operatorUid));
    const unsub = onSnapshot(
      q,
      snap => {
        const schools = snap.docs.map(d => ({ ...(d.data() as School), id: d.id }));
        onUpdate(schools);
      },
      err => {
        console.warn('[Firestore] Operator schools subscription warning:', err);
      }
    );
    this.activeUnsubscribes.push(unsub);
    return unsub;
  }

  /**
   * Updates user profile in Firestore
   */
  public async updateUserProfile(uid: string, updates: Partial<UserAccount>): Promise<boolean> {
    try {
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, sanitizeForFirestore(updates), { merge: true });
      return true;
    } catch (e: any) {
      console.warn('[Firestore] Profile update error:', e.message);
      return false;
    }
  }

  public cleanup(): void {
    this.activeUnsubscribes.forEach(unsub => unsub());
    this.activeUnsubscribes = [];
  }
}

export const firebaseSync = new FirebaseSyncService();
