import React, { useState } from 'react';
import {
  Send,
  X,
  School as SchoolIcon,
  User,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  MessageSquare,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { School, UserAccount } from '../../types';
import { NotificationType } from '../../types/notifications';
import { notificationService } from '../../services/notificationService';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  schools: School[];
  onSuccess?: () => void;
}

export const SendNotificationModal: React.FC<SendNotificationModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  schools,
  onSuccess,
}) => {
  const [selectedSchoolId, setSelectedSchoolId] = useState(schools[0]?.id || '');
  const [notificationType, setNotificationType] = useState<NotificationType>('NEW_OPERATOR_MESSAGE');
  const [targetScreen, setTargetScreen] = useState('attendance');
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [priority, setPriority] = useState<'high' | 'normal'>('high');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const currentSchool = schools.find(s => s.id === selectedSchoolId) || schools[0];
  const headTeacherName = currentSchool?.headTeacherName || 'Assigned Head Teacher';
  const headTeacherUid = currentSchool?.headTeacherUid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSchool) return;

    if (!customTitle.trim() || !customMessage.trim()) {
      setStatusMessage({ type: 'error', text: 'Please provide both title and message.' });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      // Find recipient user ID: either headTeacherUid, or query users by schoolId, or fallback to school-scoped delivery
      let recipientUid = headTeacherUid;
      if (!recipientUid || recipientUid.startsWith('ht_')) {
        try {
          const q = query(
            collection(db, 'users'),
            where('role', '==', 'headTeacher'),
            where('schoolId', '==', currentSchool.id)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            recipientUid = snap.docs[0].id;
          }
        } catch (queryErr) {
          console.warn('Could not query HT user UID:', queryErr);
        }
      }
      if (!recipientUid) {
        recipientUid = `ht_${currentSchool.id}`;
      }

      const res = await notificationService.sendNotification({
        senderUserId: currentUser.id,
        senderRole: 'operator',
        recipient_user_id: recipientUid,
        recipient_role: 'headTeacher',
        school_id: currentSchool.id,
        school_name: currentSchool.name,
        type: notificationType,
        target_screen: targetScreen,
        custom_title: customTitle.trim(),
        custom_body: customMessage.trim(),
        priority,
        payload: {
          senderName: currentUser.name,
          senderRole: 'operator',
          headTeacherName,
          recipientEmail: currentSchool.headTeacherEmail || '',
          recipientAssignedSchoolId: currentSchool.id,
        },
      });

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Push notification dispatched successfully to ${headTeacherName} (${currentSchool.name})!`,
        });
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 1500);
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to dispatch push notification.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Send Notification to Head Teacher</h3>
              <p className="text-[11px] text-slate-400">
                Direct push notification to authorized Head Teacher's mobile phone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl text-xs flex items-center gap-2 border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                  : 'bg-rose-950/80 border-rose-700 text-rose-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* School Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Target School Campus
            </label>
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) — HT: {s.headTeacherName || 'Assigned'}
                </option>
              ))}
            </select>
          </div>

          {/* Recipient HT Display Banner */}
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-900/50 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-slate-400">Authorized Recipient:</div>
              <div className="font-bold text-xs text-white truncate">{headTeacherName}</div>
              <div className="text-[10px] text-emerald-400 font-mono">
                {currentSchool?.headTeacherEmail || 'Bound via School Credentials'}
              </div>
            </div>
          </div>

          {/* Notification Category & Target Screen */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Alert Type
              </label>
              <select
                value={notificationType}
                onChange={(e) => setNotificationType(e.target.value as NotificationType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="NEW_OPERATOR_MESSAGE">Urgent Message</option>
                <option value="LOW_STUDENT_ATTENDANCE">Attendance Warning</option>
                <option value="NEW_TASK">New Task Required</option>
                <option value="ISSUE_CREATED">School Issue Alert</option>
                <option value="VISIT_REMINDER">Inspection Visit Notice</option>
                <option value="GENERAL_ANNOUNCEMENT">General Announcement</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Destination Screen
              </label>
              <select
                value={targetScreen}
                onChange={(e) => setTargetScreen(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-none focus:border-emerald-500"
              >
                <option value="attendance">Daily Attendance</option>
                <option value="tasks">School Tasks</option>
                <option value="issues">Issues & Compliance</option>
                <option value="staff">Staff Roster</option>
                <option value="students">Student Directory</option>
                <option value="examinations">Examinations</option>
                <option value="schools">School Overview</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Notification Title
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g., Immediate Student Roll Call Verification"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Notification Message
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Enter message for Head Teacher. Will appear in their Android notification tray and Notification Center..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-emerald-500 resize-none"
              required
            />
          </div>

          {/* Priority */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-slate-300">Priority Level:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPriority('high')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  priority === 'high'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                🔴 High (Vibrate & Sound)
              </button>
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  priority === 'normal'
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Standard
              </button>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching FCM...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Push Notification</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
