import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  ClipboardCheck,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Users,
  School as SchoolIcon,
  Plus,
  Save,
  Clock,
  ArrowRight,
  Filter
} from 'lucide-react';
import { StudentDailyAttendance, StaffDailyAttendance } from '../../types';

export const AttendanceSystem: React.FC = () => {
  const {
    schools,
    students,
    staff,
    studentAttendance,
    staffAttendance,
    saveStudentAttendance,
    saveStaffAttendance,
    activeSchoolId,
    setActiveSchoolId,
    activeAcademicYear,
    currentUser,
    settings,
  } = useApp();

  const isOperator = currentUser?.role === 'operator';
  const isHT = currentUser?.role === 'head_teacher';
  const isSupervisor = currentUser?.role === 'supervisor';

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'mark_students' | 'mark_staff' | 'teacher_summary'>('overview');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedSchoolId, setSelectedSchoolId] = useState(
    activeSchoolId !== 'all' ? activeSchoolId : (schools[0]?.id || '')
  );

  // Student Attendance Form state (Default to 'all' for Whole School Roll)
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [studentStatuses, setStudentStatuses] = useState<Record<string, 'present' | 'absent' | 'leave' | 'late'>>({});

  // Staff Attendance Form state
  const [staffStatuses, setStaffStatuses] = useState<Record<string, 'Present' | 'Absent' | 'Leave' | 'Late'>>({});
  const [staffRemarks, setStaffRemarks] = useState<Record<string, string>>({});

  const [savedSuccessMsg, setSavedSuccessMsg] = useState('');

  // Target school
  const currentSchool = useMemo(() => {
    return schools.find(s => s.id === selectedSchoolId) || schools[0];
  }, [schools, selectedSchoolId]);

  // Students for selected school and grade ('all' means full school student list)
  const targetClassStudents = useMemo(() => {
    if (selectedGrade === 'all') {
      return students.filter(s => s.schoolId === selectedSchoolId && s.status === 'Active');
    }
    return students.filter(s => s.schoolId === selectedSchoolId && s.grade === selectedGrade && s.status === 'Active');
  }, [students, selectedSchoolId, selectedGrade]);

  // Teachers for selected school
  const targetSchoolStaff = useMemo(() => {
    return staff.filter(s => s.schoolId === selectedSchoolId && s.status !== 'Resigned' && s.status !== 'Transferred');
  }, [staff, selectedSchoolId]);

  // Sync initial state for students
  React.useEffect(() => {
    const existingRec = studentAttendance.find(
      a => a.schoolId === selectedSchoolId && a.date === selectedDate && (selectedGrade === 'all' ? a.grade === 'All Classes' : a.grade === selectedGrade)
    );
    const initialMap: Record<string, 'present' | 'absent' | 'leave' | 'late'> = {};
    if (existingRec?.records) {
      existingRec.records.forEach(r => {
        initialMap[r.studentId] = r.status;
      });
    } else {
      targetClassStudents.forEach(st => {
        initialMap[st.id] = 'present';
      });
    }
    setStudentStatuses(initialMap);
  }, [selectedSchoolId, selectedGrade, selectedDate, targetClassStudents, studentAttendance]);

  // Sync initial state for staff
  React.useEffect(() => {
    const initialStaffMap: Record<string, 'Present' | 'Absent' | 'Leave' | 'Late'> = {};
    const initialRemarksMap: Record<string, string> = {};
    targetSchoolStaff.forEach(stf => {
      const existing = staffAttendance.find(a => a.staffId === stf.id && a.date === selectedDate);
      initialStaffMap[stf.id] = existing?.status || 'Present';
      if (existing?.remarks) initialRemarksMap[stf.id] = existing.remarks;
    });
    setStaffStatuses(initialStaffMap);
    setStaffRemarks(initialRemarksMap);
  }, [selectedSchoolId, selectedDate, targetSchoolStaff, staffAttendance]);

  // Save student attendance calculation
  const calculatedPresent = useMemo(() => {
    return Object.values(studentStatuses).filter(s => s === 'present').length;
  }, [studentStatuses]);

  const calculatedAbsent = useMemo(() => {
    return Object.values(studentStatuses).filter(s => s === 'absent').length;
  }, [studentStatuses]);

  const calculatedLeave = useMemo(() => {
    return Object.values(studentStatuses).filter(s => s === 'leave').length;
  }, [studentStatuses]);

  const calculatedLate = useMemo(() => {
    return Object.values(studentStatuses).filter(s => s === 'late').length;
  }, [studentStatuses]);

  const calculatedTotal = targetClassStudents.length;
  const calculatedPercent = calculatedTotal > 0 ? ((calculatedPresent + calculatedLate) / calculatedTotal) * 100 : 0;

  const handleSaveStudentAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedTotal === 0) return;

    if (selectedGrade === 'all') {
      // 1. Overall 'All Classes' record
      const allRecords = Object.entries(studentStatuses).map(([studentId, status]) => ({
        studentId,
        status,
      }));

      const batchToSave: any[] = [
        {
          schoolId: selectedSchoolId,
          date: selectedDate,
          academicYear: activeAcademicYear,
          grade: 'All Classes',
          totalStudents: calculatedTotal,
          present: calculatedPresent + calculatedLate,
          absent: calculatedAbsent,
          leave: calculatedLeave,
          late: calculatedLate,
          attendancePercentage: Number(calculatedPercent.toFixed(1)),
          records: allRecords,
          submittedBy: currentUser?.name || 'Head Teacher',
        }
      ];

      // 2. Also calculate and save each individual class roll automatically in the same atomic batch
      const distinctGrades = Array.from(new Set(targetClassStudents.map(s => s.grade)));
      distinctGrades.forEach(grd => {
        const classStds = targetClassStudents.filter(s => s.grade === grd);
        const classRecords = classStds.map(s => ({
          studentId: s.id,
          status: studentStatuses[s.id] || 'present',
        }));
        const clPresent = classRecords.filter(r => r.status === 'present').length;
        const clAbsent = classRecords.filter(r => r.status === 'absent').length;
        const clLeave = classRecords.filter(r => r.status === 'leave').length;
        const clLate = classRecords.filter(r => r.status === 'late').length;
        const clTotal = classStds.length;
        const clPct = clTotal > 0 ? ((clPresent + clLate) / clTotal) * 100 : 0;

        batchToSave.push({
          schoolId: selectedSchoolId,
          date: selectedDate,
          academicYear: activeAcademicYear,
          grade: grd,
          totalStudents: clTotal,
          present: clPresent + clLate,
          absent: clAbsent,
          leave: clLeave,
          late: clLate,
          attendancePercentage: Number(clPct.toFixed(1)),
          records: classRecords,
          submittedBy: currentUser?.name || 'Head Teacher',
        });
      });

      saveStudentAttendance(batchToSave);
      setSavedSuccessMsg(`Attendance saved for all ${calculatedTotal} students across all classes: ${calculatedPercent.toFixed(1)}% Present`);
    } else {
      const records = targetClassStudents.map(s => ({
        studentId: s.id,
        status: studentStatuses[s.id] || 'present',
      }));

      saveStudentAttendance({
        schoolId: selectedSchoolId,
        date: selectedDate,
        academicYear: activeAcademicYear,
        grade: selectedGrade,
        totalStudents: calculatedTotal,
        present: calculatedPresent + calculatedLate,
        absent: calculatedAbsent,
        leave: calculatedLeave,
        late: calculatedLate,
        attendancePercentage: Number(calculatedPercent.toFixed(1)),
        records,
        submittedBy: currentUser?.name || 'Head Teacher',
      });

      setSavedSuccessMsg(`Attendance saved for ${selectedGrade}: ${calculatedPercent.toFixed(1)}% Present`);
    }
    setTimeout(() => setSavedSuccessMsg(''), 3000);
  };

  const handleSaveStaffAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    const records = targetSchoolStaff.map(stf => ({
      schoolId: selectedSchoolId,
      date: selectedDate,
      academicYear: activeAcademicYear,
      staffId: stf.id,
      status: staffStatuses[stf.id] || 'Present',
      remarks: staffRemarks[stf.id] || undefined,
    }));

    saveStaffAttendance(records);
    setSavedSuccessMsg(`Staff attendance saved for ${targetSchoolStaff.length} employees.`);
    setTimeout(() => setSavedSuccessMsg(''), 3000);
  };

  // Overview calculation across all schools for selectedDate
  const allSchoolsAttendanceOverview = useMemo(() => {
    return schools.map(sch => {
      const attRecords = studentAttendance.filter(a => a.schoolId === sch.id && a.date === selectedDate);
      const staffAttRecords = staffAttendance.filter(a => a.schoolId === sch.id && a.date === selectedDate);

      let studentPercent: number | null = null;
      let totalEnrolled = 0;
      let totalPresent = 0;

      const overallRecord = attRecords.find(a => a.grade === 'All Classes');
      if (overallRecord) {
        totalEnrolled = overallRecord.totalStudents;
        totalPresent = overallRecord.present;
        studentPercent = overallRecord.attendancePercentage;
      } else if (attRecords.length > 0) {
        totalEnrolled = attRecords.reduce((sum, a) => sum + a.totalStudents, 0);
        totalPresent = attRecords.reduce((sum, a) => sum + a.present, 0);
        studentPercent = totalEnrolled > 0 ? (totalPresent / totalEnrolled) * 100 : 0;
      }

      let staffPresentCount = 0;
      let staffTotal = staff.filter(s => s.schoolId === sch.id).length;
      if (staffAttRecords.length > 0) {
        staffPresentCount = staffAttRecords.filter(s => s.status === 'Present').length;
      }

      // Threshold evaluation
      let status: 'Good' | 'Attention' | 'Critical' | 'No Data' = 'No Data';
      if (studentPercent !== null) {
        if (studentPercent >= settings.attendanceThresholds.attentionBelow) status = 'Good';
        else if (studentPercent >= settings.attendanceThresholds.criticalBelow) status = 'Attention';
        else status = 'Critical';
      }

      return {
        school: sch,
        studentPercent,
        totalEnrolled,
        totalPresent,
        staffPresentCount,
        staffTotal,
        status,
        reported: attRecords.length > 0,
      };
    });
  }, [schools, studentAttendance, staffAttendance, selectedDate, staff, settings]);

  return (
    <div className="space-y-4 pb-12">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            SEF Daily Attendance Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Student daily class roll call, teacher attendance monitoring, and operator multi-school overview
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-900 dark:text-white font-mono font-semibold focus:outline-none"
            />
          </div>
        </div>
      </div>

      {savedSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex rounded-2xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeSubTab === 'overview'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          1. Today's School Overview
        </button>

        {!isSupervisor && (
          <>
            <button
              onClick={() => setActiveSubTab('mark_students')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeSubTab === 'mark_students'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              2. Student Class Roll Call
            </button>
            <button
              onClick={() => setActiveSubTab('mark_staff')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeSubTab === 'mark_staff'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              3. Staff Attendance Entry
            </button>
          </>
        )}

        <button
          onClick={() => setActiveSubTab('teacher_summary')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
            activeSubTab === 'teacher_summary'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          4. Teacher Monitoring
        </button>
      </div>

      {/* SUB-TAB 1: TODAY'S SCHOOL ATTENDANCE OVERVIEW */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  TODAY'S SCHOOL ATTENDANCE OVERVIEW ({selectedDate})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Automated color status: <span className="text-emerald-600 font-bold">Green ≥90%</span> • <span className="text-amber-600 font-bold">Yellow 80-89%</span> • <span className="text-rose-600 font-bold">Red &lt;80%</span> • <span className="text-slate-400 font-bold">Grey: Not Reported</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allSchoolsAttendanceOverview.map(item => {
                const s = item.school;
                const pct = item.studentPercent;

                return (
                  <div
                    key={s.id}
                    className={`p-4 rounded-2xl border transition ${
                      item.status === 'Good' ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800' :
                      item.status === 'Attention' ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800' :
                      item.status === 'Critical' ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800' :
                      'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-[10px] text-slate-500">{s.code}</span>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight mt-0.5">{s.name}</h4>
                        <div className="text-[11px] text-slate-500 mt-0.5">{s.taluka}, {s.district}</div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono shadow-xs ${
                        item.status === 'Good' ? 'bg-emerald-600 text-white' :
                        item.status === 'Attention' ? 'bg-amber-500 text-white' :
                        item.status === 'Critical' ? 'bg-rose-600 text-white' :
                        'bg-slate-400 text-white'
                      }`}>
                        {pct !== null ? `${pct.toFixed(1)}%` : 'No Data'}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80 grid grid-cols-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Student Headcount</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {item.reported ? `${item.totalPresent} / ${item.totalEnrolled}` : 'Missing'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Staff Present</span>
                        <strong className="text-slate-800 dark:text-slate-200">
                          {item.staffPresentCount} / {item.staffTotal}
                        </strong>
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                      <span>HT: {s.headTeacherName}</span>
                      <button
                        onClick={() => {
                          setSelectedSchoolId(s.id);
                          setActiveSubTab('mark_students');
                        }}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                      >
                        Roll Call →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MARK STUDENT ATTENDANCE (CLASS-WISE) */}
      {activeSubTab === 'mark_students' && (
        <form onSubmit={handleSaveStudentAttendance} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Daily Class Student Roll Call
              </h3>
              <p className="text-xs text-slate-500">
                Mark present, absent or leave for each individual student
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeSchoolId === 'all' && (
                <select
                  value={selectedSchoolId}
                  onChange={e => setSelectedSchoolId(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              )}

              <select
                value={selectedGrade}
                onChange={e => setSelectedGrade(e.target.value)}
                className="rounded-xl border border-emerald-600/60 bg-emerald-950 px-3 py-1.5 text-xs font-bold text-emerald-200 focus:outline-none"
              >
                <option value="all">★ All Students ({currentSchool?.name})</option>
                {currentSchool?.grades.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Real-time calculated attendance preview banner */}
          <div className="p-3 rounded-2xl bg-emerald-950/70 border border-emerald-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-[10px] text-emerald-400 block">Total Students</span>
                <strong className="text-base text-white">{calculatedTotal}</strong>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 block font-semibold">Present (P)</span>
                <strong className="text-base text-emerald-400 font-mono">{calculatedPresent}</strong>
              </div>
              <div>
                <span className="text-[10px] text-rose-400 block font-semibold">Absent (A)</span>
                <strong className="text-base text-rose-400 font-mono">{calculatedAbsent}</strong>
              </div>
              <div>
                <span className="text-[10px] text-purple-300 block font-semibold">Leave</span>
                <strong className="text-base text-purple-300 font-mono">{calculatedLeave}</strong>
              </div>
              <div>
                <span className="text-[10px] text-amber-400 block font-semibold">Late</span>
                <strong className="text-base text-amber-400 font-mono">{calculatedLate}</strong>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-emerald-300 block font-semibold">Attendance %</span>
                <span className={`text-xl font-black font-mono ${
                  calculatedPercent >= 90 ? 'text-emerald-400' :
                  calculatedPercent >= 80 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {calculatedPercent.toFixed(1)}%
                </span>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Save Attendance
              </button>
            </div>
          </div>

          {/* Quick Batch Actions */}
          <div className="flex items-center justify-between gap-2 px-1 text-xs">
            <span className="text-[11px] text-emerald-300 font-semibold truncate">
              Marking {selectedGrade === 'all' ? 'All Classes' : selectedGrade} ({targetClassStudents.length} Students):
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const allP: Record<string, 'present' | 'absent' | 'leave' | 'late'> = {};
                  targetClassStudents.forEach(st => {
                    allP[st.id] = 'present';
                  });
                  setStudentStatuses(allP);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 text-[11px] font-bold border border-emerald-600/50 cursor-pointer"
              >
                ✓ Mark All Present (P)
              </button>
              <button
                type="button"
                onClick={() => {
                  const allA: Record<string, 'present' | 'absent' | 'leave' | 'late'> = {};
                  targetClassStudents.forEach(st => {
                    allA[st.id] = 'absent';
                  });
                  setStudentStatuses(allA);
                }}
                className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-[11px] font-bold border border-rose-700/50 cursor-pointer"
              >
                ✕ Mark All Absent (A)
              </button>
            </div>
          </div>

          {/* Student roll call items with P, A, Leave and Late */}
          <div className="space-y-2">
            {targetClassStudents.length === 0 ? (
              <div className="p-8 text-center text-emerald-300 text-xs">
                No active students found. Add students in the Student Directory.
              </div>
            ) : (
              targetClassStudents.map((st, idx) => {
                const currentStatus = studentStatuses[st.id] || 'present';

                return (
                  <div
                    key={st.id}
                    className="py-3 px-3 rounded-2xl bg-emerald-950/30 hover:bg-emerald-950/60 border border-emerald-900/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <span className="font-mono text-emerald-400 w-7 text-center text-xs font-bold shrink-0 pt-0.5 sm:pt-0 bg-emerald-900/40 py-1 rounded-lg border border-emerald-800/60">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-sm leading-tight">
                            {st.name}
                          </span>
                          <span className="font-mono text-[11px] text-emerald-300 bg-emerald-950/90 px-2 py-0.5 rounded-md border border-emerald-800/80 font-medium shrink-0">
                            GR: {st.grNumber}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-900/90 border border-emerald-700/60 text-emerald-200 font-semibold shrink-0">
                            {st.grade}
                          </span>
                        </div>
                        <div className="text-xs text-emerald-200/90 mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-emerald-400 font-medium">Father Name:</span>
                          <span className="font-semibold text-white">{st.fatherName || 'Not Specified'}</span>
                          {st.guardianContact && (
                            <span className="text-[11px] text-emerald-400/80 font-mono ml-1">
                              • {st.guardianContact}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setStudentStatuses({ ...studentStatuses, [st.id]: 'present' })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          currentStatus === 'present'
                            ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900'
                        }`}
                        title="Present"
                      >
                        P
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentStatuses({ ...studentStatuses, [st.id]: 'absent' })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          currentStatus === 'absent'
                            ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300'
                            : 'bg-emerald-950/80 text-rose-300 border border-emerald-800/80 hover:bg-rose-950'
                        }`}
                        title="Absent"
                      >
                        A
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentStatuses({ ...studentStatuses, [st.id]: 'leave' })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          currentStatus === 'leave'
                            ? 'bg-purple-600 text-white shadow-md ring-2 ring-purple-300'
                            : 'bg-emerald-950/80 text-purple-300 border border-emerald-800/80 hover:bg-purple-950'
                        }`}
                        title="Approved Leave"
                      >
                        Leave
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentStatuses({ ...studentStatuses, [st.id]: 'late' })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          currentStatus === 'late'
                            ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-200'
                            : 'bg-emerald-950/80 text-amber-300 border border-emerald-800/80 hover:bg-amber-950'
                        }`}
                        title="Late Arrival"
                      >
                        Late
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </form>
      )}

      {/* SUB-TAB 3: MARK STAFF ATTENDANCE */}
      {activeSubTab === 'mark_staff' && (
        <form onSubmit={handleSaveStaffAttendance} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Daily Staff Attendance Entry ({selectedDate})
              </h3>
              <p className="text-xs text-slate-500">
                Record attendance for Head Teacher, Teachers, and Peon/Aya. Unexcused absences link to monthly payroll deduction.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeSchoolId === 'all' && (
                <select
                  value={selectedSchoolId}
                  onChange={e => setSelectedSchoolId(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none"
                >
                  {schools.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              )}
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Save Staff Attendance
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {targetSchoolStaff.map(stf => {
              const currentStatus = staffStatuses[stf.id] || 'Present';

              return (
                <div key={stf.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{stf.name}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                        {stf.designation}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Emp ID: {stf.employeeId} • Base Pay: PKR {stf.baseSalary.toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Remarks / Leave reason"
                      value={staffRemarks[stf.id] || ''}
                      onChange={e => setStaffRemarks({ ...staffRemarks, [stf.id]: e.target.value })}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs w-44 focus:outline-none"
                    />

                    <div className="flex items-center gap-1">
                      {(['Present', 'Absent', 'Leave', 'Late'] as const).map(stat => (
                        <button
                          key={stat}
                          type="button"
                          onClick={() => setStaffStatuses({ ...staffStatuses, [stf.id]: stat })}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            currentStatus === stat
                              ? stat === 'Present' ? 'bg-emerald-600 text-white' :
                                stat === 'Absent' ? 'bg-rose-600 text-white' :
                                stat === 'Leave' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {stat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </form>
      )}

      {/* SUB-TAB 4: TEACHER ATTENDANCE MONITORING */}
      {activeSubTab === 'teacher_summary' && (
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Teacher & Staff Attendance Monitoring ({selectedDate})
              </h3>
              <p className="text-xs text-slate-500">
                Identify absent staff, chronic leaves, and unexcused absenteeism across all schools
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase text-[10px] font-semibold">
                  <th className="p-3">Staff Name</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">School</th>
                  <th className="p-3">Status Today</th>
                  <th className="p-3">Remarks / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
                {staff.map(stf => {
                  const sch = schools.find(s => s.id === stf.schoolId);
                  const att = staffAttendance.find(a => a.staffId === stf.id && a.date === selectedDate);
                  const status = att ? att.status : 'Present';

                  return (
                    <tr key={stf.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-3">
                        <div className="font-bold text-slate-900 dark:text-white">{stf.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{stf.employeeId}</div>
                      </td>
                      <td className="p-3 font-semibold text-slate-600 dark:text-slate-300">{stf.designation}</td>
                      <td className="p-3">{sch?.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          status === 'Present' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          status === 'Absent' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse' :
                          status === 'Leave' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-3 text-[11px] text-slate-500">
                        {status === 'Absent' ? (
                          <span className="text-rose-600 font-semibold">
                            ⚠️ Unexcused Absence — Salary deduction queued
                          </span>
                        ) : (
                          att?.remarks || 'Normal duty marked'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
