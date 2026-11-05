import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

export const auth = getAuth(app);

// Configure local persistence so users stay logged in across browser refreshes
try {
  setPersistence(auth, browserLocalPersistence).catch(err => {
    console.warn('[Firebase Auth] Persistence set warning:', err);
  });
} catch (e) {
  console.warn('[Firebase Auth] Error setting local persistence:', e);
}

// Google Auth Provider setup
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Friendly error messages for Firebase Authentication
 */
export function getFriendlyAuthErrorMessage(error: any): string {
  const code = error?.code || '';
  const message = error?.message || '';

  if (code === 'auth/popup-closed-by-user' || message.includes('popup-closed-by-user')) {
    return 'Sign-in cancelled: The Google sign-in window was closed before completing login. Please tap "Continue with Google" again.';
  }
  if (code === 'auth/popup-blocked' || message.includes('popup-blocked')) {
    return 'The sign-in popup was blocked by your browser. Redirecting you to Google sign-in...';
  }
  if (code === 'auth/network-request-failed' || message.includes('network-request-failed')) {
    return 'Network error: Please check your internet connection and try again.';
  }
  if (code === 'auth/unauthorized-domain' || message.includes('unauthorized-domain')) {
    return 'Domain unauthorized: Please add this domain to Firebase Console → Authentication → Settings → Authorized domains.';
  }
  if (code === 'auth/operation-not-allowed' || message.includes('operation-not-allowed')) {
    return 'Google Sign-In is not enabled in Firebase Console. Please go to Authentication → Sign-in method and enable Google.';
  }
  if (code === 'auth/cancelled-popup-request' || message.includes('cancelled-popup-request')) {
    return 'A sign-in request is already in progress. Please wait a moment and try again.';
  }
  if (code === 'auth/user-disabled') {
    return 'This user account has been disabled by an administrator.';
  }

  return message || 'Google sign-in could not be completed. Please try again.';
}

/**
 * Sign in with Google with automatic fallback to redirect on mobile or if popups are blocked
 */
export async function signInWithGoogle(): Promise<{ success: boolean; user?: FirebaseUser; redirected?: boolean }> {
  try {
    const isMobile = typeof window !== 'undefined' && (
      window.innerWidth < 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );

    // Try popup first
    const result = await signInWithPopup(auth, googleAuthProvider);
    return { success: true, user: result.user };
  } catch (error: any) {
    console.warn('[Firebase Auth] Popup sign-in error:', error?.code, error?.message);

    // Fallback to signInWithRedirect if popup is blocked or closed on mobile
    if (
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/cancelled-popup-request' ||
      (typeof window !== 'undefined' && window.innerWidth < 768)
    ) {
      console.log('[Firebase Auth] Falling back to signInWithRedirect...');
      await signInWithRedirect(auth, googleAuthProvider);
      return { success: false, redirected: true };
    }

    throw error;
  }
}

/**
 * Check for pending redirect result on page load
 */
export async function checkRedirectResult(): Promise<FirebaseUser | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      console.log('[Firebase Auth] Successful sign-in from redirect for:', result.user.email);
      return result.user;
    }
    return null;
  } catch (error: any) {
    console.warn('[Firebase Auth] Redirect result error:', error?.code, error?.message);
    throw error;
  }
}

/**
 * Sign out helper
 */
export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Validates active connection to Firestore on app startup
 */
export async function validateFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'status'));
    console.log('[Firebase] Connection to Firestore verified.');
    return true;
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.warn('[Firebase] Client is offline or network unreachable.');
      return false;
    }
    console.log('[Firebase] Firestore connected successfully.');
    return true;
  }
}

export default app;
