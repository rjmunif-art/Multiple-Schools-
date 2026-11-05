import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileSpreadsheet,
  ArrowUpDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  GraduationCap,
  Award,
  Layers,
  Sparkles,
  BarChart3
} from 'lucide-react';

export const SchoolComparison: React.FC = () => {
  const {
    schools,
    students,
    staff,
    studentAttendance,
    staffAttendance,
    examMarks,
    visits,
    issues,
    settings,
    setActiveSchoolId,
    setSelectedSchoolIdForProfile,
    setCurrentTab,
  } = useApp();

  const [sortField, setSortField] = useState<'attendance' | 'passPct' | 'students' | 'ratio' | 'issues' | 'score'>('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>(schools.map(s => s.id));

  // Compute metrics for each school
  const comparisonData = useMemo(() => {
    return schools.map(sch => {
      const schStudents = students.filter(s => s.schoolId === sch.id && s.status === 'Active');
      const schStaff = staff.filter(s => s.schoolId === sch.id && s.status === 'Active');
      const schTeachers = schStaff.filter(s => s.designation.includes('Teacher') || s.designation === 'Head Teacher');

      // Student Attendance (last 30 records average)
      const schStudentAtts = studentAttendance.filter(a => a.schoolId === sch.id);
      let avgStudentAtt = 0;
      if (schStudentAtts.length > 0) {
        avgStudentAtt = schStudentAtts.reduce((sum, a) => sum + a.attendancePercentage, 0) / schStudentAtts.length;
      }

      // Teacher Attendance
      const schStaffAtts = staffAttendance.filter(a => a.schoolId === sch.id);
      let avgStaffAtt = 90; // baseline
      if (schStaffAtts.length > 0) {
        const present = schStaffAtts.filter(a => a.status === 'Present').length;
        avgStaffAtt = (present / schStaffAtts.length) * 100;
      }

      // Examination Pass %
      const schMarks = examMarks.filter(m => m.schoolId === sch.id);
      let passPct = 80; // baseline
      let avgMarksPct = 78;
      if (schMarks.length > 0) {
        const passed = schMarks.filter(m => m.passed).length;
        passPct = (passed / schMarks.length) * 100;
        avgMarksPct = schMarks.reduce((sum, m) => sum + m.percentage, 0) / schMarks.length;
      }

      // Teacher-Student Ratio
      const studentTeacherRatio = schTeachers.length > 0 ? Math.round(schStudents.length / schTeachers.length) : 0;

      // Dropouts count
      const dropouts = students.filter(s => s.schoolId === sch.id && s.status === 'Dropout').length;

      // Visits & Open Issues
      const visitCount = visits.filter(v => v.schoolId === sch.id).length;
      const openIssuesCount = issues.filter(i => i.schoolId === sch.id && i.status !== 'Closed').length;

      // Facilities Score (out of 10)
      const facObj = sch.facilities;
      const facCount = Object.values(facObj).filter(Boolean).length;
      const facilitiesScore = Math.round((facCount / Object.keys(facObj).length) * 10);

      // School Health Score Formula (Formula from settings: weights)
      // Attendance (35%) + Teacher Attendance (25%) + Exam (20%) + Monitoring (10%) - Issues Penalty (10%)
      const f = settings.healthScoreFormula;
      const baseScore =
        (avgStudentAtt * (f.attendanceWeight / 100)) +
        (avgStaffAtt * (f.teacherAttendanceWeight / 100)) +
        (passPct * (f.examResultsWeight / 100)) +
        (Math.min(100, visitCount * 30) * (f.monitoringWeight / 100));
      const penalty = openIssuesCount * 5;
      const overallScore = Math.max(10, Math.min(100, Math.round(baseScore - penalty)));

      let ratingBand = 'Good';
      if (overallScore >= 88) ratingBand = 'Excellent';
      else if (overallScore >= 75) ratingBand = 'Good';
      else if (overallScore >= 60) ratingBand = 'Needs Attention';
      else ratingBand = 'Critical';

      return {
        school: sch,
        studentsCount: schStudents.length,
        teachersCount: schTeachers.length,
        studentTeacherRatio,
        avgStudentAtt,
        avgStaffAtt,
        passPct,
        avgMarksPct,
        dropouts,
        visitCount,
        openIssuesCount,
        facilitiesScore,
        overallScore,
        ratingBand,
      };
    });
  }, [schools, students, staff, studentAttendance, staffAttendance, examMarks, visits, issues, settings]);

  // Sorted list
  const sortedData = useMemo(() => {
    let list = comparisonData.filter(d => selectedSchoolIds.includes(d.school.id));

    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortField === 'score') { valA = a.overallScore; valB = b.overallScore; }
      if (sortField === 'attendance') { valA = a.avgStudentAtt; valB = b.avgStudentAtt; }
      if (sortField === 'passPct') { valA = a.passPct; valB = b.passPct; }
      if (sortField === 'students') { valA = a.studentsCount; valB = b.studentsCount; }
      if (sortField === 'ratio') { valA = a.studentTeacherRatio; valB = b.studentTeacherRatio; }
      if (sortField === 'issues') { valA = a.openIssuesCount; valB = b.openIssuesCount; }
      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [comparisonData, selectedSchoolIds, sortField, sortAsc]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            School Performance Comparison & Rankings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cross-compare enrollment, student attendance, teacher attendance, exam results, ratio, issues, and overall score
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Compare:</span>
          <button
            onClick={() => setSelectedSchoolIds(schools.map(s => s.id))}
            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold cursor-pointer"
          >
            All ({schools.length})
          </button>
        </div>
      </div>

      {/* Visual Bar Comparison Chart */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
          Overall School Performance Score Index (0 - 100)
        </h3>

        <div className="space-y-3">
          {sortedData.map(item => (
            <div key={item.school.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>{item.school.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({item.school.district})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                    item.ratingBand === 'Excellent' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                    item.ratingBand === 'Good' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                    item.ratingBand === 'Needs Attention' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                    'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}>
                    {item.ratingBand}
                  </span>
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-white w-10 text-right">
                    {item.overallScore}
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    item.overallScore >= 88 ? 'bg-emerald-500' :
                    item.overallScore >= 75 ? 'bg-teal-500' :
                    item.overallScore >= 60 ? 'bg-amber-500' :
                    'bg-rose-500'
                  }`}
                  style={{ width: `${item.overallScore}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase text-[10px] tracking-wider select-none">
                <th className="p-3">School Name</th>
                <th className="p-3 text-center cursor-pointer hover:text-slate-900" onClick={() => toggleSort('students')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Students</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 text-center cursor-pointer hover:text-slate-900" onClick={() => toggleSort('attendance')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Attendance %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 text-center cursor-pointer hover:text-slate-900" onClick={() => toggleSort('passPct')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Pass %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 text-center cursor-pointer hover:text-slate-900" onClick={() => toggleSort('ratio')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Ratio (S/T)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 text-center">Visits</th>
                <th className="p-3 text-center cursor-pointer hover:text-slate-900" onClick={() => toggleSort('issues')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Issues</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 text-center cursor-pointer hover:text-slate-900" onClick={() => toggleSort('score')}>
                  <div className="flex items-center justify-center gap-1">
                    <span>Health Score</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-3 text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
              {sortedData.map(item => (
                <tr key={item.school.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                  <td className="p-3">
                    <div className="font-bold text-slate-900 dark:text-white">{item.school.name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono">{item.school.code}</span>
                      <span>•</span>
                      <span>{item.school.district}</span>
                    </div>
                  </td>

                  <td className="p-3 text-center font-mono font-bold text-slate-900 dark:text-white">
                    {item.studentsCount}
                  </td>

                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                      item.avgStudentAtt >= 90 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                      item.avgStudentAtt >= 80 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                      'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {item.avgStudentAtt.toFixed(1)}%
                    </span>
                  </td>

                  <td className="p-3 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {item.passPct.toFixed(1)}%
                  </td>

                  <td className="p-3 text-center font-mono">
                    1 : {item.studentTeacherRatio}
                  </td>

                  <td className="p-3 text-center font-mono">
                    {item.visitCount}
                  </td>

                  <td className="p-3 text-center">
                    {item.openIssuesCount > 0 ? (
                      <span className="text-rose-600 font-bold flex items-center justify-center gap-1 font-mono">
                        <AlertTriangle className="w-3 h-3" />
                        {item.openIssuesCount}
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-bold font-mono">0</span>
                    )}
                  </td>

                  <td className="p-3 text-center font-mono font-black text-sm text-slate-900 dark:text-white">
                    {item.overallScore} / 100
                  </td>

                  <td className="p-3 text-right">
                    <button
                      onClick={() => {
                        setActiveSchoolId(item.school.id);
                        setSelectedSchoolIdForProfile(item.school.id);
                        setCurrentTab('schools');
                      }}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
                    >
                      Open →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
