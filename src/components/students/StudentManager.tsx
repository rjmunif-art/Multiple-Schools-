import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  GraduationCap,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  ArrowRightLeft,
  ArrowUpCircle,
  Camera,
  FileText,
  User,
  Phone,
  MapPin,
  Check,
  AlertCircle,
  Eye,
  Calendar,
  School as SchoolIcon,
  Upload,
  X,
  CreditCard,
  Loader2,
  History,
  Archive,
  Award,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { Student, StudentStatus, StudentPhotoRecord } from '../../types';
import { pickImageFromFileMemory } from '../../utils/fileUpload';
import { CustomSelect } from '../common/CustomSelect';

export const StudentManager: React.FC = () => {
  const {
    students,
    schools,
    addStudent,
    updateStudent,
    deleteStudent,
    promoteStudents,
    transferStudent,
    activeSchoolId,
    setActiveSchoolId,
    currentUser,
    openPhotoModal,
    activeAcademicYear,
    setIsAIAssistantOpen,
  } = useApp();

  const isOperator = currentUser?.role === 'operator';
  const isHT = currentUser?.role === 'head_teacher';
  const isSupervisor = currentUser?.role === 'supervisor';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [scopeTab, setScopeTab] = useState<'active' | 'passed' | 'all'>('active');

  // Selected students for batch promotion
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [targetNextGrade, setTargetNextGrade] = useState('Class II');

  // Transfer Modal
  const [transferringStudent, setTransferringStudent] = useState<Student | null>(null);
  const [targetTransferSchoolId, setTargetTransferSchoolId] = useState('');

  // Photo History Modal
  const [viewingPhotoHistoryStudent, setViewingPhotoHistoryStudent] = useState<Student | null>(null);

  // In-App Deletion Modals
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);

  // Add / Edit Modal
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form Fields
  const [formSchoolId, setFormSchoolId] = useState(
    activeSchoolId !== 'all' ? activeSchoolId : (schools[0]?.id || '')
  );
  const [formGrNumber, setFormGrNumber] = useState('');
  const [formName, setFormName] = useState('');
  const [formFatherName, setFormFatherName] = useState('');
  const [formMotherName, setFormMotherName] = useState('');
  const [formMotherCnic, setFormMotherCnic] = useState('');
  const [formGender, setFormGender] = useState<'Male' | 'Female'>('Male');
  const [formDob, setFormDob] = useState('2017-01-01');
  const [formBForm, setFormBForm] = useState('');
  const [formGrade, setFormGrade] = useState('Class I');
  const [formSection, setFormSection] = useState('A');
  const [formAdmissionDate, setFormAdmissionDate] = useState('2024-04-01');
  const [formPreviousSchool, setFormPreviousSchool] = useState('');
  const [formStatus, setFormStatus] = useState<StudentStatus>('Active');
  const [formGuardianContact, setFormGuardianContact] = useState('+92 300 ');
  const [formAddress, setFormAddress] = useState('');
  const [formVillage, setFormVillage] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  
  // Document photos & history
  const [formProfilePic, setFormProfilePic] = useState<string | undefined>(undefined);
  const [formPhotoHistory, setFormPhotoHistory] = useState<StudentPhotoRecord[]>([]);
  const [formBFormPic, setFormBFormPic] = useState<string | undefined>(undefined);
  const [formFatherNicFrontPic, setFormFatherNicFrontPic] = useState<string | undefined>(undefined);
  const [formFatherNicBackPic, setFormFatherNicBackPic] = useState<string | undefined>(undefined);
  const [formMotherNicFrontPic, setFormMotherNicFrontPic] = useState<string | undefined>(undefined);
  const [formMotherNicBackPic, setFormMotherNicBackPic] = useState<string | undefined>(undefined);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const gradeList = ['Kachi', 'Class I', 'Class II', 'Class III', 'Class IV', 'Class V', 'Class VI', 'Class VII', 'Class VIII'];

  // Filtered students
  const filteredStudents = useMemo(() => {
    let list = [...students];

    // School filtering
    if (activeSchoolId !== 'all') {
      list = list.filter(s => s.schoolId === activeSchoolId);
    } else if (isHT && currentUser?.schoolId) {
      list = list.filter(s => s.schoolId === currentUser.schoolId);
    }

    // Quick Scope Tab (Active vs Passed Out Archive vs All)
    if (scopeTab === 'active') {
      list = list.filter(s => s.status === 'Active');
    } else if (scopeTab === 'passed') {
      list = list.filter(s => s.status === 'Passed' || s.status === 'Withdrawn');
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.fatherName.toLowerCase().includes(q) ||
          s.grNumber.toLowerCase().includes(q) ||
          s.bFormNumber.toLowerCase().includes(q) ||
          s.village.toLowerCase().includes(q)
      );
    }

    if (gradeFilter !== 'all') {
      list = list.filter(s => s.grade === gradeFilter);
    }

    if (statusFilter !== 'all') {
      list = list.filter(s => s.status === statusFilter);
    }

    if (genderFilter !== 'all') {
      list = list.filter(s => s.gender === genderFilter);
    }

    return list;
  }, [students, activeSchoolId, isHT, currentUser, scopeTab, searchQuery, gradeFilter, statusFilter, genderFilter]);

  const passedCount = useMemo(() => {
    return students.filter(s => {
      const schMatch = activeSchoolId === 'all' || s.schoolId === activeSchoolId;
      return schMatch && (s.status === 'Passed' || s.status === 'Withdrawn');
    }).length;
  }, [students, activeSchoolId]);

  const activeCount = useMemo(() => {
    return students.filter(s => {
      const schMatch = activeSchoolId === 'all' || s.schoolId === activeSchoolId;
      return schMatch && s.status === 'Active';
    }).length;
  }, [students, activeSchoolId]);

  const currentClassStudents = useMemo(() => {
    if (gradeFilter === 'all') return [];
    return students.filter(s => {
      const schMatch = activeSchoolId === 'all' || s.schoolId === activeSchoolId;
      return schMatch && s.grade.toLowerCase() === gradeFilter.toLowerCase();
    });
  }, [students, activeSchoolId, gradeFilter]);

  const currentClassTotal = currentClassStudents.length;
  const currentClassBoys = currentClassStudents.filter(s => s.gender === 'Male').length;
  const currentClassGirls = currentClassStudents.filter(s => s.gender === 'Female').length;

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormSchoolId(activeSchoolId !== 'all' ? activeSchoolId : (schools[0]?.id || ''));
    setFormGrNumber('GR-' + Math.floor(1000 + Math.random() * 9000));
    setFormName('');
    setFormFatherName('');
    setFormMotherName('');
    setFormMotherCnic('');
    setFormGender('Male');
    setFormDob('2017-05-10');
    setFormBForm('4' + Math.floor(1000 + Math.random() * 9000) + '-00' + Math.floor(10000 + Math.random() * 90000) + '-1');
    setFormGrade('Class I');
    setFormSection('A');
    setFormAdmissionDate('2024-04-10');
    setFormPreviousSchool('');
    setFormStatus('Active');
    setFormGuardianContact('+92 300 1234567');
    setFormAddress('');
    setFormVillage('');
    setFormRemarks('');
    setFormProfilePic(undefined);
    setFormPhotoHistory([]);
    setFormBFormPic(undefined);
    setFormFatherNicFrontPic(undefined);
    setFormFatherNicBackPic(undefined);
    setFormMotherNicFrontPic(undefined);
    setFormMotherNicBackPic(undefined);
    setErrorMsg('');
    setShowStudentModal(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormSchoolId(student.schoolId);
    setFormGrNumber(student.grNumber);
    setFormName(student.name);
    setFormFatherName(student.fatherName);
    setFormMotherName(student.motherName || '');
    setFormMotherCnic(student.motherCnic || '');
    setFormGender(student.gender);
    setFormDob(student.dob);
    setFormBForm(student.bFormNumber);
    setFormGrade(student.grade);
    setFormSection(student.section);
    setFormAdmissionDate(student.admissionDate);
    setFormPreviousSchool(student.previousSchool || '');
    setFormStatus(student.status);
    setFormGuardianContact(student.guardianContact);
    setFormAddress(student.address);
    setFormVillage(student.village);
    setFormRemarks(student.remarks || '');
    setFormProfilePic(student.profilePic);
    setFormPhotoHistory(student.photoHistory || []);
    setFormBFormPic(student.formBPic);
    setFormFatherNicFrontPic(student.fatherNicFrontPic || student.fatherNicPic);
    setFormFatherNicBackPic(student.fatherNicBackPic);
    setFormMotherNicFrontPic(student.motherNicFrontPic || student.motherNicPic);
    setFormMotherNicBackPic(student.motherNicBackPic);
    setErrorMsg('');
    setShowStudentModal(true);
  };

  // Real upload from phone memory/gallery/camera
  const handlePickPhoto = async (
    field: 'profile' | 'bform' | 'fatherNicFront' | 'fatherNicBack' | 'motherNicFront' | 'motherNicBack'
  ) => {
    try {
      setUploadingField(field);
      const isProfile = field === 'profile';
      const dataUrl = await pickImageFromFileMemory(
        isProfile
          ? { maxWidth: 280, maxHeight: 280, quality: 0.7 }
          : { maxWidth: 640, maxHeight: 640, quality: 0.65 }
      );
      
      if (field === 'profile') {
        // If updating profile pic, automatically archive current photo into photoHistory
        if (formProfilePic && formProfilePic !== dataUrl) {
          const archivedEntry: StudentPhotoRecord = {
            id: 'photo-' + Date.now(),
            url: formProfilePic,
            academicYear: activeAcademicYear || '2025-26',
            uploadedDate: new Date().toISOString().split('T')[0],
            notes: `Archived during ${activeAcademicYear} annual photo update`
          };
          setFormPhotoHistory(prev => [archivedEntry, ...prev]);
        }
        setFormProfilePic(dataUrl);
      }
      if (field === 'bform') setFormBFormPic(dataUrl);
      if (field === 'fatherNicFront') setFormFatherNicFrontPic(dataUrl);
      if (field === 'fatherNicBack') setFormFatherNicBackPic(dataUrl);
      if (field === 'motherNicFront') setFormMotherNicFrontPic(dataUrl);
      if (field === 'motherNicBack') setFormMotherNicBackPic(dataUrl);
    } catch (err: any) {
      console.log('File selection cancelled', err);
    } finally {
      setUploadingField(null);
    }
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formName.trim() || !formFatherName.trim() || !formGrNumber.trim()) {
      setErrorMsg('Please enter Student Name, Father Name, and GR Number.');
      return;
    }

    // Duplicate GR number check within same school
    const isDuplicate = students.some(
      s => s.schoolId === formSchoolId && s.grNumber.trim().toLowerCase() === formGrNumber.trim().toLowerCase() && s.id !== editingStudent?.id
    );
    if (isDuplicate) {
      setErrorMsg(`GR Number ${formGrNumber} already exists in this school! GR numbers must be unique within a school.`);
      return;
    }

    const payload = {
      schoolId: formSchoolId,
      grNumber: formGrNumber.trim(),
      name: formName.trim(),
      fatherName: formFatherName.trim(),
      motherName: formMotherName.trim() || undefined,
      motherCnic: formMotherCnic.trim() || undefined,
      gender: formGender,
      dob: formDob,
      bFormNumber: formBForm.trim(),
      grade: formGrade,
      section: formSection,
      admissionDate: formAdmissionDate,
      previousSchool: formPreviousSchool.trim() || undefined,
      status: formStatus,
      passedOutDate: formStatus === 'Passed' ? (editingStudent?.passedOutDate || new Date().toISOString().split('T')[0]) : undefined,
      guardianContact: formGuardianContact.trim(),
      address: formAddress.trim(),
      village: formVillage.trim(),
      remarks: formRemarks.trim() || undefined,
      profilePic: formProfilePic,
      photoHistory: formPhotoHistory,
      formBPic: formBFormPic,
      fatherNicPic: formFatherNicFrontPic,
      fatherNicFrontPic: formFatherNicFrontPic,
      fatherNicBackPic: formFatherNicBackPic,
      motherNicPic: formMotherNicFrontPic,
      motherNicFrontPic: formMotherNicFrontPic,
      motherNicBackPic: formMotherNicBackPic,
    };

    if (editingStudent) {
      updateStudent({
        ...editingStudent,
        ...payload,
      });
    } else {
      addStudent(payload);
    }

    setShowStudentModal(false);
  };

  const handlePromoteBatch = () => {
    if (selectedStudentIds.length === 0) return;
    promoteStudents(selectedStudentIds, targetNextGrade);
    setSelectedStudentIds([]);
    setShowPromoteModal(false);
  };

  const handleExecuteTransfer = () => {
    if (!transferringStudent || !targetTransferSchoolId) return;
    transferStudent(transferringStudent.id, targetTransferSchoolId);
    setTransferringStudent(null);
  };

  return (
    <div className="space-y-4 pb-12 w-full max-w-full overflow-x-hidden">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-400" />
            Student Admission & Records Directory ({filteredStudents.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeSchoolId === 'all'
              ? 'Enrolled students and permanent passed-out archives across all SEF schools'
              : `Records for ${schools.find(s => s.id === activeSchoolId)?.name}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedStudentIds.length > 0 && (
            <>
              <button
                onClick={() => setShowPromoteModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow transition cursor-pointer"
              >
                <ArrowUpCircle className="w-4 h-4" />
                Promote ({selectedStudentIds.length})
              </button>

              {(isOperator || isHT) && (
                <button
                  onClick={() => setShowBatchDeleteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition cursor-pointer"
                  title="Delete selected students"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedStudentIds.length})
                </button>
              )}
            </>
          )}

          {!isSupervisor && (
            <>
              <button
                onClick={() => setIsAIAssistantOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 border border-teal-500/40 text-white font-bold text-xs shadow transition cursor-pointer"
                title="Upload PDF or Excel file to auto-extract and enroll students with AI"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>AI Bulk Enroll (PDF/Excel)</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Student Admission
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Summary Banner: Total Schools, All Students or Class 5 Total Strength */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 p-3.5 sm:p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Total Schools Count */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center gap-2">
            <SchoolIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">Total Schools</span>
              <strong className="text-sm text-white font-mono">{schools.length} Campuses</strong>
            </div>
          </div>

          {/* All Students or Selected Class Total Count */}
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-teal-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold">
                {gradeFilter === 'all' ? 'All Registered Students' : `${gradeFilter} Total Strength`}
              </span>
              <strong className="text-sm text-emerald-400 font-mono">
                {gradeFilter === 'all' ? `${filteredStudents.length} Students` : `${currentClassTotal} Students`}
              </strong>
            </div>
          </div>

          {/* Class Gender Breakdown if Class is Selected */}
          {gradeFilter !== 'all' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-blue-950/80 border border-blue-700/60 text-blue-300 font-bold">
                👦 Boys: {currentClassBoys}
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-rose-950/80 border border-rose-700/60 text-rose-300 font-bold">
                👧 Girls: {currentClassGirls}
              </span>
            </div>
          )}
        </div>

        {/* Interactive Grade Counters with Instant Filtering */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setGradeFilter('all')}
            className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
              gradeFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Classes ({activeCount})
          </button>
          {gradeList.map(g => {
            const count = students.filter(s => {
              const matchSchool = activeSchoolId === 'all' || s.schoolId === activeSchoolId;
              return matchSchool && s.grade.toLowerCase() === g.toLowerCase() && s.status === 'Active';
            }).length;
            const isSelected = gradeFilter.toLowerCase() === g.toLowerCase();

            return (
              <button
                key={g}
                onClick={() => setGradeFilter(g)}
                className={`px-2.5 py-1 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-xs ring-2 ring-teal-400'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {g} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Scope Switcher Tabs: Active vs Passed Out Archive vs All */}
      <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs">
        <button
          onClick={() => setScopeTab('active')}
          className={`flex-1 py-1.5 px-3 rounded-xl font-semibold transition cursor-pointer text-center ${
            scopeTab === 'active'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Active Students ({activeCount})
        </button>

        <button
          onClick={() => setScopeTab('passed')}
          className={`flex-1 py-1.5 px-3 rounded-xl font-semibold transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            scopeTab === 'passed'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Passed Out / Alumni ({passedCount})
        </button>

        <button
          onClick={() => setScopeTab('all')}
          className={`flex-1 py-1.5 px-3 rounded-xl font-semibold transition cursor-pointer text-center ${
            scopeTab === 'all'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All Records ({students.length})
        </button>
      </div>

      {/* Filter and Search Box */}
      <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search student name, father name, GR number (e.g. GR-1001), B-Form, village..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={gradeFilter}
            onChange={e => setGradeFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Grades</option>
            {gradeList.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Passed">Passed (Graduated)</option>
            <option value="Transferred">Transferred</option>
            <option value="Withdrawn">Withdrawn</option>
            <option value="Dropout">Dropout</option>
          </select>

          <select
            value={genderFilter}
            onChange={e => setGenderFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Genders</option>
            <option value="Male">Boys (Male)</option>
            <option value="Female">Girls (Female)</option>
          </select>

          {selectedStudentIds.length > 0 && (
            <button
              onClick={() => setSelectedStudentIds([])}
              className="text-xs text-slate-400 hover:text-white ml-auto"
            >
              Clear selection ({selectedStudentIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/80 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={e => {
                      if (e.target.checked) setSelectedStudentIds(filteredStudents.map(s => s.id));
                      else setSelectedStudentIds([]);
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="p-3">Student & Father</th>
                <th className="p-3">GR # & Form-B</th>
                <th className="p-3">School & Grade</th>
                <th className="p-3">Village / Contact</th>
                <th className="p-3">Documents & History</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No students matching search filters
                  </td>
                </tr>
              ) : (
                filteredStudents.map(st => {
                  const sch = schools.find(s => s.id === st.schoolId);
                  const isChecked = selectedStudentIds.includes(st.id);
                  const fatherFront = st.fatherNicFrontPic || st.fatherNicPic;
                  const fatherBack = st.fatherNicBackPic;
                  const motherFront = st.motherNicFrontPic || st.motherNicPic;
                  const motherBack = st.motherNicBackPic;
                  const isPassedOut = st.status === 'Passed';
                  const hasPhotoHistory = st.photoHistory && st.photoHistory.length > 0;

                  return (
                    <tr key={st.id} className={`hover:bg-slate-850 transition ${isPassedOut ? 'bg-slate-900/50 opacity-90' : ''}`}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) setSelectedStudentIds([...selectedStudentIds, st.id]);
                            else setSelectedStudentIds(selectedStudentIds.filter(id => id !== st.id));
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Profile avatar / click to view - enlarged to w-12 h-12 */}
                          <button
                            type="button"
                            onClick={() => {
                              if (st.profilePic) openPhotoModal(`Student: ${st.name}`, st.profilePic);
                              else openPhotoModal(`Student: ${st.name}`, '', 'No profile photo uploaded');
                            }}
                            className="w-12 h-12 rounded-2xl bg-slate-800 border-2 border-slate-700 text-emerald-400 flex items-center justify-center font-black text-sm shrink-0 overflow-hidden cursor-pointer hover:border-emerald-500 hover:scale-105 transition shadow-sm"
                            title="View student photo"
                          >
                            {st.profilePic ? (
                              <img src={st.profilePic} alt={st.name} className="w-full h-full object-cover" />
                            ) : (
                              st.name.charAt(0)
                            )}
                          </button>
                          <div>
                            <div className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5 leading-snug">
                              <span>{st.name}</span>
                              <span className="text-[11px] text-slate-400 font-normal">({st.gender})</span>
                              {isPassedOut && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-teal-900/60 text-teal-300 border border-teal-700/60 font-semibold">
                                  Alumni
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-300 font-medium mt-0.5">
                              S/O {st.fatherName} {st.motherName ? `• M/O ${st.motherName}` : ''}
                              {st.motherCnic ? (
                                <span className="text-[11px] text-emerald-300/90 font-mono ml-1">
                                  (NIC: {st.motherCnic})
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-mono font-bold text-emerald-400">{st.grNumber}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{st.bFormNumber || 'No Form-B'}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-white">{sch?.name || 'School'}</div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {st.grade} - Sec {st.section}
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="text-white">{st.village || st.address}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{st.guardianContact}</div>
                      </td>

                      {/* Documents: Form-B, Father Front/Back, Mother Front/Back, Photo History */}
                      <td className="p-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {/* Form B */}
                          <button
                            type="button"
                            onClick={() => {
                              if (st.formBPic) openPhotoModal(`Form-B: ${st.name}`, st.formBPic, `B-Form #: ${st.bFormNumber}`);
                              else alert('No Form-B document scanned yet for this student.');
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                              st.formBPic
                                ? 'bg-blue-950/60 text-blue-300 border-blue-700 hover:bg-blue-900'
                                : 'bg-slate-800 text-slate-500 border-slate-700'
                            }`}
                            title="NADRA Form B Document"
                          >
                            Form-B {st.formBPic ? '✓' : ''}
                          </button>

                          {/* Father NIC Front */}
                          <button
                            type="button"
                            onClick={() => {
                              if (fatherFront) openPhotoModal(`Father NIC Front: ${st.fatherName}`, fatherFront);
                              else alert('No Father CNIC Front side uploaded.');
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                              fatherFront
                                ? 'bg-purple-950/60 text-purple-300 border-purple-700 hover:bg-purple-900'
                                : 'bg-slate-800 text-slate-500 border-slate-700'
                            }`}
                            title="Father CNIC Front"
                          >
                            Father Front {fatherFront ? '✓' : ''}
                          </button>

                          {/* Father NIC Back */}
                          <button
                            type="button"
                            onClick={() => {
                              if (fatherBack) openPhotoModal(`Father NIC Back: ${st.fatherName}`, fatherBack);
                              else alert('No Father CNIC Back side uploaded.');
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                              fatherBack
                                ? 'bg-purple-950/60 text-purple-300 border-purple-700 hover:bg-purple-900'
                                : 'bg-slate-800 text-slate-500 border-slate-700'
                            }`}
                            title="Father CNIC Back"
                          >
                            Father Back {fatherBack ? '✓' : ''}
                          </button>

                          {/* Mother NIC Front */}
                          <button
                            type="button"
                            onClick={() => {
                              if (motherFront) openPhotoModal(`Mother NIC Front: ${st.motherName || st.name}`, motherFront, st.motherCnic ? `CNIC: ${st.motherCnic}` : undefined);
                              else alert('No Mother CNIC Front side uploaded.');
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                              motherFront
                                ? 'bg-rose-950/60 text-rose-300 border-rose-700 hover:bg-rose-900'
                                : 'bg-slate-800 text-slate-500 border-slate-700'
                            }`}
                            title="Mother CNIC Front"
                          >
                            Mother Front {motherFront ? '✓' : ''}
                          </button>

                          {/* Mother NIC Back */}
                          <button
                            type="button"
                            onClick={() => {
                              if (motherBack) openPhotoModal(`Mother NIC Back: ${st.motherName || st.name}`, motherBack, st.motherCnic ? `CNIC: ${st.motherCnic}` : undefined);
                              else alert('No Mother CNIC Back side uploaded.');
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition ${
                              motherBack
                                ? 'bg-rose-950/60 text-rose-300 border-rose-700 hover:bg-rose-900'
                                : 'bg-slate-800 text-slate-500 border-slate-700'
                            }`}
                            title="Mother CNIC Back"
                          >
                            Mother Back {motherBack ? '✓' : ''}
                          </button>

                          {/* Annual Photo Archive Timeline */}
                          <button
                            type="button"
                            onClick={() => setViewingPhotoHistoryStudent(st)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition flex items-center gap-1 ${
                              hasPhotoHistory
                                ? 'bg-amber-950/60 text-amber-300 border-amber-700 hover:bg-amber-900'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                            }`}
                            title="View Annual SEF Photo History Archive"
                          >
                            <History className="w-3 h-3" />
                            <span>Photos ({1 + (st.photoHistory?.length || 0)})</span>
                          </button>
                        </div>
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          st.status === 'Active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          st.status === 'Passed' ? 'bg-teal-950 text-teal-300 border border-teal-800' :
                          st.status === 'Transferred' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                          st.status === 'Dropout' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                          'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {st.status}
                        </span>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isSupervisor && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(st)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                                title="Edit Student Record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => {
                                  setTransferringStudent(st);
                                  setTargetTransferSchoolId(schools.find(s => s.id !== st.schoolId)?.id || '');
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800"
                                title="Transfer to another school"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                              </button>

                              {(isOperator || isHT) && (
                                <button
                                  onClick={() => setStudentToDelete(st)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                                  title="Delete student record"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Annual Photo Archive Timeline Modal */}
      {viewingPhotoHistoryStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-white max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    SEF Annual Photo Archive: {viewingPhotoHistoryStudent.name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    GR #: {viewingPhotoHistoryStudent.grNumber} • {viewingPhotoHistoryStudent.grade}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingPhotoHistoryStudent(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Current Active Photo */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-emerald-600/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Current Active Photo ({activeAcademicYear || '2026-27'})
                  </span>
                  <span className="text-[10px] text-slate-400">Latest Profile Photo</span>
                </div>
                {viewingPhotoHistoryStudent.profilePic ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={viewingPhotoHistoryStudent.profilePic}
                      alt="Current"
                      className="w-16 h-16 rounded-xl object-cover border border-slate-700 shadow cursor-pointer"
                      onClick={() => openPhotoModal(`Current: ${viewingPhotoHistoryStudent.name}`, viewingPhotoHistoryStudent.profilePic!)}
                    />
                    <div className="text-xs text-slate-300">
                      <div>Active in school attendance registers and identification cards.</div>
                      <button
                        onClick={() => openPhotoModal(`Current: ${viewingPhotoHistoryStudent.name}`, viewingPhotoHistoryStudent.profilePic!)}
                        className="mt-1 text-[11px] text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" /> View full resolution
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No profile photo currently uploaded.</p>
                )}
              </div>

              {/* Historical Photos Archive */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Previous Years Photos Archive (SEF Annual Audit Trail)
                </h4>

                {(!viewingPhotoHistoryStudent.photoHistory || viewingPhotoHistoryStudent.photoHistory.length === 0) ? (
                  <div className="p-4 rounded-xl bg-slate-800/40 text-center text-xs text-slate-400 border border-slate-800">
                    No previous annual photos archived yet. When this student's photo is updated for a new academic year, the previous photo is automatically archived here.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {viewingPhotoHistoryStudent.photoHistory.map((ph, idx) => (
                      <div key={ph.id || idx} className="p-2.5 rounded-xl bg-slate-800 border border-slate-700/80">
                        <div className="w-full h-28 rounded-lg overflow-hidden bg-black/40 mb-2 flex items-center justify-center">
                          <img
                            src={ph.url}
                            alt={ph.academicYear}
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                            onClick={() => openPhotoModal(`Photo ${ph.academicYear}: ${viewingPhotoHistoryStudent.name}`, ph.url)}
                          />
                        </div>
                        <div className="text-[11px] font-bold text-amber-300">{ph.academicYear}</div>
                        <div className="text-[10px] text-slate-400">{ph.uploadedDate}</div>
                        {ph.notes && <div className="text-[9px] text-slate-500 truncate mt-0.5">{ph.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingPhotoHistoryStudent(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-white max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingStudent ? `Edit Student: ${editingStudent.name}` : 'New Student Admission Entry'}
                </h3>
                <p className="text-xs text-slate-400">
                  Complete bio-data, NADRA Form-B, parent CNIC front/back copies & annual photo update.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStudentModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-200">School Campus *</label>
                  <select
                    value={formSchoolId}
                    onChange={e => setFormSchoolId(e.target.value)}
                    disabled={isHT}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">General Register (GR) Number *</label>
                  <input
                    type="text"
                    value={formGrNumber}
                    onChange={e => setFormGrNumber(e.target.value)}
                    placeholder="e.g. GR-1001"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Student Full Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Muhammad Kashif Ali"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Father's Name *</label>
                  <input
                    type="text"
                    value={formFatherName}
                    onChange={e => setFormFatherName(e.target.value)}
                    placeholder="e.g. Allah Bux Chandio"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Mother's Name (Optional)</label>
                  <input
                    type="text"
                    value={formMotherName}
                    onChange={e => setFormMotherName(e.target.value)}
                    placeholder="e.g. Zubaida Khatoon"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Mother's CNIC / NIC #</label>
                  <input
                    type="text"
                    value={formMotherCnic}
                    onChange={e => setFormMotherCnic(e.target.value)}
                    placeholder="41201-9876543-2"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Gender *</label>
                  <CustomSelect
                    value={formGender}
                    onChange={val => setFormGender(val as any)}
                    options={[
                      { value: 'Male', label: 'Male (Boy)' },
                      { value: 'Female', label: 'Female (Girl)' },
                    ]}
                    placeholder="Select gender..."
                    customPlaceholder="Type custom gender..."
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Date of Birth</label>
                  <input
                    type="date"
                    value={formDob}
                    onChange={e => setFormDob(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-200">B-Form / CNIC #</label>
                  <input
                    type="text"
                    value={formBForm}
                    onChange={e => setFormBForm(e.target.value)}
                    placeholder="41201-0022334-1"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Grade / Class *</label>
                  <CustomSelect
                    value={formGrade}
                    onChange={val => setFormGrade(val)}
                    options={gradeList}
                    placeholder="Select class..."
                    customPlaceholder="Type custom class (e.g. Class IX)..."
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Section</label>
                  <CustomSelect
                    value={formSection}
                    onChange={val => setFormSection(val)}
                    options={['A', 'B', 'C', 'D']}
                    placeholder="Section..."
                    customPlaceholder="Type section..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Guardian Contact Phone *</label>
                  <input
                    type="text"
                    value={formGuardianContact}
                    onChange={e => setFormGuardianContact(e.target.value)}
                    placeholder="+92 301 9876541"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Village / Goth</label>
                  <input
                    type="text"
                    value={formVillage}
                    onChange={e => setFormVillage(e.target.value)}
                    placeholder="e.g. Goth Dhani Bux Chandio"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Student Status</label>
                  <CustomSelect
                    value={formStatus}
                    onChange={val => setFormStatus(val as any)}
                    options={[
                      { value: 'Active', label: 'Active' },
                      { value: 'Passed', label: 'Passed (Graduated / Alumni)' },
                      { value: 'Transferred', label: 'Transferred' },
                      { value: 'Withdrawn', label: 'Withdrawn' },
                      { value: 'Dropout', label: 'Dropout' },
                    ]}
                    placeholder="Select status..."
                    customPlaceholder="Type custom status..."
                  />
                </div>
              </div>

              {formStatus === 'Passed' && (
                <div className="p-3 bg-teal-950/60 border border-teal-700/60 rounded-xl text-teal-200 text-xs flex items-center gap-2">
                  <Archive className="w-4 h-4 text-teal-400 shrink-0" />
                  <span>
                    <strong>Permanent Record Retention:</strong> This student will remain permanently archived in this school system with complete attendance records, exam results, and bio-data.
                  </span>
                </div>
              )}

              {/* Uploads Section: Profile Pic, Form-B, Father NIC Front & Back */}
              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    Student Photo & Identification Documents (Phone Memory / Gallery)
                  </span>
                  <span className="text-[10px] text-slate-400">Click button to open phone files</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* 1. Profile Photo */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-200">1. Student Profile Photo</span>
                      {formProfilePic && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    {formProfilePic && (
                      <div className="relative mb-2 w-full h-24 rounded-lg overflow-hidden bg-black/40 border border-slate-700 flex items-center justify-center">
                        <img src={formProfilePic} alt="Profile" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => openPhotoModal('Student Profile Photo', formProfilePic)}
                          className="absolute bottom-1 right-1 p-1 bg-black/70 rounded text-white hover:text-emerald-400"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-auto">
                      <button
                        type="button"
                        onClick={() => handlePickPhoto('profile')}
                        disabled={uploadingField === 'profile'}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        {uploadingField === 'profile' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {formProfilePic ? 'Update Photo (Keep Old in Archive)' : 'Upload from Phone'}
                      </button>
                      {formProfilePic && (
                        <button
                          type="button"
                          onClick={() => setFormProfilePic(undefined)}
                          className="p-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 hover:text-white"
                          title="Remove Photo"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. NADRA Form-B Certificate */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-200">2. Form-B Document</span>
                      {formBFormPic && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    {formBFormPic && (
                      <div className="relative mb-2 w-full h-24 rounded-lg overflow-hidden bg-black/40 border border-slate-700 flex items-center justify-center">
                        <img src={formBFormPic} alt="Form-B" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => openPhotoModal('Form-B Document', formBFormPic)}
                          className="absolute bottom-1 right-1 p-1 bg-black/70 rounded text-white hover:text-blue-400"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-auto">
                      <button
                        type="button"
                        onClick={() => handlePickPhoto('bform')}
                        disabled={uploadingField === 'bform'}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        {uploadingField === 'bform' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {formBFormPic ? 'Change Form-B' : 'Upload Form-B'}
                      </button>
                      {formBFormPic && (
                        <button
                          type="button"
                          onClick={() => setFormBFormPic(undefined)}
                          className="p-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 hover:text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 3. Father CNIC Front Side */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-200">3. Father CNIC (Front Side)</span>
                      {formFatherNicFrontPic && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    {formFatherNicFrontPic && (
                      <div className="relative mb-2 w-full h-24 rounded-lg overflow-hidden bg-black/40 border border-slate-700 flex items-center justify-center">
                        <img src={formFatherNicFrontPic} alt="Father CNIC Front" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => openPhotoModal('Father CNIC Front Side', formFatherNicFrontPic)}
                          className="absolute bottom-1 right-1 p-1 bg-black/70 rounded text-white hover:text-emerald-400"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-auto">
                      <button
                        type="button"
                        onClick={() => handlePickPhoto('fatherNicFront')}
                        disabled={uploadingField === 'fatherNicFront'}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        {uploadingField === 'fatherNicFront' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {formFatherNicFrontPic ? 'Change Front' : 'Upload Front Side'}
                      </button>
                      {formFatherNicFrontPic && (
                        <button
                          type="button"
                          onClick={() => setFormFatherNicFrontPic(undefined)}
                          className="p-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 hover:text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 4. Father CNIC Back Side */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-200">4. Father CNIC (Back Side)</span>
                      {formFatherNicBackPic && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    {formFatherNicBackPic && (
                      <div className="relative mb-2 w-full h-24 rounded-lg overflow-hidden bg-black/40 border border-slate-700 flex items-center justify-center">
                        <img src={formFatherNicBackPic} alt="Father CNIC Back" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => openPhotoModal('Father CNIC Back Side', formFatherNicBackPic)}
                          className="absolute bottom-1 right-1 p-1 bg-black/70 rounded text-white hover:text-emerald-400"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-auto">
                      <button
                        type="button"
                        onClick={() => handlePickPhoto('fatherNicBack')}
                        disabled={uploadingField === 'fatherNicBack'}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        {uploadingField === 'fatherNicBack' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {formFatherNicBackPic ? 'Change Back' : 'Upload Back Side'}
                      </button>
                      {formFatherNicBackPic && (
                        <button
                          type="button"
                          onClick={() => setFormFatherNicBackPic(undefined)}
                          className="p-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 hover:text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 5. Mother CNIC Front Side */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-200">5. Mother CNIC (Front Side)</span>
                      {formMotherNicFrontPic && <Check className="w-3.5 h-3.5 text-rose-400" />}
                    </div>
                    {formMotherNicFrontPic && (
                      <div className="relative mb-2 w-full h-24 rounded-lg overflow-hidden bg-black/40 border border-slate-700 flex items-center justify-center">
                        <img src={formMotherNicFrontPic} alt="Mother CNIC Front" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => openPhotoModal('Mother CNIC Front Side', formMotherNicFrontPic)}
                          className="absolute bottom-1 right-1 p-1 bg-black/70 rounded text-white hover:text-rose-400"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-auto">
                      <button
                        type="button"
                        onClick={() => handlePickPhoto('motherNicFront')}
                        disabled={uploadingField === 'motherNicFront'}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        {uploadingField === 'motherNicFront' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {formMotherNicFrontPic ? 'Change Front' : 'Upload Front Side'}
                      </button>
                      {formMotherNicFrontPic && (
                        <button
                          type="button"
                          onClick={() => setFormMotherNicFrontPic(undefined)}
                          className="p-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 hover:text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 6. Mother CNIC Back Side */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-200">6. Mother CNIC (Back Side)</span>
                      {formMotherNicBackPic && <Check className="w-3.5 h-3.5 text-rose-400" />}
                    </div>
                    {formMotherNicBackPic && (
                      <div className="relative mb-2 w-full h-24 rounded-lg overflow-hidden bg-black/40 border border-slate-700 flex items-center justify-center">
                        <img src={formMotherNicBackPic} alt="Mother CNIC Back" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => openPhotoModal('Mother CNIC Back Side', formMotherNicBackPic)}
                          className="absolute bottom-1 right-1 p-1 bg-black/70 rounded text-white hover:text-rose-400"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-auto">
                      <button
                        type="button"
                        onClick={() => handlePickPhoto('motherNicBack')}
                        disabled={uploadingField === 'motherNicBack'}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        {uploadingField === 'motherNicBack' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {formMotherNicBackPic ? 'Change Back' : 'Upload Back Side'}
                      </button>
                      {formMotherNicBackPic && (
                        <button
                          type="button"
                          onClick={() => setFormMotherNicBackPic(undefined)}
                          className="p-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 hover:text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-200">Remarks / Notes</label>
                <textarea
                  value={formRemarks}
                  onChange={e => setFormRemarks(e.target.value)}
                  placeholder="e.g. Special student talent, dietary or health alerts"
                  rows={2}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                >
                  {editingStudent ? 'Update Record' : 'Save Student Admission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Promotion Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-white">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-teal-400" />
              Batch Promote Students
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Promote <strong>{selectedStudentIds.length}</strong> selected students to the next grade level for the new academic cycle.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1 text-slate-200">Target Next Grade</label>
              <select
                value={targetNextGrade}
                onChange={e => setTargetNextGrade(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
              >
                {gradeList.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowPromoteModal(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handlePromoteBatch}
                className="px-4 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-500"
              >
                Confirm Promotion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Student Modal */}
      {transferringStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl text-white">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-teal-400" />
              Transfer Student School
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Transfer <strong>{transferringStudent.name} ({transferringStudent.grNumber})</strong> to another SEF partner school.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold mb-1 text-slate-200">Destination School</label>
              <select
                value={targetTransferSchoolId}
                onChange={e => setTargetTransferSchoolId(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
              >
                {schools.filter(s => s.id !== transferringStudent.schoolId).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code}) - {s.district}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setTransferringStudent(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteTransfer}
                className="px-4 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-500"
              >
                Execute Transfer
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Single Student Deletion Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-rose-800/80 rounded-3xl p-5 shadow-2xl text-white">
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-950/80 border border-rose-700">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Delete Student Record?</h3>
                <p className="text-[11px] text-slate-400">{studentToDelete.name} ({studentToDelete.grNumber})</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 mb-4">
              <p>
                Are you sure you want to permanently delete the student register record for <strong>{studentToDelete.name}</strong> (GR: {studentToDelete.grNumber})?
              </p>
              <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-800/60 text-amber-200 text-[11px]">
                <strong>💡 Note:</strong> If the student has completed school or transferred, marking them as <strong>"Passed"</strong> or <strong>"Transferred"</strong> preserves their academic and attendance history.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteStudent(studentToDelete.id);
                  setStudentToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold transition shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Deletion Modal */}
      {showBatchDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-rose-800/80 rounded-3xl p-5 shadow-2xl text-white">
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-950/80 border border-rose-700">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Batch Delete Selected Students</h3>
                <p className="text-[11px] text-slate-400">{selectedStudentIds.length} student records selected</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
              This action will permanently delete all <strong>{selectedStudentIds.length}</strong> selected student records from the school general register.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  selectedStudentIds.forEach(id => deleteStudent(id));
                  setSelectedStudentIds([]);
                  setShowBatchDeleteModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold transition shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All {selectedStudentIds.length} Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
