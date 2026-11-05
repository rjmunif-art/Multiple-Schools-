import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Phone,
  Calendar,
  Briefcase,
  Award,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  Eye,
  Camera,
  Check,
  X,
  Loader2,
  Archive,
  History,
  Clock,
  Receipt
} from 'lucide-react';
import { Staff, StaffDesignation, StaffStatus } from '../../types';
import { pickImageFromFileMemory } from '../../utils/fileUpload';
import { CustomSelect } from '../common/CustomSelect';

export const StaffManager: React.FC = () => {
  const {
    staff,
    schools,
    addStaff,
    updateStaff,
    deleteStaff,
    activeSchoolId,
    currentUser,
    openPhotoModal,
    setCurrentTab,
    payroll,
    staffAttendance,
  } = useApp();

  const isOperator = currentUser?.role === 'operator';
  const isHT = currentUser?.role === 'head_teacher';

  const [searchQuery, setSearchQuery] = useState('');
  const [designationFilter, setDesignationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [schoolFilter, setSchoolFilter] = useState(activeSchoolId !== 'all' ? activeSchoolId : 'all');
  const [scopeTab, setScopeTab] = useState<'active' | 'resigned' | 'all'>('active');

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [viewingSalaryHistoryStaff, setViewingSalaryHistoryStaff] = useState<Staff | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);

  // Form Fields
  const [formSchoolId, setFormSchoolId] = useState(schools[0]?.id || '');
  const [formEmployeeId, setFormEmployeeId] = useState('');
  const [formName, setFormName] = useState('');
  const [formCnic, setFormCnic] = useState('');
  const [formQualification, setFormQualification] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formDesignation, setFormDesignation] = useState<StaffDesignation>('Junior Teacher');
  const [formJoiningDate, setFormJoiningDate] = useState('2022-01-01');
  const [formResignationDate, setFormResignationDate] = useState('');
  const [formResignationReason, setFormResignationReason] = useState('');
  const [formContact, setFormContact] = useState('+92 300 ');
  const [formStatus, setFormStatus] = useState<StaffStatus>('Active');
  const [formAssignedGrade, setFormAssignedGrade] = useState('Class III');
  const [formAssignedSubject, setFormAssignedSubject] = useState('General Science');
  const [formBaseSalary, setFormBaseSalary] = useState<number>(30000);
  
  // Document photos
  const [formProfilePic, setFormProfilePic] = useState<string | undefined>(undefined);
  const [formCnicFrontPic, setFormCnicFrontPic] = useState<string | undefined>(undefined);
  const [formCnicBackPic, setFormCnicBackPic] = useState<string | undefined>(undefined);
  const [formAppointmentLetterPic, setFormAppointmentLetterPic] = useState<string | undefined>(undefined);
  const [formRemarks, setFormRemarks] = useState('');
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const designationList: StaffDesignation[] = [
    'Head Teacher',
    'Senior Teacher',
    'Junior Teacher',
    'ECE Teacher',
    'Peon',
    'Aya',
    'Security Guard'
  ];

  const filteredStaff = useMemo(() => {
    let list = [...staff];

    if (activeSchoolId !== 'all') {
      list = list.filter(s => s.schoolId === activeSchoolId);
    } else if (schoolFilter !== 'all') {
      list = list.filter(s => s.schoolId === schoolFilter);
    } else if (isHT && currentUser?.schoolId) {
      list = list.filter(s => s.schoolId === currentUser.schoolId);
    }

    // Quick Scope Tab
    if (scopeTab === 'active') {
      list = list.filter(s => s.status === 'Active' || s.status === 'Leave');
    } else if (scopeTab === 'resigned') {
      list = list.filter(s => s.status === 'Resigned' || s.status === 'Inactive' || s.status === 'Transferred');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.employeeId.toLowerCase().includes(q) ||
          s.cnic.includes(q) ||
          s.qualification.toLowerCase().includes(q) ||
          (s.subject && s.subject.toLowerCase().includes(q))
      );
    }

    if (designationFilter !== 'all') {
      list = list.filter(s => s.designation === designationFilter);
    }

    if (statusFilter !== 'all') {
      list = list.filter(s => s.status === statusFilter);
    }

    return list;
  }, [staff, activeSchoolId, schoolFilter, isHT, currentUser, scopeTab, searchQuery, designationFilter, statusFilter]);

  const activeStaffCount = useMemo(() => {
    return staff.filter(s => {
      const matchSchool = activeSchoolId === 'all' || s.schoolId === activeSchoolId;
      return matchSchool && (s.status === 'Active' || s.status === 'Leave');
    }).length;
  }, [staff, activeSchoolId]);

  const resignedStaffCount = useMemo(() => {
    return staff.filter(s => {
      const matchSchool = activeSchoolId === 'all' || s.schoolId === activeSchoolId;
      return matchSchool && (s.status === 'Resigned' || s.status === 'Inactive' || s.status === 'Transferred');
    }).length;
  }, [staff, activeSchoolId]);

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormSchoolId(activeSchoolId !== 'all' ? activeSchoolId : (schools[0]?.id || ''));
    setFormEmployeeId('EMP-' + Math.floor(100 + Math.random() * 900));
    setFormName('');
    setFormCnic('41201-' + Math.floor(1000000 + Math.random() * 9000000) + '-1');
    setFormQualification('B.A / B.Ed');
    setFormSubject('General Subjects');
    setFormDesignation('Junior Teacher');
    setFormJoiningDate('2023-01-15');
    setFormResignationDate('');
    setFormResignationReason('');
    setFormContact('+92 300 1234567');
    setFormStatus('Active');
    setFormAssignedGrade('Class II');
    setFormAssignedSubject('English');
    setFormBaseSalary(30000);
    setFormProfilePic(undefined);
    setFormCnicFrontPic(undefined);
    setFormCnicBackPic(undefined);
    setFormAppointmentLetterPic(undefined);
    setFormRemarks('');
    setShowStaffModal(true);
  };

  const handleOpenEdit = (stf: Staff) => {
    setEditingStaff(stf);
    setFormSchoolId(stf.schoolId);
    setFormEmployeeId(stf.employeeId);
    setFormName(stf.name);
    setFormCnic(stf.cnic);
    setFormQualification(stf.qualification);
    setFormSubject(stf.subject || '');
    setFormDesignation(stf.designation);
    setFormJoiningDate(stf.joiningDate);
    setFormResignationDate(stf.resignationDate || '');
    setFormResignationReason(stf.resignationReason || '');
    setFormContact(stf.contact);
    setFormStatus(stf.status);
    setFormAssignedGrade(stf.assignedGrade || '');
    setFormAssignedSubject(stf.assignedSubject || '');
    setFormBaseSalary(stf.baseSalary);
    setFormProfilePic(stf.profilePic);
    setFormCnicFrontPic(stf.cnicFrontPic);
    setFormCnicBackPic(stf.cnicBackPic);
    setFormAppointmentLetterPic(stf.appointmentLetterPic);
    setFormRemarks(stf.remarks || '');
    setShowStaffModal(true);
  };

  const handlePickPhoto = async (field: 'profile' | 'cnicFront' | 'cnicBack' | 'appointment') => {
    try {
      setUploadingField(field);
      const dataUrl = await pickImageFromFileMemory({ maxWidth: 1200, maxHeight: 1200, quality: 0.82 });
      if (field === 'profile') setFormProfilePic(dataUrl);
      if (field === 'cnicFront') setFormCnicFrontPic(dataUrl);
      if (field === 'cnicBack') setFormCnicBackPic(dataUrl);
      if (field === 'appointment') setFormAppointmentLetterPic(dataUrl);
    } catch (err: any) {
      console.log('File selection cancelled', err);
    } finally {
      setUploadingField(null);
    }
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmployeeId.trim()) return;

    const payload = {
      schoolId: formSchoolId,
      employeeId: formEmployeeId.trim(),
      name: formName.trim(),
      cnic: formCnic.trim(),
      qualification: formQualification.trim(),
      subject: formSubject.trim() || undefined,
      designation: formDesignation,
      joiningDate: formJoiningDate,
      resignationDate: formStatus === 'Resigned' ? (formResignationDate || new Date().toISOString().split('T')[0]) : undefined,
      resignationReason: formStatus === 'Resigned' ? formResignationReason : undefined,
      contact: formContact.trim(),
      status: formStatus,
      assignedGrade: formAssignedGrade.trim() || undefined,
      assignedSubject: formAssignedSubject.trim() || undefined,
      baseSalary: Number(formBaseSalary),
      profilePic: formProfilePic,
      cnicFrontPic: formCnicFrontPic,
      cnicBackPic: formCnicBackPic,
      appointmentLetterPic: formAppointmentLetterPic,
      remarks: formRemarks.trim() || undefined,
    };

    if (editingStaff) {
      updateStaff({
        ...editingStaff,
        ...payload,
      });
    } else {
      addStaff(payload);
    }
    setShowStaffModal(false);
  };

  return (
    <div className="space-y-4 pb-12 w-full max-w-full overflow-x-hidden">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            School Staff & Teacher Directory ({filteredStaff.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Head Teachers, Senior & Junior Teachers, Peon/Aya support staff, salary records & permanent archives
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOperator && (
            <button
              onClick={() => setCurrentTab('payroll')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow transition cursor-pointer"
            >
              <DollarSign className="w-4 h-4" />
              Manage Salaries
            </button>
          )}

          {isOperator && (
            <button
              onClick={handleOpenAdd}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Staff Member
            </button>
          )}
        </div>
      </div>

      {/* Scope Switcher Tabs: Active vs Resigned Archive vs All */}
      <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 text-xs">
        <button
          onClick={() => setScopeTab('active')}
          className={`flex-1 py-1.5 px-3 rounded-xl font-semibold transition cursor-pointer text-center ${
            scopeTab === 'active'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          Active Staff ({activeStaffCount})
        </button>

        <button
          onClick={() => setScopeTab('resigned')}
          className={`flex-1 py-1.5 px-3 rounded-xl font-semibold transition cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            scopeTab === 'resigned'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          Resigned / Former Staff ({resignedStaffCount})
        </button>

        <button
          onClick={() => setScopeTab('all')}
          className={`flex-1 py-1.5 px-3 rounded-xl font-semibold transition cursor-pointer text-center ${
            scopeTab === 'all'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All Records ({staff.length})
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 shadow-sm space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search teacher name, employee ID, CNIC (e.g. 41201-...), qualification, subject..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {activeSchoolId === 'all' && (
            <select
              value={schoolFilter}
              onChange={e => setSchoolFilter(e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">All Schools</option>
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          <select
            value={designationFilter}
            onChange={e => setDesignationFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Designations</option>
            {designationList.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Leave">On Leave</option>
            <option value="Resigned">Resigned (Archived)</option>
            <option value="Absent">Absent</option>
            <option value="Transferred">Transferred</option>
          </select>
        </div>
      </div>

      {/* Staff Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredStaff.map(stf => {
          const sch = schools.find(s => s.id === stf.schoolId);
          const isResigned = stf.status === 'Resigned';

          return (
            <div
              key={stf.id}
              className={`bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-sm flex flex-col justify-between ${
                isResigned ? 'border-amber-900/50 bg-slate-900/70' : ''
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (stf.profilePic) openPhotoModal(`Staff: ${stf.name}`, stf.profilePic);
                        else openPhotoModal(`Staff: ${stf.name}`, '', 'No profile photo uploaded');
                      }}
                      className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center font-bold text-sm shadow shrink-0 overflow-hidden cursor-pointer hover:border-emerald-500"
                      title="View Staff Profile Photo"
                    >
                      {stf.profilePic ? (
                        <img src={stf.profilePic} alt={stf.name} className="w-full h-full object-cover" />
                      ) : (
                        stf.name.charAt(0)
                      )}
                    </button>
                    <div>
                      <h3 className="font-bold text-sm text-white leading-tight">
                        {stf.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          stf.designation === 'Head Teacher' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          stf.designation.includes('Teacher') ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                          'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {stf.designation}
                        </span>
                        {isResigned && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-950 text-rose-300 border border-rose-800 font-semibold">
                            Resigned Archive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    stf.status === 'Active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    stf.status === 'Leave' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    stf.status === 'Resigned' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                    'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {stf.status}
                  </span>
                </div>

                <div className="mt-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">School:</span>
                    <span className="font-semibold text-white truncate max-w-[170px]">{sch?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Employee ID:</span>
                    <span className="font-mono font-bold text-emerald-400">{stf.employeeId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">CNIC:</span>
                    <span className="font-mono text-white">{stf.cnic}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Qualification:</span>
                    <span className="font-semibold text-white">{stf.qualification}</span>
                  </div>
                  {stf.subject && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Subject:</span>
                      <span className="font-semibold text-white">{stf.subject}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-700/60 pt-1.5 mt-1.5">
                    <span className="text-slate-400">{isResigned ? 'Last Drawn Salary:' : 'Monthly Base Salary:'}</span>
                    <span className="font-bold text-emerald-400">
                      PKR {stf.baseSalary.toLocaleString()}/mo
                    </span>
                  </div>
                  {isResigned && stf.resignationDate && (
                    <div className="flex justify-between text-[11px] text-amber-300/90 pt-1">
                      <span>Resignation Date:</span>
                      <span className="font-mono">{stf.resignationDate}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: CNIC Front & Back + Salary History button */}
              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {/* CNIC Front */}
                  <button
                    type="button"
                    onClick={() => {
                      if (stf.cnicFrontPic) openPhotoModal(`CNIC Front: ${stf.name}`, stf.cnicFrontPic);
                      else alert('No CNIC Front side attached.');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                      stf.cnicFrontPic
                        ? 'bg-blue-950/60 text-blue-300 border-blue-700 hover:bg-blue-900'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    NIC Front {stf.cnicFrontPic ? '✓' : ''}
                  </button>

                  {/* CNIC Back */}
                  <button
                    type="button"
                    onClick={() => {
                      if (stf.cnicBackPic) openPhotoModal(`CNIC Back: ${stf.name}`, stf.cnicBackPic);
                      else alert('No CNIC Back side attached.');
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                      stf.cnicBackPic
                        ? 'bg-blue-950/60 text-blue-300 border-blue-700 hover:bg-blue-900'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    NIC Back {stf.cnicBackPic ? '✓' : ''}
                  </button>

                  {/* Complete Salary & Attendance History */}
                  <button
                    type="button"
                    onClick={() => setViewingSalaryHistoryStaff(stf)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-700 hover:bg-emerald-900 flex items-center gap-1"
                    title="View Permanent Salary History and Attendance Records"
                  >
                    <History className="w-3 h-3" />
                    Salary History
                  </button>
                </div>

                {(isOperator || isHT) && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(stf)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      title="Edit Staff Member"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setStaffToDelete(stf)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
                      title="Delete Staff Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Salary History & Attendance Archive Modal */}
      {viewingSalaryHistoryStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-white max-h-[88vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Permanent Staff Salary & Attendance History Archive
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {viewingSalaryHistoryStaff.name} ({viewingSalaryHistoryStaff.employeeId}) • {viewingSalaryHistoryStaff.designation}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingSalaryHistoryStaff(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Permanent Retention Status Banner */}
            <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-2xl mb-4 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-300">Permanent School HR & Financial Record</div>
                <div className="text-[11px] text-emerald-100/80 mt-0.5">
                  Even if this employee resigns or transfers, all monthly salary disbursement records, CNIC scans, appointment letters, and attendance logs remain permanently stored in this school system for audit compliance.
                </div>
              </div>
            </div>

            {/* Employee Bio & Tenure Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                <div className="text-[10px] text-slate-400">Joining Date</div>
                <div className="font-mono font-bold text-white">{viewingSalaryHistoryStaff.joiningDate}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                <div className="text-[10px] text-slate-400">Current Status</div>
                <div className={`font-bold ${viewingSalaryHistoryStaff.status === 'Active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {viewingSalaryHistoryStaff.status}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                <div className="text-[10px] text-slate-400">Base Monthly Salary</div>
                <div className="font-bold text-white">PKR {viewingSalaryHistoryStaff.baseSalary.toLocaleString()}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                <div className="text-[10px] text-slate-400">CNIC Number</div>
                <div className="font-mono font-semibold text-white">{viewingSalaryHistoryStaff.cnic}</div>
              </div>
            </div>

            {/* Monthly Payroll Ledger Records */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Monthly Salary Payment Ledger & Receipts
              </h4>

              {(() => {
                const staffPayroll = payroll.filter(p => p.staffId === viewingSalaryHistoryStaff.id);
                if (staffPayroll.length === 0) {
                  return (
                    <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 text-center text-xs text-slate-400">
                      Base salary is set to PKR {viewingSalaryHistoryStaff.baseSalary.toLocaleString()}/mo. No closed monthly payroll vouchers generated yet for this period. All future salary disbursements will be permanently listed here.
                    </div>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-800 text-slate-400 text-[10px] uppercase font-semibold">
                          <th className="p-2.5">Month</th>
                          <th className="p-2.5">Base Salary</th>
                          <th className="p-2.5">Deductions</th>
                          <th className="p-2.5">Net Disbursed</th>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">Payment Method</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-200">
                        {staffPayroll.map(p => (
                          <tr key={p.id} className="hover:bg-slate-800/40">
                            <td className="p-2.5 font-mono font-semibold">{p.month}</td>
                            <td className="p-2.5">PKR {p.baseSalary.toLocaleString()}</td>
                            <td className="p-2.5 text-rose-400">
                              -PKR {(p.deductions?.absenceDeduction || 0).toLocaleString()}
                            </td>
                            <td className="p-2.5 font-bold text-emerald-400">
                              PKR {p.netSalary.toLocaleString()}
                            </td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                {p.paymentStatus}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-400">
                              {p.paymentMethod || 'Cash Voucher'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingSalaryHistoryStaff(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-semibold"
              >
                Close Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-white max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingStaff ? `Edit Staff: ${editingStaff.name}` : 'Add New Staff / Teacher / Peon'}
                </h3>
                <p className="text-xs text-slate-400">
                  Enter credentials, CNIC front/back copies, monthly salary and resignation retention.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Assigned School *</label>
                  <select
                    value={formSchoolId}
                    onChange={e => setFormSchoolId(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {schools.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Employee ID *</label>
                  <input
                    type="text"
                    value={formEmployeeId}
                    onChange={e => setFormEmployeeId(e.target.value)}
                    placeholder="e.g. EMP-DAD-005"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Staff Member Full Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Master Suhail Ahmed Brohi"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">CNIC (National ID) *</label>
                  <input
                    type="text"
                    value={formCnic}
                    onChange={e => setFormCnic(e.target.value)}
                    placeholder="41201-1234567-1"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Designation *</label>
                  <CustomSelect
                    value={formDesignation}
                    onChange={val => setFormDesignation(val as any)}
                    options={designationList}
                    placeholder="Select designation..."
                    customPlaceholder="Type custom designation..."
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Qualification *</label>
                  <input
                    type="text"
                    value={formQualification}
                    onChange={e => setFormQualification(e.target.value)}
                    placeholder="e.g. M.A (Sindhi), B.Ed"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Teaching Subject</label>
                  <input
                    type="text"
                    value={formSubject}
                    onChange={e => setFormSubject(e.target.value)}
                    placeholder="e.g. Science, Mathematics"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Base Monthly Salary (PKR) *</label>
                  <input
                    type="number"
                    value={formBaseSalary}
                    onChange={e => setFormBaseSalary(Number(e.target.value))}
                    placeholder="e.g. 35000"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Contact Mobile *</label>
                  <input
                    type="text"
                    value={formContact}
                    onChange={e => setFormContact(e.target.value)}
                    placeholder="+92 301 5551201"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-200">Current Status</label>
                  <CustomSelect
                    value={formStatus}
                    onChange={val => setFormStatus(val as any)}
                    options={[
                      { value: 'Active', label: 'Active' },
                      { value: 'Leave', label: 'On Leave' },
                      { value: 'Resigned', label: 'Resigned (Archived in School)' },
                      { value: 'Absent', label: 'Absent' },
                      { value: 'Transferred', label: 'Transferred' },
                    ]}
                    placeholder="Select status..."
                    customPlaceholder="Type custom status..."
                  />
                </div>
              </div>

              {/* If Resigned: Record Resignation Date & Reason */}
              {formStatus === 'Resigned' && (
                <div className="p-3.5 bg-amber-950/40 border border-amber-800/80 rounded-2xl space-y-2.5">
                  <div className="font-bold text-amber-300 flex items-center gap-2">
                    <Archive className="w-4 h-4 text-amber-400" />
                    Teacher Resignation Retention Record
                  </div>
                  <p className="text-[11px] text-amber-200/80 leading-snug">
                    When this teacher resigns, their profile, qualification, monthly salary ledger, and attendance history will remain permanently stored in this school system.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block font-semibold mb-1 text-slate-300">Resignation Effective Date</label>
                      <input
                        type="date"
                        value={formResignationDate || '2026-10-30'}
                        onChange={e => setFormResignationDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-slate-300">Resignation Reason / Notes</label>
                      <input
                        type="text"
                        value={formResignationReason}
                        onChange={e => setFormResignationReason(e.target.value)}
                        placeholder="e.g. Relocated to Karachi / Higher education"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Photo & CNIC Front/Back Uploads */}
              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-400" />
                    Identification & CNIC (Front / Back Side from Phone Storage)
                  </span>
                  <span className="text-[10px] text-slate-400">Click to upload from phone</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Profile Photo */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-200">1. Staff Profile Photo</span>
                      {formProfilePic && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    {formProfilePic && (
                      <div className="relative mb-2 w-full h-24 rounded-lg overflow-hidden bg-black/40 border border-slate-700 flex items-center justify-center">
                        <img src={formProfilePic} alt="Profile" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => openPhotoModal('Staff Profile Photo', formProfilePic)}
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
                        {formProfilePic ? 'Change Photo' : 'Upload Photo'}
                      </button>
                      {formProfilePic && (
                        <button
                          type="button"
                          onClick={() => setFormProfilePic(undefined)}
                          className="p-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 hover:text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CNIC Front Side */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-200">2. CNIC Front Side</span>
                      {formCnicFrontPic && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    {formCnicFrontPic && (
                      <div className="relative mb-2 w-full h-24 rounded-lg overflow-hidden bg-black/40 border border-slate-700 flex items-center justify-center">
                        <img src={formCnicFrontPic} alt="CNIC Front" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => openPhotoModal('Staff CNIC Front Side', formCnicFrontPic)}
                          className="absolute bottom-1 right-1 p-1 bg-black/70 rounded text-white hover:text-blue-400"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-auto">
                      <button
                        type="button"
                        onClick={() => handlePickPhoto('cnicFront')}
                        disabled={uploadingField === 'cnicFront'}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        {uploadingField === 'cnicFront' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {formCnicFrontPic ? 'Change Front' : 'Upload Front Side'}
                      </button>
                      {formCnicFrontPic && (
                        <button
                          type="button"
                          onClick={() => setFormCnicFrontPic(undefined)}
                          className="p-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 hover:text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* CNIC Back Side */}
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-200">3. CNIC Back Side</span>
                      {formCnicBackPic && <Check className="w-3.5 h-3.5 text-blue-400" />}
                    </div>
                    {formCnicBackPic && (
                      <div className="relative mb-2 w-full h-24 rounded-lg overflow-hidden bg-black/40 border border-slate-700 flex items-center justify-center">
                        <img src={formCnicBackPic} alt="CNIC Back" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => openPhotoModal('Staff CNIC Back Side', formCnicBackPic)}
                          className="absolute bottom-1 right-1 p-1 bg-black/70 rounded text-white hover:text-blue-400"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-1.5 mt-auto">
                      <button
                        type="button"
                        onClick={() => handlePickPhoto('cnicBack')}
                        disabled={uploadingField === 'cnicBack'}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition cursor-pointer"
                      >
                        {uploadingField === 'cnicBack' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        {formCnicBackPic ? 'Change Back' : 'Upload Back Side'}
                      </button>
                      {formCnicBackPic && (
                        <button
                          type="button"
                          onClick={() => setFormCnicBackPic(undefined)}
                          className="p-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-300 hover:text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowStaffModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md"
                >
                  {editingStaff ? 'Update Record' : 'Save Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* In-App Custom Staff Deletion Modal */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-rose-800/80 rounded-3xl p-5 shadow-2xl text-white">
            <div className="flex items-center gap-3 mb-3 text-rose-400">
              <div className="p-2.5 rounded-2xl bg-rose-950/80 border border-rose-700">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">Delete Staff Record?</h3>
                <p className="text-[11px] text-slate-400">{staffToDelete.name} ({staffToDelete.employeeId})</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-2xl border border-slate-800 mb-4">
              <p>Are you sure you want to permanently delete this employee record from the school database?</p>
              <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-800/60 text-amber-200 text-[11px]">
                <strong>💡 Pro-Tip:</strong> To keep permanent salary ledgers and attendance history, set their status to <strong>"Resigned"</strong> instead of deleting.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteStaff(staffToDelete.id);
                  setStaffToDelete(null);
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
    </div>
  );
};
