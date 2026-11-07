import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  User,
  Shield,
  School as SchoolIcon,
  Phone,
  Mail,
  Building2,
  GraduationCap,
  Save,
  CheckCircle2,
  Camera,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { UserAccount, UserRole } from '../../types';
import { resizeAndCompressImage } from '../../services/imageUtils';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: UserAccount | null;
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
  const [instituteName, setInstituteName] = useState('');
  const [degree, setDegree] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoData, setPhotoData] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const isOperator = userToEdit?.role === 'operator';
  const isHT = userToEdit?.role === 'headTeacher' || userToEdit?.role === 'head_teacher';

  useEffect(() => {
    if (userToEdit && isOpen) {
      setName(userToEdit.name || '');
      setInstituteName(userToEdit.instituteName || userToEdit.organizationName || 'Sindh Rural Education Support Organization (SRESO)');
      setDegree(userToEdit.degree || '');
      setPhone(userToEdit.phone || '');
      setEmail(userToEdit.email || '');
      setPhotoPreview(userToEdit.photoData || userToEdit.photoUrl || null);
      setPhotoData(userToEdit.photoData);
      setSuccessMsg('');
      setErrorMsg('');
    }
  }, [userToEdit, isOpen]);

  if (!isOpen || !userToEdit) return null;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await resizeAndCompressImage(file, 256, 0.7);
      setPhotoData(compressed);
      setPhotoPreview(compressed);
      setErrorMsg('');
    } catch (err: any) {
      console.error('Image compression error:', err);
      setErrorMsg('Could not process selected image. Please choose another.');
    }
  };

  const validatePhone = (val: string): boolean => {
    const cleaned = val.replace(/[\s-]/g, '');
    return /^(\+92|92|0)?3[0-9]{9}$/.test(cleaned);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedInstitute = instituteName.trim();
    const trimmedDegree = degree.trim();

    if (!trimmedName) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (isOperator && !trimmedInstitute) {
      setErrorMsg('Please enter your Institute or Organization name.');
      return;
    }
    if (isOperator && !trimmedDegree) {
      setErrorMsg('Please enter your educational degree.');
      return;
    }
    if (!trimmedPhone) {
      setErrorMsg('Please enter your mobile phone number.');
      return;
    }
    if (!validatePhone(trimmedPhone)) {
      setErrorMsg('Please enter a valid Pakistani mobile number (e.g. 03001234567 or +923001234567).');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    try {
      const updatedData: Partial<UserAccount> = {
        name: trimmedName,
        phone: trimmedPhone,
        photoData: photoData || photoPreview || undefined,
        photoUrl: photoData || photoPreview || undefined,
        instituteName: isOperator ? trimmedInstitute : userToEdit.instituteName,
        organizationName: isOperator ? trimmedInstitute : userToEdit.organizationName,
        degree: isOperator ? trimmedDegree : userToEdit.degree,
      };

      await updateUserProfile(updatedData);

      // If head teacher name/contact changed, keep assigned school sync'd
      if (isHT && userToEdit.schoolId) {
        const assignedSchool = schools.find(s => s.id === userToEdit.schoolId);
        if (assignedSchool) {
          updateSchool({
            ...assignedSchool,
            headTeacherName: trimmedName,
            contactNumber: trimmedPhone,
          });
        }
      }

      setSuccessMsg('Profile updated successfully and synced across all devices!');
      setTimeout(() => {
        onClose();
      }, 800);
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
                Edit {isOperator ? 'Operator' : 'Head Teacher'} Profile
              </h2>
              <p className="text-xs text-slate-400">
                Update account details & administrative credentials
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
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Profile Photo Avatar Upload */}
          <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-800/50 border border-slate-800">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-emerald-500/60 bg-slate-800 shadow-xl flex items-center justify-center">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-slate-500" />
                )}
              </div>
              <label
                htmlFor="edit-profile-photo"
                className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg cursor-pointer transition active:scale-90"
                title="Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
                <input
                  id="edit-profile-photo"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {photoPreview ? 'Profile photo ready' : 'Tap camera icon to change'}
            </p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Full Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Munif Ahmed"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Institute Name (Operator) */}
          {isOperator && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                Institute / Organization Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={instituteName}
                onChange={e => setInstituteName(e.target.value)}
                placeholder="e.g. Sindh Rural Education Support Organization (SRESO)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          )}

          {/* Educational Degree (Operator) */}
          {isOperator && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
                Educational Degree <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={degree}
                onChange={e => setDegree(e.target.value)}
                placeholder="e.g. M.Ed / B.S Education"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          )}

          {/* Email (Read-Only from Google) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              Google Email Address (Read-Only)
            </label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 text-xs sm:text-sm cursor-not-allowed"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              Contact Phone Number <span className="text-rose-400">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 03001234567 or +923001234567"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition"
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
