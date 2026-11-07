import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ShieldCheck,
  UserPlus,
  Key,
  School,
  User,
  Trash2,
  Edit2,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  UserCheck
} from 'lucide-react';
import { UserAccount, UserRole, SchoolInvite } from '../../types';

export const UserCredentialsManager: React.FC = () => {
  const {
    users,
    schools,
    createUserAccount,
    updateUserAccount,
    deleteUserAccount,
    currentUser,
    openEditProfile,
    inviteHeadTeacher,
    removeHeadTeacher,
    getSchoolInvites
  } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [schoolInvites, setSchoolInvites] = useState<SchoolInvite[]>([]);

  // Form fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<UserRole>('head_teacher');
  const [schoolId, setSchoolId] = useState(schools[0]?.id || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadAllInvites = useCallback(async () => {
    try {
      const all: SchoolInvite[] = [];
      for (const s of schools) {
        const invs = await getSchoolInvites(s.id);
        all.push(...invs);
      }
      const seen = new Set<string>();
      const deduped: SchoolInvite[] = [];
      for (const inv of all) {
        if (!seen.has(inv.email.toLowerCase())) {
          seen.add(inv.email.toLowerCase());
          deduped.push(inv);
        }
      }
      setSchoolInvites(deduped);
    } catch (e) {
      console.warn('Error loading invites:', e);
    }
  }, [schools, getSchoolInvites]);

  useEffect(() => {
    loadAllInvites();
  }, [loadAllInvites]);

  const resetForm = () => {
    setName('');
    setUsername('');
    setPin('');
    setRole('head_teacher');
    setSchoolId(schools[0]?.id || '');
    setEmail('');
    setPhone('');
    setErrorMsg('');
    setEditingUser(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setPin(user.pin || '');
    setRole(user.role);
    setSchoolId(user.schoolId || schools[0]?.id || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setErrorMsg('');
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // If adding a Head Teacher:
    // Do NOT create a users document for the HT (their real uid is unknown until they sign in).
    // Create invites/{email} document.
    if (role === 'head_teacher' && !editingUser) {
      if (!name.trim()) {
        setErrorMsg('Please enter the full name of the Head Teacher.');
        return;
      }
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        setErrorMsg('Please enter a valid Google email address for the Head Teacher.');
        return;
      }
      if (!schoolId) {
        setErrorMsg('Please assign a school to this Head Teacher.');
        return;
      }

      const res = await inviteHeadTeacher(
        schoolId,
        cleanEmail,
        name.trim(),
        phone.trim() || undefined
      );

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to add Head Teacher.');
        return;
      }

      setDeleteNotice('Head teacher added. Ask them to sign in with this Google account.');
      setShowAddModal(false);
      resetForm();
      await loadAllInvites();
      return;
    }

    if (!name.trim() || !username.trim() || !pin.trim()) {
      setErrorMsg('Please enter full name, username ID and PIN / password.');
      return;
    }

    if (!editingUser) {
      if (users.some(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
        setErrorMsg('Username ID is already taken. Please choose another.');
        return;
      }
      createUserAccount({
        name: name.trim(),
        username: username.trim(),
        pin: pin.trim(),
        role,
        schoolId: role === 'head_teacher' ? schoolId : undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
    } else {
      updateUserAccount({
        ...editingUser,
        name: name.trim(),
        username: username.trim(),
        pin: pin.trim(),
        role,
        schoolId: role === 'head_teacher' ? schoolId : undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleRemoveInvite = async (inv: SchoolInvite) => {
    if (!window.confirm(`Revoke Head Teacher invite for ${inv.email}?`)) {
      return;
    }
    const res = await removeHeadTeacher(inv.schoolId, inv.email);
    if (res.success) {
      setDeleteNotice('Head Teacher access revoked successfully.');
      await loadAllInvites();
    } else {
      setErrorMsg(res.error || 'Failed to remove invite.');
    }
  };

  const copyCredentials = (u: UserAccount) => {
    const sch = schools.find(s => s.id === u.schoolId);
    const text = `SEF School Portal Login:\nRole: ${u.role}\nUsername: ${u.username}\nPIN: ${u.pin}${sch ? `\nAssigned School: ${sch.name} (${sch.code})` : ''}`;
    navigator.clipboard?.writeText(text);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            School Staff Access & Login ID Generator
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operator can generate username IDs and PINs for Head Teachers (restricted to assigned school) and Supervisors (read-only)
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Create New Login ID
        </button>
      </div>

      {/* Notification banner */}
      {deleteNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{deleteNotice}</span>
        </div>
      )}

      {/* Users List Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white">Active System Accounts ({users.length})</span>
          <span className="text-[11px] text-slate-500">Stored locally with offline encryption</span>
        </div>

        {/* Head Teacher Active Invites Section */}
        {schoolInvites.length > 0 && (
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-850 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>Head Teacher Invites & Delegations ({schoolInvites.length})</span>
              <span className="text-[10px] lowercase text-emerald-600 dark:text-emerald-400 font-medium">Google Auth Ready</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {schoolInvites.map(inv => {
                const sch = schools.find(s => s.id === inv.schoolId);
                return (
                  <div key={inv.email} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm font-bold shrink-0">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{inv.name || 'Head Teacher'}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                            HT Invite
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                          <span className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400">
                            <Mail className="w-3 h-3" />
                            {inv.email}
                          </span>
                          {inv.phone && <span>Phone: {inv.phone}</span>}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                            Pending Google Sign-In
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5 font-medium">
                          <School className="w-3.5 h-3.5" />
                          <span>Assigned Campus: <strong>{sch ? `${sch.name} (${sch.code})` : inv.schoolName || 'Assigned School'}</strong></span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        onClick={() => handleRemoveInvite(inv)}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title={`Revoke access for ${inv.email}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove Invite</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {users.filter(u => !(u.id.startsWith('usr-') && (u.role === 'head_teacher' || u.role === 'headTeacher'))).map(u => {
            const sch = schools.find(s => s.id === u.schoolId);
            const isSelf = currentUser?.id === u.id;

            return (
              <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                    u.role === 'operator' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300' :
                    u.role === 'head_teacher' ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300' :
                    'bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300'
                  }`}>
                    {u.role === 'operator' && <ShieldCheck className="w-5 h-5" />}
                    {u.role === 'head_teacher' && <School className="w-5 h-5" />}
                    {u.role === 'supervisor' && <User className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{u.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        u.role === 'operator' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700' :
                        u.role === 'head_teacher' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700' :
                        'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                      {isSelf && (
                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-semibold">
                          You
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 flex flex-wrap items-center gap-3">
                      <span>Username: <strong className="font-mono text-slate-900 dark:text-slate-100">{u.username}</strong></span>
                      <span>PIN: <strong className="font-mono text-slate-900 dark:text-slate-100">{u.pin}</strong></span>
                      {u.phone && <span>Phone: {u.phone}</span>}
                    </div>

                    {u.role === 'head_teacher' && (
                      <div className="mt-1 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1.5 font-medium">
                        <School className="w-3.5 h-3.5" />
                        <span>Restricted to: <strong>{sch ? `${sch.name} (${sch.code})` : 'Unassigned'}</strong></span>
                      </div>
                    )}
                    {u.role === 'supervisor' && (
                      <div className="mt-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
                        Read-only access across all school reports & monitoring visits
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => copyCredentials(u)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center gap-1 transition"
                    title="Copy Login Credentials to send to Head Teacher"
                  >
                    {copiedId === u.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedId === u.id ? 'Copied' : 'Share'}</span>
                  </button>

                  <button
                    onClick={() => openEditProfile(u)}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Edit user profile"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {!isSelf && (
                    <button
                      onClick={() => setUserToDelete(u)}
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                      title={`Revoke user access for ${u.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add / Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-white">
            <h3 className="text-base font-bold mb-1">
              {editingUser ? 'Edit User Credentials' : 'Create New School Login ID'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Head Teachers get dedicated access to their assigned school; Supervisors get read-only reports.
            </p>

            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Master Ghulam Rasool Chandio"
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  System Role *
                </label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="head_teacher">Head Teacher (Single School Access)</option>
                  <option value="supervisor">Supervisor (Read-Only All Reports)</option>
                  <option value="operator">Operator (Full Control All Schools)</option>
                </select>
              </div>

              {role === 'head_teacher' && !editingUser ? (
                <>
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Head teachers sign in using their Google account. An invitation document will be registered in Firestore for this Gmail. They will see only their assigned school.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Assign Specific School *
                    </label>
                    <select
                      value={schoolId}
                      onChange={e => setSchoolId(e.target.value)}
                      required
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    >
                      {schools.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code}) - {s.district}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Head Teacher's Google Email *</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="e.g. teacher.jamshoro@gmail.com"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. 03001234567"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  {role === 'head_teacher' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Assign Specific School *
                      </label>
                      <select
                        value={schoolId}
                        onChange={e => setSchoolId(e.target.value)}
                        required
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      >
                        {schools.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code}) - {s.district}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Username ID *
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        placeholder="e.g. supervisor_1"
                        required
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        PIN / Password *
                      </label>
                      <input
                        type="text"
                        value={pin}
                        onChange={e => setPin(e.target.value)}
                        placeholder="e.g. 1111"
                        required
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Mobile Phone
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+92 301 5551201"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="staff@sef.org"
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  {role === 'head_teacher' && !editingUser ? 'Grant Access & Send Invite' : (editingUser ? 'Save Changes' : 'Generate ID')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Account Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-white">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-center mb-1">Delete User Account?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-5 leading-relaxed">
              Are you sure you want to permanently revoke system access for{' '}
              <strong className="text-slate-900 dark:text-white">{userToDelete.name}</strong>{' '}
              ({userToDelete.role.replace('_', ' ')})?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetName = userToDelete.name;
                  deleteUserAccount(userToDelete.id);
                  setUserToDelete(null);
                  setDeleteNotice(`Account for ${targetName} was deleted.`);
                  setTimeout(() => setDeleteNotice(null), 3500);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
