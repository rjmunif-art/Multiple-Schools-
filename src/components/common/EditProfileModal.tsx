import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  User,
  Shield,
  School as SchoolIcon,
  Phone,
  Mail,
  Building,
  Save,
  CheckCircle2,
  Camera,
  Sparkles,
  Loader2
} from 'lucide-react';
import { UserAccount, UserRole } from '../../types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: UserAccount | null; // If provided, edits that user; otherwise edits currentUser
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  targetUser,
}) => {
  const {
    currentUser,
    schools,
    updateUserProfile,
    updateSchool,
  } = useApp();

  const userToEdit = targetUser || currentUser;

  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('operator');
  const [organizationName, setOrganizationName] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (userToEdit && isOpen) {
      setName(userToEdit.name || '');
      setRole(userToEdit.role || 'operator');
      setOrganizationName(userToEdit.organizationName || 'Sindh Rural Education Support Organization (SRESO)');
      setSchoolId(userToEdit.schoolId || (schools[0]?.id || ''));
      setPhone(userToEdit.phone || '');
      setEmail(userToEdit.email || '');
      setPhotoUrl(userToEdit.photoUrl || '');
      setSuccessMsg('');
      setErrorMsg('');
    }
  }, [userToEdit, isOpen, schools]);

  if (!isOpen || !userToEdit) return null;

  const isHT = role === 'head_teacher';
  const isOperator = role === 'operator';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a valid full name.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const updatedData: Partial<UserAccount> = {
        name: name.trim(),
        role,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        organizationName: isOperator ? organizationName.trim() : userToEdit.organizationName,
        schoolId: isHT ? schoolId : undefined,
      };

      await updateUserProfile(updatedData);

      // If head teacher name changed and school is assigned, also update the school's HT name for consistency
      if (isHT && schoolId) {
        const assignedSchool = schools.find(s => s.id === schoolId);
        if (assignedSchool && assignedSchool.headTeacherName !== name.trim()) {
          updateSchool({
            ...assignedSchool,
            headTeacherName: name.trim(),
            contactNumber: phone.trim() || assignedSchool.contactNumber,
          });
        }
      }

      setSuccessMsg('Profile updated successfully and synced across all devices!');
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                Edit {isOperator ? 'Operator' : isHT ? 'Head Teacher (HT)' : 'User'} Profile
              </h2>
              <p className="text-xs text-slate-400">
                Update account details & personal role information
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Profile Photo Avatar Preview */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-800/50 border border-slate-800">
            <div className="relative w-14 h-14 rounded-full overflow-hidden bg-emerald-600 flex items-center justify-center text-white font-black text-xl shrink-0 shadow-md">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={() => setPhotoUrl('')}
                />
              ) : (
                name.charAt(0) || 'U'
              )}
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Profile Photo URL
              </label>
              <input
                type="url"
                value={photoUrl}
                onChange={e => setPhotoUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-hidden focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                Google account profile photo is loaded automatically
              </p>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Muhammad Saleh Mangi or Munif Ahmed"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Portal Access Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('operator')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isOperator
                    ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-xs'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                Operator (All Schools)
              </button>

              <button
                type="button"
                onClick={() => setRole('head_teacher')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  isHT
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-xs'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <SchoolIcon className="w-3.5 h-3.5 text-emerald-400" />
                Head Teacher (HT)
              </button>
            </div>
          </div>

          {/* Assigned School (if Head Teacher) */}
          {isHT && (
            <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-800/40">
              <label className="block text-xs font-semibold text-emerald-300 mb-1.5 flex items-center gap-1.5">
                <SchoolIcon className="w-3.5 h-3.5 text-emerald-400" />
                Assigned Head Teacher Campus *
              </label>
              <select
                value={schoolId}
                onChange={e => setSchoolId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-emerald-700/60 text-white text-xs sm:text-sm focus:outline-hidden focus:border-emerald-400"
              >
                {schools.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code}) - {s.district}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-emerald-400/80 mt-1">
                Head Teachers automatically focus on their assigned campus for roll calls, student register & reports.
              </p>
            </div>
          )}

          {/* Organization Name (if Operator) */}
          {isOperator && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-emerald-400" />
                SEF Operator Organization / NGO Name
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={e => setOrganizationName(e.target.value)}
                placeholder="e.g. Mangi SEF Education Network (Sindh)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:outline-hidden focus:border-emerald-500"
              />
            </div>
          )}

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              Contact Mobile Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +92 300 1234567 or 03001234567"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. rjmunif@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
