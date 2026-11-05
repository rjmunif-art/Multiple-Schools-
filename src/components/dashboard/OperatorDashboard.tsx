import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  School as SchoolIcon,
  Users,
  GraduationCap,
  ClipboardCheck,
  AlertTriangle,
  Compass,
  CheckSquare,
  TrendingUp,
  PlusCircle,
  FileSpreadsheet,
  DollarSign,
  Database,
  ArrowRight,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  Edit2
} from 'lucide-react';

export const OperatorDashboard: React.FC = () => {
  const {
    currentUser,
    schools,
    students,
    staff,
    studentAttendance,
    staffAttendance,
    visits,
    issues,
    tasks,
    activeAcademicYear,
    activeSchoolId,
    setActiveSchoolId,
    setCurrentTab,
    setSelectedSchoolIdForProfile,
    settings,
    setIsAIAssistantOpen,
    openEditProfile,
  } = useApp();

  const isOperator = currentUser?.role === 'operator';
  const isHT = currentUser?.role === 'head_teacher';
  const isSupervisor = currentUser?.role === 'supervisor';

  // Calculate filtered or all schools
  const targetSchools = useMemo(() => {
    if (activeSchoolId === 'all') return schools;
    return schools.filter(s => s.id === activeSchoolId);
  }, [schools, activeSchoolId]);

  // Aggregate metrics
  const totalSchoolsCount = targetSchools.length;
  const activeSchoolsCount = targetSchools.filter(s => s.status === 'active').length;
  const attentionSchoolsCount = targetSchools.filter(s => s.status === 'attention' || s.status === 'critical').length;

  const schoolIdsSet = useMemo(() => new Set(targetSchools.map(s => s.id)), [targetSchools]);

  const targetStudents = useMemo(() => students.filter(s => schoolIdsSet.has(s.schoolId)), [students, schoolIdsSet]);
  const targetStaff = useMemo(() => staff.filter(s => schoolIdsSet.has(s.schoolId)), [staff, schoolIdsSet]);

  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayDisplayFormatted = useMemo(() => {
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  }, []);

  // School status & attendance cards data
  const schoolCardsData = useMemo(() => {
    return targetSchools.map(sch => {
      const schStudents = students.filter(s => s.schoolId === sch.id && s.status === 'Active');
      const schTeachers = staff.filter(s => s.schoolId === sch.id && s.status === 'Active');
      const schLastVisit = visits.find(v => v.schoolId === sch.id);
      const schPendingIssues = issues.filter(i => i.schoolId === sch.id && i.status !== 'Closed');

      // 1. Check if attendance was reported today (todayIso)
      const todayAllClasses = studentAttendance.find(
        a => a.schoolId === sch.id && a.date === todayIso && a.grade === 'All Classes'
      );
      const todayClassRecs = studentAttendance.filter(
        a => a.schoolId === sch.id && a.date === todayIso && a.grade !== 'All Classes'
      );

      let reportedAttendance: number | null = null;
      let reportedDate: string | null = null;
      let isToday = false;

      if (todayAllClasses) {
        reportedAttendance = todayAllClasses.attendancePercentage;
        reportedDate = todayIso;
        isToday = true;
      } else if (todayClassRecs.length > 0) {
        const sumPresent = todayClassRecs.reduce((sum, r) => sum + r.present, 0);
        const sumTotal = todayClassRecs.reduce((sum, r) => sum + r.totalStudents, 0);
        reportedAttendance = sumTotal > 0 ? (sumPresent / sumTotal) * 100 : 0;
        reportedDate = todayIso;
        isToday = true;
      } else {
        // 2. If no attendance today, check the most recent reported date for this school
        const allSchRecs = studentAttendance.filter(a => a.schoolId === sch.id);
        if (allSchRecs.length > 0) {
          const uniqueDates = Array.from(new Set(allSchRecs.map(r => r.date))).sort().reverse();
          const latestDate = uniqueDates[0];
          const latestAllClasses = allSchRecs.find(r => r.date === latestDate && r.grade === 'All Classes');
          if (latestAllClasses) {
            reportedAttendance = latestAllClasses.attendancePercentage;
            reportedDate = latestDate;
          } else {
            const latestClassRecs = allSchRecs.filter(r => r.date === latestDate && r.grade !== 'All Classes');
            const sumPresent = latestClassRecs.reduce((sum, r) => sum + r.present, 0);
            const sumTotal = latestClassRecs.reduce((sum, r) => sum + r.totalStudents, 0);
            reportedAttendance = sumTotal > 0 ? (sumPresent / sumTotal) * 100 : 0;
            reportedDate = latestDate;
          }
          isToday = false;
        }
      }

      // Attendance color & status
      let attColor = 'bg-slate-500';
      let attStatus: 'Good' | 'Attention' | 'Critical' | 'No Data' = 'No Data';

      if (reportedAttendance !== null) {
        if (reportedAttendance >= settings.attendanceThresholds.attentionBelow) {
          attColor = 'bg-emerald-500 text-white';
          attStatus = 'Good';
        } else if (reportedAttendance >= settings.attendanceThresholds.criticalBelow) {
          attColor = 'bg-amber-500 text-white';
          attStatus = 'Attention';
        } else {
          attColor = 'bg-rose-500 text-white';
          attStatus = 'Critical';
        }
      }

      return {
        school: sch,
        studentsCount: schStudents.length,
        teachersCount: schTeachers.length,
        todayAttendance: reportedAttendance,
        reportedDate,
        isToday,
        attColor,
        attStatus,
        lastVisitDate: schLastVisit?.date,
        pendingIssuesCount: schPendingIssues.length,
      };
    });
  }, [targetSchools, students, staff, studentAttendance, visits, issues, todayIso, settings]);

  // Overall attendance calculation
  const todayStudentAtts = useMemo(() => {
    return studentAttendance.filter(a => a.date === todayIso && schoolIdsSet.has(a.schoolId));
  }, [studentAttendance, todayIso, schoolIdsSet]);

  const { overallStudentAttendance, isAttendanceFromToday } = useMemo(() => {
    const todaySchools = schoolCardsData.filter(s => s.isToday && s.todayAttendance !== null);
    if (todaySchools.length > 0) {
      const avg = todaySchools.reduce((sum, s) => sum + (s.todayAttendance || 0), 0) / todaySchools.length;
      return { overallStudentAttendance: avg, isAttendanceFromToday: true };
    }
    // Fall back to latest reported average across schools
    const reportedSchools = schoolCardsData.filter(s => s.todayAttendance !== null);
    if (reportedSchools.length === 0) return { overallStudentAttendance: 0, isAttendanceFromToday: false };
    const avg = reportedSchools.reduce((sum, s) => sum + (s.todayAttendance || 0), 0) / reportedSchools.length;
    return { overallStudentAttendance: avg, isAttendanceFromToday: false };
  }, [schoolCardsData]);

  // Today's teacher attendance
  const todayStaffAtts = useMemo(() => {
    return staffAttendance.filter(a => a.date === todayIso && schoolIdsSet.has(a.schoolId));
  }, [staffAttendance, todayIso, schoolIdsSet]);

  const overallTodayTeacherAttendance = useMemo(() => {
    if (todayStaffAtts.length === 0) return 0;
    const presentCount = todayStaffAtts.filter(a => a.status === 'Present').length;
    return (presentCount / todayStaffAtts.length) * 100;
  }, [todayStaffAtts]);

  // Pending tasks & visits
  const targetTasks = useMemo(() => tasks.filter(t => schoolIdsSet.has(t.schoolId)), [tasks, schoolIdsSet]);
  const pendingTasksCount = targetTasks.filter(t => t.status !== 'Completed').length;

  const targetIssues = useMemo(() => issues.filter(i => schoolIdsSet.has(i.schoolId)), [issues, schoolIdsSet]);
  const criticalIssuesCount = targetIssues.filter(i => i.priority === 'Critical' && i.status !== 'Closed').length;

  const targetVisits = useMemo(() => visits.filter(v => schoolIdsSet.has(v.schoolId)), [visits, schoolIdsSet]);

  const handleSelectSchool = (schoolId: string) => {
    setActiveSchoolId(schoolId);
    setSelectedSchoolIdForProfile(schoolId);
    setCurrentTab('schools');
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Welcome / Role Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {activeSchoolId === 'all' ? 'All Schools Central Overview' : `Selected School: ${targetSchools[0]?.name}`}
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1">
              {currentUser?.name || 'SEF Partner Operator'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-0.5">
              {currentUser?.organizationName || 'Sindh Rural Education Support Organization'} • Academic Year {activeAcademicYear}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openEditProfile(currentUser)}
              className="px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 border border-white/25 active:scale-95"
              title="Edit Profile"
            >
              <Edit2 className="w-3.5 h-3.5 text-emerald-200" />
              Edit Profile
            </button>
            <button
              onClick={() => setCurrentTab('attendance')}
              className="px-3.5 py-2 rounded-xl bg-white text-emerald-900 text-xs font-bold shadow-xs hover:bg-emerald-50 active:scale-95 transition cursor-pointer flex items-center gap-1.5"
            >
              <ClipboardCheck className="w-4 h-4 text-emerald-700" />
              Today's Attendance
            </button>
            {isOperator && (
              <button
                onClick={() => setCurrentTab('payroll')}
                className="px-3.5 py-2 rounded-xl bg-emerald-700/80 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition cursor-pointer flex items-center gap-1.5 border border-emerald-500/50"
              >
                <DollarSign className="w-4 h-4 text-emerald-300" />
                Staff Salaries
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Schools */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Total Schools</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <SchoolIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {totalSchoolsCount}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{activeSchoolsCount} Active</span>
            <span>•</span>
            <span className="text-rose-500 font-semibold">{attentionSchoolsCount} Need Attention</span>
          </div>
        </div>

        {/* Total Enrollment */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Enrolled Students</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {targetStudents.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Across Kachi to Class VIII
          </div>
        </div>

        {/* Today's Student Attendance */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>{isAttendanceFromToday ? "Today's Attendance" : "Latest Attendance"}</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              overallStudentAttendance >= 90 ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600' :
              overallStudentAttendance >= 80 ? 'bg-amber-100 dark:bg-amber-950 text-amber-600' :
              'bg-rose-100 dark:bg-rose-950 text-rose-600'
            }`}>
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
            {overallStudentAttendance > 0 ? (
              <>
                <span>{overallStudentAttendance.toFixed(1)}%</span>
                <span className={`text-xs font-bold px-1.5 py-0.2 rounded-full ${
                  overallStudentAttendance >= 90 ? 'bg-emerald-100 text-emerald-700' :
                  overallStudentAttendance >= 80 ? 'bg-amber-100 text-amber-700' :
                  'bg-rose-100 text-rose-700'
                }`}>
                  {overallStudentAttendance >= 90 ? 'Good' : overallStudentAttendance >= 80 ? 'Attention' : 'Critical'}
                </span>
              </>
            ) : (
              <span className="text-slate-400 text-base font-semibold">Not Reported</span>
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {isAttendanceFromToday 
              ? `${schoolCardsData.filter(s => s.isToday).length} of ${targetSchools.length} schools submitted today`
              : `${schoolCardsData.filter(s => s.todayAttendance !== null).length} of ${targetSchools.length} schools latest reported`}
          </div>
        </div>

        {/* Teachers & Staff */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Teachers & Staff</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {targetStaff.length}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px]">
            <span className="text-purple-600 dark:text-purple-400 font-semibold">
              {overallTodayTeacherAttendance > 0 ? `${overallTodayTeacherAttendance.toFixed(0)}% Present` : 'HT & Teachers'}
            </span>
            <span>•</span>
            <span className="text-slate-500">{targetStaff.filter(s => s.designation === 'Peon').length} Peons</span>
          </div>
        </div>
      </div>

      {/* Quick Actions (Large 1-hand friendly mobile buttons) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>Quick Operations</span>
          <span className="text-[10px] text-slate-400 font-normal">Tap to open field action</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {isOperator && (
            <button
              onClick={() => {
                setActiveSchoolId('all');
                setCurrentTab('schools');
              }}
              className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 active:scale-95"
            >
              <PlusCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-bold leading-tight">+ Add School</span>
            </button>
          )}

          <button
            onClick={() => setCurrentTab('students')}
            className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 text-blue-800 dark:text-blue-300 text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 active:scale-95"
          >
            <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-bold leading-tight">+ Student</span>
          </button>

          <button
            onClick={() => setCurrentTab('attendance')}
            className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800/80 text-teal-800 dark:text-teal-300 text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 active:scale-95"
          >
            <ClipboardCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-bold leading-tight">✓ Attendance</span>
          </button>

          <button
            onClick={() => setCurrentTab('examinations')}
            className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-800 dark:text-indigo-300 text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 active:scale-95"
          >
            <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold leading-tight">📝 Enter Marks</span>
          </button>

          <button
            onClick={() => setCurrentTab('visits')}
            className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 active:scale-95"
          >
            <Compass className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-bold leading-tight">🏫 School Visit</span>
          </button>

          {isOperator ? (
            <button
              onClick={() => setCurrentTab('payroll')}
              className="p-3 rounded-2xl bg-green-50 dark:bg-green-950/50 hover:bg-green-100 dark:hover:bg-green-900/60 border border-green-200 dark:border-green-800/80 text-green-800 dark:text-green-300 text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 active:scale-95"
            >
              <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-xs font-bold leading-tight">💰 Salaries</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentTab('reports')}
              className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-center transition cursor-pointer flex flex-col items-center justify-center gap-1.5 active:scale-95"
            >
              <FileSpreadsheet className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              <span className="text-xs font-bold leading-tight">📊 Reports</span>
            </button>
          )}
        </div>
      </div>

      {/* Today's School Attendance Comparison (Visual Bar Chart with Drill-down) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Today's School Attendance ({todayDisplayFormatted})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Thresholds: <span className="text-emerald-600 font-semibold">≥90% Good</span> • <span className="text-amber-600 font-semibold">80-89% Attention</span> • <span className="text-rose-600 font-semibold">&lt;80% Critical</span>
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('attendance')}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Visual attendance bars */}
        <div className="space-y-3">
          {schoolCardsData.map(item => {
            const att = item.todayAttendance;
            return (
              <div
                key={item.school.id}
                onClick={() => handleSelectSchool(item.school.id)}
                className="group p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 transition cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition truncate max-w-[70%]">
                    {item.school.name} <span className="text-slate-400 font-mono font-normal">({item.school.code})</span>
                  </div>
                  <div className="font-bold flex items-center gap-2">
                    {att !== null ? (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        att >= 90 ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                        att >= 80 ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' :
                        'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      }`}>
                        {att.toFixed(1)}% {item.isToday ? '(Today)' : item.reportedDate ? `(${item.reportedDate.split('-').reverse().slice(0, 2).join('/')})` : ''}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        Not Reported (0%)
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      att === null ? 'w-0' :
                      att >= 90 ? 'bg-emerald-500' :
                      att >= 80 ? 'bg-amber-500' :
                      'bg-rose-500'
                    }`}
                    style={{ width: `${att !== null ? Math.min(100, Math.max(0, att)) : 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>{item.school.taluka}, {item.school.district}</span>
                  <span>HT: {item.school.headTeacherName}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* School Summary Cards Grid (Click to enter management area) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              School Profiles & Operational Status
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tap any school card to enter its complete management profile
            </p>
          </div>
          <button
            onClick={() => setCurrentTab('schools')}
            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
          >
            <span>My Schools Directory</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {schoolCardsData.map(item => {
            const s = item.school;
            return (
              <div
                key={s.id}
                onClick={() => handleSelectSchool(s.id)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  {/* Top card header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {s.code} • {s.programType}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {s.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {s.village}, {s.taluka}, {s.district}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        s.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        s.status === 'attention' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-2 mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400">Students</div>
                      <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                        {item.studentsCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Staff</div>
                      <div className="text-xs font-black text-slate-900 dark:text-white mt-0.5">
                        {item.teachersCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Today's Att.</div>
                      <div className={`text-xs font-black mt-0.5 ${
                        item.todayAttendance === null ? 'text-slate-400' :
                        item.todayAttendance >= 90 ? 'text-emerald-600 dark:text-emerald-400' :
                        item.todayAttendance >= 80 ? 'text-amber-600 dark:text-amber-400' :
                        'text-rose-600 dark:text-rose-400'
                      }`}>
                        {item.todayAttendance ? `${item.todayAttendance.toFixed(0)}%` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card footer: HT name and pending alerts */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="truncate max-w-[140px]">HT: {s.headTeacherName}</span>
                  {item.pendingIssuesCount > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {item.pendingIssuesCount} {item.pendingIssuesCount === 1 ? 'issue' : 'issues'}
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      All Clear
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
