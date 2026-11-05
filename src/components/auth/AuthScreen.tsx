import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  School as SchoolIcon,
  Shield,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Lock
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { loginWithGoogleAuth, authError } = useApp();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setLocalError(null);
    try {
      const result = await loginWithGoogleAuth();
      if (!result.success && result.message) {
        setLocalError(result.message);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Google sign-in could not be completed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top micro brand indicator */}
      <div className="w-full max-w-md pt-2 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Sindh Education Foundation
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          SEF Partner Portal
        </div>
      </div>

      {/* Main Centered Login Box */}
      <div className="w-full max-w-md my-auto py-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

          {/* App Logo & Title */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-950/40 border border-emerald-400/30 mb-3.5">
              <SchoolIcon className="w-8 h-8 text-white" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              SEF School Operator
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Multi-Campus Management, Student Register, Daily Attendance & Head Teacher Portal
            </p>
          </div>

          {/* Single Prominent Google Sign-In Button */}
          <div className="mt-8 space-y-4">
            <button
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm sm:text-base shadow-lg border border-slate-200 flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
              aria-label="Continue with Google"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
                  <span className="text-slate-800 font-semibold text-sm">Signing in with Google...</span>
                </>
              ) : (
                <>
                  {/* Official Google G Logo */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="tracking-wide">Continue with Google</span>
                </>
              )}
            </button>

            {/* Inline Error Message Area */}
            {displayError && (
              <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">
                  <span className="font-semibold text-rose-200">Sign-in Notice: </span>
                  {displayError}
                </div>
              </div>
            )}
          </div>

          {/* Security & Multi-Device Sync Notice */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Real-Time Cloud Sync Across All Mobiles & Computers</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Data is securely linked to your account via Firebase Firestore.
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="w-full max-w-md pb-2 text-center text-[11px] text-slate-400">
        <p className="font-medium text-slate-300">
          Design and Developed by <span className="text-emerald-400 font-semibold">Munif Ahmed</span>
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          Contact for Technical Support:{' '}
          <a
            href="mailto:rjmunif@gmail.com"
            className="text-emerald-400 underline font-mono hover:text-emerald-300"
          >
            rjmunif@gmail.com
          </a>
        </p>
      </footer>
    </div>
  );
};
