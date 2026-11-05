import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Printer,
  Download,
  Calendar,
  Filter,
  CheckCircle2,
  Users,
  GraduationCap,
  ClipboardCheck,
  Award,
  AlertTriangle,
  Compass,
  CheckSquare,
  Building,
  School as SchoolIcon,
  Search
} from 'lucide-react';

export const ReportsCenter: React.FC = () => {
  const {
    schools,
    students,
    staff,
    studentAttendance,
    staffAttendance,
    examinations,
    examMarks,
    visits,
    issues,
    tasks,
    payroll,
    activeSchoolId,
    activeAcademicYear,
    currentUser,
  } = useApp();

  const isSupervisor = currentUser?.role === 'supervisor';

  const [selectedReportId, setSelectedReportId] = useState<number>(14); // default Overall Operator Report
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(activeSchoolId !== 'all' ? activeSchoolId : 'all');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(activeAcademicYear);

  const reportList = [
    { id: 1, title: 'School Profile Report', desc: 'Comprehensive administrative & facility dossier per campus', icon: SchoolIcon },
    { id: 2, title: 'Student Enrollment Report', desc: 'Complete breakdown of student headcounts, gender & grades', icon: GraduationCap },
    { id: 3, title: 'Teacher & Staff Report', desc: 'Faculty qualifications, designations, and salary structures', icon: Users },
    { id: 4, title: 'Student Attendance Report', desc: 'Daily attendance percentages and class-wise roll calls', icon: ClipboardCheck },
    { id: 5, title: 'Teacher Attendance Report', desc: 'Staff presence, leaves, tardiness, and unexcused absences', icon: Users },
    { id: 6, title: 'Monthly Attendance Report', desc: 'Consolidated 30-day student and faculty attendance trends', icon: Calendar },
    { id: 7, title: 'Examination Result Report', desc: 'Subject marks, total scores and percentage gazette', icon: Award },
    { id: 8, title: 'Pass / Fail Analysis Report', desc: 'Pass rates, grade letter distributions (A+ to F)', icon: CheckCircle2 },
    { id: 9, title: 'School Comparison Report', desc: 'Multi-school KPI comparison and ranking index', icon: FileText },
    { id: 10, title: 'School Visit Report', desc: 'Officer monitoring logs, arrivals and classroom observations', icon: Compass },
    { id: 11, title: 'Monitoring Checklist Report', desc: '17-point quality inspection outcomes & compliance', icon: ClipboardCheck },
    { id: 12, title: 'School Issue & Follow-up Report', desc: 'Facility defects, security hazards and contractor actions', icon: AlertTriangle },
    { id: 13, title: 'Task & Directive Status Report', desc: 'Administrative assignments and deadline status', icon: CheckSquare },
    { id: 14, title: 'Overall Operator Executive Report', desc: 'High-level executive summary across all partner schools', icon: Building },
  ];

  const currentReport = reportList.find(r => r.id === selectedReportId) || reportList[13];

  // Export report to CSV
  const handleExportCsv = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    const filename = `${currentReport.title.replace(/\s+/g, '_')}_${selectedAcademicYear}.csv`;

    if (selectedReportId === 1 || selectedReportId === 14) {
      // School profile / executive
      headers = ['School Code', 'School Name', 'Program', 'District', 'Taluka', 'Head Teacher', 'Status', 'Enrolled Students', 'Staff Count'];
      const target = selectedSchoolId === 'all' ? schools : schools.filter(s => s.id === selectedSchoolId);
      rows = target.map(s => [
        s.code,
        `"${s.name}"`,
        s.programType,
        s.district,
        s.taluka,
        `"${s.headTeacherName}"`,
        s.status,
        students.filter(st => st.schoolId === s.id).length,
        staff.filter(stf => stf.schoolId === s.id).length,
      ]);
    } else if (selectedReportId === 2) {
      // Students
      headers = ['GR Number', 'Student Name', 'Father Name', 'School', 'Grade', 'Section', 'Gender', 'Status', 'B-Form'];
      const target = selectedSchoolId === 'all' ? students : students.filter(s => s.schoolId === selectedSchoolId);
      rows = target.map(st => {
        const sch = schools.find(s => s.id === st.schoolId);
        return [st.grNumber, `"${st.name}"`, `"${st.fatherName}"`, `"${sch?.name}"`, st.grade, st.section, st.gender, st.status, st.bFormNumber];
      });
    } else if (selectedReportId === 3) {
      // Teachers
      headers = ['Employee ID', 'Name', 'Designation', 'School', 'CNIC', 'Qualification', 'Base Salary', 'Status'];
      const target = selectedSchoolId === 'all' ? staff : staff.filter(s => s.schoolId === selectedSchoolId);
      rows = target.map(stf => {
        const sch = schools.find(s => s.id === stf.schoolId);
        return [stf.employeeId, `"${stf.name}"`, stf.designation, `"${sch?.name}"`, stf.cnic, `"${stf.qualification}"`, stf.baseSalary, stf.status];
      });
    } else if (selectedReportId === 7 || selectedReportId === 8) {
      // Exam Marks
      headers = ['Student Name', 'School', 'Grade', 'Total Max', 'Total Obtained', 'Percentage', 'Result', 'Grade'];
      const target = selectedSchoolId === 'all' ? examMarks : examMarks.filter(m => m.schoolId === selectedSchoolId);
      rows = target.map(m => {
        const st = students.find(s => s.id === m.studentId);
        const sch = schools.find(s => s.id === m.schoolId);
        return [`"${st?.name}"`, `"${sch?.name}"`, m.grade, m.totalMaxMarks, m.totalObtainedMarks, `${m.percentage}%`, m.passed ? 'PASS' : 'FAIL', m.gradeLetter];
      });
    } else {
      // General report
      headers = ['School Code', 'School Name', 'Metric', 'Reported Status'];
      const target = selectedSchoolId === 'all' ? schools : schools.filter(s => s.id === selectedSchoolId);
      rows = target.map(s => [s.code, `"${s.name}"`, currentReport.title, s.status]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Official SEF Reports Center ({reportList.length} Reports)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {isSupervisor ? 'SEF Supervisor Read-Only Access' : 'Generate, inspect and export all multi-school records'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV / Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Main Grid: Sidebar list of 14 reports + Right Preview pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: 14 Reports List */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-3 space-y-1 max-h-[75vh] overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
            Available Official Reports
          </div>

          {reportList.map(rep => {
            const Icon = rep.icon;
            const isSelected = selectedReportId === rep.id;

            return (
              <button
                key={rep.id}
                onClick={() => setSelectedReportId(rep.id)}
                className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-emerald-600'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs truncate font-bold leading-tight">
                    {rep.id}. {rep.title}
                  </div>
                  <div className={`text-[10px] truncate leading-tight mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {rep.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Report Output View */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 space-y-4">
          {/* Header of Report with Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Official Report #{currentReport.id}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {currentReport.title}
              </h3>
              <p className="text-xs text-slate-500">
                Sindh Rural Education Support Organization • SEF Partner Network
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={selectedSchoolId}
                onChange={e => setSelectedSchoolId(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs focus:outline-none"
              >
                <option value="all">All Schools</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              <select
                value={selectedAcademicYear}
                onChange={e => setSelectedAcademicYear(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-xs font-mono focus:outline-none"
              >
                <option value="2026-27">2026-27</option>
                <option value="2025-26">2025-26</option>
              </select>
            </div>
          </div>

          {/* Report Body Rendering */}
          <div className="space-y-4 text-xs">
            {/* If Report 14: Overall Operator Report */}
            {selectedReportId === 14 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block font-semibold">Total Schools</span>
                    <strong className="text-base text-slate-900 dark:text-white">{schools.length}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block font-semibold">Total Students</span>
                    <strong className="text-base text-slate-900 dark:text-white">{students.length}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block font-semibold">Teachers & Staff</span>
                    <strong className="text-base text-slate-900 dark:text-white">{staff.length}</strong>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
                    <span className="text-[10px] text-slate-400 block font-semibold">Total Visits Logged</span>
                    <strong className="text-base text-slate-900 dark:text-white">{visits.length}</strong>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 font-bold uppercase text-[10px] text-slate-500">
                      <tr>
                        <th className="p-2.5">School Name</th>
                        <th className="p-2.5">Code</th>
                        <th className="p-2.5">District</th>
                        <th className="p-2.5 text-center">Enrollment</th>
                        <th className="p-2.5 text-center">Staff</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {schools.map(s => (
                        <tr key={s.id}>
                          <td className="p-2.5 font-bold text-slate-900 dark:text-white">{s.name}</td>
                          <td className="p-2.5 font-mono text-slate-500">{s.code}</td>
                          <td className="p-2.5">{s.district}</td>
                          <td className="p-2.5 text-center font-mono font-bold">
                            {students.filter(st => st.schoolId === s.id).length}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold">
                            {staff.filter(stf => stf.schoolId === s.id).length}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* If Report 2: Student Enrollment Report */}
            {selectedReportId === 2 && (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 font-bold uppercase text-[10px] text-slate-500">
                    <tr>
                      <th className="p-2.5">GR #</th>
                      <th className="p-2.5">Student Name</th>
                      <th className="p-2.5">Father Name</th>
                      <th className="p-2.5">Grade</th>
                      <th className="p-2.5">B-Form</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {students.slice(0, 15).map(st => (
                      <tr key={st.id}>
                        <td className="p-2.5 font-mono font-bold">{st.grNumber}</td>
                        <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{st.name}</td>
                        <td className="p-2.5 text-slate-500">{st.fatherName}</td>
                        <td className="p-2.5">{st.grade}</td>
                        <td className="p-2.5 font-mono text-slate-500">{st.bFormNumber}</td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {st.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* If Report 3: Teacher Report */}
            {selectedReportId === 3 && (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800 font-bold uppercase text-[10px] text-slate-500">
                    <tr>
                      <th className="p-2.5">Employee ID</th>
                      <th className="p-2.5">Staff Name</th>
                      <th className="p-2.5">Designation</th>
                      <th className="p-2.5">Qualification</th>
                      <th className="p-2.5 text-right">Base Salary</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {staff.map(stf => (
                      <tr key={stf.id}>
                        <td className="p-2.5 font-mono font-bold">{stf.employeeId}</td>
                        <td className="p-2.5 font-semibold text-slate-900 dark:text-white">{stf.name}</td>
                        <td className="p-2.5">{stf.designation}</td>
                        <td className="p-2.5 text-slate-500">{stf.qualification}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                          PKR {stf.baseSalary.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {stf.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* If other report: Generalized preview */}
            {selectedReportId !== 14 && selectedReportId !== 2 && selectedReportId !== 3 && (
              <div className="p-6 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                <FileText className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{currentReport.title}</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  {currentReport.desc}. All records verified against local encrypted storage. Export via CSV or print above.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={handleExportCsv}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 cursor-pointer"
                  >
                    Download Formatted CSV
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
                  >
                    Print PDF Layout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
