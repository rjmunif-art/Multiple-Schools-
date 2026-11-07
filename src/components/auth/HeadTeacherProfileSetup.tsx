import React, { useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { SchoolInvite } from '../../types';
import { resizeAndCompressImage } from '../../services/imageUtils';
import {
  School as SchoolIcon,
  User,
  Phone,
  Mail,
  Camera,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Building,
  LogOut,
} from 'lucide-react';

interface HeadTeacherProfileSetupProps {
  firebaseUser: FirebaseUser;
  invite: SchoolInvite;
  onComplete: (profileData: {
    name: string;
    phone: string;
    photoData?: string;
  }) => Promise<void>;
  onSignOut: () => void;
}

export const HeadTeacherProfileSetup: React.FC<HeadTeacherProfileSetupProps> = ({
  firebaseUser,
  invite,
  onComplete,
  onSignOut,
}) => {
  const [name, setName] = useState(invite.name || firebaseUser.displayName || '');
  const [phone, setPhone] = useState(invite.phone || '');
  const [photoPreview, setPhotoPreview] = useState<string | null>(firebaseUser.photoURL || null);
  const [photoData, setPhotoData] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await resizeAndCompressImage(file, 256, 0.7);
      setPhotoData(compressed);
      setPhotoPreview(compressed);
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Image compression error:', err);
      setErrorMessage('Could not process selected image. Please choose another image.');
    }
  };

  const validatePhone = (val: string): boolean => {
    const cleaned = val.replace(/[\s-]/g, '');
    return /^(\+92|92|0)?3[0-9]{9}$/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!trimmedPhone) {
      setErrorMessage('Please enter your active mobile phone number.');
      return;
    }
    if (!validatePhone(trimmedPhone)) {
      setErrorMessage('Please enter a valid Pakistani mobile number (e.g. 03001234567 or +923001234567).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete({
        name: trimmedName,
        phone: trimmedPhone,
        photoData: photoData || (firebaseUser.photoURL || undefined),
      });
    } catch (err: any) {
      console.error('Head Teacher profile setup error:', err);
      setErrorMessage(err.message || 'Failed to complete profile. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center p-4 sm:p-6 select-none relative">
      {/* Background ambient lighting */}
      <div className="absolute top-10 -left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 -right-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="w-full max-w-lg flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
            <SchoolIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-wide text-white">Head Teacher Portal</span>
        </div>
        <button
          onClick={onSignOut}
          className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1.5 transition py-1 px-2.5 rounded-lg border border-slate-800 hover:border-rose-800/50"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Switch Account</span>
        </button>
      </div>

      {/* Main Form Card */}
      <div className="w-full max-w-lg my-auto py-6">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

          {/* Assigned School Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 mb-6 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                School Access Assigned
              </p>
              <h3 className="text-sm font-bold text-white mt-0.5">
                {invite.schoolName || 'Assigned School'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Operator has invited you to manage this campus. Complete your quick details below to continue.
              </p>
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Head Teacher Setup
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Confirm your contact details to access the daily attendance roll call, student registers, and school records.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Circular Profile Picture Upload */}
            <div className="flex flex-col items-center justify-center pb-2">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500/60 bg-slate-800 shadow-xl flex items-center justify-center">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-slate-500" />
                  )}
                </div>
                <label
                  htmlFor="ht-photo-input"
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg cursor-pointer transition active:scale-90"
                  title="Upload profile picture"
                >
                  <Camera className="w-4 h-4" />
                  <input
                    id="ht-photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                {photoPreview ? 'Profile photo ready' : 'Add photo (optional)'}
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Full Name <span className="text-rose-400">*</span></span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Master Ghulam Rasool"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Email (Read-Only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>Google Email (Matched to Invite, Read-Only)</span>
              </label>
              <input
                type="email"
                value={firebaseUser.email || ''}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-400 text-sm cursor-not-allowed"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mobile Phone Number <span className="text-rose-400">*</span></span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 03001234567 or +923001234567"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activating Head Teacher Access...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Open School Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Debug Line */}
            <div className="pt-2 text-center">
              <span className="text-[11px] font-mono text-slate-400">
                Signed in as: {firebaseUser.email || 'unknown'} | Invite found: yes
              </span>
            </div>
          </form>
        </div>
      </div>

      <footer className="w-full max-w-lg pb-2 text-center text-[11px] text-slate-500">
        Sindh Education Foundation Multi-School Management System
      </footer>
    </div>
  );
};
