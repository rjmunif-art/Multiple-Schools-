import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { UserAccount, UserRole } from '../../types';

export const UserCredentialsManager: React.FC = () => {
  const { users, schools, createUserAccount, updateUserAccount, deleteUserAccount, currentUser, openEditProfile } = useApp();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [role, setRole] = useState<UserRole>('head_teacher');
  const [schoolId, setSchoolId] = useState(schools[0]?.id || '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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
    setPin(user.pin);
    setRole(user.role);
    setSchoolId(user.schoolId || schools[0]?.id || '');
    setEmail(user.email || '');
    setPhone(user.phone || '');
    setErrorMsg('');
    setShowAddModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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

      {/* Users List Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 dark:text-white">Active System Accounts ({users.length})</span>
          <span className="text-[11px] text-slate-500">Stored locally with offline encryption</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {users.map(u => {
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
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete access for ${u.name}?`)) {
                          deleteUserAccount(u.id);
                        }
                      }}
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                      title="Revoke user access"
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
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    Head Teacher will only be allowed to see and manage this selected school.
                  </span>
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
                    placeholder="e.g. ht_dadu"
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
                    placeholder="ht@sef.org"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

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
                  {editingUser ? 'Save Changes' : 'Generate ID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
