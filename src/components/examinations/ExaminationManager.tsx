import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Award,
  Calendar,
  FileSpreadsheet,
  Printer,
  Download,
  Plus,
  Save,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Search,
  Filter,
  School as SchoolIcon,
  X
} from 'lucide-react';
import { Examination, ExamMark } from '../../types';

export const ExaminationManager: React.FC = () => {
  const {
    examinations,
    examMarks,
    schools,
    students,
    activeSchoolId,
    activeAcademicYear,
    addExamination,
    saveExamMarks,
    currentUser,
    settings,
  } = useApp();

  const isOperator = currentUser?.role === 'operator';
  const isSupervisor = currentUser?.role === 'supervisor';

  const [activeTab, setActiveTab] = useState<'mark_entry' | 'result_sheets' | 'exams_list'>('result_sheets');

  // Result sheet filters
  const [selectedExamId, setSelectedExamId] = useState(examinations[0]?.id || '');
  const [selectedSchoolId, setSelectedSchoolId] = useState(
    activeSchoolId !== 'all' ? activeSchoolId : (schools[0]?.id || '')
  );
  const [selectedGrade, setSelectedGrade] = useState('Class V');

  // Single student result card modal
  const [viewingMarkCard, setViewingMarkCard] = useState<ExamMark | null>(null);

  // New Exam Modal
  const [showNewExamModal, setShowNewExamModal] = useState(false);
  const [examName, setExamName] = useState('');
  const [examType, setExamType] = useState<'Annual' | 'Midterm' | 'Monthly' | 'Unit'>('Monthly');
  const [examStart, setExamStart] = useState('2026-11-01');
  const [examEnd, setExamEnd] = useState('2026-11-07');
  const [examPassingPercent, setExamPassingPercent] = useState(33);

  // Marks Entry State (studentId -> subject -> obtainedMarks)
  const [inputMarksMap, setInputMarksMap] = useState<Record<string, Record<string, number>>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const currentExam = useMemo(() => {
    return examinations.find(e => e.id === selectedExamId) || examinations[0];
  }, [examinations, selectedExamId]);

  const currentSchool = useMemo(() => {
    return schools.find(s => s.id === selectedSchoolId) || schools[0];
  }, [schools, selectedSchoolId]);

  // Target students for selected school & grade
  const targetStudents = useMemo(() => {
    return students.filter(s => s.schoolId === selectedSchoolId && s.grade === selectedGrade && s.status === 'Active');
  }, [students, selectedSchoolId, selectedGrade]);

  // Load existing marks into input state
  React.useEffect(() => {
    const map: Record<string, Record<string, number>> = {};
    targetStudents.forEach(st => {
      const existing = examMarks.find(m => m.examinationId === selectedExamId && m.studentId === st.id);
      map[st.id] = {};
      if (currentExam?.subjects) {
        currentExam.subjects.forEach(sub => {
          const matchSub = existing?.subjectMarks.find(sm => sm.subject === sub);
          map[st.id][sub] = matchSub ? matchSub.obtainedMarks : 75; // default reasonable marks
        });
      }
    });
    setInputMarksMap(map);
  }, [selectedExamId, selectedSchoolId, selectedGrade, targetStudents, currentExam, examMarks]);

  // Calculated Class Results Sheet with ranks & statistics
  const classResultRows = useMemo(() => {
    if (!currentExam) return [];

    const rows = targetStudents.map(st => {
      const existing = examMarks.find(m => m.examinationId === selectedExamId && m.studentId === st.id);
      const studentInputs = inputMarksMap[st.id] || {};

      let totalMax = currentExam.subjects.length * 100;
      let totalObtained = 0;
      let hasFailedSubject = false;

      const subMarks = currentExam.subjects.map(sub => {
        const val = studentInputs[sub] !== undefined ? studentInputs[sub] : (existing?.subjectMarks.find(s => s.subject === sub)?.obtainedMarks || 0);
        totalObtained += val;
        if (val < currentExam.passingPercentage) hasFailedSubject = true;
        return { subject: sub, totalMarks: 100, obtainedMarks: val };
      });

      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const passed = percentage >= currentExam.passingPercentage && !hasFailedSubject;

      let gradeLetter = 'F';
      if (percentage >= 85) gradeLetter = 'A+';
      else if (percentage >= 75) gradeLetter = 'A';
      else if (percentage >= 65) gradeLetter = 'B';
      else if (percentage >= 50) gradeLetter = 'C';
      else if (percentage >= 33) gradeLetter = 'D';

      return {
        student: st,
        subjectMarks: subMarks,
        totalMax,
        totalObtained,
        percentage,
        passed,
        gradeLetter,
        existingMark: existing,
      };
    });

    // Sort by percentage descending to calculate rankings!
    rows.sort((a, b) => b.percentage - a.percentage);

    return rows.map((r, idx) => ({
      ...r,
      rank: idx + 1,
    }));
  }, [targetStudents, currentExam, selectedExamId, examMarks, inputMarksMap]);

  // Aggregate Exam Statistics
  const stats = useMemo(() => {
    if (classResultRows.length === 0) return { passedCount: 0, failedCount: 0, passPct: 0, highest: 0, lowest: 0, average: 0 };
    const passedCount = classResultRows.filter(r => r.passed).length;
    const failedCount = classResultRows.length - passedCount;
    const passPct = (passedCount / classResultRows.length) * 100;
    const highest = Math.max(...classResultRows.map(r => r.totalObtained));
    const lowest = Math.min(...classResultRows.map(r => r.totalObtained));
    const average = classResultRows.reduce((sum, r) => sum + r.percentage, 0) / classResultRows.length;
    return { passedCount, failedCount, passPct, highest, lowest, average };
  }, [classResultRows]);

  const handleSaveAllMarks = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentExam) return;

    const toSave: Omit<ExamMark, 'id' | 'createdAt' | 'updatedAt'>[] = classResultRows.map(row => ({
      examinationId: currentExam.id,
      schoolId: selectedSchoolId,
      studentId: row.student.id,
      grade: selectedGrade,
      academicYear: activeAcademicYear,
      subjectMarks: row.subjectMarks,
      totalMaxMarks: row.totalMax,
      totalObtainedMarks: row.totalObtained,
      percentage: Number(row.percentage.toFixed(1)),
      passed: row.passed,
      gradeLetter: row.gradeLetter,
      remarks: row.passed ? `Rank #${row.rank} with ${row.percentage.toFixed(1)}%` : 'Requires remedial assistance',
    }));

    saveExamMarks(toSave);
    setSaveSuccessMsg(`Saved examination marks for ${classResultRows.length} students.`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examName.trim()) return;

    addExamination({
      name: examName.trim(),
      academicYear: activeAcademicYear,
      examType,
      startDate: examStart,
      endDate: examEnd,
      subjects: ['Sindhi', 'English', 'Mathematics', 'General Science', 'Social Studies', 'Islamiat/Ethics'],
      passingPercentage: examPassingPercent,
      isPublished: true,
    });

    setShowNewExamModal(false);
    setExamName('');
  };

  const exportResultsToCsv = () => {
    if (!currentExam || classResultRows.length === 0) return;
    const headers = ['Rank', 'GR Number', 'Student Name', 'Father Name', 'Grade', ...currentExam.subjects, 'Total Max', 'Total Obtained', 'Percentage', 'Grade', 'Result'];
    const rows = classResultRows.map(r => [
      r.rank,
      r.student.grNumber,
      `"${r.student.name}"`,
      `"${r.student.fatherName}"`,
      r.student.grade,
      ...r.subjectMarks.map(sm => sm.obtainedMarks),
      r.totalMax,
      r.totalObtained,
      `${r.percentage.toFixed(1)}%`,
      r.gradeLetter,
      r.passed ? 'PASSED' : 'FAILED',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${currentSchool?.name}_${selectedGrade}_${currentExam.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            SEF Examination & Result Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Annual & Midterm assessments, marksheets, rank calculator, and official result sheets
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOperator && (
            <button
              onClick={() => setShowNewExamModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Assessment / Exam
            </button>
          )}
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-2xl bg-slate-200 dark:bg-slate-800 p-1 border border-slate-300 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('result_sheets')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'result_sheets'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          1. Class Result Sheet & Rankings
        </button>

        {!isSupervisor && (
          <button
            onClick={() => setActiveTab('mark_entry')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'mark_entry'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            2. Marks Entry Grid
          </button>
        )}

        <button
          onClick={() => setActiveTab('exams_list')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'exams_list'
              ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          3. Examination Schedule ({examinations.length})
        </button>
      </div>

      {/* Selector Filters (School, Grade, Exam) */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Exam Selector */}
          <select
            value={selectedExamId}
            onChange={e => setSelectedExamId(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            {examinations.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name} ({ex.examType})</option>
            ))}
          </select>

          {/* School Selector */}
          {activeSchoolId === 'all' && (
            <select
              value={selectedSchoolId}
              onChange={e => setSelectedSchoolId(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              {schools.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          {/* Grade Selector */}
          <select
            value={selectedGrade}
            onChange={e => setSelectedGrade(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            {currentSchool?.grades.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportResultsToCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV / Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Sheet
          </button>
        </div>
      </div>

      {/* TAB 1: RESULT SHEETS & RANKINGS */}
      {activeTab === 'result_sheets' && (
        <div className="space-y-4">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Passing Ratio</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {stats.passPct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {stats.passedCount} Passed • {stats.failedCount} Failed
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Class Average</div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {stats.average.toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {classResultRows.length} Students Assessed
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Highest Score</div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {stats.highest}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Top Rank #1
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-center">
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Passing Threshold</div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {currentExam?.passingPercentage}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">SEF Standard Passing</div>
            </div>
          </div>

          {/* Official Result Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {currentSchool?.name} — {selectedGrade} Official Gazette
                </h3>
                <p className="text-xs text-slate-500">
                  {currentExam?.name} • Academic Year {activeAcademicYear}
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {currentExam?.subjects.length} Subjects Evaluated
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                    <th className="p-2.5 text-center w-12">Rank</th>
                    <th className="p-2.5">Student Details</th>
                    <th className="p-2.5">GR Number</th>
                    {currentExam?.subjects.map(s => (
                      <th key={s} className="p-2.5 text-center font-semibold">{s}</th>
                    ))}
                    <th className="p-2.5 text-center">Obtained / Max</th>
                    <th className="p-2.5 text-center">%</th>
                    <th className="p-2.5 text-center">Grade</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5 text-right">Card</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {classResultRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        No students found for {currentSchool?.name} in {selectedGrade}.
                      </td>
                    </tr>
                  ) : (
                    classResultRows.map(row => (
                      <tr key={row.student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2.5 text-center font-bold">
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                            row.rank === 1 ? 'bg-amber-400 text-amber-950 shadow-xs' :
                            row.rank === 2 ? 'bg-slate-300 text-slate-900' :
                            row.rank === 3 ? 'bg-amber-700/60 text-white' :
                            'text-slate-400'
                          }`}>
                            {row.rank}
                          </span>
                        </td>

                        <td className="p-2.5">
                          <div className="font-bold text-slate-900 dark:text-white">{row.student.name}</div>
                          <div className="text-[10px] text-slate-400">S/O {row.student.fatherName}</div>
                        </td>

                        <td className="p-2.5 font-mono font-semibold text-slate-700 dark:text-slate-300">
                          {row.student.grNumber}
                        </td>

                        {row.subjectMarks.map(sm => (
                          <td
                            key={sm.subject}
                            className={`p-2.5 text-center font-mono font-medium ${
                              sm.obtainedMarks < (currentExam?.passingPercentage || 33)
                                ? 'text-rose-600 font-bold bg-rose-50/50 dark:bg-rose-950/20'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {sm.obtainedMarks}
                          </td>
                        ))}

                        <td className="p-2.5 text-center font-mono font-bold text-slate-900 dark:text-white">
                          {row.totalObtained} / {row.totalMax}
                        </td>

                        <td className="p-2.5 text-center font-mono font-bold">
                          {row.percentage.toFixed(1)}%
                        </td>

                        <td className="p-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {row.gradeLetter}
                        </td>

                        <td className="p-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            row.passed
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {row.passed ? 'PASS' : 'FAIL'}
                          </span>
                        </td>

                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => {
                              if (row.existingMark) setViewingMarkCard(row.existingMark);
                              else {
                                setViewingMarkCard({
                                  id: 'temp-' + row.student.id,
                                  examinationId: currentExam!.id,
                                  schoolId: selectedSchoolId,
                                  studentId: row.student.id,
                                  grade: selectedGrade,
                                  academicYear: activeAcademicYear,
                                  subjectMarks: row.subjectMarks,
                                  totalMaxMarks: row.totalMax,
                                  totalObtainedMarks: row.totalObtained,
                                  percentage: row.percentage,
                                  passed: row.passed,
                                  gradeLetter: row.gradeLetter,
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                });
                              }
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 text-[11px] font-semibold"
                            title="Generate individual marksheet card"
                          >
                            Card
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MARKS ENTRY GRID */}
      {activeTab === 'mark_entry' && (
        <form onSubmit={handleSaveAllMarks} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Enter Examination Subject Marks
              </h3>
              <p className="text-xs text-slate-500">
                Type marks (0-100) per subject. Totals, percentages and pass/fail calculate automatically.
              </p>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              Save All Entered Marks
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                  <th className="p-2.5">Student</th>
                  <th className="p-2.5">GR</th>
                  {currentExam?.subjects.map(s => (
                    <th key={s} className="p-2.5 text-center font-semibold">{s}</th>
                  ))}
                  <th className="p-2.5 text-center">Calculated %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {targetStudents.map(st => {
                  const studentInputs = inputMarksMap[st.id] || {};
                  const studentRow = classResultRows.find(r => r.student.id === st.id);

                  return (
                    <tr key={st.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2.5">
                        <div className="font-bold text-slate-900 dark:text-white">{st.name}</div>
                        <div className="text-[10px] text-slate-400">S/O {st.fatherName}</div>
                      </td>

                      <td className="p-2.5 font-mono text-slate-500">{st.grNumber}</td>

                      {currentExam?.subjects.map(sub => (
                        <td key={sub} className="p-2.5 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={studentInputs[sub] !== undefined ? studentInputs[sub] : ''}
                            onChange={e => {
                              const val = Math.min(100, Math.max(0, Number(e.target.value)));
                              setInputMarksMap({
                                ...inputMarksMap,
                                [st.id]: {
                                  ...(inputMarksMap[st.id] || {}),
                                  [sub]: val,
                                },
                              });
                            }}
                            className="w-14 text-center font-mono py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:border-emerald-500"
                          />
                        </td>
                      ))}

                      <td className="p-2.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {studentRow ? `${studentRow.percentage.toFixed(1)}% (${studentRow.gradeLetter})` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </form>
      )}

      {/* TAB 3: EXAM SCHEDULE LIST */}
      {activeTab === 'exams_list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {examinations.map(ex => (
            <div key={ex.id} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                  {ex.examType} Assessment
                </span>
                <span className="text-xs text-slate-400 font-mono">{ex.academicYear}</span>
              </div>

              <h4 className="text-base font-bold text-slate-900 dark:text-white mt-1">{ex.name}</h4>
              <p className="text-xs text-slate-500">
                Date: {ex.startDate} to {ex.endDate} • Passing Marks: {ex.passingPercentage}%
              </p>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1">
                {ex.subjects.map(sub => (
                  <span key={sub} className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Individual Student Result Marksheet Card Modal */}
      {viewingMarkCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white text-slate-900 rounded-3xl p-6 shadow-2xl">
            {/* Marksheet Header */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-emerald-800">
              <div>
                <h3 className="text-sm font-extrabold uppercase text-emerald-800">
                  Sindh Education Foundation (SEF)
                </h3>
                <h4 className="text-base font-black text-slate-900 mt-0.5">
                  Official Student Achievement Card
                </h4>
                <p className="text-[11px] text-slate-500">
                  {currentExam?.name} • Year {activeAcademicYear}
                </p>
              </div>
              <button
                onClick={() => setViewingMarkCard(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const st = students.find(s => s.id === viewingMarkCard.studentId);
              const sch = schools.find(s => s.id === viewingMarkCard.schoolId);

              return (
                <div className="mt-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Student:</span>
                      <strong className="text-sm">{st?.name}</strong>
                      <span className="block text-[11px] text-slate-500">Father: {st?.fatherName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Campus:</span>
                      <strong className="text-sm">{sch?.name}</strong>
                      <span className="block text-[11px] text-slate-500">{viewingMarkCard.grade}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">GR Number:</span>
                      <strong className="font-mono">{st?.grNumber}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">B-Form #:</span>
                      <strong className="font-mono text-[11px]">{st?.bFormNumber}</strong>
                    </div>
                  </div>

                  {/* Marks Breakdown */}
                  <table className="w-full border-collapse border border-slate-200 text-xs mt-3">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                        <th className="p-2 text-left">Subject</th>
                        <th className="p-2 text-center">Max</th>
                        <th className="p-2 text-center">Obtained</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {viewingMarkCard.subjectMarks.map(sm => (
                        <tr key={sm.subject}>
                          <td className="p-2 font-medium">{sm.subject}</td>
                          <td className="p-2 text-center font-mono text-slate-500">100</td>
                          <td className="p-2 text-center font-mono font-bold">{sm.obtainedMarks}</td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.2 rounded text-[10px] font-bold ${
                              sm.obtainedMarks >= (currentExam?.passingPercentage || 33)
                                ? 'text-emerald-700 bg-emerald-100'
                                : 'text-rose-700 bg-rose-100'
                            }`}>
                              {sm.obtainedMarks >= (currentExam?.passingPercentage || 33) ? 'Pass' : 'Fail'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-50 font-bold border-t-2 border-emerald-800">
                        <td className="p-2">Grand Total</td>
                        <td className="p-2 text-center font-mono">{viewingMarkCard.totalMaxMarks}</td>
                        <td className="p-2 text-center font-mono text-emerald-800">{viewingMarkCard.totalObtainedMarks}</td>
                        <td className="p-2 text-center font-black">{viewingMarkCard.gradeLetter}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Result Verdict Box */}
                  <div className={`p-3 rounded-xl text-white flex items-center justify-between ${
                    viewingMarkCard.passed ? 'bg-emerald-800' : 'bg-rose-800'
                  }`}>
                    <div>
                      <div className="text-[10px] opacity-80 uppercase tracking-wider font-semibold">Final Assessment Result</div>
                      <div className="text-xl font-black">{viewingMarkCard.passed ? 'PROMOTED / PASSED' : 'NEEDS IMPROVEMENT'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black font-mono">{viewingMarkCard.percentage.toFixed(1)}%</div>
                      <span className="text-xs">Grade: {viewingMarkCard.gradeLetter}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      Print Card
                    </button>
                    <button
                      onClick={() => setViewingMarkCard(null)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* New Exam Assessment Modal */}
      {showNewExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl text-slate-900 dark:text-white">
            <h3 className="text-base font-bold mb-1">Schedule New Examination</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add Annual, Midterm, Monthly Test or Diagnostic assessment.
            </p>

            <form onSubmit={handleCreateExam} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Assessment Name *</label>
                <input
                  type="text"
                  value={examName}
                  onChange={e => setExamName(e.target.value)}
                  placeholder="e.g. November 2026 Monthly Unit Test"
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Exam Type</label>
                  <select
                    value={examType}
                    onChange={e => setExamType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Annual">Annual Exam</option>
                    <option value="Midterm">Midterm Assessment</option>
                    <option value="Monthly">Monthly Test</option>
                    <option value="Unit">Unit Test</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Passing %</label>
                  <input
                    type="number"
                    value={examPassingPercent}
                    onChange={e => setExamPassingPercent(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    value={examStart}
                    onChange={e => setExamStart(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    value={examEnd}
                    onChange={e => setExamEnd(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewExamModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  Create Examination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
