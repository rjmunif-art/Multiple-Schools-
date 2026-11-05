import { db, validateFirestoreConnection } from '../firebase/config';
import { doc, getDoc, setDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { AppDatabase } from './storage';
import { UserAccount } from '../types';

export interface FirebaseUserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: 'operator' | 'head_teacher' | 'supervisor';
  organizationName?: string;
  phone?: string;
  schoolId?: string;
  createdAt: string;
  lastLoginAt: string;
}

class FirebaseSyncService {
  private isConnected: boolean = false;
  private activeUnsubscribe: Unsubscribe | null = null;

  public async init(): Promise<boolean> {
    try {
      this.isConnected = await validateFirestoreConnection();
      return this.isConnected;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Initializes or updates the user profile document in Firestore: users/{uid}
   */
  public async ensureUserDocument(firebaseUser: FirebaseUser): Promise<FirebaseUserProfile> {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    try {
      const snap = await getDoc(userDocRef);
      const now = new Date().toISOString();

      if (!snap.exists()) {
        const newProfile: FirebaseUserProfile = {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'School Operator',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          role: 'operator',
          organizationName: 'Sindh Rural Education Support Organization (SRESO)',
          createdAt: now,
          lastLoginAt: now,
        };
        await setDoc(userDocRef, newProfile, { merge: true });
        console.log('[Firestore] Created new user document:', firebaseUser.uid);
        return newProfile;
      } else {
        const existing = snap.data() as FirebaseUserProfile;
        // Keep profile photo and display name updated if available from Google
        const updated: Partial<FirebaseUserProfile> = {
          lastLoginAt: now,
        };
        if (firebaseUser.photoURL && !existing.photoURL) {
          updated.photoURL = firebaseUser.photoURL;
        }
        if (firebaseUser.displayName && (!existing.displayName || existing.displayName === 'School Operator')) {
          updated.displayName = firebaseUser.displayName;
        }
        await setDoc(userDocRef, updated, { merge: true });
        return { ...existing, ...updated };
      }
    } catch (err: any) {
      console.warn('[Firestore] Error ensuring user document:', err.message);
      // Fallback in-memory profile if network is down
      return {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'School Operator',
        email: firebaseUser.email || '',
        photoURL: firebaseUser.photoURL || '',
        role: 'operator',
        organizationName: 'Sindh Rural Education Support Organization (SRESO)',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Loads user's data from Firestore under users/{uid}/data/database.
   * If not found, migrates initial/local data to Firestore.
   */
  public async loadOrMigrateUserData(uid: string, fallbackDb: AppDatabase): Promise<AppDatabase> {
    const dataRef = doc(db, 'users', uid, 'data', 'database');
    try {
      const snap = await getDoc(dataRef);
      if (snap.exists()) {
        console.log('[Firestore] Successfully restored school database from users/' + uid + '/data/database');
        return snap.data() as AppDatabase;
      } else {
        // First login: Migrate current/localStorage data to Firestore
        console.log('[Firestore] First login detected. Migrating initial dataset to Firestore under users/' + uid + '/data/database');
        await setDoc(dataRef, fallbackDb);
        return fallbackDb;
      }
    } catch (err: any) {
      console.warn('[Firestore] Failed to read user database, falling back to local cache:', err.message);
      return fallbackDb;
    }
  }

  /**
   * Saves updated user database to Firestore under users/{uid}/data/database
   */
  public async saveUserData(uid: string, database: AppDatabase): Promise<{ success: boolean; error?: string }> {
    if (!uid) return { success: false, error: 'No UID provided' };
    const dataRef = doc(db, 'users', uid, 'data', 'database');
    try {
      await setDoc(dataRef, database, { merge: true });
      return { success: true };
    } catch (err: any) {
      console.warn('[Firestore] Failed to save user data:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Subscribes to real-time updates for users/{uid}/data/database
   */
  public subscribeToUserData(uid: string, onUpdate: (data: AppDatabase) => void): Unsubscribe {
    if (this.activeUnsubscribe) {
      this.activeUnsubscribe();
      this.activeUnsubscribe = null;
    }

    const dataRef = doc(db, 'users', uid, 'data', 'database');
    const unsub = onSnapshot(
      dataRef,
      snapshot => {
        if (snapshot.exists()) {
          const remoteData = snapshot.data() as AppDatabase;
          onUpdate(remoteData);
        }
      },
      error => {
        console.warn('[Firestore] Snapshot listener warning:', error.message);
      }
    );

    this.activeUnsubscribe = unsub;
    return unsub;
  }

  /**
   * Unsubscribe active listeners on sign out
   */
  public cleanup(): void {
    if (this.activeUnsubscribe) {
      this.activeUnsubscribe();
      this.activeUnsubscribe = null;
    }
  }

  /**
   * Updates user profile in Firestore under users/{uid}
   */
  public async updateUserProfile(uid: string, updates: Partial<FirebaseUserProfile>): Promise<boolean> {
    try {
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, updates, { merge: true });
      return true;
    } catch (e: any) {
      console.warn('[Firestore] Profile update error:', e.message);
      return false;
    }
  }
}

export const firebaseSync = new FirebaseSyncService();
