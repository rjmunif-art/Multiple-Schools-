import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  School as SchoolIcon,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  Calendar,
  Users,
  GraduationCap,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
  FileText,
  DollarSign,
  Compass,
  CheckSquare,
  AlertCircle
} from 'lucide-react';
import { School } from '../../types';

export const SchoolDirectory: React.FC = () => {
  const {
    schools,
    addSchool,
    updateSchool,
    deleteSchool,
    students,
    staff,
    studentAttendance,
    visits,
    issues,
    tasks,
    documents,
    payroll,
    currentUser,
    users,
    activeSchoolId,
    setActiveSchoolId,
    selectedSchoolIdForProfile,
    setSelectedSchoolIdForProfile,
    setCurrentTab,
    openPhotoModal,
    openEditProfile,
  } = useApp();

  const isOperator = currentUser?.role === 'operator';
  const isHT = currentUser?.role === 'head_teacher';

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'students'>('name');

  // Add / Edit Modal
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  // School Profile active tab
  const [profileTab, setProfileTab] = useState<
    'overview' | 'students' | 'teachers' | 'attendance' | 'results' | 'visits' | 'monitoring' | 'facilities' | 'documents' | 'issues' | 'tasks' | 'payroll' | 'history'
  >('overview');

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formProgram, setFormProgram] = useState<'PIMS' | 'EVS' | 'SEF-Middle' | 'SAS' | 'Integrated'>('PIMS');
  const [formDistrict, setFormDistrict] = useState('Dadu');
  const [formTaluka, setFormTaluka] = useState('');
  const [formUc, setFormUc] = useState('');
  const [formVillage, setFormVillage] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formHeadTeacherName, setFormHeadTeacherName] = useState('');
  const [formContactNumber, setFormContactNumber] = useState('');
  const [formEstablishedDate, setFormEstablishedDate] = useState('2020-01-01');
  const [formShift, setFormShift] = useState<'Morning' | 'Afternoon' | 'Double Shift'>('Morning');
  const [formStatus, setFormStatus] = useState<'active' | 'attention' | 'critical' | 'inactive'>('active');
  const [formNotes, setFormNotes] = useState('');
  const [facilities, setFacilities] = useState({
    drinkingWater: true,
    toilets: true,
    boundaryWall: true,
    electricity: true,
    solarPower: true,
    library: false,
    computerLab: false,
    playground: true,
    furnitureAdequate: true,
  });

  const availableDistricts = useMemo(() => {
    return Array.from(new Set(schools.map(s => s.district)));
  }, [schools]);

  // Filtered & Sorted list
  const filteredSchools = useMemo(() => {
    let list = [...schools];

    if (isHT && currentUser?.schoolId) {
      list = list.filter(s => s.id === currentUser.schoolId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        s =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.headTeacherName.toLowerCase().includes(q) ||
          s.district.toLowerCase().includes(q) ||
          s.taluka.toLowerCase().includes(q) ||
          s.village.toLowerCase().includes(q)
      );
    }

    if (districtFilter !== 'all') {
      list = list.filter(s => s.district === districtFilter);
    }

    if (statusFilter !== 'all') {
      list = list.filter(s => s.status === statusFilter);
    }

    if (programFilter !== 'all') {
      list = list.filter(s => s.programType === programFilter);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'code') return a.code.localeCompare(b.code);
      if (sortBy === 'students') {
        const countA = students.filter(st => st.schoolId === a.id).length;
        const countB = students.filter(st => st.schoolId === b.id).length;
        return countB - countA;
      }
      return 0;
    });

    return list;
  }, [schools, isHT, currentUser, searchQuery, districtFilter, statusFilter, programFilter, sortBy, students]);

  // Active School profile detail
  const profileSchool = useMemo(() => {
    if (!selectedSchoolIdForProfile) return null;
    return schools.find(s => s.id === selectedSchoolIdForProfile) || null;
  }, [selectedSchoolIdForProfile, schools]);

  const handleOpenAdd = () => {
    setEditingSchool(null);
    setFormName('');
    setFormCode('SEF-' + Math.floor(100 + Math.random() * 900));
    setFormProgram('PIMS');
    setFormDistrict('Dadu');
    setFormTaluka('');
    setFormUc('');
    setFormVillage('');
    setFormAddress('');
    setFormHeadTeacherName('');
    setFormContactNumber('+92 300 ');
    setFormEstablishedDate('2020-01-01');
    setFormShift('Morning');
    setFormStatus('active');
    setFormNotes('');
    setFacilities({
      drinkingWater: true,
      toilets: true,
      boundaryWall: true,
      electricity: true,
      solarPower: true,
      library: false,
      computerLab: false,
      playground: true,
      furnitureAdequate: true,
    });
    setShowSchoolModal(true);
  };

  const handleOpenEdit = (sch: School, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingSchool(sch);
    setFormName(sch.name);
    setFormCode(sch.code);
    setFormProgram(sch.programType);
    setFormDistrict(sch.district);
    setFormTaluka(sch.taluka);
    setFormUc(sch.uc);
    setFormVillage(sch.village);
    setFormAddress(sch.address);
    setFormHeadTeacherName(sch.headTeacherName);
    setFormContactNumber(sch.contactNumber);
    setFormEstablishedDate(sch.establishedDate);
    setFormShift(sch.shift);
    setFormStatus(sch.status);
    setFormNotes(sch.notes || '');
    setFacilities(sch.facilities);
    setShowSchoolModal(true);
  };

  const handleSaveSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) return;

    if (editingSchool) {
      updateSchool({
        ...editingSchool,
        name: formName.trim(),
        code: formCode.trim(),
        programType: formProgram,
        district: formDistrict.trim(),
        taluka: formTaluka.trim(),
        uc: formUc.trim(),
        village: formVillage.trim(),
        address: formAddress.trim(),
        headTeacherName: formHeadTeacherName.trim(),
        contactNumber: formContactNumber.trim(),
        establishedDate: formEstablishedDate,
        shift: formShift,
        status: formStatus,
        notes: formNotes.trim(),
        facilities,
      });
    } else {
      addSchool({
        name: formName.trim(),
        code: formCode.trim(),
        programType: formProgram,
        district: formDistrict.trim(),
        taluka: formTaluka.trim(),
        uc: formUc.trim(),
        village: formVillage.trim(),
        address: formAddress.trim(),
        headTeacherName: formHeadTeacherName.trim(),
        contactNumber: formContactNumber.trim(),
        establishedDate: formEstablishedDate,
        grades: ['Kachi', 'Class I', 'Class II', 'Class III', 'Class IV', 'Class V'],
        shift: formShift,
        status: formStatus,
        notes: formNotes.trim(),
        facilities,
      });
    }
    setShowSchoolModal(false);
  };

  const handleDeleteSchool = (id: string, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm(`Are you sure you want to delete ${name}? All associated student records and visits will be deleted.`)) {
      deleteSchool(id);
      if (selectedSchoolIdForProfile === id) {
        setSelectedSchoolIdForProfile(null);
      }
    }
  };

  // If a school profile is selected, render the School Profile view
  if (profileSchool) {
    const schStudents = students.filter(s => s.schoolId === profileSchool.id);
    const schStaff = staff.filter(s => s.schoolId === profileSchool.id);
    const schVisits = visits.filter(v => v.schoolId === profileSchool.id);
    const schIssues = issues.filter(i => i.schoolId === profileSchool.id);
    const schTasks = tasks.filter(t => t.schoolId === profileSchool.id);
    const schDocs = documents.filter(d => d.schoolId === profileSchool.id);
    const schPayroll = payroll.filter(p => p.schoolId === profileSchool.id);
    const schAttendance = studentAttendance.filter(a => a.schoolId === profileSchool.id);

    return (
      <div className="space-y-4 pb-12">
        {/* Back and Header */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => setSelectedSchoolIdForProfile(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            ← Back to School List
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveSchoolId(profileSchool.id);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSchoolId === profileSchool.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {activeSchoolId === profileSchool.id ? 'Currently Active Scope' : 'Set as Active Scope'}
            </button>

            {isOperator && (
              <button
                onClick={e => handleOpenEdit(profileSchool, e)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                title="Edit School Profile"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* School Profile Hero Card */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-5 rounded-3xl shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-200 border border-emerald-600/40">
                  {profileSchool.code}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300">
                  Program: {profileSchool.programType}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white text-emerald-950">
                  {profileSchool.status}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black mt-2">{profileSchool.name}</h2>
              <p className="text-xs sm:text-sm text-emerald-200 mt-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                {profileSchool.village}, {profileSchool.taluka}, District {profileSchool.district}
              </p>
              <div className="mt-2 text-xs text-emerald-100 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span>HT: <strong>{profileSchool.headTeacherName}</strong></span>
                  <button
                    onClick={() => {
                      const htUser = users.find(u => u.schoolId === profileSchool.id && u.role === 'head_teacher') || {
                        id: 'ht-' + profileSchool.id,
                        username: 'ht_' + profileSchool.code.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                        name: profileSchool.headTeacherName,
                        phone: profileSchool.contactNumber,
                        role: 'head_teacher' as const,
                        pin: '1111',
                        schoolId: profileSchool.id,
                        createdAt: new Date().toISOString()
                      };
                      openEditProfile(htUser);
                    }}
                    className="px-2 py-0.5 rounded-lg bg-emerald-800/90 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition shadow-xs cursor-pointer active:scale-95"
                    title="Edit Head Teacher (HT) Details"
                  >
                    <Edit2 className="w-3 h-3 text-emerald-300" />
                    Edit HT
                  </button>
                </div>
                <span>Contact: <strong>{profileSchool.contactNumber}</strong></span>
                <span>Est: <strong>{profileSchool.establishedDate}</strong></span>
                <span>Shift: <strong>{profileSchool.shift}</strong></span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 bg-emerald-950/70 p-3 rounded-2xl border border-emerald-800/60 text-center shrink-0">
              <div>
                <div className="text-[10px] text-emerald-300">Students</div>
                <div className="text-lg font-black text-white">{schStudents.length}</div>
              </div>
              <div>
                <div className="text-[10px] text-emerald-300">Teachers</div>
                <div className="text-lg font-black text-white">{schStaff.length}</div>
              </div>
              <div>
                <div className="text-[10px] text-emerald-300">Visits</div>
                <div className="text-lg font-black text-white">{schVisits.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Tabs Navigation */}
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'overview', label: '1. Overview' },
            { id: 'students', label: `2. Students (${schStudents.length})` },
            { id: 'teachers', label: `3. Staff (${schStaff.length})` },
            { id: 'attendance', label: '4. Attendance' },
            { id: 'visits', label: `5. Visits (${schVisits.length})` },
            { id: 'facilities', label: '6. Facilities' },
            { id: 'issues', label: `7. Issues (${schIssues.length})` },
            { id: 'tasks', label: `8. Tasks (${schTasks.length})` },
            { id: 'documents', label: `9. Documents (${schDocs.length})` },
            { id: 'payroll', label: `10. Payroll (${schPayroll.length})` },
            { id: 'history', label: '11. History' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setProfileTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                profileTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {profileTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Geographic & Demographics
              </h3>
              <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-400">Village:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{profileSchool.village}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-400">Union Council (UC):</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{profileSchool.uc}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-400">Taluka:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{profileSchool.taluka}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-400">District:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{profileSchool.district}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-400">GPS Coordinates:</span>
                  <span className="font-mono text-slate-800 dark:text-white">
                    {profileSchool.gpsCoordinates
                      ? `${profileSchool.gpsCoordinates.lat.toFixed(4)}, ${profileSchool.gpsCoordinates.lng.toFixed(4)}`
                      : 'Recorded during visit'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-400">Physical Address:</span>
                  <span className="font-semibold text-slate-800 dark:text-white text-right max-w-[200px]">{profileSchool.address}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Academic & Facilities Overview
              </h3>
              <div className="text-xs space-y-2 text-slate-600 dark:text-slate-300">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-400">Authorized Grades:</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{profileSchool.grades.join(', ')}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-400">Drinking Water:</span>
                  <span className={`font-bold ${profileSchool.facilities.drinkingWater ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {profileSchool.facilities.drinkingWater ? 'Functional' : 'Defective / Needs Pump'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-400">Boundary Wall:</span>
                  <span className={`font-bold ${profileSchool.facilities.boundaryWall ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {profileSchool.facilities.boundaryWall ? 'Secure Perimeter' : 'Damaged / Action Required'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-400">Solar Power:</span>
                  <span className={`font-bold ${profileSchool.facilities.solarPower ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {profileSchool.facilities.solarPower ? 'Installed & Operational' : 'None'}
                  </span>
                </div>
                {profileSchool.notes && (
                  <div className="pt-2">
                    <span className="text-slate-400 block mb-1">Operator Field Notes:</span>
                    <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 italic">
                      "{profileSchool.notes}"
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {profileTab === 'students' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Students Enrolled in {profileSchool.name} ({schStudents.length})
              </h3>
              <button
                onClick={() => {
                  setActiveSchoolId(profileSchool.id);
                  setCurrentTab('students');
                }}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                Open Full Student Management →
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {schStudents.map(st => (
                <div key={st.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {st.name} <span className="font-mono text-slate-400">({st.grNumber})</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Father: {st.fatherName} • {st.grade} • Form-B: {st.bFormNumber}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
                    {st.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {profileTab === 'teachers' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Teaching & Support Staff ({schStaff.length})
              </h3>
              <button
                onClick={() => {
                  setActiveSchoolId(profileSchool.id);
                  setCurrentTab('staff');
                }}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                Open Staff Directory →
              </button>
            </div>

            <div className="space-y-2">
              {schStaff.map(stf => (
                <div key={stf.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{stf.name}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold">
                        {stf.designation}
                      </span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Emp ID: {stf.employeeId} • CNIC: {stf.cnic} • Contact: {stf.contact}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">
                      PKR {stf.baseSalary.toLocaleString()}/mo
                    </div>
                    <span className="text-[10px] text-slate-400 font-semibold">Base Salary</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profileTab === 'facilities' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
              Infrastructure & Amenities Checklist
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(profileSchool.facilities).map(([key, val]) => (
                <div
                  key={key}
                  className={`p-3 rounded-2xl border flex items-center gap-2.5 text-xs font-medium ${
                    val
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  {val ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {profileTab === 'history' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2">
              School Timeline & Milestones
            </h3>
            <div className="border-l-2 border-emerald-500 pl-3 space-y-3">
              <div>
                <span className="font-bold text-slate-900 dark:text-white">Established:</span> {profileSchool.establishedDate}
                <p className="text-[11px] text-slate-500">Official registration under SEF {profileSchool.programType} program.</p>
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">Record Created:</span> {new Date(profileSchool.createdAt).toLocaleDateString()}
                <p className="text-[11px] text-slate-500">System digitized with offline sync support.</p>
              </div>
              <div>
                <span className="font-bold text-slate-900 dark:text-white">Last Profile Update:</span> {new Date(profileSchool.updatedAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // School Directory Table / Card View
  return (
    <div className="space-y-4 pb-12">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <SchoolIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            SEF Multi-School Directory ({filteredSchools.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor and manage all partner schools across Dadu, Badin, Tharparkar, Khairpur, Larkana, Sukkur
          </p>
        </div>

        {isOperator && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New School
          </button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search school name, code (e.g. SEF-DAD-101), HT name, district, taluka, village..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={districtFilter}
            onChange={e => setDistrictFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Districts</option>
            {availableDistricts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active (Good)</option>
            <option value="attention">Needs Attention</option>
            <option value="critical">Critical</option>
          </select>

          <select
            value={programFilter}
            onChange={e => setProgramFilter(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Programs</option>
            <option value="PIMS">PIMS</option>
            <option value="EVS">EVS</option>
            <option value="SEF-Middle">SEF-Middle</option>
            <option value="SAS">SAS</option>
          </select>

          <div className="ml-auto flex items-center gap-1.5 text-slate-500">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="name">Name A-Z</option>
              <option value="code">School Code</option>
              <option value="students">Enrollment (High-Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* School Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredSchools.map(sch => {
          const schStudents = students.filter(s => s.schoolId === sch.id);
          const schStaff = staff.filter(s => s.schoolId === sch.id);
          const schVisits = visits.filter(v => v.schoolId === sch.id);
          const schPendingIssues = issues.filter(i => i.schoolId === sch.id && i.status !== 'Closed');

          return (
            <div
              key={sch.id}
              onClick={() => setSelectedSchoolIdForProfile(sch.id)}
              className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {sch.code} • {sch.programType}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                      {sch.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {sch.village}, {sch.taluka}, {sch.district}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      sch.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                      sch.status === 'attention' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}
                  >
                    {sch.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400">Students</div>
                    <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{schStudents.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Teachers</div>
                    <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{schStaff.length}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Visits</div>
                    <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">{schVisits.length}</div>
                  </div>
                </div>

                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>HT: <strong>{sch.headTeacherName}</strong></span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const htUser = users.find(u => u.schoolId === sch.id && u.role === 'head_teacher') || {
                          id: 'ht-' + sch.id,
                          username: 'ht_' + sch.code.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                          name: sch.headTeacherName,
                          phone: sch.contactNumber,
                          role: 'head_teacher' as const,
                          pin: '1111',
                          schoolId: sch.id,
                          createdAt: new Date().toISOString()
                        };
                        openEditProfile(htUser);
                      }}
                      className="p-1 rounded-md bg-slate-100 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950/60 text-slate-500 hover:text-emerald-500 dark:text-slate-400 dark:hover:text-emerald-400 transition"
                      title="Edit Head Teacher (HT) Profile"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400">{sch.contactNumber}</span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="text-[11px]">
                  {schPendingIssues.length > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {schPendingIssues.length} pending issues
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Healthy Campus
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setActiveSchoolId(sch.id);
                    }}
                    className="p-1 rounded-lg text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-semibold px-2"
                    title="Filter entire application to this school"
                  >
                    Select
                  </button>

                  {isOperator && (
                    <>
                      <button
                        onClick={e => handleOpenEdit(sch, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit School"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => handleDeleteSchool(sch.id, sch.name, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        title="Delete School"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit School Modal */}
      {showSchoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-white max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold mb-1">
              {editingSchool ? `Edit School: ${editingSchool.name}` : 'Add New SEF Partner School'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enter complete administrative, geographic and infrastructure details for this school.
            </p>

            <form onSubmit={handleSaveSchool} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">School Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Dua Public School"
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">School Code (SEF ID) *</label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                    placeholder="e.g. SEF-DAD-101"
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Program Type</label>
                  <select
                    value={formProgram}
                    onChange={e => setFormProgram(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PIMS">PIMS</option>
                    <option value="EVS">EVS</option>
                    <option value="SEF-Middle">SEF-Middle</option>
                    <option value="SAS">SAS</option>
                    <option value="Integrated">Integrated</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">District *</label>
                  <input
                    type="text"
                    value={formDistrict}
                    onChange={e => setFormDistrict(e.target.value)}
                    placeholder="e.g. Dadu, Badin, Tharparkar"
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Taluka *</label>
                  <input
                    type="text"
                    value={formTaluka}
                    onChange={e => setFormTaluka(e.target.value)}
                    placeholder="e.g. Sehwan, Gambat, Mithi"
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Union Council (UC)</label>
                  <input
                    type="text"
                    value={formUc}
                    onChange={e => setFormUc(e.target.value)}
                    placeholder="e.g. Dhani Bux Chandio"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Village / Goth</label>
                  <input
                    type="text"
                    value={formVillage}
                    onChange={e => setFormVillage(e.target.value)}
                    placeholder="e.g. Goth Dhani Bux Chandio"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Full Physical Address</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={e => setFormAddress(e.target.value)}
                  placeholder="Street / Link road address"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Head Teacher Name *</label>
                  <input
                    type="text"
                    value={formHeadTeacherName}
                    onChange={e => setFormHeadTeacherName(e.target.value)}
                    placeholder="e.g. Master Ghulam Rasool Chandio"
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Contact Number *</label>
                  <input
                    type="text"
                    value={formContactNumber}
                    onChange={e => setFormContactNumber(e.target.value)}
                    placeholder="+92 301 5551201"
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Established Date</label>
                  <input
                    type="date"
                    value={formEstablishedDate}
                    onChange={e => setFormEstablishedDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Shift</label>
                  <select
                    value={formShift}
                    onChange={e => setFormShift(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Afternoon">Afternoon</option>
                    <option value="Double Shift">Double Shift</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Operational Status</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="active">Active (Good)</option>
                    <option value="attention">Needs Attention</option>
                    <option value="critical">Critical</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Facilities Checklist Switches */}
              <div className="pt-2">
                <label className="block font-semibold mb-1.5">Campus Facilities</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  {Object.entries(facilities).map(([key, val]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={val}
                        onChange={e => setFacilities({ ...facilities, [key]: e.target.checked })}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                      />
                      <span className="capitalize text-[11px]">{key.replace(/([A-Z])/g, ' $1')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Operator Notes</label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Field notes or special SEF grant remarks..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSchoolModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
                >
                  {editingSchool ? 'Update School' : 'Create School'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
