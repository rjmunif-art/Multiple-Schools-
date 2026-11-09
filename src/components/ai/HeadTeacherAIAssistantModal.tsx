import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { db } from '../../firebase/config';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  Sparkles,
  X,
  Send,
  Paperclip,
  FileSpreadsheet,
  FileText,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
  Users,
  Check,
  ChevronDown,
  Trash2,
  HelpCircle,
  RotateCcw,
  MessageSquare,
  History,
  Plus,
  Edit3,
  Calendar,
  AlertTriangle,
  Building,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Bell,
  Clock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { SchoolIntelligenceEngine } from '../../services/schoolIntelligence';
import { Student, Staff } from '../../types';

interface ChatSession {
  id: string;
  title: string;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

interface StructuredActionData {
  type: string;
  data: any;
  status: 'pending' | 'confirmed' | 'cancelled';
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  attachedFile?: {
    name: string;
    type: string;
    size: number;
  };
  structuredAction?: StructuredActionData;
  extractedStudents?: any[];
  extractedTeachers?: any[];
  isEnrolled?: boolean;
  timestamp: string;
  error?: boolean;
}

interface HeadTeacherAIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HeadTeacherAIAssistantModal: React.FC<HeadTeacherAIAssistantModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    currentUser,
    activeSchool,
    schools,
    students,
    staff,
    studentAttendance,
    staffAttendance,
    issues,
    examinations,
    examMarks,
    batchAddStudents,
    addStaff,
    updateStudent,
    updateStaff,
    saveStudentAttendance,
    activeAcademicYear,
  } = useApp();

  const isHT = currentUser?.role === 'head_teacher' || currentUser?.role === 'headTeacher';
  const isOperator = currentUser?.role === 'operator';

  // Selected school: locked for HT, selectable for Operator
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(
    isHT && currentUser?.schoolId
      ? currentUser.schoolId
      : activeSchool?.id && activeSchool.id !== 'all'
      ? activeSchool.id
      : 'all'
  );

  useEffect(() => {
    if (isHT && currentUser?.schoolId) {
      setSelectedSchoolId(currentUser.schoolId);
    } else if (isOperator) {
      if (activeSchool?.id && activeSchool?.id !== 'all') {
        setSelectedSchoolId(activeSchool.id);
      }
    }
  }, [currentUser?.id, currentUser?.schoolId, isHT, isOperator, activeSchool?.id]);

  // Fallback school anchor for Firestore chat collection path
  const effectiveSchoolId = useMemo(() => {
    if (selectedSchoolId !== 'all') return selectedSchoolId;
    if (isHT && currentUser?.schoolId) return currentUser.schoolId;
    if (schools.length > 0) return schools[0].id;
    return 'general';
  }, [selectedSchoolId, isHT, currentUser?.schoolId, schools]);

  const targetSchool = selectedSchoolId === 'all'
    ? null
    : schools.find(s => s.id === selectedSchoolId) || null;

  // Chat sessions state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>('default-chat');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editChatTitle, setEditChatTitle] = useState('');

  // Messages & input state
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{
    file: File;
    name: string;
    type: string;
    size: number;
    base64Data?: string;
    extractedText?: string;
  } | null>(null);

  // Editable preview table for bulk imports
  const [importPreview, setImportPreview] = useState<{
    messageId: string;
    students: any[];
    teachers: any[];
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, importPreview]);

  // Load chat sessions from Firestore
  useEffect(() => {
    if (!isOpen || !currentUser?.id || !effectiveSchoolId) return;

    try {
      const chatsRef = collection(db, 'schools', effectiveSchoolId, 'assistantChats');
      const q = query(chatsRef, where('userId', '==', currentUser.id), orderBy('updatedAt', 'desc'));
      const unsub = onSnapshot(q, snap => {
        const loaded: ChatSession[] = snap.docs.map(d => ({
          id: d.id,
          title: d.data().title || 'School Assistant Chat',
          schoolId: d.data().schoolId || effectiveSchoolId,
          createdAt: d.data().createdAt || new Date().toISOString(),
          updatedAt: d.data().updatedAt || new Date().toISOString(),
        }));
        setChatSessions(loaded);
      }, err => {
        console.warn('[Firestore] Chat sessions load warning:', err.message);
      });

      return () => unsub();
    } catch (e) {
      console.warn('Error setting up chat sessions listener:', e);
    }
  }, [isOpen, currentUser?.id, effectiveSchoolId]);

  // Load messages for current chat session
  useEffect(() => {
    if (!isOpen || !currentUser?.id || !effectiveSchoolId || !currentChatId) return;

    if (currentChatId === 'default-chat') {
      // Initialize default welcome message
      const schoolTitle = targetSchool
        ? `${targetSchool.name} (${targetSchool.code})`
        : 'All SEF Partner Campuses Consolidated';
      const roleTag = isHT
        ? `Head Teacher (${targetSchool?.name || 'Assigned School'})`
        : 'SEF School Operator';

      setMessages([
        {
          id: 'welcome-init',
          sender: 'ai',
          text: `Assalam-o-Alaikum **${currentUser?.name || 'Administrator'}**! I am **SchoolSync Assistant**, your dedicated management AI for **${roleTag}**.\n\nCurrently focused on **${schoolTitle}**.\n\nHow can I help you today? You can ask me to evaluate attendance, search students, bulk enroll from files, or perform operational updates.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      return;
    }

    try {
      const messagesRef = collection(db, 'schools', effectiveSchoolId, 'assistantChats', currentChatId, 'messages');
      const q = query(messagesRef, orderBy('timestamp', 'asc'));
      const unsub = onSnapshot(q, snap => {
        if (!snap.empty) {
          const msgs: Message[] = snap.docs.map(d => {
            const data = d.data();
            return {
              id: d.id,
              sender: data.role === 'user' ? 'user' : 'ai',
              text: data.content || '',
              structuredAction: data.structuredAction || undefined,
              extractedStudents: data.extractedStudents || undefined,
              timestamp: data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            };
          });
          setMessages(msgs);
        }
      }, err => {
        console.warn('[Firestore] Chat messages subscription warning:', err.message);
      });

      return () => unsub();
    } catch (e) {
      console.warn('Error loading chat messages:', e);
    }
  }, [isOpen, currentUser?.id, effectiveSchoolId, currentChatId, targetSchool, isHT]);

  // Start new chat
  const handleStartNewChat = async () => {
    if (!currentUser?.id || !effectiveSchoolId) return;
    const newChatId = 'chat-' + Date.now();
    const now = new Date().toISOString();
    const chatDocRef = doc(db, 'schools', effectiveSchoolId, 'assistantChats', newChatId);

    const newChatSession: ChatSession = {
      id: newChatId,
      title: 'New Conversation',
      schoolId: effectiveSchoolId,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await setDoc(chatDocRef, {
        id: newChatId,
        schoolId: effectiveSchoolId,
        userId: currentUser.id,
        title: 'New Conversation',
        createdAt: now,
        updatedAt: now,
      });

      setCurrentChatId(newChatId);
      setIsDrawerOpen(false);
      setMessages([
        {
          id: 'welcome-' + newChatId,
          sender: 'ai',
          text: `Started a new conversation for **${targetSchool ? targetSchool.name : 'All Campuses'}**. What would you like to work on?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('Error creating new chat session:', err);
    }
  };

  // Delete chat
  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this chat conversation?')) return;
    try {
      const chatDocRef = doc(db, 'schools', effectiveSchoolId, 'assistantChats', chatId);
      await deleteDoc(chatDocRef);
      if (currentChatId === chatId) {
        setCurrentChatId('default-chat');
      }
    } catch (err) {
      console.error('Error deleting chat:', err);
    }
  };

  // Rename chat
  const handleSaveRename = async (chatId: string) => {
    if (!editChatTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    try {
      const chatDocRef = doc(db, 'schools', effectiveSchoolId, 'assistantChats', chatId);
      await setDoc(chatDocRef, { title: editChatTitle.trim(), updatedAt: new Date().toISOString() }, { merge: true });
      setEditingChatId(null);
    } catch (err) {
      console.error('Error renaming chat:', err);
    }
  };

  // File Upload parsing
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type || '';
    const isImage = fileType.startsWith('image/');
    const isPdf = fileType === 'application/pdf';
    const isSpreadsheet =
      fileType.includes('spreadsheet') ||
      fileType.includes('excel') ||
      fileType.includes('csv') ||
      file.name.endsWith('.csv') ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls');

    let base64Data: string | undefined = undefined;
    let extractedText: string | undefined = undefined;

    if (isSpreadsheet) {
      try {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        extractedText = XLSX.utils.sheet_to_csv(worksheet);
      } catch (err) {
        console.warn('Could not parse spreadsheet locally:', err);
      }
    } else if (isImage || isPdf) {
      try {
        const reader = new FileReader();
        base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const res = reader.result as string;
            const pureBase64 = res.split(',')[1] || res;
            resolve(pureBase64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      } catch (err) {
        console.warn('Could not read binary file:', err);
      }
    }

    setAttachedFile({
      file,
      name: file.name,
      type: fileType || (isSpreadsheet ? 'spreadsheet' : 'document'),
      size: file.size,
      base64Data,
      extractedText,
    });
  };

  // Build live school context payload
  const buildSchoolContext = () => {
    const filteredStudents = selectedSchoolId === 'all' ? students : students.filter(s => s.schoolId === selectedSchoolId);
    const filteredStaff = selectedSchoolId === 'all' ? staff : staff.filter(s => s.schoolId === selectedSchoolId);
    const schoolObj = targetSchool || schools[0] || null;

    const studentsSample = filteredStudents
      .slice(0, 15)
      .map(s => `- GR: ${s.grNumber}, Name: ${s.name}, Father: ${s.fatherName}, Grade: ${s.grade}, Gender: ${s.gender}`)
      .join('\n');

    const staffSample = filteredStaff
      .slice(0, 12)
      .map(st => `- Name: ${st.name}, Designation: ${st.designation}, CNIC: ${st.cnic}, Phone: ${st.contact}`)
      .join('\n');

    return {
      userRole: currentUser?.role || 'operator',
      schoolName: schoolObj?.name || 'All Campuses',
      schoolCode: schoolObj?.code || 'SEF-ALL',
      district: schoolObj?.district || 'Sindh',
      taluka: schoolObj?.taluka || 'Sindh',
      headTeacher: schoolObj?.headTeacherName || currentUser?.name || 'N/A',
      totalStudents: filteredStudents.length,
      totalStaff: filteredStaff.length,
      todayAttendance: 'Normal (Recorded)',
      teacherAttendance: 'Present',
      pendingIssues: issues.filter(i => i.status !== 'Resolved').length + ' open issues',
      academicYear: activeAcademicYear,
      studentsSample,
      staffSample,
    };
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const msgText = (textToSend || inputMessage).trim();
    if (!msgText && !attachedFile) return;

    const userMsgId = 'msg-' + Date.now();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newUserMessage: Message = {
      id: userMsgId,
      sender: 'user',
      text: msgText || (attachedFile ? `Attached file: ${attachedFile.name}` : ''),
      attachedFile: attachedFile
        ? {
            name: attachedFile.name,
            type: attachedFile.type,
            size: attachedFile.size,
          }
        : undefined,
      timestamp: nowTime,
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    const currentAttachment = attachedFile;
    setAttachedFile(null);
    setIsLoading(true);

    // Save user message to Firestore if in an active chat session
    if (currentChatId !== 'default-chat' && currentUser?.id) {
      try {
        const msgDocRef = doc(db, 'schools', effectiveSchoolId, 'assistantChats', currentChatId, 'messages', userMsgId);
        await setDoc(msgDocRef, {
          id: userMsgId,
          chatId: currentChatId,
          userId: currentUser.id,
          role: 'user',
          content: newUserMessage.text,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Failed saving user message to Firestore:', e);
      }
    }

    try {
      const payload: any = {
        message: msgText,
        schoolContext: buildSchoolContext(),
        history: updatedMessages.slice(-20),
      };

      if (currentAttachment) {
        payload.file = {
          filename: currentAttachment.name,
          mimeType: currentAttachment.file.type || 'text/plain',
          data: currentAttachment.base64Data,
          extractedText: currentAttachment.extractedText,
        };
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'AI service error');
      }

      const aiMsgId = 'ai-' + Date.now();
      const newAiMessage: Message = {
        id: aiMsgId,
        sender: 'ai',
        text: data.reply,
        structuredAction: data.structuredAction
          ? {
              type: data.structuredAction.action,
              data: data.structuredAction,
              status: 'pending',
            }
          : undefined,
        extractedStudents: data.extractedStudents || data.structuredAction?.students,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, newAiMessage]);

      // If preview_import or extracted students exist, open the preview table
      if (data.extractedStudents && data.extractedStudents.length > 0) {
        setImportPreview({
          messageId: aiMsgId,
          students: data.extractedStudents,
          teachers: data.structuredAction?.teachers || [],
        });
      }

      // Save AI message to Firestore
      if (currentChatId !== 'default-chat' && currentUser?.id) {
        try {
          const msgDocRef = doc(db, 'schools', effectiveSchoolId, 'assistantChats', currentChatId, 'messages', aiMsgId);
          await setDoc(msgDocRef, {
            id: aiMsgId,
            chatId: currentChatId,
            userId: currentUser.id,
            role: 'assistant',
            content: data.reply,
            structuredAction: newAiMessage.structuredAction || null,
            extractedStudents: data.extractedStudents || null,
            timestamp: new Date().toISOString(),
          });

          // Update chat session timestamp and title if first user message
          const chatDocRef = doc(db, 'schools', effectiveSchoolId, 'assistantChats', currentChatId);
          const firstSnippet = msgText.slice(0, 32) || 'School Assistant Chat';
          await setDoc(
            chatDocRef,
            {
              title: firstSnippet,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (e) {
          console.warn('Failed saving AI message to Firestore:', e);
        }
      }
    } catch (err: any) {
      console.error('AI chat failed:', err);
      let rawMsg = err?.message || 'Could not communicate with SchoolSync Assistant. Please try again.';
      if (typeof rawMsg === 'string' && rawMsg.startsWith('Error: ')) {
        rawMsg = rawMsg.slice(7);
      }
      const errorMsg: Message = {
        id: 'err-' + Date.now(),
        sender: 'ai',
        text: `Error: ${rawMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Execute confirmed structured action
  const handleConfirmAction = async (msgId: string, action: StructuredActionData) => {
    const targetSchoolId = targetSchool?.id || schools[0]?.id;
    if (!targetSchoolId) return;

    try {
      if (action.type === 'add_students' && action.data.students) {
        const studentsToAdd = action.data.students.map((st: any) => ({
          schoolId: targetSchoolId,
          grNumber: st.grNumber || 'GR-' + Math.floor(1000 + Math.random() * 9000),
          name: st.name,
          fatherName: st.fatherName || 'Guardian',
          gender: st.gender || 'Male',
          grade: st.grade || 'Class I',
          section: st.section || 'A',
          dob: st.dob || '2018-01-01',
          admissionDate: new Date().toISOString().split('T')[0],
          bFormNumber: st.bFormNumber || '',
          guardianContact: st.guardianContact || '+92 300 0000000',
          address: st.address || 'Sindh',
          village: st.village || 'Village',
          status: 'Active' as const,
        }));
        batchAddStudents(studentsToAdd);
      } else if (action.type === 'add_teachers' && action.data.teachers) {
        for (const t of action.data.teachers) {
          addStaff({
            schoolId: targetSchoolId,
            employeeId: 'EMP-' + Math.floor(100 + Math.random() * 900),
            name: t.name,
            cnic: t.cnic || '41201-0000000-1',
            qualification: t.qualification || 'B.A / B.Ed',
            designation: t.designation || 'Junior Teacher',
            joiningDate: new Date().toISOString().split('T')[0],
            contact: t.contact || '+92 300 0000000',
            status: 'Active',
            baseSalary: t.baseSalary || 25000,
          });
        }
      } else if (action.type === 'mark_attendance') {
        const att = action.data.attendance || action.data;
        const todayDate = new Date().toISOString().split('T')[0];
        saveStudentAttendance([
          {
            schoolId: targetSchoolId,
            date: att.date || todayDate,
            academicYear: activeAcademicYear,
            grade: 'Class I',
            totalStudents: 1,
            present: att.status === 'present' ? 1 : 0,
            absent: att.status === 'absent' ? 1 : 0,
            leave: att.status === 'leave' ? 1 : 0,
            attendancePercentage: att.status === 'present' ? 100 : 0,
            submittedBy: currentUser?.name || 'Head Teacher',
          },
        ]);
      }

      // Mark message as confirmed
      setMessages(prev =>
        prev.map(m =>
          m.id === msgId && m.structuredAction
            ? { ...m, structuredAction: { ...m.structuredAction, status: 'confirmed' } }
            : m
        )
      );
    } catch (e: any) {
      console.error('Error executing action:', e);
      alert('Could not complete action: ' + e.message);
    }
  };

  // Cancel structured action
  const handleCancelAction = (msgId: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === msgId && m.structuredAction
          ? { ...m, structuredAction: { ...m.structuredAction, status: 'cancelled' } }
          : m
      )
    );
  };

  // Commit bulk preview students
  const handleCommitPreviewStudents = () => {
    if (!importPreview?.students?.length) return;
    const destSchoolId = targetSchool?.id || schools[0]?.id;
    if (!destSchoolId) {
      alert('Please select a school first.');
      return;
    }

    const studentsToAdd = importPreview.students.map((st: any, idx: number) => ({
      schoolId: destSchoolId,
      grNumber: st.grNumber || 'GR-' + (1000 + idx),
      name: st.name || 'Student',
      fatherName: st.fatherName || 'Father',
      gender: (st.gender || '').toLowerCase().startsWith('f') ? ('Female' as const) : ('Male' as const),
      grade: st.grade || 'Class I',
      section: st.section || 'A',
      dob: st.dob || '2018-05-10',
      bFormNumber: st.bFormNumber || '',
      guardianContact: st.guardianContact || '+92 300 0000000',
      address: st.address || 'Sindh',
      village: st.village || 'Village',
      admissionDate: st.admissionDate || new Date().toISOString().split('T')[0],
      status: 'Active' as const,
    }));

    batchAddStudents(studentsToAdd);
    setImportPreview(null);

    // Add confirmation message
    const confirmMsg: Message = {
      id: 'conf-' + Date.now(),
      sender: 'ai',
      text: `Successfully enrolled all **${studentsToAdd.length} students** into **${targetSchool?.name || 'the school register'}**! Roster records and enrollment counts have been updated in real-time.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages(prev => [...prev, confirmMsg]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-4xl h-[92vh] max-h-[850px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        {/* Top Header Bar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Drawer toggle for Past Chats */}
            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shrink-0 border border-slate-700"
              title="Chat History"
            >
              <History className="w-4 h-4 text-emerald-400" />
            </button>

            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-md border border-emerald-400/40 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white truncate tracking-tight">
                  SchoolSync Assistant
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold uppercase tracking-wider hidden sm:inline">
                  Gemini Flash AI
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Professional Pakistani School AI • SEF Roster & Evaluation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* School Scope Selector (Operator can change, Head Teacher is locked) */}
            {isHT ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-300">
                <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold truncate max-w-[150px]">{targetSchool?.name || 'Assigned School'}</span>
                <span className="text-[10px] text-emerald-400 font-bold">(Locked)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <label className="text-[11px] text-slate-400 hidden md:inline">Working on:</label>
                <select
                  value={selectedSchoolId}
                  onChange={e => setSelectedSchoolId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500 max-w-[170px] truncate"
                >
                  <option value="all">All Schools Consolidated</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              aria-label="Close Assistant"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body: Drawer + Chat Pane */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Chat History Slide-Over Drawer */}
          {isDrawerOpen && (
            <div className="absolute inset-y-0 left-0 w-72 sm:w-80 bg-slate-950 border-r border-slate-800 z-30 flex flex-col p-3 shadow-2xl animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <History className="w-4 h-4 text-emerald-400" />
                  <span>Saved Conversations</span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* New Chat Button */}
              <button
                onClick={handleStartNewChat}
                className="mt-3 w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Chat</span>
              </button>

              {/* Chat list */}
              <div className="flex-1 overflow-y-auto mt-3 space-y-1.5 scrollbar-thin">
                {chatSessions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    No past saved chats yet. Messages save automatically to cloud.
                  </div>
                ) : (
                  chatSessions.map(session => (
                    <div
                      key={session.id}
                      onClick={() => {
                        setCurrentChatId(session.id);
                        setIsDrawerOpen(false);
                      }}
                      className={`group p-2.5 rounded-xl border text-xs transition cursor-pointer flex items-center justify-between gap-2 ${
                        currentChatId === session.id
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                          : 'bg-slate-900 border-slate-800/80 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        {editingChatId === session.id ? (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editChatTitle}
                              onChange={e => setEditChatTitle(e.target.value)}
                              className="w-full px-2 py-0.5 rounded bg-slate-800 text-white text-xs border border-emerald-500 focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveRename(session.id)}
                              className="p-1 text-emerald-400 hover:text-emerald-300"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="font-semibold truncate">{session.title}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setEditingChatId(session.id);
                            setEditChatTitle(session.title);
                          }}
                          className="p-1 text-slate-400 hover:text-emerald-400"
                          title="Rename chat"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => handleDeleteChat(session.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-400"
                          title="Delete chat"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Main Chat Pane */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-xs'
                        : msg.error
                        ? 'bg-rose-950/50 border border-rose-500/40 text-rose-200 rounded-bl-xs'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-xs'
                    }`}
                  >
                    {/* Attachment Badge */}
                    {msg.attachedFile && (
                      <div className="mb-2 p-2 rounded-xl bg-black/20 border border-white/10 flex items-center gap-2 text-xs">
                        <FileText className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span className="truncate font-semibold">{msg.attachedFile.name}</span>
                      </div>
                    )}

                    {/* Formatted Markdown-like text */}
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.text}
                    </div>

                    {/* Structured Action Card */}
                    {msg.structuredAction && msg.structuredAction.status === 'pending' && (
                      <div className="mt-3 p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>Action Confirmation Required</span>
                        </div>
                        <p className="text-xs text-slate-300">
                          SchoolSync Assistant has structured this update for you. Click confirm to apply directly to Firestore:
                        </p>
                        <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300">
                          {JSON.stringify(msg.structuredAction.data, null, 2)}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleConfirmAction(msg.id, msg.structuredAction!)}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm & Apply</span>
                          </button>
                          <button
                            onClick={() => handleCancelAction(msg.id)}
                            className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {msg.structuredAction && msg.structuredAction.status === 'confirmed' && (
                      <div className="mt-2.5 p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold">Action Confirmed & Synced to School Database</span>
                      </div>
                    )}

                    <div className="mt-1.5 text-[10px] opacity-60 text-right">
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Retry Button if message failed */}
                  {msg.error && (
                    <button
                      onClick={() => handleSendMessage('Please retry my last request.')}
                      className="mt-1 flex items-center gap-1 text-xs text-emerald-400 hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry Request</span>
                    </button>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 text-xs w-fit">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-slate-300 font-medium ml-1">SchoolSync Assistant is thinking...</span>
                </div>
              )}

              {/* Import Preview Table Modal / Card BEFORE committing */}
              {importPreview && (
                <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/50 shadow-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-white">
                          Roster Import Preview ({importPreview.students.length} Students Detected)
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Verify student data before adding to school register
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setImportPreview(null)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Scrollable Editable Preview Table */}
                  <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-850 text-slate-400 uppercase text-[10px] sticky top-0">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">GR No</th>
                          <th className="p-2">Student Name</th>
                          <th className="p-2">Father Name</th>
                          <th className="p-2">Grade</th>
                          <th className="p-2">Gender</th>
                          <th className="p-2">B-Form / Contact</th>
                          <th className="p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {importPreview.students.map((st, i) => {
                          const isDuplicate = students.some(
                            existing => (existing.grNumber && st.grNumber && existing.grNumber.toLowerCase() === String(st.grNumber).toLowerCase())
                          );
                          const isMissingFields = !st.name || !st.fatherName || !st.grade;

                          return (
                            <tr key={i} className="hover:bg-slate-850/50">
                              <td className="p-2 font-mono text-[11px]">{i + 1}</td>
                              <td className="p-2 font-mono text-emerald-300">{st.grNumber || 'Auto'}</td>
                              <td className="p-2 font-semibold text-white">{st.name || 'Missing Name'}</td>
                              <td className="p-2">{st.fatherName || <span className="text-amber-400 text-[10px]">Required</span>}</td>
                              <td className="p-2">{st.grade || 'Class I'}</td>
                              <td className="p-2">{st.gender || 'Male'}</td>
                              <td className="p-2 font-mono text-[11px]">{st.bFormNumber || st.guardianContact || '-'}</td>
                              <td className="p-2">
                                {isDuplicate ? (
                                  <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                                    Duplicate GR
                                  </span>
                                ) : isMissingFields ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                                    Needs Review
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                                    Ready
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-slate-400">
                      Target: <strong>{targetSchool?.name || schools[0]?.name || 'Primary Campus'}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setImportPreview(null)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCommitPreviewStudents}
                        className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Add all {importPreview.students.length} students</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestion Chips */}
            {messages.length <= 2 && (
              <div className="px-3 py-2 border-t border-slate-800/80 bg-slate-900/40 flex items-center gap-2 overflow-x-auto scrollbar-none">
                {[
                  { label: "📊 Today's Attendance Overview", text: "Give me an attendance summary for today." },
                  { label: "👥 How to Bulk Enroll", text: "How can I bulk enroll students from an Excel or PDF document?" },
                  { label: "👩‍🏫 Check Teacher Leaves", text: "Show me teacher attendance and absent days." },
                  { label: "⚠️ Students Needing Attention", text: "Which students have low attendance or missing B-Forms?" },
                  { label: "📝 Draft School Report", text: "Draft an SEF monthly compliance monitoring report." },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(chip.text)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-300 text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center gap-1 hover:border-emerald-500/50"
                  >
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Attachment preview banner */}
            {attachedFile && (
              <div className="px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-emerald-300 truncate">
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  <span className="truncate font-semibold">{attachedFile.name}</span>
                  <span className="text-[10px] text-slate-500">
                    ({Math.round(attachedFile.size / 1024)} KB)
                  </span>
                </div>
                <button
                  onClick={() => setAttachedFile(null)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/90 flex items-center gap-2 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 sm:p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer border border-slate-700 shrink-0"
                title="Attach Document, Excel, CSV or PDF"
              >
                <Paperclip className="w-4 h-4 text-emerald-400" />
              </button>

              <textarea
                value={inputMessage}
                onChange={e => setInputMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder={
                  targetSchool
                    ? `Message SchoolSync for ${targetSchool.name}... (e.g. mark Ali absent, search GR-101)`
                    : 'Ask anything across all schools or paste student/teacher roster...'
                }
                className="flex-1 py-2.5 px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-500 transition resize-none max-h-24"
              />

              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={isLoading || (!inputMessage.trim() && !attachedFile)}
                className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
