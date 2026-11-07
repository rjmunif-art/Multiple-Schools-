import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  User,
  Mail,
  Phone,
  Building,
  KeyRound,
  Image,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  ShieldCheck,
  School as SchoolIcon,
  Eye,
  EyeOff,
} from 'lucide-react';

export const EditProfileModal: React.FC = () => {
  const { currentUser, isEditProfileOpen, setIsEditProfileOpen, updateUserProfile, schools } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [pin, setPin] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [showPin, setShowPin] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync state when modal opens
  useEffect(() => {
    if (currentUser && isEditProfileOpen) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setOrganizationName(currentUser.organizationName || '');
      setPin(currentUser.pin || '');
      setPhotoUrl(currentUser.photoUrl || '');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [currentUser, isEditProfileOpen]);

  if (!isEditProfileOpen || !currentUser) return null;

  const assignedSchool = schools.find(s => s.id === currentUser.schoolId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    if (pin && pin.trim().length < 4) {
      setErrorMessage('Security PIN / Password should be at least 4 characters.');
      return;
    }

    setIsSaving(true);
    try {
      const success = await updateUserProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        organizationName: organizationName.trim() || undefined,
        pin: pin.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
      });

      if (success) {
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => {
          setIsEditProfileOpen(false);
        }, 1200);
      } else {
        setErrorMessage('Failed to update profile. Please check your inputs.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="edit-profile-title" className="text-lg font-bold text-white leading-tight">
                Edit Account Profile
              </h2>
              <p className="text-xs text-emerald-100">
                {currentUser.role === 'operator' ? 'SEF School Operator' : 'Head Teacher'} Account
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEditProfileOpen(false)}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Close (or press Phone Back Button)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status Banners */}
          {errorMessage && (
            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Account Identifiers Header */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">Username / Login ID</div>
              <div className="font-mono text-sm font-bold text-slate-800">
                @{currentUser.username}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                <ShieldCheck className="w-3 h-3 mr-1" />
                {currentUser.role === 'operator' ? 'Operator' : 'Head Teacher'}
              </span>
            </div>
          </div>

          {/* Assigned School (For Head Teacher) */}
          {assignedSchool && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center space-x-3">
              <SchoolIcon className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="text-xs">
                <div className="font-semibold text-blue-900">{assignedSchool.name}</div>
                <div className="text-blue-700">SEMIS Code: {assignedSchool.code}</div>
              </div>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Abdul Munif"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Official Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. rjmunif@gmail.com"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Used for security verification and multi-device account recovery.
            </p>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Mobile Number (Pakistan)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="03001234567 or +923001234567"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
            </div>
          </div>

          {/* Organization Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Organization / Directorate Name
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={organizationName}
                onChange={e => setOrganizationName(e.target.value)}
                placeholder="e.g. SEF Education Network (Sindh)"
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
            </div>
          </div>

          {/* Security PIN / Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Login PIN / Password
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="Enter 4-digit PIN or password"
                className="w-full pl-9 pr-10 py-2 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Update your quick PIN to log in across any mobile device.
            </p>
          </div>

          {/* Photo URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Profile Photo URL (Optional)
            </label>
            <div className="relative">
              <Image className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="url"
                value={photoUrl}
                onChange={e => setPhotoUrl(e.target.value)}
                placeholder="https://..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(false)}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center space-x-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm hover:shadow transition disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
