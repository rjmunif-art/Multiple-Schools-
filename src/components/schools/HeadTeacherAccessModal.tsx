import React, { useState, useEffect } from 'react';
import { School, SchoolInvite } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  X,
  UserCheck,
  Mail,
  User,
  Phone,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Send,
  Building,
  Sparkles,
  Check
} from 'lucide-react';

interface HeadTeacherAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
}

export const HeadTeacherAccessModal: React.FC<HeadTeacherAccessModalProps> = ({
  isOpen,
  onClose,
  school,
}) => {
  const { currentUser, inviteHeadTeacher, removeHeadTeacher, getSchoolInvites, updateSchool } = useApp();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [activeInvites, setActiveInvites] = useState<SchoolInvite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && school?.id) {
      loadInvites();
      setInviteEmail('');
      setInviteName(school.headTeacherName || '');
      setInvitePhone(school.contactNumber || '');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, school?.id]);

  const loadInvites = async () => {
    setIsLoading(true);
    try {
      const invites = await getSchoolInvites(school.id);
      setActiveInvites(invites);
    } catch (e) {
      console.warn('Error loading invites:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !school) return null;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = inviteEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid Google email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await inviteHeadTeacher(
        school.id,
        cleanEmail,
        inviteName.trim() || undefined,
        invitePhone.trim() || undefined
      );

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to add Head Teacher.');
      } else {
        setSuccessMsg('Head teacher added. Ask them to sign in with this Google account.');
        setInviteEmail('');
        await loadInvites();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while creating invite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAccess = async (emailToRemove?: string) => {
    if (!window.confirm('Are you sure you want to revoke Head Teacher access for this school?')) {
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const targetEmail = emailToRemove || school.headTeacherEmail;
      const res = await removeHeadTeacher(school.id, targetEmail);
      if (res.success) {
        setSuccessMsg('Head Teacher access revoked successfully.');
        await loadInvites();
      } else {
        setErrorMsg(res.error || 'Failed to remove Head Teacher.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error revoking access.');
    } finally {
      setIsLoading(false);
    }
  };

  // Compile full list of head teachers / invites for this school
  const allHTs: Array<{ email: string; name: string; phone?: string; isActive: boolean }> = [];
  if (school.headTeacherEmail) {
    allHTs.push({
      email: school.headTeacherEmail.toLowerCase(),
      name: school.headTeacherName || 'Assigned Head Teacher',
      phone: school.contactNumber,
      isActive: !!school.headTeacherUid,
    });
  }
  for (const inv of activeInvites) {
    const isVerified =
      inv.status === 'verified' ||
      !!inv.headTeacherUid ||
      (school.headTeacherEmail?.toLowerCase() === inv.email.toLowerCase() && !!school.headTeacherUid);
    const existing = allHTs.find(h => h.email.toLowerCase() === inv.email.toLowerCase());
    if (existing) {
      if (isVerified) existing.isActive = true;
    } else {
      allHTs.push({
        email: inv.email.toLowerCase(),
        name: inv.name || 'Invited Head Teacher',
        phone: inv.phone,
        isActive: isVerified,
      });
    }
  }

  const hasAssignedHT = allHTs.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">
                Head Teacher Access
              </h2>
              <p className="text-xs text-slate-400 truncate flex items-center gap-1.5">
                <Building className="w-3 h-3 text-emerald-400" />
                <span>{school.name} ({school.code})</span>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Strict Notice Required by Specifications */}
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-amber-200 text-xs">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-amber-100">Notice: </span>
              The head teacher must sign in using this exact Google email address to access this school. One email address can only be invited to ONE school across the entire system.
            </div>
          </div>

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Assigned Head Teachers list */}
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
              Head Teachers for this School ({allHTs.length})
            </h3>

            {allHTs.length > 0 ? (
              <div className="space-y-2.5">
                {allHTs.map(ht => (
                  <div key={ht.email} className="p-4 rounded-2xl bg-slate-850 border border-slate-700/80 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-sm shrink-0">
                          {ht.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="font-bold text-white text-sm truncate">
                            {ht.name}
                          </div>
                          <div className="text-xs text-slate-400 font-mono truncate flex items-center gap-1.5 mt-0.5">
                            <Mail className="w-3 h-3 text-emerald-400" />
                            <span>{ht.email}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveAccess(ht.email)}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                        title="Delete invite / revoke access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Contact: {ht.phone || 'Not specified'}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 shadow-xs ${
                        ht.isActive
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {ht.isActive ? (
                          <>
                            <span>Verified</span>
                            <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                          </>
                        ) : (
                          <span>Pending Google Sign-In</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-850/60 border border-slate-800 text-center text-xs text-slate-400">
                No Head Teacher has been added yet. Enter their Google email below to grant access.
              </div>
            )}
          </div>

          {/* Invite Form */}
          <form onSubmit={handleSendInvite} className="space-y-3.5 pt-2 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              {hasAssignedHT ? 'Change / Re-invite Head Teacher' : 'Invite Head Teacher with Google Account'}
            </h3>

            {/* Google Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>Head Teacher's Google Email <span className="text-rose-400">*</span></span>
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="e.g. teacher.jamshoro@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span>Head Teacher Full Name (Optional)</span>
              </label>
              <input
                type="text"
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                placeholder="e.g. Master Ghulam Rasool"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mobile Phone (Optional)</span>
              </label>
              <input
                type="tel"
                value={invitePhone}
                onChange={e => setInvitePhone(e.target.value)}
                placeholder="e.g. 03001234567"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Google Invite...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Grant Head Teacher Access</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
